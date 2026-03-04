// Email OAuth Routes – erweiterbare Provider-Architektur (Gmail zuerst)
// Token werden NIEMALS geloggt oder im Klartext gespeichert.
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import db from '../db/database.js'
import crypto from 'node:crypto'

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS email_connections (
    id           TEXT PRIMARY KEY,
    provider     TEXT NOT NULL,
    email        TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at   TEXT,
    scope        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const SaveTokenSchema = z.object({
  provider:     z.enum(['gmail', 'outlook']),
  email:        z.string().email(),
  accessToken:  z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt:    z.string().optional(),
  scope:        z.string().optional(),
})

interface ConnectionRow {
  id: string
  provider: string
  email: string
  expires_at: string | null
  scope: string | null
  created_at: string
}

export async function oauthRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Alle verbundenen Email-Accounts auflisten ─────────────────────────────
  fastify.get('/api/email/connections', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT id, provider, email, expires_at, scope, created_at
      FROM email_connections ORDER BY created_at DESC
    `).all() as ConnectionRow[]

    // Tokens NIEMALS zurückgeben
    return reply.send({ connections: rows })
  })

  // ── Token speichern (nach manuellem OAuth-Flow im Browser) ────────────────
  fastify.post('/api/email/connections', async (request, reply) => {
    const body = SaveTokenSchema.parse(request.body)

    // Prüfen ob schon verbunden
    const existing = db.prepare(
      'SELECT id FROM email_connections WHERE provider = ? AND email = ?'
    ).get(body.provider, body.email) as { id: string } | undefined

    const id = existing?.id ?? crypto.randomUUID()

    db.prepare(`
      INSERT OR REPLACE INTO email_connections
        (id, provider, email, access_token, refresh_token, expires_at, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      body.provider,
      body.email,
      body.accessToken,                   // gespeichert, nie geloggt
      body.refreshToken ?? null,
      body.expiresAt ?? null,
      body.scope ?? null,
    )

    console.log(`[OAuth] ${body.provider} verbunden: ${body.email}`)
    return reply.code(201).send({ id, provider: body.provider, email: body.email })
  })

  // ── Verbindung trennen ────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/api/email/connections/:id',
    async (request, reply) => {
      const { id } = request.params
      db.prepare('DELETE FROM email_connections WHERE id = ?').run(id)
      return reply.code(204).send()
    }
  )

  // ── Token für Skill-Nutzung abrufen (nur intern, kein Client-Zugriff) ─────
  fastify.get<{ Params: { provider: string } }>(
    '/api/email/token/:provider',
    async (request, reply) => {
      const row = db.prepare(`
        SELECT access_token, refresh_token, expires_at, email
        FROM email_connections WHERE provider = ? LIMIT 1
      `).get(request.params.provider) as {
        access_token: string
        refresh_token: string | null
        expires_at: string | null
        email: string
      } | undefined

      if (!row) {
        return reply.code(404).send({ error: `Kein ${request.params.provider}-Account verbunden.` })
      }

      // Refresh wenn abgelaufen (Gmail)
      if (request.params.provider === 'gmail' && row.refresh_token) {
        const expiresAt = row.expires_at ? new Date(row.expires_at) : null
        const needsRefresh = expiresAt ? expiresAt < new Date() : false

        if (needsRefresh) {
          const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''

          if (clientId && clientSecret) {
            try {
              const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id:     clientId,
                  client_secret: clientSecret,
                  refresh_token: row.refresh_token,
                  grant_type:    'refresh_token',
                }),
              })
              const data = await tokenRes.json() as { access_token?: string; expires_in?: number }
              if (data.access_token) {
                const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
                db.prepare(`
                  UPDATE email_connections
                  SET access_token = ?, expires_at = ?, updated_at = datetime('now')
                  WHERE provider = 'gmail' AND email = ?
                `).run(data.access_token, newExpiry, row.email)
                return reply.send({ accessToken: data.access_token, email: row.email })
              }
            } catch (err) {
              console.error('[OAuth] Token-Refresh fehlgeschlagen:', (err as Error).message)
            }
          }
        }
      }

      return reply.send({ accessToken: row.access_token, email: row.email })
    }
  )

  // ── Gmail OAuth-URL generieren ────────────────────────────────────────────
  fastify.get('/api/email/gmail/auth-url', async (_req, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
    if (!clientId) {
      return reply.code(400).send({
        error: 'GOOGLE_CLIENT_ID nicht konfiguriert.',
        hint: 'Trage GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET in die .env-Datei ein.',
      })
    }
    const redirectUri = process.env.GMAIL_REDIRECT_URI ?? 'http://localhost:3000/api/email/gmail/callback'
    const scope = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ')

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: 'code',
      scope,
      access_type:   'offline',
      prompt:        'consent',
    })

    return reply.send({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
  })

  // ── Gmail OAuth Callback ──────────────────────────────────────────────────
  fastify.get<{ Querystring: { code?: string; error?: string } }>(
    '/api/email/gmail/callback',
    async (request, reply) => {
      const { code, error } = request.query

      if (error || !code) {
        return reply.redirect(`http://localhost:5173/settings?email_error=${error ?? 'cancelled'}`)
      }

      const clientId     = process.env.GOOGLE_CLIENT_ID ?? ''
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
      const redirectUri  = process.env.GMAIL_REDIRECT_URI ?? 'http://localhost:3000/api/email/gmail/callback'

      try {
        // Code gegen Tokens tauschen
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id:     clientId,
            client_secret: clientSecret,
            redirect_uri:  redirectUri,
            grant_type:    'authorization_code',
          }),
        })
        const tokens = await tokenRes.json() as {
          access_token?: string
          refresh_token?: string
          expires_in?: number
          error?: string
        }

        if (!tokens.access_token) {
          throw new Error(tokens.error ?? 'Token-Austausch fehlgeschlagen')
        }

        // Email-Adresse abrufen
        const userRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const user = await userRes.json() as { email?: string }
        const email = user.email ?? 'unbekannt@gmail.com'

        // In SQLite speichern (Token nie geloggt)
        const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()
        const id = crypto.randomUUID()
        db.prepare(`
          INSERT OR REPLACE INTO email_connections
            (id, provider, email, access_token, refresh_token, expires_at, scope, updated_at)
          VALUES (?, 'gmail', ?, ?, ?, ?, 'gmail.readonly gmail.send', datetime('now'))
        `).run(id, email, tokens.access_token, tokens.refresh_token ?? null, expiresAt)

        console.log(`[OAuth] Gmail verbunden: ${email}`)
        return reply.redirect(`http://localhost:5173/settings?email_connected=gmail&email=${encodeURIComponent(email)}`)

      } catch (err) {
        console.error('[OAuth] Gmail-Callback-Fehler:', (err as Error).message)
        return reply.redirect('http://localhost:5173/settings?email_error=callback_failed')
      }
    }
  )
}
