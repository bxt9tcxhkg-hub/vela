// OIDC – OpenID Connect / Enterprise SSO Login
// Supports any OIDC-compliant provider (Google, Azure AD, Okta, etc.)
// Config via environment variables:
//   OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI
import type { FastifyInstance } from 'fastify'
import { getDb } from '../db/database.js'
import { signToken } from './auth.js'

function isOidcConfigured(): boolean {
  return !!(
    process.env.OIDC_ISSUER &&
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET &&
    process.env.OIDC_REDIRECT_URI
  )
}

async function getOidcClient() {
  // Dynamic import to avoid startup errors when package not installed
  const { Issuer } = await import('openid-client')
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER!)
  return new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID!,
    client_secret: process.env.OIDC_CLIENT_SECRET!,
    redirect_uris: [process.env.OIDC_REDIRECT_URI!],
    response_types: ['code'],
  })
}

export async function oidcRoutes(fastify: FastifyInstance) {
  // GET /api/auth/oidc/config
  fastify.get('/api/auth/oidc/config', async (_request, reply) => {
    if (!isOidcConfigured()) {
      return reply.send({ enabled: false, issuer: null })
    }
    return reply.send({ enabled: true, issuer: process.env.OIDC_ISSUER })
  })

  // GET /api/auth/oidc/login
  fastify.get('/api/auth/oidc/login', async (_request, reply) => {
    if (!isOidcConfigured()) {
      return reply.code(503).send({ error: 'OIDC not configured' })
    }
    try {
      const client = await getOidcClient()
      const url = client.authorizationUrl({
        scope: 'openid email profile',
        response_type: 'code',
      })
      return reply.redirect(url)
    } catch (err: any) {
      return reply.code(500).send({ error: 'OIDC provider error', detail: err?.message })
    }
  })

  // GET /api/auth/oidc/callback
  fastify.get('/api/auth/oidc/callback', async (request, reply) => {
    if (!isOidcConfigured()) {
      return reply.code(503).send({ error: 'OIDC not configured' })
    }
    try {
      const client = await getOidcClient()
      const params = client.callbackParams(request.raw)
      const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI!, params)
      const userinfo = await client.userinfo(tokenSet)

      const email = userinfo.email
      if (!email) return reply.code(400).send({ error: 'No email in OIDC userinfo' })

      const username = userinfo.name || userinfo.preferred_username || email.split('@')[0]
      const db = getDb()

      // Upsert user by email
      db.prepare(
        "INSERT OR IGNORE INTO users (id, username, email, role) VALUES (lower(hex(randomblob(8))), ?, ?, 'user')"
      ).run(username, email)
      db.prepare('UPDATE users SET username = ? WHERE email = ?').run(username, email)

      const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email) as any
      const token = signToken({ id: user.id, email: user.email, role: user.role })

      return reply.redirect(`/?token=${token}`)
    } catch (err: any) {
      return reply.code(500).send({ error: 'OIDC callback failed', detail: err?.message })
    }
  })
}
