import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'

db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    prompt     TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'Allgemein',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO prompt_templates (id, name, prompt, category) VALUES
    ('tpl-1', 'E-Mails zusammenfassen', 'Fasse meine ungelesenen E-Mails kurz zusammen.', 'E-Mail'),
    ('tpl-2', 'Web-Recherche', 'Suche aktuelle Informationen zu: ', 'Recherche'),
    ('tpl-3', 'Aufgabenliste erstellen', 'Erstelle eine strukturierte Aufgabenliste für: ', 'Organisation'),
    ('tpl-4', 'Text übersetzen (EN→DE)', 'Übersetze den folgenden Text ins Deutsche: ', 'Text'),
    ('tpl-5', 'Text zusammenfassen', 'Fasse den folgenden Text in 3 Sätzen zusammen: ', 'Text');
`)

export async function templateRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/templates', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM prompt_templates ORDER BY category, name').all()
    return reply.send({ templates: rows })
  })

  fastify.post<{ Body: { name: string; prompt: string; category?: string } }>(
    '/api/templates',
    async (req, reply) => {
      const id = crypto.randomUUID()
      db.prepare(`INSERT INTO prompt_templates (id, name, prompt, category) VALUES (?, ?, ?, ?)`).run(
        id, req.body.name, req.body.prompt, req.body.category ?? 'Eigene'
      )
      return reply.code(201).send({ id, ...req.body })
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/templates/:id',
    async (req, reply) => {
      db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )
}
