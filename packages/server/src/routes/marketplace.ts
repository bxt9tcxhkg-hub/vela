// Marketplace Routes – Skill-Registry Browse + Install + Uninstall
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { skillRegistry } from '@vela/core'
import { join } from 'node:path'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import db from '../db/database.js'

// Tabelle für installierte Skills (Metadaten)
db.exec(`
  CREATE TABLE IF NOT EXISTS installed_skills (
    id           TEXT PRIMARY KEY,
    version      TEXT NOT NULL,
    author       TEXT NOT NULL,
    verified     INTEGER NOT NULL DEFAULT 0,
    installed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const SKILLS_DIR = process.env.VELA_SKILLS_DIR ??
  join(process.env.HOME ?? '~', '.vela', 'skills')

interface InstalledRow { id: string; version: string; author: string; verified: number; installed_at: string }

export async function marketplaceRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Verfügbare Skills aus Registry ────────────────────────────────────────
  fastify.get('/api/marketplace/skills', async (request, reply) => {
    const query  = (request.query as Record<string, string>).q ?? ''
    const filter = (request.query as Record<string, string>).filter ?? 'all'

    let skills = query
      ? await skillRegistry.search(query)
      : await skillRegistry.fetchAvailable()

    if (filter === 'verified') skills = skills.filter(s => s.verified)
    if (filter === 'low')      skills = skills.filter(s => s.riskLevel === 'low')
    if (filter === 'medium')   skills = skills.filter(s => s.riskLevel === 'medium')
    if (filter === 'high')     skills = skills.filter(s => s.riskLevel === 'high')

    // Installierte Skills markieren
    const installed = (db.prepare('SELECT id, version FROM installed_skills').all() as InstalledRow[])
    const installedMap = new Map(installed.map(r => [r.id, r.version]))

    const enriched = skills.map(s => ({
      ...s,
      installed:      installedMap.has(s.id),
      installedVersion: installedMap.get(s.id) ?? null,
      hasUpdate:      installedMap.has(s.id) && installedMap.get(s.id) !== s.version,
    }))

    return reply.send({ skills: enriched })
  })

  // ── Installierte Skills ────────────────────────────────────────────────────
  fastify.get('/api/marketplace/installed', async (_req, reply) => {
    const rows = db.prepare('SELECT * FROM installed_skills ORDER BY installed_at DESC').all() as InstalledRow[]
    return reply.send({ skills: rows })
  })

  // ── Skill installieren ────────────────────────────────────────────────────
  fastify.post<{ Params: { skillId: string } }>(
    '/api/marketplace/skills/:skillId/install',
    async (request, reply) => {
      const { skillId } = request.params
      const skill = await skillRegistry.find(skillId)

      if (!skill) {
        return reply.code(404).send({ error: `Skill '${skillId}' nicht gefunden.` })
      }

      const result = await skillRegistry.install(skillId, SKILLS_DIR)
      if (!result.success) {
        return reply.code(500).send({ error: result.error })
      }

      db.prepare(`
        INSERT OR REPLACE INTO installed_skills (id, version, author, verified, installed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(skillId, skill.version, skill.author, skill.verified ? 1 : 0)

      console.log(`[Marketplace] Skill installiert: ${skillId} v${skill.version}`)
      return reply.code(201).send({ success: true, skill })
    }
  )

  // ── Skill deinstallieren ──────────────────────────────────────────────────
  fastify.delete<{ Params: { skillId: string } }>(
    '/api/marketplace/skills/:skillId',
    async (request, reply) => {
      const { skillId } = request.params
      await skillRegistry.uninstall(skillId, SKILLS_DIR)
      db.prepare('DELETE FROM installed_skills WHERE id = ?').run(skillId)
      console.log(`[Marketplace] Skill deinstalliert: ${skillId}`)
      return reply.code(204).send()
    }
  )

  // ── Update-Check ──────────────────────────────────────────────────────────
  fastify.get('/api/marketplace/updates', async (_req, reply) => {
    const installed = (db.prepare('SELECT id, version FROM installed_skills').all() as InstalledRow[])
    const updates   = await skillRegistry.checkForUpdates(installed)
    return reply.send({ updates })
  })
}
