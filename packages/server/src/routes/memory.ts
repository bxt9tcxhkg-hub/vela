// Long-Term Memory + Notification Routes
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'

export async function memoryRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Memory ──────────────────────────────────────────────────────────────
  fastify.get('/api/memory', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM memory_entries ORDER BY updated_at DESC').all()
    return reply.send({ entries: rows })
  })

  fastify.post<{ Body: { key: string; value: string; source?: string } }>(
    '/api/memory',
    async (req, reply) => {
      db.prepare(`
        INSERT INTO memory_entries (key, value, source, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(req.body.key, req.body.value, req.body.source ?? 'user')
      return reply.code(201).send({ ok: true })
    }
  )

  fastify.delete<{ Params: { key: string } }>(
    '/api/memory/:key',
    async (req, reply) => {
      db.prepare('DELETE FROM memory_entries WHERE key = ?').run(req.params.key)
      return reply.code(204).send()
    }
  )

  // ── Notifications ────────────────────────────────────────────────────────
  fastify.get('/api/notifications', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all()
    const unread = (db.prepare('SELECT COUNT(*) as n FROM notifications WHERE read = 0').get() as { n: number }).n
    return reply.send({ notifications: rows, unread })
  })

  fastify.post<{ Body: { title: string; body: string } }>(
    '/api/notifications',
    async (req, reply) => {
      db.prepare('INSERT INTO notifications (title, body) VALUES (?, ?)').run(req.body.title, req.body.body)
      return reply.code(201).send({ ok: true })
    }
  )

  fastify.patch('/api/notifications/read-all', async (_req, reply) => {
    db.prepare("UPDATE notifications SET read = 1").run()
    return reply.send({ ok: true })
  })
}
