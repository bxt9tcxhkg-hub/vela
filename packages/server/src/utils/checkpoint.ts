/**
 * T-08: Aufgaben-Checkpoint und Abbruch-Recovery
 * Schreibt Fortschritts-Checkpoints für mehrstufige Aufgaben.
 * Beim Neustart: Wiederherstellungsangebot.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CHECKPOINT_DIR = join(__dirname, '../../../../.vela')
const CHECKPOINT_FILE = join(CHECKPOINT_DIR, 'checkpoint.json')

export interface TaskStep {
  index: number
  description: string
  status: 'pending' | 'done' | 'failed'
}

export interface Checkpoint {
  taskId: string
  taskDescription: string
  steps: TaskStep[]
  currentStep: number
  startedAt: string
  updatedAt: string
  context?: string  // kurze Zusammenfassung des bisherigen Fortschritts
}

function ensureDir(): void {
  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true })
  }
}

export function saveCheckpoint(checkpoint: Checkpoint): void {
  ensureDir()
  checkpoint.updatedAt = new Date().toISOString()
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf-8')
}

export function loadCheckpoint(): Checkpoint | null {
  if (!existsSync(CHECKPOINT_FILE)) return null
  try {
    const raw = readFileSync(CHECKPOINT_FILE, 'utf-8')
    return JSON.parse(raw) as Checkpoint
  } catch {
    return null
  }
}

export function clearCheckpoint(): void {
  if (existsSync(CHECKPOINT_FILE)) {
    writeFileSync(CHECKPOINT_FILE, '{}', 'utf-8')
  }
}

export function hasActiveCheckpoint(): boolean {
  const cp = loadCheckpoint()
  if (!cp || !cp.taskId) return false
  // Checkpoint gilt als aktiv wenn noch Schritte pending sind
  return cp.steps?.some((s) => s.status === 'pending') ?? false
}

export function getCheckpointResumeMessage(cp: Checkpoint, level: string): string {
  const remaining = cp.steps.filter((s) => s.status === 'pending').length
  const done = cp.steps.filter((s) => s.status === 'done').length

  if (level === 'entwickler') {
    return `Checkpoint: "${cp.taskDescription}" | ${done}/${cp.steps.length} Schritte done — weitermachen oder verwerfen?`
  }
  if (level === 'poweruser') {
    return `Unvollständige Aufgabe: "${cp.taskDescription}" (${done} von ${cp.steps.length} erledigt). Weitermachen?`
  }
  return `Es gibt eine unvollständige Aufgabe vom letzten Mal: "${cp.taskDescription}". Ich war bei Schritt ${done + 1} von ${cp.steps.length}. Soll ich weitermachen oder sollen wir das verwerfen?`
}

export function getCheckpointPath(): string {
  ensureDir()
  return CHECKPOINT_FILE
}
