import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { config } from '../config.js'
import { webSearchSkill } from '../skills/web-search.js'
import { chatOllama, isOllamaAvailable, listOllamaModels } from '../ai/ollama.js'
import { AgentPlanner } from '@vela/core'
import { chatGemini } from '../ai/gemini.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages:  z.array(MessageSchema),
  model:     z.string().optional(),   // 'ollama', 'claude', 'openai'
  provider:  z.string().optional(),   // expliziter Provider-Override
})

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

function getSystemPrompt(): string {
  return (
    process.env.VELA_SYSTEM_PROMPT ??
    `Du bist ${process.env.VELA_NAME ?? 'Vela'}, ein persönlicher KI-Assistent. ` +
    `Du bist hilfsbereit, präzise und antwortest auf Deutsch. ` +
    `Du handelst niemals ohne Bestätigung des Nutzers bei wichtigen Aktionen.`
  )
}

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {

  // ─── Health ──────────────────────────────────────────────────────────────
  fastify.get('/api/health', async (_req, reply) => {
    const ollamaOk = await isOllamaAvailable()
    const body = JSON.stringify({
      status:  'ok',
      version: '0.1.0',
      ollama:  ollamaOk,
    })
    return reply.code(200).header('Content-Type', 'application/json').send(body)
  })

  // ─── Ollama-Status & Modelle ──────────────────────────────────────────────
  fastify.get('/api/ollama/status', async (_req, reply) => {
    const available = await isOllamaAvailable()
    const models    = available ? await listOllamaModels() : []
    return reply.code(200).send({ available, models })
  })

  // ─── Chat ─────────────────────────────────────────────────────────────────
  fastify.post('/api/chat', async (request, reply) => {
    const body     = ChatRequestSchema.parse(request.body)
    const provider = body.provider ?? body.model ?? 'ollama'

    const lastUser     = [...body.messages].reverse().find(m => m.role === 'user')
    const userText     = lastUser?.content ?? ''
    const searchQuery  = needsWebSearch(userText)
    let   systemPrompt = getSystemPrompt()
    let   skillUsed: string | null = null

    // ── Agent Planner: Skills erkennen ──────────────────────────────────
    const planner = new AgentPlanner({ verbose: true })
    const coreMessages = body.messages.map((m, i) => ({
      id: String(i), role: m.role as 'user' | 'assistant', content: m.content, timestamp: new Date(),
    }))
    const plannedActions = await planner.plan(userText, coreMessages)
    const highRiskAction = plannedActions.find(a => a.riskLevel === 'high' && a.requiresConfirmation)
    if (highRiskAction) {
      return reply.code(202).send({
        requiresConfirmation: true,
        action: { id: highRiskAction.id, description: highRiskAction.description, riskLevel: highRiskAction.riskLevel },
      })
    }

    // Web-Search-Kontext einfügen
    if (searchQuery) {
      try {
        const result = await webSearchSkill.execute({ query: searchQuery })
        if (result.success && result.summary !== 'Keine direkte Antwort gefunden') {
          systemPrompt += `\n\nAktuelle Web-Suchergebnisse für "${searchQuery}":\n${result.summary}`
          skillUsed = 'web-search'
        }
      } catch { /* ignorieren */ }
    }

    let text = ''

    // ── Ollama (lokal) ────────────────────────────────────────────────────
    if (provider === 'ollama' || provider === 'local') {
      const available = await isOllamaAvailable()
      if (!available) {
        return reply.code(503).send({
          error: 'Ollama-Dienst nicht erreichbar. Bitte Ollama starten: ollama serve',
          hint:  'Du kannst in den Einstellungen zum Cloud-Modus wechseln.',
        })
      }
      const model = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'
      text = await chatOllama(body.messages, model, systemPrompt)
    }

    // ── Anthropic Claude ──────────────────────────────────────────────────
    else if (provider === 'claude' || provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY ?? ''
      if (!apiKey) {
        return reply.code(400).send({ error: 'Kein Anthropic API-Key konfiguriert.' })
      }
      const client   = new Anthropic({ apiKey })
      const response = await client.messages.create({
        model:      process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   body.messages,
      })
      text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
    }

    // ── OpenAI ────────────────────────────────────────────────────────────
    else if (provider === 'openai' || provider === 'gpt') {
      const apiKey = process.env.OPENAI_API_KEY ?? ''
      if (!apiKey) {
        return reply.code(400).send({ error: 'Kein OpenAI API-Key konfiguriert.' })
      }
      const client   = new OpenAI({ apiKey })
      const response = await client.chat.completions.create({
        model:    'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...body.messages,
        ],
      })
      text = response.choices[0]?.message?.content ?? ''
    }

    // ── Google Gemini ─────────────────────────────────────────────────
    else if (provider === 'gemini' || provider === 'google') {
      const apiKey = process.env.GEMINI_API_KEY ?? ''
      if (!apiKey) {
        return reply.code(400).send({ error: 'Kein Google Gemini API-Key konfiguriert.' })
      }
      text = await chatGemini(body.messages, apiKey, undefined, systemPrompt)
    }

    else {
      return reply.code(400).send({ error: `Unbekannter Provider: ${provider}` })
    }

    const activity = skillUsed === 'web-search' && searchQuery
      ? { icon: '🔍', description: `Web-Suche: ${searchQuery}`, status: 'done' }
      : { icon: '💬', description: `Chat: ${userText.slice(0, 40)}`, status: 'done' }

    return reply.code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ text, skillUsed, provider, activity }))
  })
}
