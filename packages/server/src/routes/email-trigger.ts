// Email Inbound Trigger – IMAP-Polling → Vela Chat
// Config via env: EMAIL_TRIGGER_HOST, EMAIL_TRIGGER_USER, EMAIL_TRIGGER_PASS
//                 EMAIL_TRIGGER_PORT (default 993), EMAIL_TRIGGER_TLS (default true)
import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import imapSimple from 'imap-simple'
import crypto from 'node:crypto'

const TRIGGER_HOST = process.env.EMAIL_TRIGGER_HOST
const TRIGGER_USER = process.env.EMAIL_TRIGGER_USER
const TRIGGER_PASS = process.env.EMAIL_TRIGGER_PASS
const TRIGGER_PORT = parseInt(process.env.EMAIL_TRIGGER_PORT ?? '993', 10)
const TRIGGER_TLS  = process.env.EMAIL_TRIGGER_TLS !== 'false'

const triggerEnabled = Boolean(TRIGGER_HOST && TRIGGER_USER && TRIGGER_PASS)

let pollingInterval: ReturnType<typeof setInterval> | null = null

async function pollEmails(): Promise<number> {
  if (!triggerEnabled) return 0

  const connection = await imapSimple.connect({
    imap: {
      host:     TRIGGER_HOST!,
      user:     TRIGGER_USER!,
      password: TRIGGER_PASS!,
      port:     TRIGGER_PORT,
      tls:      TRIGGER_TLS,
      authTimeout: 10000,
    },
  })

  await connection.openBox('INBOX')
  const messages = await connection.search(['UNSEEN'], {
    bodies: ['HEADER.FIELDS (FROM SUBJECT)', 'TEXT'],
    markSeen: true,
  })

  let processed = 0
  for (const msg of messages) {
    const headerPart = msg.parts.find(p => p.which === 'HEADER.FIELDS (FROM SUBJECT)')
    const bodyPart   = msg.parts.find(p => p.which === 'TEXT')

    const from    = headerPart?.body?.from?.[0] ?? 'unknown'
    const subject = headerPart?.body?.subject?.[0] ?? '(kein Betreff)'
    const body    = typeof bodyPart?.body === 'string' ? bodyPart.body.slice(0, 2000) : ''

    const prompt = `E-Mail von: ${from}\nBetreff: ${subject}\n\n${body}`

    let velaResponse = ''
    try {
      const chatRes = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await chatRes.json() as { text?: string }
      velaResponse = data.text ?? ''
    } catch { /* ignore chat errors */ }

    db.prepare(`
      INSERT INTO email_trigger_log (id, from_addr, subject, body_preview, vela_response)
      VALUES (?,?,?,?,?)
    `).run(crypto.randomUUID(), from, subject, body.slice(0, 500), velaResponse)

    processed++
  }

  await connection.end()
  return processed
}

export async function emailTriggerRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/api/email-trigger/config', async (_req, reply) => {
    return reply.send({
      enabled: triggerEnabled,
      host:    TRIGGER_HOST ?? null,
      user:    TRIGGER_USER ?? null,
    })
  })

  fastify.post('/api/email-trigger/poll', async (_req, reply) => {
    if (!triggerEnabled) return reply.code(503).send({ error: 'Email-Trigger nicht konfiguriert.' })
    try {
      const processed = await pollEmails()
      return reply.send({ processed })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'IMAP-Verbindung fehlgeschlagen.' })
    }
  })

  fastify.post('/api/email-trigger/start', async (_req, reply) => {
    if (!triggerEnabled) return reply.code(503).send({ error: 'Email-Trigger nicht konfiguriert.' })
    if (pollingInterval) return reply.send({ ok: true, message: 'Polling läuft bereits.' })

    pollingInterval = setInterval(async () => {
      try { await pollEmails() } catch { /* ignore */ }
    }, 5 * 60 * 1000)

    return reply.send({ ok: true, message: 'Polling gestartet (alle 5 Minuten).' })
  })

  fastify.post('/api/email-trigger/stop', async (_req, reply) => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    return reply.send({ ok: true, message: 'Polling gestoppt.' })
  })
}
