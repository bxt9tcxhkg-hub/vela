// Email Inbound Trigger – IMAP polling that routes emails through Vela chat
// Config via env vars: EMAIL_TRIGGER_HOST, EMAIL_TRIGGER_USER, EMAIL_TRIGGER_PASS,
//                      EMAIL_TRIGGER_PORT (default 993), EMAIL_TRIGGER_TLS (default true)
import type { FastifyInstance } from 'fastify'
import { getDb } from '../db/database.js'

function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_TRIGGER_HOST && process.env.EMAIL_TRIGGER_USER && process.env.EMAIL_TRIGGER_PASS)
}

function getImapConfig() {
  return {
    imap: {
      host: process.env.EMAIL_TRIGGER_HOST!,
      user: process.env.EMAIL_TRIGGER_USER!,
      password: process.env.EMAIL_TRIGGER_PASS!,
      port: parseInt(process.env.EMAIL_TRIGGER_PORT || '993', 10),
      tls: process.env.EMAIL_TRIGGER_TLS !== 'false',
      authTimeout: 10000,
    },
  }
}

let pollingInterval: ReturnType<typeof setInterval> | null = null

async function pollEmails(fastify: FastifyInstance): Promise<number> {
  const imapSimple = await import('imap-simple')
  const db = getDb()
  const config = getImapConfig()

  const connection = await imapSimple.connect(config)
  await connection.openBox('INBOX')

  const searchCriteria = ['UNSEEN']
  const fetchOptions = {
    bodies: ['HEADER.FIELDS (FROM SUBJECT)', 'TEXT'],
    markSeen: true,
  }

  const messages = await connection.search(searchCriteria, fetchOptions)
  let processed = 0

  for (const msg of messages) {
    const headerPart = msg.parts.find((p: any) => p.which === 'HEADER.FIELDS (FROM SUBJECT)')
    const bodyPart = msg.parts.find((p: any) => p.which === 'TEXT')

    const from = headerPart?.body?.from?.[0] || 'unknown'
    const subject = headerPart?.body?.subject?.[0] || '(no subject)'
    const bodyText: string = bodyPart?.body || ''
    const bodyPreview = bodyText.slice(0, 500)

    // Route through Vela chat via internal fetch
    let velaResponse: string | null = null
    try {
      const serverUrl = `http://localhost:${process.env.PORT || 3000}`
      const resp = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: `Email from: ${from}\nSubject: ${subject}\n\n${bodyText.slice(0, 2000)}` },
          ],
          stream: false,
        }),
      })
      const data = await resp.json() as any
      velaResponse = data?.content || data?.message || JSON.stringify(data)
    } catch (e: any) {
      velaResponse = `Error routing to chat: ${e?.message}`
    }

    db.prepare(`
      INSERT INTO email_trigger_log (id, from_addr, subject, body_preview, vela_response)
      VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?)
    `).run(from, subject, bodyPreview, velaResponse)

    processed++
  }

  connection.end()
  return processed
}

export async function emailTriggerRoutes(fastify: FastifyInstance) {
  // GET /api/email-trigger/config
  fastify.get('/api/email-trigger/config', async (_request, reply) => {
    return reply.send({
      enabled: isEmailConfigured(),
      host: process.env.EMAIL_TRIGGER_HOST || null,
      user: process.env.EMAIL_TRIGGER_USER || null,
    })
  })

  // POST /api/email-trigger/poll
  fastify.post('/api/email-trigger/poll', async (_request, reply) => {
    if (!isEmailConfigured()) {
      return reply.code(503).send({ error: 'Email trigger not configured' })
    }
    try {
      const processed = await pollEmails(fastify)
      return reply.send({ processed })
    } catch (err: any) {
      return reply.code(500).send({ error: 'Poll failed', detail: err?.message })
    }
  })

  // POST /api/email-trigger/start
  fastify.post('/api/email-trigger/start', async (_request, reply) => {
    if (!isEmailConfigured()) {
      return reply.code(503).send({ error: 'Email trigger not configured' })
    }
    if (pollingInterval) {
      return reply.send({ message: 'Already polling' })
    }
    // Poll immediately, then every 5 minutes
    pollEmails(fastify).catch((e) => fastify.log.error('Email poll error: ' + e?.message))
    pollingInterval = setInterval(() => {
      pollEmails(fastify).catch((e) => fastify.log.error('Email poll error: ' + e?.message))
    }, 5 * 60 * 1000)
    return reply.send({ message: 'Polling started (every 5 minutes)' })
  })

  // POST /api/email-trigger/stop
  fastify.post('/api/email-trigger/stop', async (_request, reply) => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
      return reply.send({ message: 'Polling stopped' })
    }
    return reply.send({ message: 'Not polling' })
  })
}
