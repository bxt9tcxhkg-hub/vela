// Multi-Channel – Discord & Telegram Integration
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'

db.exec(`
  CREATE TABLE IF NOT EXISTS channel_configs (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    type       TEXT NOT NULL,
    name       TEXT NOT NULL,
    token      TEXT NOT NULL,
    chat_id    TEXT,
    enabled    INTEGER NOT NULL DEFAULT 1,
    webhook_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
  return res.json()
}

async function sendDiscordMessage(webhookUrl: string, text: string) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text }),
  })
  return res.ok
}

export async function channelRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/api/channels', async (_req, reply) => {
    const rows = db.prepare('SELECT id, type, name, enabled, chat_id, created_at FROM channel_configs ORDER BY created_at DESC').all()
    return reply.send({ channels: rows })
  })

  fastify.post<{ Body: { type: 'telegram' | 'discord'; name: string; token: string; chatId?: string; webhookUrl?: string } }>(
    '/api/channels',
    async (req, reply) => {
      const { type, name, token, chatId, webhookUrl } = req.body
      db.prepare('INSERT INTO channel_configs (type, name, token, chat_id, webhook_url) VALUES (?,?,?,?,?)').run(
        type, name, token, chatId ?? null, webhookUrl ?? null
      )
      return reply.code(201).send({ ok: true })
    }
  )

  fastify.patch<{ Params: { id: string }; Body: { enabled: boolean } }>(
    '/api/channels/:id',
    async (req, reply) => {
      db.prepare('UPDATE channel_configs SET enabled = ? WHERE id = ?').run(req.body.enabled ? 1 : 0, req.params.id)
      return reply.send({ ok: true })
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/channels/:id',
    async (req, reply) => {
      db.prepare('DELETE FROM channel_configs WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )

  // Test channel
  fastify.post<{ Params: { id: string }; Body: { message?: string } }>(
    '/api/channels/:id/test',
    async (req, reply) => {
      const ch = db.prepare('SELECT * FROM channel_configs WHERE id = ?').get(req.params.id) as
        { type: string; token: string; chat_id: string | null; webhook_url: string | null } | undefined
      if (!ch) return reply.code(404).send({ error: 'Kanal nicht gefunden' })

      const testMsg = req.body.message ?? '✦ Vela-Test: Verbindung erfolgreich!'

      if (ch.type === 'telegram' && ch.chat_id) {
        const result = await sendTelegramMessage(ch.token, ch.chat_id, testMsg)
        return reply.send({ ok: true, result })
      } else if (ch.type === 'discord' && ch.webhook_url) {
        const ok = await sendDiscordMessage(ch.webhook_url, testMsg)
        return reply.send({ ok })
      }
      return reply.code(400).send({ error: 'Konfiguration unvollständig' })
    }
  )

  // Broadcast message to all enabled channels
  fastify.post<{ Body: { message: string } }>(
    '/api/channels/broadcast',
    async (req, reply) => {
      const channels = db.prepare('SELECT * FROM channel_configs WHERE enabled = 1').all() as
        { type: string; token: string; chat_id: string | null; webhook_url: string | null }[]

      let sent = 0
      for (const ch of channels) {
        try {
          if (ch.type === 'telegram' && ch.chat_id) {
            await sendTelegramMessage(ch.token, ch.chat_id, req.body.message)
            sent++
          } else if (ch.type === 'discord' && ch.webhook_url) {
            await sendDiscordMessage(ch.webhook_url, req.body.message)
            sent++
          }
        } catch { /* ignore individual failures */ }
      }
      return reply.send({ sent, total: channels.length })
    }
  )

  // Telegram webhook receiver (inbound messages)
  fastify.post<{ Params: { token: string } }>(
    '/api/channels/telegram/webhook/:token',
    async (req, reply) => {
      const body = req.body as { message?: { chat: { id: number }; text?: string } }
      const msg = body.message
      if (!msg?.text) return reply.send({ ok: true })

      // Route through Vela chat
      try {
        const chatRes = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: msg.text }] }),
        })
        const data = await chatRes.json() as { text?: string }

        const ch = db.prepare('SELECT * FROM channel_configs WHERE type = "telegram" AND token = ?').get(req.params.token) as
          { token: string } | undefined
        if (ch) await sendTelegramMessage(req.params.token, String(msg.chat.id), data.text ?? 'Keine Antwort')
      } catch { /* ignore */ }

      return reply.send({ ok: true })
    }
  )
}
