import type { FastifyInstance } from 'fastify'

interface SettingsBody {
  anthropicKey?: string
  openaiKey?: string
  model?: string
}

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/settings', async (_req, reply) => {
    return reply.send({
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.VELA_MODEL ?? 'claude',
    })
  })

  fastify.post<{ Body: SettingsBody }>('/api/settings', async (req, reply) => {
    const { anthropicKey, openaiKey, model } = req.body ?? {}
    if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey
    if (openaiKey) process.env.OPENAI_API_KEY = openaiKey
    if (model) process.env.VELA_MODEL = model
    return reply.send({ ok: true })
  })
}
