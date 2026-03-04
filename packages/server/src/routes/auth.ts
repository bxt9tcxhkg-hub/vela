// Multi-User Auth – Register, Login, Profile, User Management
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vela-dev-secret-change-in-prod'
const TOKEN_TTL  = 7 * 24 * 3600 * 1000 // 7 days

type User = { id: string; username: string; email: string; role: string; created_at: string }

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token: string): { sub: string } | null {
  try { return jwt.verify(token, JWT_SECRET) as { sub: string } } catch { return null }
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Register ────────────────────────────────────────────────────────────
  fastify.post<{ Body: { username: string; email: string; password: string } }>(
    '/api/auth/register',
    async (req, reply) => {
      const { username, email, password } = req.body
      if (!username || !email || !password) return reply.code(400).send({ error: 'Alle Felder erforderlich.' })
      if (password.length < 8) return reply.code(400).send({ error: 'Passwort mindestens 8 Zeichen.' })

      const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username)
      if (existing) return reply.code(409).send({ error: 'Nutzer existiert bereits.' })

      const hash = await bcrypt.hash(password, 12)
      const id   = crypto.randomUUID()
      // First user becomes admin
      const count = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n
      const role  = count === 0 ? 'admin' : 'user'
      db.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?,?,?,?,?)').run(id, username, email, hash, role)

      const token = signToken(id)
      db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,datetime("now","+"||?||" seconds"))').run(token, id, TOKEN_TTL / 1000)

      const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(id) as User
      return reply.code(201).send({ token, user })
    }
  )

  // ── Login ────────────────────────────────────────────────────────────────
  fastify.post<{ Body: { email: string; password: string } }>(
    '/api/auth/login',
    async (req, reply) => {
      const { email, password } = req.body
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
        (User & { password_hash: string }) | undefined
      if (!row) return reply.code(401).send({ error: 'Falsche E-Mail oder Passwort.' })

      const ok = await bcrypt.compare(password, row.password_hash)
      if (!ok) return reply.code(401).send({ error: 'Falsche E-Mail oder Passwort.' })

      const token = signToken(row.id)
      db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?,?,datetime("now","+"||?||" seconds"))').run(token, row.id, TOKEN_TTL / 1000)

      const user: User = { id: row.id, username: row.username, email: row.email, role: row.role, created_at: row.created_at }
      return reply.send({ token, user })
    }
  )

  // ── Me (verify token) ────────────────────────────────────────────────────
  fastify.get('/api/auth/me', async (req, reply) => {
    const auth = req.headers.authorization ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

    const payload = verifyToken(token)
    if (!payload) return reply.code(401).send({ error: 'Token ungültig.' })

    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(payload.sub) as User | undefined
    if (!user) return reply.code(404).send({ error: 'Nutzer nicht gefunden.' })

    return reply.send({ user })
  })

  // ── Logout ───────────────────────────────────────────────────────────────
  fastify.post('/api/auth/logout', async (req, reply) => {
    const auth = req.headers.authorization ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return reply.send({ ok: true })
  })

  // ── Admin: list users ────────────────────────────────────────────────────
  fastify.get('/api/users', async (_req, reply) => {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC').all()
    return reply.send({ users })
  })

  // ── Admin: change role ───────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: { role: string } }>(
    '/api/users/:id/role',
    async (req, reply) => {
      const allowed = ['admin', 'user', 'guest']
      if (!allowed.includes(req.body.role)) return reply.code(400).send({ error: 'Ungültige Rolle.' })
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id)
      return reply.send({ ok: true })
    }
  )

  // ── Admin: delete user ───────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/api/users/:id',
    async (req, reply) => {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )
}
