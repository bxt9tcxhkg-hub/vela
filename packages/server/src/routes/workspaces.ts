// Workspace Isolation – isolierte Arbeitsbereiche pro User
import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vela-dev-secret-change-in-prod'

type User = { id: string; role: string }

function extractUser(authHeader: string | undefined): User | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string }
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(payload.sub) as User | undefined
    return user ?? null
  } catch { return null }
}

type Workspace = { id: string; name: string; owner_id: string; created_at: string }
type Member    = { workspace_id: string; user_id: string; role: string }

export async function workspaceRoutes(fastify: FastifyInstance): Promise<void> {

  // List workspaces the user is member of or owns
  fastify.get('/api/workspaces', async (req, reply) => {
    const user = extractUser(req.headers.authorization)
    if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

    const rows = db.prepare(`
      SELECT w.* FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at DESC
    `).all(user.id) as Workspace[]
    return reply.send({ workspaces: rows })
  })

  // Create workspace
  fastify.post<{ Body: { name: string } }>('/api/workspaces', async (req, reply) => {
    const user = extractUser(req.headers.authorization)
    if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })
    const { name } = req.body
    if (!name?.trim()) return reply.code(400).send({ error: 'Name erforderlich.' })

    const id = crypto.randomUUID()
    db.prepare('INSERT INTO workspaces (id, name, owner_id) VALUES (?,?,?)').run(id, name.trim(), user.id)
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,?)').run(id, user.id, 'owner')

    return reply.code(201).send({ id, name: name.trim(), owner_id: user.id })
  })

  // Get workspace detail + members
  fastify.get<{ Params: { id: string } }>('/api/workspaces/:id', async (req, reply) => {
    const user = extractUser(req.headers.authorization)
    if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id) as Workspace | undefined
    if (!ws) return reply.code(404).send({ error: 'Workspace nicht gefunden.' })

    const membership = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(ws.id, user.id)
    if (!membership) return reply.code(403).send({ error: 'Kein Zugriff.' })

    const members = db.prepare(`
      SELECT wm.user_id, wm.role, u.username, u.email
      FROM workspace_members wm
      INNER JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ?
    `).all(ws.id)

    return reply.send({ workspace: ws, members })
  })

  // Add member (owner only)
  fastify.post<{ Params: { id: string }; Body: { userId: string; role?: string } }>(
    '/api/workspaces/:id/members',
    async (req, reply) => {
      const user = extractUser(req.headers.authorization)
      if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

      const ownerCheck = db.prepare(
        'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = ?'
      ).get(req.params.id, user.id, 'owner')
      if (!ownerCheck) return reply.code(403).send({ error: 'Nur Workspace-Owner darf Mitglieder hinzufügen.' })

      const { userId, role = 'member' } = req.body
      try {
        db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,?)').run(req.params.id, userId, role)
        return reply.code(201).send({ ok: true })
      } catch {
        return reply.code(409).send({ error: 'Mitglied existiert bereits.' })
      }
    }
  )

  // Remove member (owner only)
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/api/workspaces/:id/members/:userId',
    async (req, reply) => {
      const user = extractUser(req.headers.authorization)
      if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

      const ownerCheck = db.prepare(
        'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = ?'
      ).get(req.params.id, user.id, 'owner')
      if (!ownerCheck) return reply.code(403).send({ error: 'Nur Workspace-Owner darf Mitglieder entfernen.' })

      db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(req.params.id, req.params.userId)
      return reply.code(204).send()
    }
  )

  // Delete workspace (owner only)
  fastify.delete<{ Params: { id: string } }>('/api/workspaces/:id', async (req, reply) => {
    const user = extractUser(req.headers.authorization)
    if (!user) return reply.code(401).send({ error: 'Nicht authentifiziert.' })

    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ? AND owner_id = ?').get(req.params.id, user.id)
    if (!ws) return reply.code(403).send({ error: 'Nur Workspace-Owner darf löschen.' })

    db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id)
    return reply.code(204).send()
  })
}
