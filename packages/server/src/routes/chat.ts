import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { chatGroq } from '../ai/groq.js'
import { buildSystemPrompt, type UserLevel, type BackendMode } from '../prompts/builder.js'
import { analyzeContext, getContextWarningMessage } from '../utils/context.js'
import { loadCheckpoint, hasActiveCheckpoint, getCheckpointResumeMessage } from '../utils/checkpoint.js'
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

interface ActivityEntry {
  icon: string
  description: string
  status: string
}

function needsWebSearch(message: string): string | null {
  const lower = message.toLowerCase()
  const patterns = [
    /(?:suche?|such mir|find) (?:nach )?(.+)/,
    /was (?:ist|sind|bedeutet|war) (.+?)[\?\!\.]*$/,
    /wer (?:ist|war|sind) (.+?)[\?\!\.]*$/,
    /wie (?:funktioniert|heißt|viel|lang|alt) (.+?)[\?\!\.]*$/,
    /wann (?:ist|war|wurde|findet) (.+?)[\?\!\.]*$/,
    /wo (?:ist|liegt|befindet) (.+?)[\?\!\.]*$/,
    /aktuelle? (?:news|nachrichten|infos?) (?:über|zu|von) (.+)/,
    /informationen? (?:über|zu|von) (.+)/,
  ]
  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match?.[1] && match[1].length > 2) return match[1].trim()
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
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY ?? ''
    if (!apiKey) {
      return reply.code(400).send({ error: 'Kein API Key konfiguriert. Bitte in den Einstellungen hinterlegen.' })
    }

    const body = ChatRequestSchema.parse(request.body)

    const client = new Anthropic({ apiKey })

    // Detect if web search is needed
    const lastUserMessage = [...body.messages].reverse().find(m => m.role === 'user')
    const userMessageText = lastUserMessage?.content ?? ''
    const searchQuery = lastUserMessage ? needsWebSearch(userMessageText) : null

    const systemPrompt = process.env.VELA_SYSTEM_PROMPT
      ? process.env.VELA_SYSTEM_PROMPT
      : (() => {
          const vars: import('../prompts/builder.js').PromptVars = {
            language: process.env.VELA_PREF_LANGUAGE ?? 'Deutsch',
            tone: process.env.VELA_PREF_TONE ?? 'einfach',
            purpose: process.env.VELA_PREF_PURPOSE ?? 'alltag',
            level: (process.env.VELA_PREF_LEVEL ?? 'laie') as UserLevel,
            backendMode: (process.env.VELA_BACKEND === 'groq' ? 'groq' : process.env.VELA_BACKEND === 'cloud' ? 'cloud' : 'local') as BackendMode,
          }
          if (process.env.VELA_PREF_NAME) vars.name = process.env.VELA_PREF_NAME
          if (process.env.DEFAULT_MODEL) vars.backendModel = process.env.DEFAULT_MODEL
          return buildSystemPrompt(vars)
        })()

    let activeSystemPrompt = systemPrompt
    let skillUsed: string | null = null

    if (searchQuery) {
      try {
        const searchResult = await webSearchSkill.execute({ query: searchQuery })
        if (searchResult.success && searchResult.summary !== 'Keine direkte Antwort gefunden') {
          activeSystemPrompt += `\n\nAktuelle Web-Suchergebnisse für "${searchQuery}":\n${searchResult.summary}`
          skillUsed = 'web-search'
        }
      } catch (_err) {
        // Ignore search errors, proceed without context
      }
    }

    const activeBackend = process.env.VELA_BACKEND ?? 'anthropic'
    let text: string

    if (activeBackend === 'groq') {
      text = await chatGroq(body.messages, activeSystemPrompt)
    } else {
      const response = await client.messages.create({
        model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: activeSystemPrompt,
        messages: body.messages,
      })
      text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
    }

    // T-07: Kontextfenster-Analyse
    const model = process.env.DEFAULT_MODEL ?? 'default'
    const userLevel = process.env.VELA_PREF_LEVEL ?? 'laie'
    const ctxStats = analyzeContext(body.messages, activeSystemPrompt, model)
    const ctxWarning = getContextWarningMessage(ctxStats, userLevel)

    // T-08: Checkpoint-Check (nur bei erster Nachricht einer Session)
    let checkpointNotice = ''
    if (body.messages.length === 1 && body.messages[0]?.role === 'user') {
      if (hasActiveCheckpoint()) {
        const cp = loadCheckpoint()
        if (cp) checkpointNotice = getCheckpointResumeMessage(cp, userLevel)
      }
    }

    // Prepend notices to text if present
    let finalText = text
    if (checkpointNotice) finalText = checkpointNotice + '\n\n' + finalText
    if (ctxWarning) finalText = finalText + '\n\n---\n' + ctxWarning

    // Build activity entry
    let activity: ActivityEntry
    if (skillUsed === 'web-search' && searchQuery) {
      activity = { icon: '🔍', description: 'Web-Suche: ' + searchQuery, status: 'done' }
    } else {
      activity = { icon: '💬', description: 'Chat: ' + userMessageText.slice(0, 40), status: 'done' }
    }

    const responseBody = JSON.stringify({ text: finalText, skillUsed, activity, contextStats: ctxStats })
    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Length', Buffer.byteLength(responseBody))
      .header('Transfer-Encoding', '')
      .send(responseBody)
  })
}
