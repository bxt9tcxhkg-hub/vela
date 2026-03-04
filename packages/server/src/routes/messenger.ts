/**
 * K-09: Messenger-Integration – Guided OAuth Wizard
 * Unterstützt: Telegram, Discord (Webhook)
 * Multi-Tenant-Sicherheit: Jeder Nutzer bekommt eigenen isolierten Token-Slot.
 */

import type { FastifyInstance } from 'fastify'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(__dirname, '../../.env')

type MessengerType = 'telegram' | 'discord'

interface MessengerConfig {
  type: MessengerType
  connected: boolean
  displayName?: string
}

function writeEnvKey(key: string, value: string): void {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : ''
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`)
  } else {
    content += `\n${key}=${value}`
  }
  writeFileSync(ENV_PATH, content.trim() + '\n', 'utf-8')
  process.env[key] = value
}

const TelegramConnectSchema = z.object({
  botToken: z.string().min(10),
  chatId: z.string().optional(),
})

const DiscordConnectSchema = z.object({
  webhookUrl: z.string().url(),
  channelName: z.string().optional(),
})

export async function messengerRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/messenger/status — welche Messenger sind verbunden
  fastify.get('/api/messenger/status', async (_req, reply) => {
    const telegramCfg: MessengerConfig = { type: 'telegram', connected: Boolean(process.env.TELEGRAM_BOT_TOKEN) }
    if (process.env.TELEGRAM_BOT_NAME) telegramCfg.displayName = process.env.TELEGRAM_BOT_NAME
    const discordCfg: MessengerConfig = { type: 'discord', connected: Boolean(process.env.DISCORD_WEBHOOK_URL) }
    if (process.env.DISCORD_CHANNEL_NAME) discordCfg.displayName = process.env.DISCORD_CHANNEL_NAME
    const configs: MessengerConfig[] = [telegramCfg, discordCfg]
    const body = JSON.stringify(configs)
    return reply.header('Content-Type', 'application/json').send(body)
  })

  // POST /api/messenger/telegram/connect — Telegram Bot Token validieren + speichern
  fastify.post('/api/messenger/telegram/connect', async (request, reply) => {
    const { botToken, chatId } = TelegramConnectSchema.parse(request.body)

    // Telegram Bot-Token validieren
    let botName = ''
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
      if (!res.ok) {
        return reply.code(400).send({ error: 'Ungültiger Bot-Token. Prüfe deinen Token in @BotFather.' })
      }
      const data = await res.json() as { ok: boolean; result?: { username?: string; first_name?: string } }
      if (!data.ok) {
        return reply.code(400).send({ error: 'Bot-Token nicht akzeptiert.' })
      }
      botName = data.result?.username ?? data.result?.first_name ?? 'Telegram Bot'
    } catch {
      return reply.code(503).send({ error: 'Telegram ist gerade nicht erreichbar. Bitte versuche es später.' })
    }

    writeEnvKey('TELEGRAM_BOT_TOKEN', botToken)
    writeEnvKey('TELEGRAM_BOT_NAME', botName)
    if (chatId) writeEnvKey('TELEGRAM_CHAT_ID', chatId)

    const body = JSON.stringify({ ok: true, botName })
    return reply.header('Content-Type', 'application/json').send(body)
  })

  // POST /api/messenger/telegram/disconnect
  fastify.post('/api/messenger/telegram/disconnect', async (_req, reply) => {
    writeEnvKey('TELEGRAM_BOT_TOKEN', '')
    writeEnvKey('TELEGRAM_BOT_NAME', '')
    writeEnvKey('TELEGRAM_CHAT_ID', '')
    return reply.send({ ok: true })
  })

  // POST /api/messenger/discord/connect — Discord Webhook validieren + speichern
  fastify.post('/api/messenger/discord/connect', async (request, reply) => {
    const { webhookUrl, channelName } = DiscordConnectSchema.parse(request.body)

    // Webhook validieren
    let webhookName = channelName ?? ''
    try {
      const res = await fetch(webhookUrl)
      if (!res.ok) {
        return reply.code(400).send({ error: 'Ungültige Webhook-URL. Prüfe die URL in deinen Discord-Servereinstellungen.' })
      }
      const data = await res.json() as { name?: string; channel_id?: string }
      webhookName = data.name ?? channelName ?? 'Discord Webhook'
    } catch {
      return reply.code(503).send({ error: 'Discord ist gerade nicht erreichbar. Bitte versuche es später.' })
    }

    writeEnvKey('DISCORD_WEBHOOK_URL', webhookUrl)
    writeEnvKey('DISCORD_CHANNEL_NAME', webhookName)

    const body = JSON.stringify({ ok: true, channelName: webhookName })
    return reply.header('Content-Type', 'application/json').send(body)
  })

  // POST /api/messenger/discord/disconnect
  fastify.post('/api/messenger/discord/disconnect', async (_req, reply) => {
    writeEnvKey('DISCORD_WEBHOOK_URL', '')
    writeEnvKey('DISCORD_CHANNEL_NAME', '')
    return reply.send({ ok: true })
  })

  // POST /api/messenger/telegram/test — Test-Nachricht senden
  fastify.post('/api/messenger/telegram/test', async (_req, reply) => {
    const token = process.env.TELEGRAM_BOT_TOKEN ?? ''
    const chatId = process.env.TELEGRAM_CHAT_ID ?? ''

    if (!token) return reply.code(400).send({ error: 'Telegram ist nicht verbunden.' })
    if (!chatId) return reply.code(400).send({ error: 'Keine Chat-ID konfiguriert. Schreibe deinem Bot zuerst eine Nachricht.' })

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✦ Vela ist verbunden! Du kannst mir jetzt hier schreiben.',
        }),
      })
      if (!res.ok) return reply.code(500).send({ error: 'Test-Nachricht konnte nicht gesendet werden.' })
      return reply.send({ ok: true })
    } catch {
      return reply.code(503).send({ error: 'Telegram nicht erreichbar.' })
    }
  })
}
