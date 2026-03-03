import type { FastifyInstance } from 'fastify'
import { listSkills, getSkill } from '../skills/registry.js'

export async function skillRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/skills', async (_req, reply) => {
    const body = JSON.stringify(listSkills().map(s => ({ name: s.name, description: s.description })))
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .header('Transfer-Encoding', '')
      .send(body)
  })

  fastify.post<{ Body: { skill: string; query?: string; params?: Record<string, unknown> } }>(
    '/api/skills/run',
    async (req, reply) => {
      const { skill, query, params } = req.body
      const s = getSkill(skill)
      if (!s) {
        const body = JSON.stringify({ error: `Skill nicht gefunden: ${skill}` })
        return reply.code(404)
          .header('Content-Type', 'application/json')
          .header('Content-Length', Buffer.byteLength(body))
          .header('Transfer-Encoding', '')
          .send(body)
      }

      const result = await s.execute({ query: query ?? undefined, params: params ?? undefined })
      const body = JSON.stringify(result)
      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Length', Buffer.byteLength(body))
        .header('Transfer-Encoding', '')
        .send(body)
    }
  )
}
