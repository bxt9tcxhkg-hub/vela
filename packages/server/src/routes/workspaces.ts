// Workspaces – isolated contexts for users
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDb } from '../db/database.js'
import { extractUser } from './auth.js'

export async function workspaceRoutes(fastify: FastifyInstance) {
  // GET /api/workspaces
  fastify.get('/api/workspaces', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const db = getDb()
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.owner_id, w.created_at, wm.role AS member_role
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at DESC
    `).all(user.id)

    return reply.send({ workspaces })
  })

  // POST /api/workspaces
  fastify.post('/api/workspaces', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const schema = z.object({ name: z.string().min(1) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const db = getDb()
    const id = db.prepare(
      "INSERT INTO workspaces (id, name, owner_id) VALUES (lower(hex(randomblob(8))), ?, ?) RETURNING id"
    ).get(body.data.name, user.id) as { id: string }

    db.prepare(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')"
    ).run(id.id, user.id)

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id.id)
    return reply.code(201).send({ workspace })
  })

  // GET /api/workspaces/:id
  fastify.get('/api/workspaces/:id', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const db = getDb()

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any
    if (!workspace) return reply.code(404).send({ error: 'Workspace not found' })

    const membership = db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, user.id)
    if (!membership) return reply.code(403).send({ error: 'Access denied' })

    const members = db.prepare(`
      SELECT u.id, u.username, u.email, wm.role
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ?
    `).all(id)

    return reply.send({ workspace, members })
  })

  // POST /api/workspaces/:id/members
  fastify.post('/api/workspaces/:id/members', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const schema = z.object({ userId: z.string(), role: z.string().default('member') })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const db = getDb()
    const membership = db.prepare(
      "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
    ).get(id, user.id) as any
    if (!membership || membership.role !== 'owner') {
      return reply.code(403).send({ error: 'Only owners can add members' })
    }

    db.prepare(
      "INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)"
    ).run(id, body.data.userId, body.data.role)

    return reply.send({ message: 'Member added' })
  })

  // DELETE /api/workspaces/:id/members/:userId
  fastify.delete('/api/workspaces/:id/members/:userId', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id, userId } = request.params as { id: string; userId: string }
    const db = getDb()

    const membership = db.prepare(
      "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
    ).get(id, user.id) as any
    if (!membership || membership.role !== 'owner') {
      return reply.code(403).send({ error: 'Only owners can remove members' })
    }

    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(id, userId)
    return reply.send({ message: 'Member removed' })
  })

  // DELETE /api/workspaces/:id
  fastify.delete('/api/workspaces/:id', async (request, reply) => {
    const user = extractUser(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const db = getDb()

    const membership = db.prepare(
      "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
    ).get(id, user.id) as any
    if (!membership || membership.role !== 'owner') {
      return reply.code(403).send({ error: 'Only owners can delete workspaces' })
    }

    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id)
    return reply.send({ message: 'Workspace deleted' })
  })
}
