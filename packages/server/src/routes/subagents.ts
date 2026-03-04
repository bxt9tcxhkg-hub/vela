// Sub-Agent Delegation – Aufgaben auf spezialisierte Mini-Agents aufteilen
import type { FastifyInstance } from 'fastify'
import db from '../db/database.js'
import crypto from 'node:crypto'

db.exec(`
  CREATE TABLE IF NOT EXISTS sub_agents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL,
    model       TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    skills      TEXT NOT NULL DEFAULT '[]',
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS delegations (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    agent_id    TEXT NOT NULL,
    task        TEXT NOT NULL,
    result      TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
  );

  INSERT OR IGNORE INTO sub_agents (id, name, description, system_prompt, model) VALUES
    ('sa-research',  'Research Agent',   'Recherchiert Fakten und fasst zusammen', 'Du bist ein Recherche-Experte. Analysiere die Anfrage, liefere präzise Fakten und eine strukturierte Zusammenfassung.', 'claude-haiku-4-5-20251001'),
    ('sa-code',      'Code Agent',       'Schreibt und reviewed Code',             'Du bist ein Senior-Entwickler. Schreibe sauberen, kommentierten Code und erkläre deine Entscheidungen kurz.', 'claude-haiku-4-5-20251001'),
    ('sa-writer',    'Writer Agent',     'Erstellt Texte und Dokumentation',       'Du bist ein erfahrener Texter. Schreibe klar, prägnant und zielgruppengerecht.', 'claude-haiku-4-5-20251001'),
    ('sa-planner',   'Planner Agent',    'Erstellt Pläne und To-Do-Listen',        'Du bist ein Planungs-Experte. Zerlege Aufgaben in konkrete, umsetzbare Schritte mit Prioritäten.', 'claude-haiku-4-5-20251001');
`)

export async function subAgentRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/api/agents', async (_req, reply) => {
    const agents = db.prepare('SELECT * FROM sub_agents ORDER BY name ASC').all()
    return reply.send({ agents })
  })

  fastify.post<{ Body: { name: string; description?: string; systemPrompt: string; model?: string } }>(
    '/api/agents',
    async (req, reply) => {
      const id = `sa-${crypto.randomUUID().slice(0, 8)}`
      db.prepare('INSERT INTO sub_agents (id, name, description, system_prompt, model) VALUES (?,?,?,?,?)').run(
        id, req.body.name, req.body.description ?? '', req.body.systemPrompt, req.body.model ?? 'claude-haiku-4-5-20251001'
      )
      return reply.code(201).send({ id })
    }
  )

  // Delegate a task to a specific agent
  fastify.post<{ Params: { id: string }; Body: { task: string } }>(
    '/api/agents/:id/delegate',
    async (req, reply) => {
      const agent = db.prepare('SELECT * FROM sub_agents WHERE id = ?').get(req.params.id) as
        { id: string; name: string; system_prompt: string; model: string } | undefined
      if (!agent) return reply.code(404).send({ error: 'Agent nicht gefunden' })

      const delegationId = crypto.randomUUID()
      db.prepare('INSERT INTO delegations (id, agent_id, task) VALUES (?,?,?)').run(delegationId, agent.id, req.body.task)

      // Execute via chat API
      try {
        const res = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: req.body.task }],
            systemPrompt: agent.system_prompt,
          }),
        })
        const data = await res.json() as { text?: string }
        const result = data.text ?? 'Keine Antwort'

        db.prepare("UPDATE delegations SET result = ?, status = 'done', finished_at = datetime('now') WHERE id = ?").run(result, delegationId)

        return reply.send({
          delegationId,
          agentName: agent.name,
          task: req.body.task,
          result,
        })
      } catch (e) {
        db.prepare("UPDATE delegations SET status = 'failed' WHERE id = ?").run(delegationId)
        return reply.code(500).send({ error: (e as Error).message })
      }
    }
  )

  // Auto-route: detect best agent for task and delegate
  fastify.post<{ Body: { task: string } }>(
    '/api/agents/auto-delegate',
    async (req, reply) => {
      const task = req.body.task.toLowerCase()

      // Simple keyword routing
      let agentId = 'sa-research' // default
      if (/code|programmier|skript|funktion|klasse|bug|fehler|implement/i.test(task)) agentId = 'sa-code'
      else if (/schreib|text|blog|artikel|email|brief|zusammenfassung/i.test(task)) agentId = 'sa-writer'
      else if (/plan|aufgabe|todo|schritte|strategie|roadmap|organi/i.test(task)) agentId = 'sa-planner'

      const res = await fetch(`http://localhost:3000/api/agents/${agentId}/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: req.body.task }),
      })
      const data = await res.json() as Record<string, unknown>
      return reply.send({ ...data, autoRouted: true, selectedAgent: agentId })
    }
  )

  // Delegation history
  fastify.get('/api/agents/delegations', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT d.*, sa.name as agent_name
      FROM delegations d
      JOIN sub_agents sa ON d.agent_id = sa.id
      ORDER BY d.created_at DESC LIMIT 50
    `).all()
    return reply.send({ delegations: rows })
  })

  fastify.delete<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    db.prepare('DELETE FROM sub_agents WHERE id = ?').run(req.params.id)
    return reply.code(204).send()
  })
}
