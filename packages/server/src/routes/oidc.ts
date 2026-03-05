// OIDC – OpenID Connect / Enterprise SSO
// Config via env: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI
import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import * as oidcClient from 'openid-client'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vela-dev-secret-change-in-prod'
const TOKEN_TTL  = 7 * 24 * 3600 // seconds

const OIDC_ISSUER        = process.env.OIDC_ISSUER
const OIDC_CLIENT_ID     = process.env.OIDC_CLIENT_ID
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET
const OIDC_REDIRECT_URI  = process.env.OIDC_REDIRECT_URI

const oidcEnabled = Boolean(OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_REDIRECT_URI)

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
}

let _oidcConfig: oidcClient.Configuration | null = null
async function getOidcConfig(): Promise<oidcClient.Configuration> {
  if (_oidcConfig) return _oidcConfig
  _oidcConfig = await oidcClient.discovery(
    new URL(OIDC_ISSUER!),
    OIDC_CLIENT_ID!,
    OIDC_CLIENT_SECRET!,
  )
  return _oidcConfig
}

export async function oidcRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/api/auth/oidc/config', async (_req, reply) => {
    return reply.send({ enabled: oidcEnabled, issuer: OIDC_ISSUER ?? null })
  })

  fastify.get('/api/auth/oidc/login', async (_req, reply) => {
    if (!oidcEnabled) return reply.code(503).send({ error: 'OIDC not configured.' })
    const config = await getOidcConfig()
    const state  = crypto.randomBytes(16).toString('hex')
    const url    = oidcClient.buildAuthorizationUrl(config, {
      redirect_uri: OIDC_REDIRECT_URI!,
      scope: 'openid email profile',
      state,
    })
    return reply.redirect(url.href)
  })

  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/auth/oidc/callback',
    async (req, reply) => {
      if (!oidcEnabled) return reply.code(503).send({ error: 'OIDC not configured.' })
      if (req.query.error) return reply.code(400).send({ error: req.query.error })

      try {
        const config   = await getOidcConfig()
        const tokens   = await oidcClient.authorizationCodeGrant(
          config,
          new URL(req.url, `http://${req.headers.host}`),
          { expectedState: req.query.state }
        )
        const claims   = tokens.claims()
        const email    = (claims?.email as string) ?? `oidc_${claims?.sub}@unknown`
        const username = (claims?.preferred_username as string) ?? (claims?.name as string) ?? email.split('@')[0]

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
        let userId: string
        if (existing) {
          userId = existing.id
        } else {
          userId = crypto.randomUUID()
          const count = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n
          const role  = count === 0 ? 'admin' : 'user'
          db.prepare(
            'INSERT INTO users (id, username, email, password_hash, role) VALUES (?,?,?,?,?)'
          ).run(userId, username, email, '', role)
        }

        const token = signToken(userId)
        db.prepare(
          'INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?,?,datetime("now","+"||?||" seconds"))'
        ).run(token, userId, TOKEN_TTL)

        return reply.redirect(`/?token=${token}`)
      } catch (err) {
        fastify.log.error(err)
        return reply.code(500).send({ error: 'OIDC callback failed.' })
      }
    }
  )
}
