// Workflows – Skills in Abfolge automatisieren
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'

db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps       TEXT NOT NULL DEFAULT '[]',
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO workflows (id, name, description, steps) VALUES
    ('wf-demo', 'Morgen-Brief', 'Tägliche Zusammenfassung',
     '[{"id":"1","type":"prompt","label":"E-Mails prüfen","prompt":"Fasse meine ungelesenen E-Mails zusammen."},{"id":"2","type":"prompt","label":"Wetter","prompt":"Wie ist das Wetter heute in Wien?"},{"id":"3","type":"prompt","label":"Aufgaben","prompt":"Erstelle eine To-Do-Liste für heute basierend auf den E-Mails."}]');
`)

export async function workflowRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/api/workflows', async (_req, reply) => {
    const rows = db.prepare('SELECT id, name, description, steps, enabled, last_run, created_at FROM workflows ORDER BY created_at DESC').all() as
      { id: string; name: string; description: string; steps: string; enabled: number; last_run: string | null; created_at: string }[]
    return reply.send({ workflows: rows.map(r => ({ ...r, steps: JSON.parse(r.steps) as unknown[] })) })
  })

  fastify.post<{ Body: { name: string; description?: string; steps: unknown[] } }>(
    '/api/workflows',
    async (req, reply) => {
      const id = crypto.randomUUID()
      db.prepare(`INSERT INTO workflows (id, name, description, steps) VALUES (?, ?, ?, ?)`).run(
        id, req.body.name, req.body.description ?? '', JSON.stringify(req.body.steps)
      )
      return reply.code(201).send({ id })
    }
  )

  fastify.put<{ Params: { id: string }; Body: { name?: string; steps?: unknown[]; enabled?: boolean } }>(
    '/api/workflows/:id',
    async (req, reply) => {
      const { id } = req.params
      if (req.body.name !== undefined)    db.prepare("UPDATE workflows SET name = ? WHERE id = ?").run(req.body.name, id)
      if (req.body.steps !== undefined)   db.prepare("UPDATE workflows SET steps = ? WHERE id = ?").run(JSON.stringify(req.body.steps), id)
      if (req.body.enabled !== undefined) db.prepare("UPDATE workflows SET enabled = ? WHERE id = ?").run(req.body.enabled ? 1 : 0, id)
      return reply.send({ ok: true })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/api/workflows/:id/run',
    async (req, reply) => {
      const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as
        { id: string; name: string; steps: string } | undefined
      if (!wf) return reply.code(404).send({ error: 'Nicht gefunden' })

      const steps = JSON.parse(wf.steps) as { id: string; type: string; prompt: string; label: string }[]
      const results: { step: string; result: string }[] = []

      for (const step of steps) {
        try {
          const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: step.prompt }] }),
          })
          const data = await res.json() as { text?: string }
          results.push({ step: step.label, result: data.text ?? '' })
        } catch {
          results.push({ step: step.label, result: 'Fehler' })
        }
      }

      db.prepare("UPDATE workflows SET last_run = datetime('now') WHERE id = ?").run(req.params.id)
      return reply.send({ results })
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/workflows/:id',
    async (req, reply) => {
      db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )
}
