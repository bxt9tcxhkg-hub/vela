import type { FastifyInstance } from 'fastify'
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
}

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/settings', async (_req, reply) => {
    const body = JSON.stringify({
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      velaName: process.env.VELA_NAME ?? 'Vela',
      systemPrompt: process.env.VELA_SYSTEM_PROMPT ?? '',
      hasGmailConfig: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN),
    })
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .header('Transfer-Encoding', '')
      .send(body)
  })

  fastify.post<{ Body: SettingsBody }>('/api/settings', async (req, reply) => {
    const { anthropicKey, model, systemPrompt, velaName, googleClientId, googleClientSecret, googleRefreshToken } = req.body ?? {}

    if (anthropicKey?.trim()) {
      writeEnvKey('ANTHROPIC_API_KEY', anthropicKey.trim())
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

    const body = JSON.stringify({ ok: true })
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .header('Transfer-Encoding', '')
      .send(body)
  })
}
