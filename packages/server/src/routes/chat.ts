import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { buildSystemPrompt }  from '../prompts/builder.js'
import { getAdapter }         from '../ai/registry.js'
import { analyzeContext, getContextWarningMessage } from '../utils/context.js'
import { loadCheckpoint, hasActiveCheckpoint, getCheckpointResumeMessage } from '../utils/checkpoint.js'
import { checkDiskStorage, checkRamUsage, getStorageWarningMessage } from '../utils/storage-monitor.js'
import { webSearchSkill }     from '../skills/web-search.js'
import { getDb } from '../db/database.js'
import { detectTopicFromText, isTopic, TOPIC_MODULES, type Topic } from '../prompts/topics.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
  stream: z.boolean().optional().default(false),
  userId: z.string().optional(),
  channelId: z.string().optional(),
  explicitTopic: z.string().optional(),
})

interface ActivityEntry { icon: string; description: string; status: string }

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

function resolveTopic(userId: string | undefined, channelId: string | undefined, explicitTopic: string | undefined, userText: string): { topic: Topic | null; needsNeutralQuestion: boolean } {
  if (explicitTopic && isTopic(explicitTopic)) {
    return { topic: explicitTopic, needsNeutralQuestion: false }
  }

  if (userId && channelId) {
    const db = getDb()
    const row = db.prepare('SELECT active_topic FROM conversation_scope WHERE user_id = ? AND channel_id = ?').get(userId, channelId) as { active_topic?: string } | undefined
    if (row?.active_topic && isTopic(row.active_topic)) {
      return { topic: row.active_topic, needsNeutralQuestion: false }
    }
  }

  const detected = detectTopicFromText(userText)
  if (detected) return { topic: detected, needsNeutralQuestion: false }

  return { topic: null, needsNeutralQuestion: userText.trim().length > 0 }
}

function persistScope(userId: string | undefined, channelId: string | undefined, topic: Topic | null): void {
  if (!userId || !channelId || !topic) return
  const db = getDb()
  db.prepare(`
    INSERT INTO conversation_scope (user_id, channel_id, active_topic)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, channel_id)
    DO UPDATE SET active_topic = excluded.active_topic, updated_at = datetime('now')
  `).run(userId, channelId, topic)
}

