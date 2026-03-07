// Auth – JWT-based register / login / me / logout
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'vela-secret-change-in-production'
const JWT_EXPIRES = '7d'

export function signToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string }
  } catch {
    return null
  }
}

export function extractUser(request: { headers?: Record<string, unknown> }) {
  const rawAuth = request.headers?.authorization
  const auth = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

export async function authRoutes(fastify: FastifyInstance) {
  const db = getDb()

  // POST /api/auth/register
  fastify.post('/api/auth/register', async (request, reply) => {
    const schema = z.object({
      username: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const { username, email, password } = body.data
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return reply.code(409).send({ error: 'Email already registered' })

    const hash = await bcrypt.hash(password, 10)
    db.prepare(
      "INSERT INTO users (id, username, email, password_hash) VALUES (lower(hex(randomblob(8))), ?, ?, ?)"
    ).run(username, email, hash)

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE email = ?').get(email) as any
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    return reply.send({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
  })

  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const { email, password } = body.data
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!user || !user.password_hash) return reply.code(401).send({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = signToken({ id: user.id, email: user.email, role: user.role })
    return reply.send({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
  })

  // GET /api/auth/me
  fastify.get('/api/auth/me', async (request, reply) => {
    const payload = extractUser(request)
    if (!payload) return reply.code(401).send({ error: 'Unauthorized' })

    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(payload.id) as any
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send({ user })
  })

  // POST /api/auth/logout
  fastify.post('/api/auth/logout', async (_request, reply) => {
    // Stateless JWT — client discards token
    return reply.send({ message: 'Logged out' })
  })
}
