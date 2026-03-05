import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(__dirname, '../../.env')

function writeEnvKey(key: string, value: string): void {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : ''
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`)
  } else {
    content += `\n${key}=${value}`
  }
  writeFileSync(ENV_PATH, content.trim() + '\n', 'utf-8')
  // Also update process.env immediately
  process.env[key] = value
}

interface SettingsBody {
  anthropicKey?: string
  openaiKey?: string
  model?: string
  systemPrompt?: string
  velaName?: string
  googleClientId?: string
  googleClientSecret?: string
  googleRefreshToken?: string
  language?: string
  groqKey?: string
}

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/settings', async (_req, reply) => {
    const body = JSON.stringify({
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      velaName: process.env.VELA_NAME ?? 'Vela',
      systemPrompt: process.env.VELA_SYSTEM_PROMPT ?? '',
      hasGmailConfig: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN),
      hasGroqKey: Boolean(process.env.GROQ_API_KEY),
      language: (db.prepare("SELECT value FROM settings WHERE key='language'").get() as { value?: string } | undefined)?.value ?? 'auto',
    })
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .header('Transfer-Encoding', '')
      .send(body)
  })

  fastify.post<{ Body: { provider: 'anthropic' | 'openai' | 'groq'; apiKey: string } }>(
    '/api/settings/test-cloud-key',
    async (req, reply) => {
      const provider = req.body?.provider
      const apiKey = req.body?.apiKey?.trim()
      if (!provider || !apiKey) return reply.code(400).send({ ok: false, message: 'Provider und API-Key sind erforderlich.' })

      try {
        let res: Response

        if (provider === 'anthropic') {
          res = await fetch('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          })
        } else if (provider === 'openai') {
          res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
        } else {
          res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
        }

        if (!res.ok) {
          const text = await res.text()
          const detail = text.slice(0, 300)
          return reply.code(400).send({ ok: false, message: `Verbindung fehlgeschlagen (${provider}): ${res.status} ${detail}` })
        }

        return reply.send({ ok: true, message: 'API-Key gültig. Verbindung erfolgreich.' })
      } catch (err) {
        return reply.code(500).send({ ok: false, message: err instanceof Error ? err.message : 'Netzwerkfehler beim Verbindungstest' })
      }
    },
  )

  fastify.post<{ Body: SettingsBody }>('/api/settings', async (req, reply) => {
    const { anthropicKey, openaiKey, model, systemPrompt, velaName, googleClientId, googleClientSecret, googleRefreshToken, language, groqKey } = req.body ?? {}

    if (anthropicKey?.trim()) {
      writeEnvKey('ANTHROPIC_API_KEY', anthropicKey.trim())
    }
    if (openaiKey?.trim()) {
      writeEnvKey('OPENAI_API_KEY', openaiKey.trim())
    }
    if (model?.trim()) {
      writeEnvKey('DEFAULT_MODEL', model.trim())
    }
    if (systemPrompt !== undefined && systemPrompt.trim()) {
      writeEnvKey('VELA_SYSTEM_PROMPT', systemPrompt.trim())
    }
    if (velaName?.trim()) {
      writeEnvKey('VELA_NAME', velaName.trim())
    }
    if (googleClientId?.trim()) {
      writeEnvKey('GOOGLE_CLIENT_ID', googleClientId.trim())
    }
    if (googleClientSecret?.trim()) {
      writeEnvKey('GOOGLE_CLIENT_SECRET', googleClientSecret.trim())
    }
    if (googleRefreshToken?.trim()) {
      writeEnvKey('GOOGLE_REFRESH_TOKEN', googleRefreshToken.trim())
    }
    if (groqKey?.trim()) {
      writeEnvKey('GROQ_API_KEY', groqKey.trim())
    }
    if (language !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('language', ?)").run(language)
    }

    const body = JSON.stringify({ ok: true })
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .header('Transfer-Encoding', '')
      .send(body)
  })
}
