/**
 * T-04: /api/status — kombinierter System-Status
 * Hardware, Speicher, Backend, Kontext-Fenster
 */

import type { FastifyInstance } from 'fastify'
import { checkDiskStorage, checkRamUsage } from '../utils/storage-monitor.js'
import { detectHardware } from '../utils/hardware.js'
import { hasActiveCheckpoint, loadCheckpoint } from '../utils/checkpoint.js'
import { listSnapshots, createSnapshot } from '../utils/config-snapshot.js'

export async function statusRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/status', async (_req, reply) => {
    const level = process.env.VELA_PREF_LEVEL ?? 'laie'
    const disk  = checkDiskStorage(level)
    const ram   = checkRamUsage()
    const hw    = detectHardware()

    const activeCheckpoint = hasActiveCheckpoint()
    const checkpoint = activeCheckpoint ? loadCheckpoint() : null

    const alerts: string[] = []
    if (disk.warning !== 'none') alerts.push(disk.message)
    if (ram.warning === 'critical' || ram.warning === 'low') {
      if (level === 'entwickler') {
        alerts.push(`RAM: ${ram.freeGb}GB frei / ${ram.totalGb}GB (${ram.usedPercent}%)`)
      } else {
        alerts.push(`Arbeitsspeicher läuft voll (${ram.usedPercent}% belegt).`)
      }
    }

    const body = JSON.stringify({
      ok: alerts.length === 0,
      alerts,
      disk: {
        freeGb:     disk.freeGb,
        totalGb:    disk.totalGb,
        usedPercent: disk.usedPercent,
        warning:    disk.warning,
      },
      ram: {
        freeGb:      ram.freeGb,
        totalGb:     ram.totalGb,
        usedPercent: ram.usedPercent,
        warning:     ram.warning,
      },
      hardware: {
        ram_gb:               hw.ram_gb,
        has_gpu:              hw.has_gpu,
        recommended_backend:  hw.recommended_backend,
      },
      backend: process.env.VELA_BACKEND ?? 'anthropic',
      checkpoint: activeCheckpoint ? {
        active:      true,
        description: checkpoint?.taskDescription,
        stepsTotal:  checkpoint?.steps.length,
        stepsDone:   checkpoint?.steps.filter(s => s.status === 'done').length,
      } : { active: false },
    })

    return reply
      .code(200)
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .send(body)
  })
  // GET /api/status/snapshots — Liste aller Snapshots
  fastify.get('/api/status/snapshots', async (_req, reply) => {
    const snapshots = listSnapshots()
    const body = JSON.stringify({ snapshots })
    return reply.header('Content-Type', 'application/json').send(body)
  })

  // POST /api/status/snapshots — Snapshot jetzt erstellen
  fastify.post('/api/status/snapshots', async (_req, reply) => {
    const path = createSnapshot()
    const body = JSON.stringify({ ok: Boolean(path), path })
    return reply.header('Content-Type', 'application/json').send(body)
  })
}
