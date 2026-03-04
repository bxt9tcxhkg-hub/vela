// Adaptive Preferences – track signals, surface suggestions, confirm/reject
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import { detectSignals } from '../lib/behaviorDetector.js'

const THRESHOLD = 3 // how many times before suggesting

export async function preferencesRoutes(fastify: FastifyInstance): Promise<void> {

  // Called internally by chat route after each user message
  fastify.post<{ Body: { message: string } }>(
    '/api/preferences/track',
    async (req, reply) => {
      const signals = detectSignals(req.body.message)
      const newSuggestions: unknown[] = []

      for (const sig of signals) {
        const existing = db.prepare('SELECT * FROM behavior_signals WHERE signal_key = ?').get(sig.key) as
          { id: string; count: number; threshold: number } | undefined

        if (existing) {
          const newCount = existing.count + 1
          db.prepare("UPDATE behavior_signals SET count = ?, last_seen = datetime('now') WHERE signal_key = ?")
            .run(newCount, sig.key)

          // Create suggestion when threshold crossed for first time
          if (newCount === THRESHOLD) {
            const alreadySuggested = db.prepare('SELECT id FROM adaptive_preferences WHERE signal_key = ?').get(sig.key)
            if (!alreadySuggested) {
              db.prepare(`INSERT INTO adaptive_preferences (signal_key, label, value) VALUES (?, ?, ?)`)
                .run(sig.key, sig.label, sig.value)
              newSuggestions.push({ signal_key: sig.key, label: sig.label, value: sig.value })
            }
          }
        } else {
          db.prepare('INSERT INTO behavior_signals (signal_key, label, count) VALUES (?, ?, 1)').run(sig.key, sig.label)
        }
      }

      return reply.send({ tracked: signals.length, newSuggestions })
    }
  )

  // Get pending suggestions for the UI to show
  fastify.get('/api/preferences/suggestions', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT ap.*, bs.count, bs.threshold
      FROM adaptive_preferences ap
      JOIN behavior_signals bs ON ap.signal_key = bs.signal_key
      WHERE ap.status = 'pending'
      ORDER BY ap.created_at DESC
    `).all()
    return reply.send({ suggestions: rows })
  })

  // Confirm suggestion → becomes active preference
  fastify.post<{ Params: { id: string } }>('/api/preferences/suggestions/:id/confirm', async (req, reply) => {
    db.prepare("UPDATE adaptive_preferences SET status = 'confirmed', decided_at = datetime('now') WHERE id = ?")
      .run(req.params.id)
    return reply.send({ ok: true })
  })

  // Reject suggestion
  fastify.post<{ Params: { id: string } }>('/api/preferences/suggestions/:id/reject', async (req, reply) => {
    db.prepare("UPDATE adaptive_preferences SET status = 'rejected', decided_at = datetime('now') WHERE id = ?")
      .run(req.params.id)
    return reply.send({ ok: true })
  })

  // Get all confirmed preferences (used by chat to enrich system prompt)
  fastify.get('/api/preferences/active', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT signal_key, label, value FROM adaptive_preferences WHERE status = 'confirmed'
    `).all() as { signal_key: string; label: string; value: string }[]
    return reply.send({ preferences: rows })
  })

  // Delete a confirmed preference
  fastify.delete<{ Params: { id: string } }>('/api/preferences/:id', async (req, reply) => {
    db.prepare('DELETE FROM adaptive_preferences WHERE id = ?').run(req.params.id)
    return reply.code(204).send()
  })

  // Full list (for settings page)
  fastify.get('/api/preferences', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT ap.*, bs.count, bs.threshold
      FROM adaptive_preferences ap
      JOIN behavior_signals bs ON ap.signal_key = bs.signal_key
      ORDER BY ap.created_at DESC
    `).all()
    return reply.send({ preferences: rows })
  })
}
