// Scheduler – zeitgesteuerte Aufgaben für Vela
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'
import cron from 'node-cron'

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    cron_expr   TEXT NOT NULL,
    prompt      TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run    TEXT,
    next_desc   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Active cron jobs map
const activeJobs = new Map<string, ReturnType<typeof cron.schedule>>()

async function runTask(id: string, prompt: string) {
  try {
    const now = new Date().toISOString()
    db.prepare("UPDATE scheduled_tasks SET last_run = ? WHERE id = ?").run(now, id)
    // Trigger chat API internally
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        scheduled: true,
      }),
    })
    const data = await res.json() as { text?: string }
    console.log(`[Scheduler] Task ${id} ausgeführt:`, data.text?.slice(0, 80))
    db.prepare(`INSERT INTO audit_log (id, action_id, skill_name, params, decision, result, execution_ms, checksum, created_at)
      VALUES (?,?,?,?,?,?,?,?,datetime('now'))`).run(
      crypto.randomUUID(), id, 'scheduler',
      JSON.stringify({ prompt }), 'approved',
      JSON.stringify({ text: data.text?.slice(0, 200) }), 0,
      crypto.createHash('sha256').update(id + prompt).digest('hex')
    )
  } catch (e) {
    console.error(`[Scheduler] Task ${id} fehlgeschlagen:`, (e as Error).message)
  }
}

function startJob(id: string, cronExpr: string, prompt: string) {
  if (!cron.validate(cronExpr)) return false
  const job = cron.schedule(cronExpr, () => void runTask(id, prompt), { timezone: 'Europe/Vienna' })
  activeJobs.set(id, job)
  return true
}

// Load enabled tasks on startup
function initScheduler() {
  const tasks = db.prepare("SELECT id, cron_expr, prompt FROM scheduled_tasks WHERE enabled = 1").all() as
    { id: string; cron_expr: string; prompt: string }[]
  tasks.forEach(t => startJob(t.id, t.cron_expr, t.prompt))
  console.log(`[Scheduler] ${tasks.length} Aufgaben geladen`)
}

export async function schedulerRoutes(fastify: FastifyInstance): Promise<void> {
  initScheduler()

  fastify.get('/api/scheduler', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all()
    return reply.send({ tasks: rows })
  })

  fastify.post<{ Body: { name: string; cronExpr: string; prompt: string } }>(
    '/api/scheduler',
    async (req, reply) => {
      const { name, cronExpr, prompt } = req.body
      if (!cron.validate(cronExpr)) {
        return reply.code(400).send({ error: 'Ungültiger Cron-Ausdruck' })
      }
      const id = crypto.randomUUID()
      db.prepare(`INSERT INTO scheduled_tasks (id, name, cron_expr, prompt) VALUES (?, ?, ?, ?)`).run(id, name, cronExpr, prompt)
      startJob(id, cronExpr, prompt)
      return reply.code(201).send({ id, name, cronExpr, prompt })
    }
  )

  fastify.patch<{ Params: { id: string }; Body: { enabled: boolean } }>(
    '/api/scheduler/:id',
    async (req, reply) => {
      const { id } = req.params
      const enabled = req.body.enabled ? 1 : 0
      db.prepare("UPDATE scheduled_tasks SET enabled = ? WHERE id = ?").run(enabled, id)
      const task = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as
        { id: string; cron_expr: string; prompt: string } | undefined
      if (task) {
        if (enabled && task) startJob(task.id, task.cron_expr, task.prompt)
        else activeJobs.get(id)?.stop(); activeJobs.delete(id)
      }
      return reply.send({ ok: true })
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/scheduler/:id',
    async (req, reply) => {
      activeJobs.get(req.params.id)?.stop()
      activeJobs.delete(req.params.id)
      db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(req.params.id)
      return reply.code(204).send()
    }
  )
}
