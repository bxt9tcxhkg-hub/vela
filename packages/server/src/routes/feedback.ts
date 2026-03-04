// Feedback-System – anonym, offline-fähig, optional GitHub Issues
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import db from '../db/database.js'
import crypto from 'node:crypto'

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    rating       TEXT NOT NULL CHECK(rating IN ('good','okay','bad')),
    category     TEXT NOT NULL,
    message      TEXT,
    vela_version TEXT,
    os           TEXT,
    mode         TEXT,
    github_issue INTEGER,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Rate-Limit: max 3 pro Stunde (in-memory, resets on restart – ausreichend für Anti-Spam)
const hourlyCount = new Map<string, number[]>()

function checkRateLimit(limit = 3): boolean {
  const key = 'feedback'
  const now = Date.now()
  const hour = now - 60 * 60 * 1000
  const times = (hourlyCount.get(key) ?? []).filter(t => t > hour)
  if (times.length >= limit) return false
  times.push(now)
  hourlyCount.set(key, times)
  return true
}

const FeedbackSchema = z.object({
  rating:      z.enum(['good', 'okay', 'bad']),
  category:    z.enum(['onboarding', 'skills', 'ui', 'performance', 'bug', 'other']),
  message:     z.string().max(2000).optional(),
  velaVersion: z.string().default('0.1.0'),
  os:          z.string().default('unknown'),
  mode:        z.enum(['local', 'cloud']).default('local'),
  timestamp:   z.string().optional(),
})

interface FeedbackRow {
  id: number
  rating: string
  category: string
  message: string | null
  vela_version: string | null
  os: string | null
  mode: string | null
  github_issue: number | null
  created_at: string
}

interface MetaRow { value: string }

// GitHub Issue erstellen (optional)
async function createGithubIssue(feedback: z.infer<typeof FeedbackSchema>): Promise<number | null> {
  const token = process.env.GITHUB_FEEDBACK_TOKEN ?? ''
  const repo  = process.env.GITHUB_FEEDBACK_REPO ?? 'bxt9tcxhkg-hub/vela'
  if (!token) return null

  const RATING_EMOJI = { good: '😊', okay: '😐', bad: '😞' }
  const title = `[Feedback] ${feedback.category} — ${RATING_EMOJI[feedback.rating]} ${feedback.rating} (v${feedback.velaVersion})`
  const body  = [
    `**Bewertung:** ${RATING_EMOJI[feedback.rating]} ${feedback.rating}`,
    `**Kategorie:** ${feedback.category}`,
    `**Version:** ${feedback.velaVersion}`,
    `**OS:** ${feedback.os}`,
    `**Modus:** ${feedback.mode}`,
    '',
    `**Nachricht:**`,
    feedback.message ? feedback.message : '_(kein Kommentar)_',
    '',
    '---',
    '*Automatisch erstellt durch Vela Feedback-System. Enthält keine persönlichen Daten.*',
  ].join('\n')

  const labels = ['feedback', `feedback:${feedback.rating}`, `category:${feedback.category}`]

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent':   'Vela/0.1.0',
        Accept:         'application/vnd.github+json',
      },
      body: JSON.stringify({ title, body, labels }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json() as { number?: number }
    return data.number ?? null
  } catch {
    return null
  }
}

export async function feedbackRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Feedback einreichen ────────────────────────────────────────────────────
  fastify.post('/api/feedback', async (request, reply) => {
    // Feedback-System deaktivierbar
    const disabled = (db.prepare("SELECT value FROM feedback_meta WHERE key='disabled'").get() as MetaRow | undefined)?.value === '1'
    if (disabled) return reply.code(403).send({ error: 'Feedback-System deaktiviert.' })

    const rateLimit = parseInt(
      (db.prepare("SELECT value FROM feedback_meta WHERE key='rate_limit'").get() as MetaRow | undefined)?.value ?? '3'
    )

    if (!checkRateLimit(rateLimit)) {
      return reply.code(429).send({ error: 'Zu viele Feedbacks – bitte in einer Stunde erneut versuchen.' })
    }

    const body = FeedbackSchema.parse(request.body)

    // GitHub Issue (async, non-blocking)
    let githubIssue: number | null = null
    try { githubIssue = await createGithubIssue(body) } catch { /* ignorieren */ }

    // SQLite speichern
    const result = db.prepare(`
      INSERT INTO feedback (rating, category, message, vela_version, os, mode, github_issue)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(body.rating, body.category, body.message ?? null, body.velaVersion, body.os, body.mode, githubIssue)

    console.log(`[Feedback] ${body.rating}/${body.category}${githubIssue ? ` → GitHub #${githubIssue}` : ''}`)
    return reply.code(201).send({ id: result.lastInsertRowid, githubIssue })
  })

  // ── Feedback-Statistiken (Expert Mode) ────────────────────────────────────
  fastify.get('/api/feedback/stats', async (_req, reply) => {
    const total = (db.prepare('SELECT COUNT(*) as n FROM feedback').get() as { n: number }).n
    const byRating = db.prepare(`
      SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating
    `).all() as Array<{ rating: string; count: number }>
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count FROM feedback GROUP BY category ORDER BY count DESC
    `).all() as Array<{ category: string; count: number }>
    const recent = db.prepare(`
      SELECT id, rating, category, message, os, mode, vela_version, created_at
      FROM feedback ORDER BY created_at DESC LIMIT 50
    `).all() as FeedbackRow[]

    return reply.send({ total, byRating, byCategory, recent })
  })

  // ── CSV-Export ────────────────────────────────────────────────────────────
  fastify.get('/api/feedback/export', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all() as FeedbackRow[]
    const header = 'id,rating,category,message,vela_version,os,mode,github_issue,created_at\n'
    const csv = rows.map(r =>
      [r.id, r.rating, r.category, `"${(r.message ?? '').replace(/"/g, '""')}"`,
       r.vela_version, r.os, r.mode, r.github_issue ?? '', r.created_at].join(',')
    ).join('\n')

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="vela-feedback-${new Date().toISOString().split('T')[0]}.csv"`)
      .send(header + csv)
  })

  // ── Erinnerungsstate lesen/schreiben ──────────────────────────────────────
  fastify.get('/api/feedback/reminder-state', async (_req, reply) => {
    const get = (key: string) =>
      (db.prepare(`SELECT value FROM feedback_meta WHERE key=?`).get(key) as MetaRow | undefined)?.value ?? null

    return reply.send({
      dismissed:      get('reminder_dismissed') === '1',
      lastFeedback:   get('last_feedback_at'),
      sessionCount:   parseInt(get('session_count') ?? '0'),
    })
  })

  fastify.post<{ Body: { dismissed?: boolean; incrementSession?: boolean } }>(
    '/api/feedback/reminder-state',
    async (request, reply) => {
      const { dismissed, incrementSession } = request.body ?? {}
      const upsert = db.prepare("INSERT OR REPLACE INTO feedback_meta (key, value) VALUES (?, ?)")

      if (dismissed !== undefined) {
        upsert.run('reminder_dismissed', dismissed ? '1' : '0')
      }
      if (incrementSession) {
        const current = parseInt(
          (db.prepare("SELECT value FROM feedback_meta WHERE key='session_count'").get() as MetaRow | undefined)?.value ?? '0'
        )
        upsert.run('session_count', String(current + 1))
      }
      return reply.send({ ok: true })
    }
  )
}
