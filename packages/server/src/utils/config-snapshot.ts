/**
 * T-09: Automatische Konfigurationssnapshots
 * Täglich wird ein Snapshot der .env-Konfiguration erstellt.
 * Bei Schaden: automatisches Wiederherstellungsangebot.
 * Sensible Daten (API-Keys) werden vor dem Speichern geschwärzt.
 */

import {
  readFileSync, writeFileSync, existsSync,
  mkdirSync, readdirSync, copyFileSync, statSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH       = join(__dirname, '../../../../packages/server/.env')
const SNAPSHOT_DIR   = join(__dirname, '../../../../.vela/snapshots')
const MAX_SNAPSHOTS  = 7   // 7 Tage aufbewahren

export interface SnapshotMeta {
  filename: string
  createdAt: string
  size: number
}

/** Schwärzt API-Keys für sichere Speicherung */
function redactEnv(content: string): string {
  return content
    .replace(/(ANTHROPIC_API_KEY=)(.+)/g, '$1[REDACTED]')
    .replace(/(OPENAI_API_KEY=)(.+)/g, '$1[REDACTED]')
    .replace(/(GROQ_API_KEY=)(.+)/g, '$1[REDACTED]')
    .replace(/(TELEGRAM_BOT_TOKEN=)(.+)/g, '$1[REDACTED]')
    .replace(/(GOOGLE_REFRESH_TOKEN=)(.+)/g, '$1[REDACTED]')
    .replace(/(GOOGLE_CLIENT_SECRET=)(.+)/g, '$1[REDACTED]')
    .replace(/(DISCORD_WEBHOOK_URL=)(.+)/g, '$1[REDACTED]')
}

function ensureSnapshotDir(): void {
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true })
  }
}

function getDateTag(): string {
  return new Date().toISOString().split('T')[0] ?? 'unknown'
}

function pruneOldSnapshots(): void {
  try {
    const files = readdirSync(SNAPSHOT_DIR)
      .filter(f => f.endsWith('.env.snapshot'))
      .map(f => ({ name: f, mtime: statSync(join(SNAPSHOT_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime)

    // Behalte nur MAX_SNAPSHOTS neueste
    for (const file of files.slice(MAX_SNAPSHOTS)) {
      const path = join(SNAPSHOT_DIR, file.name)
      writeFileSync(path, '', 'utf-8')  // Leer schreiben statt löschen (Sicherheit)
    }
  } catch { /* ignore */ }
}

export function createSnapshot(): string | null {
  if (!existsSync(ENV_PATH)) return null

  ensureSnapshotDir()

  const dateTag    = getDateTag()
  const snapFile   = join(SNAPSHOT_DIR, `${dateTag}.env.snapshot`)

  // Nur einmal pro Tag
  if (existsSync(snapFile)) return snapFile

  try {
    const raw     = readFileSync(ENV_PATH, 'utf-8')
    const redacted = redactEnv(raw)
    const header  = `# Vela Config Snapshot — ${new Date().toISOString()}\n# API-Keys wurden geschwärzt.\n\n`
    writeFileSync(snapFile, header + redacted, 'utf-8')
    pruneOldSnapshots()
    return snapFile
  } catch {
    return null
  }
}

export function listSnapshots(): SnapshotMeta[] {
  if (!existsSync(SNAPSHOT_DIR)) return []

  return readdirSync(SNAPSHOT_DIR)
    .filter(f => f.endsWith('.env.snapshot'))
    .map(f => {
      const fullPath = join(SNAPSHOT_DIR, f)
      const stat = statSync(fullPath)
      return {
        filename:  f,
        createdAt: stat.mtime.toISOString(),
        size:      stat.size,
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function shouldCreateSnapshot(): boolean {
  if (!existsSync(SNAPSHOT_DIR)) return true
  const dateTag  = getDateTag()
  const snapFile = join(SNAPSHOT_DIR, `${dateTag}.env.snapshot`)
  return !existsSync(snapFile)
}

/** Wird beim Server-Start aufgerufen */
export function initSnapshotSchedule(): void {
  // Sofort beim Start prüfen
  if (shouldCreateSnapshot()) {
    const path = createSnapshot()
    if (path) console.log(`✦ Config-Snapshot erstellt: ${path}`)
  }

  // Täglich um Mitternacht prüfen (alle 24h)
  const INTERVAL_MS = 24 * 60 * 60 * 1000
  setInterval(() => {
    if (shouldCreateSnapshot()) {
      const path = createSnapshot()
      if (path) console.log(`✦ Config-Snapshot erstellt: ${path}`)
    }
  }, INTERVAL_MS)
}
