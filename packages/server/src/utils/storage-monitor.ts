/**
 * T-04: Speicherverbrauch-Monitoring
 * Überwacht Festplatten-Füllstand und warnt bei kritischem Niveau.
 * Nutzerfreundliche Meldung, kein technischer Fehler-Text.
 */

import { execSync } from 'child_process'
import os from 'os'

export interface StorageStatus {
  freeGb: number
  totalGb: number
  usedPercent: number
  warning: 'none' | 'low' | 'critical'
  message: string
}

export interface RamStatus {
  freeGb: number
  totalGb: number
  usedPercent: number
  warning: 'none' | 'low' | 'critical'
}

const DISK_WARN_PERCENT  = 85   // Warnung ab 85% voll
const DISK_CRIT_PERCENT  = 95   // Kritisch ab 95% voll
const RAM_WARN_PERCENT   = 85
const RAM_CRIT_PERCENT   = 95

function getFreeDiskGb(): { free: number; total: number } {
  try {
    if (process.platform === 'win32') {
      const result = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:csv', {
        encoding: 'utf-8', timeout: 3000,
      })
      const lines = result.trim().split('\n').filter(l => l.includes(','))
      const parts = lines[lines.length - 1]?.split(',') ?? []
      const free  = parseInt(parts[1] ?? '0', 10) / 1073741824
      const total = parseInt(parts[2] ?? '0', 10) / 1073741824
      return { free: Math.round(free), total: Math.round(total) }
    } else {
      const result = execSync("df -BG / | awk 'NR==2 {print $2, $4}'", {
        encoding: 'utf-8', timeout: 3000,
      }).trim()
      const [totalStr, freeStr] = result.split(' ')
      return {
        total: parseInt(totalStr?.replace('G', '') ?? '0', 10),
        free: parseInt(freeStr?.replace('G', '') ?? '0', 10),
      }
    }
  } catch {
    return { free: 99, total: 100 }
  }
}

export function checkDiskStorage(level = 'laie'): StorageStatus {
  const { free, total } = getFreeDiskGb()
  const usedPercent = Math.round(((total - free) / total) * 100)

  let warning: StorageStatus['warning'] = 'none'
  let message = ''

  if (usedPercent >= DISK_CRIT_PERCENT) {
    warning = 'critical'
    if (level === 'entwickler') {
      message = `Disk: ${free}GB frei / ${total}GB total (${usedPercent}% voll) — KRITISCH`
    } else if (level === 'poweruser') {
      message = `Speicher fast voll (${usedPercent}%). Vela könnte instabil werden — bitte Platz schaffen.`
    } else {
      message = `Dein Computer hat kaum noch freien Speicherplatz (noch ${free} GB). Bitte lösche nicht mehr benötigte Dateien, damit Vela weiterhin gut funktioniert.`
    }
  } else if (usedPercent >= DISK_WARN_PERCENT) {
    warning = 'low'
    if (level === 'entwickler') {
      message = `Disk: ${free}GB frei / ${total}GB (${usedPercent}%) — Warnung`
    } else if (level === 'poweruser') {
      message = `Speicher wird knapp (${usedPercent}% voll, ${free}GB frei).`
    } else {
      message = `Dein Speicherplatz wird langsam knapp (noch ${free} GB frei). Kein Problem für jetzt, aber gut zu wissen.`
    }
  }

  return { freeGb: free, totalGb: total, usedPercent, warning, message }
}

export function checkRamUsage(): RamStatus {
  const totalBytes = os.totalmem()
  const freeBytes  = os.freemem()
  const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100)
  const freeGb  = Math.round(freeBytes  / 1073741824)
  const totalGb = Math.round(totalBytes / 1073741824)

  let warning: RamStatus['warning'] = 'none'
  if (usedPercent >= RAM_CRIT_PERCENT) warning = 'critical'
  else if (usedPercent >= RAM_WARN_PERCENT) warning = 'low'

  return { freeGb, totalGb, usedPercent, warning }
}

export function getStorageWarningMessage(disk: StorageStatus, ram: RamStatus, level: string): string {
  const msgs: string[] = []

  if (disk.warning !== 'none') msgs.push(disk.message)

  if (ram.warning === 'critical') {
    if (level === 'entwickler') {
      msgs.push(`RAM: ${ram.freeGb}GB frei / ${ram.totalGb}GB (${ram.usedPercent}%) — KRITISCH`)
    } else if (level === 'poweruser') {
      msgs.push(`Arbeitsspeicher fast voll (${ram.usedPercent}%). Andere Programme schließen empfohlen.`)
    } else {
      msgs.push(`Dein Computer hat gerade wenig freien Arbeitsspeicher. Vela läuft möglicherweise langsamer. Schließe andere Programme wenn möglich.`)
    }
  }

  return msgs.join('\n')
}
