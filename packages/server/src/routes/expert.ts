// Expert Routes – Audit-Log, Skill-Management, Permissions, Model-Params, Diagnostics, Webhooks
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'
import os from 'node:os'
import { statSync } from 'node:fs'
import { join } from 'node:path'

// ─── Schema extensions ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS skill_config (
    skill_name TEXT PRIMARY KEY,
    enabled    INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    secret     TEXT NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

export async function expertRoutes(fastify: FastifyInstance): Promise<void> {

  // ── 1. AUDIT LOG ─────────────────────────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/audit-log',
    async (req, reply) => {
      const limit  = Math.min(parseInt(req.query.limit  ?? '50', 10), 200)
      const offset = parseInt(req.query.offset ?? '0', 10)
      const rows = db.prepare(`
        SELECT id, action_id, skill_name, decision, result, execution_ms, created_at
        FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(limit, offset)
      const total = (db.prepare('SELECT COUNT(*) as n FROM audit_log').get() as { n: number }).n
      return reply.send({ rows, total, limit, offset })
    }
  )

  fastify.get('/api/audit-log/export', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT id, action_id, skill_name, params, decision, result, execution_ms, checksum, created_at
      FROM audit_log ORDER BY created_at DESC
    `).all() as Record<string, unknown>[]
    const header = 'id,action_id,skill_name,decision,execution_ms,created_at\n'
    const csv = header + rows.map(r =>
      [r.id, r.action_id, r.skill_name, r.decision, r.execution_ms, r.created_at]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="vela-audit.csv"')
      .send(csv)
  })

  // ── 2. SKILL MANAGEMENT ──────────────────────────────────────────────────
  fastify.get('/api/skills/config', async (_req, reply) => {
    const rows = db.prepare('SELECT skill_name, enabled FROM skill_config').all() as { skill_name: string; enabled: number }[]
    const configMap: Record<string, boolean> = {}
    rows.forEach(r => { configMap[r.skill_name] = r.enabled === 1 })
    return reply.send({ config: configMap })
  })

  fastify.post<{ Params: { name: string }; Body: { enabled: boolean } }>(
    '/api/skills/:name/toggle',
    async (req, reply) => {
      const { name } = req.params
      const enabled = req.body.enabled ? 1 : 0
      db.prepare(`
        INSERT OR REPLACE INTO skill_config (skill_name, enabled, updated_at)
        VALUES (?, ?, datetime('now'))
      `).run(name, enabled)
      return reply.send({ skill_name: name, enabled: enabled === 1 })
    }
  )

  // ── 3. PERMISSION MATRIX ─────────────────────────────────────────────────
  fastify.get('/api/permissions', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM permissions ORDER BY risk_level').all()
    return reply.send({ permissions: rows })
  })

  fastify.delete<{ Params: { type: string } }>(
    '/api/permissions/:type',
    async (req, reply) => {
      db.prepare('DELETE FROM permissions WHERE permission_type = ?').run(req.params.type)
      return reply.code(204).send()
    }
  )

  // ── 4. MODEL PARAMETERS ──────────────────────────────────────────────────
  fastify.get('/api/model-params', async (_req, reply) => {
    const get = (key: string, def: string) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
      return row?.value ?? def
    }
    return reply.send({
      temperature:   parseFloat(get('model_temperature', '0.7')),
      maxTokens:     parseInt(get('model_max_tokens', '4096'), 10),
      contextWindow: parseInt(get('model_context_window', '8192'), 10),
    })
  })

  fastify.post<{ Body: { temperature?: number; maxTokens?: number; contextWindow?: number } }>(
    '/api/model-params',
    async (req, reply) => {
      const { temperature, maxTokens, contextWindow } = req.body
      const upsert = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`)
      if (temperature  !== undefined) upsert.run('model_temperature',    String(temperature))
      if (maxTokens    !== undefined) upsert.run('model_max_tokens',     String(maxTokens))
      if (contextWindow !== undefined) upsert.run('model_context_window', String(contextWindow))
      return reply.send({ ok: true })
    }
  )

  // ── 5. DIAGNOSTICS ───────────────────────────────────────────────────────
  fastify.get('/api/diagnostics', async (_req, reply) => {
    const dataDir = process.env.VELA_DATA_DIR ?? join(process.cwd(), '.vela-data')
    let dbSizeBytes = 0
    try { dbSizeBytes = statSync(join(dataDir, 'vela.db')).size } catch { /* ignore */ }

    const counts = {
      messages:      (db.prepare('SELECT COUNT(*) as n FROM messages').get() as { n: number }).n,
      audit_log:     (db.prepare('SELECT COUNT(*) as n FROM audit_log').get() as { n: number }).n,
      conversations: (db.prepare('SELECT COUNT(*) as n FROM conversations').get() as { n: number }).n,
      email_connections: 0 as number,
    }
    try {
      counts.email_connections = (db.prepare('SELECT COUNT(*) as n FROM email_connections').get() as { n: number }).n
    } catch { /* table might not exist */ }

    return reply.send({
      uptime:      Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform:    process.platform,
      arch:        process.arch,
      memUsed:     Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memTotal:    Math.round(os.totalmem() / 1024 / 1024),
      cpuCores:    os.cpus().length,
      dbSizeMb:    +(dbSizeBytes / 1024 / 1024).toFixed(2),
      counts,
    })
  })

  // ── 6. WEBHOOKS ──────────────────────────────────────────────────────────
  fastify.get('/api/webhooks', async (_req, reply) => {
    const rows = db.prepare('SELECT id, name, enabled, created_at FROM webhooks ORDER BY created_at DESC').all()
    return reply.send({ webhooks: rows })
  })

  fastify.post<{ Body: { name: string } }>(
    '/api/webhooks',
    async (req, reply) => {
      const id     = crypto.randomUUID()
      const secret = crypto.randomBytes(24).toString('hex')
      db.prepare(`
        INSERT INTO webhooks (id, name, secret, enabled) VALUES (?, ?, ?, 1)
      `).run(id, req.body.name ?? 'Webhook', secret)
      return reply.code(201).send({ id, name: req.body.name, secret })
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/webhooks/:id',
    async (req, reply) => {
      db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )

  // Webhook trigger endpoint (external systems call this)
  fastify.post<{ Params: { id: string }; Body: { message: string } }>(
    '/api/webhooks/:id/trigger',
    async (req, reply) => {
      const authorization = (req.headers['x-vela-secret'] as string | undefined) ?? ''
      const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND enabled = 1').get(req.params.id) as
        { id: string; name: string; secret: string } | undefined

      if (!webhook || webhook.secret !== authorization) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      // TODO: enqueue message for chat processing
      return reply.send({ ok: true, queued: req.body.message })
    }
  )
  // ── 7. TOKEN USAGE ───────────────────────────────────────────────────────
  fastify.get('/api/token-usage', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT provider, model,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(response_tokens) as response_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as requests
      FROM token_usage GROUP BY provider, model ORDER BY total_tokens DESC
    `).all() as { provider: string; model: string; prompt_tokens: number; response_tokens: number; total_tokens: number; requests: number }[]

    const totalTokens = rows.reduce((a, r) => a + r.total_tokens, 0)

    // Rough cost estimate (Claude Haiku: $0.25/M input, $1.25/M output)
    const estimatedCost = rows.reduce((a, r) => {
      if (r.provider === 'anthropic') return a + (r.prompt_tokens * 0.00000025) + (r.response_tokens * 0.00000125)
      if (r.provider === 'openai')    return a + (r.prompt_tokens * 0.0000005)  + (r.response_tokens * 0.0000015)
      return a
    }, 0)

    return reply.send({ rows, totalTokens, estimatedCostUSD: +estimatedCost.toFixed(4) })
  })

}