function withTopicPrompt(basePrompt: string, topic: Topic | null): string {
  if (!topic) return basePrompt
  const module = TOPIC_MODULES[topic]
  return `${basePrompt}\n\nAktives Thema: ${module.label}\nThemenkontext: ${module.systemContext}\nGrenzen: ${module.boundaries.join(' | ')}`
}

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/health', async (_req, reply) => {
    const adapter = getAdapter()
    const available = await adapter.isAvailable().catch(() => false)
    const body = JSON.stringify({ status: 'ok', version: '0.1.0', backend: adapter.name, backendAvailable: available })
    return reply.code(200).header('Content-Type', 'application/json').header('Content-Length', Buffer.byteLength(body)).send(body)
  })

  fastify.post('/api/chat/stream', async (request, reply) => {
    const body = ChatRequestSchema.parse(request.body)
    const adapter = getAdapter()

    const userLevel = process.env.VELA_PREF_LEVEL ?? 'laie'
    const baseSystemPrompt = buildSystemPrompt({
      language: process.env.VELA_PREF_LANGUAGE ?? 'Deutsch',
      tone: process.env.VELA_PREF_TONE ?? 'einfach',
      purpose: process.env.VELA_PREF_PURPOSE ?? 'alltag',
      level: userLevel as 'laie' | 'poweruser' | 'entwickler',
      backendMode: (process.env.VELA_BACKEND === 'groq' ? 'groq' : process.env.VELA_BACKEND === 'gemini' ? 'cloud' : process.env.VELA_BACKEND === 'local' ? 'local' : 'cloud') as 'local' | 'groq' | 'cloud',
    })

    const lastUser = [...body.messages].reverse().find(m => m.role === 'user')
    const userText = lastUser?.content ?? ''
    const topicResolution = resolveTopic(body.userId, body.channelId, body.explicitTopic, userText)
    persistScope(body.userId, body.channelId, topicResolution.topic)

    let activePrompt = withTopicPrompt(baseSystemPrompt, topicResolution.topic)

    const searchQ = needsWebSearch(userText)
    if (searchQ) {
      try {
        const sr = await webSearchSkill.execute({ query: searchQ })
        if (sr.success && sr.summary !== 'Keine direkte Antwort gefunden') {
          activePrompt += `\n\nAktuelle Web-Suchergebnisse für "${searchQ}":\n${sr.summary}`
        }
      } catch { /* ignore */ }
    }

    let checkpointNotice = ''
    if (body.messages.length === 1 && body.messages[0]?.role === 'user' && hasActiveCheckpoint()) {
      const cp = loadCheckpoint()
      if (cp) checkpointNotice = getCheckpointResumeMessage(cp, userLevel)
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    try {
      if (checkpointNotice) sendEvent('checkpoint', { text: checkpointNotice })

      if (adapter.stream) {
        let fullText = ''
        for await (const chunk of adapter.stream(body.messages, activePrompt, { maxTokens: 1024 })) {
          fullText += chunk
          sendEvent('chunk', { text: chunk })
        }

        if (topicResolution.needsNeutralQuestion && !topicResolution.topic) {
          fullText = `Bevor ich rate: Soll ich unter Terminassistenz, Ernährung oder Alltag antworten?\n\n${fullText}`
        }

        const ctxStats = analyzeContext(body.messages, activePrompt, process.env.DEFAULT_MODEL ?? 'default')
        const ctxWarn = getContextWarningMessage(ctxStats, userLevel)
        const disk = checkDiskStorage(userLevel)
        const ram = checkRamUsage()
        const storageWarn = getStorageWarningMessage(disk, ram, userLevel)

        sendEvent('done', {
          text: fullText,
          activeTopic: topicResolution.topic,
          starterSuggestions: topicResolution.topic ? TOPIC_MODULES[topicResolution.topic].starterSuggestions : [],
          contextStats: ctxStats,
          warnings: [ctxWarn, storageWarn].filter(Boolean),
        })
      } else {
        const result = adapter.chatWithUsage
          ? await adapter.chatWithUsage(body.messages, activePrompt, { maxTokens: 1024 })
          : { text: await adapter.chat(body.messages, activePrompt, { maxTokens: 1024 }) }

        let text = result.text
        if (topicResolution.needsNeutralQuestion && !topicResolution.topic) {
          text = `Bevor ich rate: Soll ich unter Terminassistenz, Ernährung oder Alltag antworten?\n\n${text}`
        }

        sendEvent('chunk', { text })
        sendEvent('done', {
          text,
          activeTopic: topicResolution.topic,
          starterSuggestions: topicResolution.topic ? TOPIC_MODULES[topicResolution.topic].starterSuggestions : [],
          tokenUsage: result.tokenUsage,
        })
      }
    } catch (err: unknown) {
      sendEvent('error', { message: err instanceof Error ? err.message : 'Unbekannter Fehler' })
    }

    reply.raw.end()
  })

  fastify.post('/api/chat', async (request, reply) => {
    const body = ChatRequestSchema.parse(request.body)
    const adapter = getAdapter()
    const userLevel = process.env.VELA_PREF_LEVEL ?? 'laie'

    const vars: Parameters<typeof buildSystemPrompt>[0] = {
      language: process.env.VELA_PREF_LANGUAGE ?? 'Deutsch',
      tone: process.env.VELA_PREF_TONE ?? 'einfach',
      purpose: process.env.VELA_PREF_PURPOSE ?? 'alltag',
      level: userLevel as 'laie' | 'poweruser' | 'entwickler',
      backendMode: (process.env.VELA_BACKEND === 'groq' ? 'groq' : process.env.VELA_BACKEND === 'local' ? 'local' : 'cloud') as 'local' | 'groq' | 'cloud',
    }
    if (process.env.VELA_PREF_NAME) vars.name = process.env.VELA_PREF_NAME
    if (process.env.DEFAULT_MODEL) vars.backendModel = process.env.DEFAULT_MODEL

    const basePrompt = process.env.VELA_SYSTEM_PROMPT ? process.env.VELA_SYSTEM_PROMPT : buildSystemPrompt(vars)

    const lastUser = [...body.messages].reverse().find(m => m.role === 'user')
    const userText = lastUser?.content ?? ''

    const topicResolution = resolveTopic(body.userId, body.channelId, body.explicitTopic, userText)
    persistScope(body.userId, body.channelId, topicResolution.topic)

    let activePrompt = withTopicPrompt(basePrompt, topicResolution.topic)

    const searchQ = needsWebSearch(userText)
    let skillUsed: string | null = null

    if (searchQ) {
      try {
        const sr = await webSearchSkill.execute({ query: searchQ })
        if (sr.success && sr.summary !== 'Keine direkte Antwort gefunden') {
          activePrompt += `\n\nAktuelle Web-Suchergebnisse für "${searchQ}":\n${sr.summary}`
          skillUsed = 'web-search'
        }
      } catch { /* ignore */ }
    }

    let text: string
    let tokenUsage = undefined

    try {
      if (adapter.chatWithUsage) {
        const result = await adapter.chatWithUsage(body.messages, activePrompt, { maxTokens: 1024 })
        text = result.text
        tokenUsage = result.tokenUsage
      } else {
        text = await adapter.chat(body.messages, activePrompt, { maxTokens: 1024 })
      }
    } catch (err: unknown) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Fehler' })
    }

    const ctxStats = analyzeContext(body.messages, activePrompt, process.env.DEFAULT_MODEL ?? 'default', tokenUsage)
    const ctxWarn = getContextWarningMessage(ctxStats, userLevel)
    const disk = checkDiskStorage(userLevel)
    const ram = checkRamUsage()
    const storageWarn = getStorageWarningMessage(disk, ram, userLevel)

    let checkpointNotice = ''
    if (body.messages.length === 1 && body.messages[0]?.role === 'user' && hasActiveCheckpoint()) {
      const cp = loadCheckpoint()
      if (cp) checkpointNotice = getCheckpointResumeMessage(cp, userLevel)
    }

    let finalText = text
    if (topicResolution.needsNeutralQuestion && !topicResolution.topic) {
      finalText = `Bevor ich rate: Soll ich unter Terminassistenz, Ernährung oder Alltag antworten?\n\n${finalText}`
    }
    if (checkpointNotice) finalText = checkpointNotice + '\n\n' + finalText
    if (ctxWarn) finalText = finalText + '\n\n---\n' + ctxWarn
    if (storageWarn) finalText = finalText + '\n\n⚠️ ' + storageWarn

    const activity: ActivityEntry = skillUsed === 'web-search' && searchQ
      ? { icon: '🔍', description: 'Web-Suche: ' + searchQ, status: 'done' }
      : { icon: '💬', description: 'Chat: ' + userText.slice(0, 40), status: 'done' }

    const responseBody = JSON.stringify({
      text: finalText,
      skillUsed,
      activity,
      activeTopic: topicResolution.topic,
      starterSuggestions: topicResolution.topic ? TOPIC_MODULES[topicResolution.topic].starterSuggestions : [],
      contextStats: ctxStats,
      tokenUsage,
    })

    return reply.code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Length', Buffer.byteLength(responseBody))
      .send(responseBody)
  })
}
