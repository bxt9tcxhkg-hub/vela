import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { streamClaude } from '../ai/anthropic.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
})

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok', version: '0.1.0' }))

  // Streaming chat endpoint (Server-Sent Events)
  fastify.post('/api/chat', async (request, reply) => {
    const body = ChatRequestSchema.parse(request.body)

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders()

    try {
      for await (const chunk of streamClaude(body.messages)) {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    } finally {
      reply.raw.end()
    }
  })
}
