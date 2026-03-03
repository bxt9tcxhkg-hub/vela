import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { webSearchSkill } from '../skills/web-search.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
})

function needsWebSearch(message: string): string | null {
  const lower = message.toLowerCase()
  const patterns = [
    /suche? (?:nach )?(.+)/,
    /was ist (.+)\?/,
    /wer ist (.+)\?/,
    /aktuelle? (?:news|nachrichten) (?:über|zu) (.+)/,
  ]
  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

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

    // Detect if web search is needed
    const lastUserMessage = [...body.messages].reverse().find(m => m.role === 'user')
    const searchQuery = lastUserMessage ? needsWebSearch(lastUserMessage.content) : null

    let systemPrompt = 'Du bist Vela, ein persönlicher KI-Assistent. Du bist hilfsbereit, präzise und antwortest auf Deutsch. Du handelst niemals ohne Bestätigung des Nutzers bei wichtigen Aktionen.'

    if (searchQuery) {
      try {
        const searchResult = await webSearchSkill.execute({ query: searchQuery })
        if (searchResult.success && searchResult.summary !== 'Keine direkte Antwort gefunden') {
          systemPrompt += `\n\nAktuelle Web-Suchergebnisse für "${searchQuery}":\n${searchResult.summary}`
        }
      } catch (_err) {
        // Ignore search errors, proceed without context
      }
    }

    const response = await client.messages.create({
      model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const responseBody = JSON.stringify({ text, skillUsed: searchQuery ? 'web-search' : null })
    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Length', Buffer.byteLength(responseBody))
      .header('Transfer-Encoding', '')
      .send(responseBody)
  })
}
