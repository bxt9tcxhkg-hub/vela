// RAG – Dokumente hochladen und durchsuchen
import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import db from '../db/database.js'
import crypto from 'node:crypto'

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    content    TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type  TEXT NOT NULL DEFAULT 'text/plain',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    id UNINDEXED, name, content,
    content='documents', content_rowid='rowid'
  );
`)

export async function documentRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB max

  // List documents
  fastify.get('/api/documents', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT id, name, size_bytes, mime_type, created_at,
             substr(content, 1, 200) as preview
      FROM documents ORDER BY created_at DESC
    `).all()
    return reply.send({ documents: rows })
  })

  // Upload document
  fastify.post('/api/documents/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'Keine Datei' })

    const buffer = await data.toBuffer()
    const content = buffer.toString('utf-8').replace(/\r\n/g, '\n')
    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO documents (id, name, content, size_bytes, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.filename, content, buffer.byteLength, data.mimetype)

    // Update FTS index
    db.prepare(`INSERT INTO documents_fts (id, name, content) VALUES (?, ?, ?)`).run(id, data.filename, content)

    return reply.code(201).send({ id, name: data.filename, size_bytes: buffer.byteLength })
  })

  // Search documents (for RAG)
  fastify.get<{ Querystring: { q: string } }>('/api/documents/search', async (req, reply) => {
    const q = req.query.q ?? ''
    if (!q.trim()) return reply.send({ results: [] })

    try {
      const results = db.prepare(`
        SELECT d.id, d.name, snippet(documents_fts, 2, '<mark>', '</mark>', '…', 32) as excerpt
        FROM documents_fts fts
        JOIN documents d ON fts.id = d.id
        WHERE documents_fts MATCH ?
        LIMIT 5
      `).all(q)
      return reply.send({ results })
    } catch {
      // Fallback: simple LIKE search
      const rows = db.prepare(`
        SELECT id, name, substr(content, 1, 300) as excerpt
        FROM documents WHERE content LIKE ? LIMIT 5
      `).all(`%${q}%`)
      return reply.send({ results: rows })
    }
  })

  // Get full document content
  fastify.get<{ Params: { id: string } }>('/api/documents/:id', async (req, reply) => {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id)
    if (!doc) return reply.code(404).send({ error: 'Nicht gefunden' })
    return reply.send(doc)
  })

  // Delete document
  fastify.delete<{ Params: { id: string } }>('/api/documents/:id', async (req, reply) => {
    db.prepare('DELETE FROM documents_fts WHERE id = ?').run(req.params.id)
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id)
    return reply.code(204).send()
  })
}
