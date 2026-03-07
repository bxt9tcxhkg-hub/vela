import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDb } from '../db/database.js'
import { TOPICS, TOPIC_MODULES, isTopic } from '../prompts/topics.js'

const UserTopicsSchema = z.object({
  userId: z.string().min(1),
  topics: z.array(z.string()).min(1),
})

const ScopeSetSchema = z.object({
  userId: z.string().min(1),
  channelId: z.string().min(1),
  topic: z.string().min(1),
})

export async function topicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/topics', async (_req, reply) => {
    return reply.send({
      topics: TOPICS.map((k) => ({ ...TOPIC_MODULES[k] }))
    })
  })

  fastify.post('/api/topics/user-selection', async (request, reply) => {
    const body = UserTopicsSchema.parse(request.body)
    const valid = body.topics.filter(isTopic)
    if (valid.length === 0) return reply.code(400).send({ error: 'Keine gültigen Themen übergeben.' })

    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM user_topics WHERE user_id = ?').run(body.userId)
      const stmt = db.prepare('INSERT INTO user_topics (user_id, topic) VALUES (?, ?)')
      for (const t of valid) stmt.run(body.userId, t)
    })
    tx()

    return reply.send({ ok: true, topics: valid })
  })

  fastify.post('/api/topics/scope', async (request, reply) => {
    const body = ScopeSetSchema.parse(request.body)
    if (!isTopic(body.topic)) return reply.code(400).send({ error: 'Ungültiges Thema.' })

    const db = getDb()
    db.prepare(`
      INSERT INTO conversation_scope (user_id, channel_id, active_topic)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, channel_id)
      DO UPDATE SET active_topic = excluded.active_topic, updated_at = datetime('now')
    `).run(body.userId, body.channelId, body.topic)

    return reply.send({ ok: true, scope: { userId: body.userId, channelId: body.channelId, topic: body.topic } })
  })

  fastify.get('/api/topics/scope', async (request, reply) => {
    const query = z.object({ userId: z.string().min(1), channelId: z.string().min(1) }).parse(request.query)
    const db = getDb()
    const row = db.prepare('SELECT active_topic FROM conversation_scope WHERE user_id = ? AND channel_id = ?').get(query.userId, query.channelId) as { active_topic?: string } | undefined

    return reply.send({ activeTopic: row?.active_topic ?? null })
  })
}
