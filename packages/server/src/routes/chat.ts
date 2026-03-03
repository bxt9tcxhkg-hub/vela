import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
})

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/health', async (_req, reply) => {
    const body = JSON.stringify({ status: 'ok', version: '0.1.0' })
    return reply
      .code(200)
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .send(body)
  })

  fastify.post('/api/chat', async (request, reply) => {
    const body = ChatRequestSchema.parse(request.body)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

    const response = await client.messages.create({
      model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'Du bist Vela, ein persönlicher KI-Assistent. Du bist hilfsbereit, präzise und antwortest auf Deutsch. Du handelst niemals ohne Bestätigung des Nutzers bei wichtigen Aktionen.',
      messages: body.messages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const responseBody = JSON.stringify({ text })
    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Length', Buffer.byteLength(responseBody))
      .header('Transfer-Encoding', '')
      .send(responseBody)
  })
}
