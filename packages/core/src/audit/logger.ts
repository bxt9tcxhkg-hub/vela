// Immutable audit logger

import { createHmac } from 'crypto'
import type { AuditEntry } from '../types/index.js'

export class AuditLogger {
  private deviceKey: string
  private entries: AuditEntry[] = []

  constructor(deviceKey: string) {
    this.deviceKey = deviceKey
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'checksum'>): AuditEntry {
    const id = crypto.randomUUID()
    const timestamp = new Date()
    const checksum = this.computeChecksum({ id, timestamp, ...entry })

    const fullEntry: AuditEntry = { id, timestamp, checksum, ...entry }
    this.entries.push(fullEntry)
    return fullEntry
  }

  private computeChecksum(entry: Omit<AuditEntry, 'checksum'>): string {
    const payload = JSON.stringify(entry)
    return createHmac('sha256', this.deviceKey).update(payload).digest('hex')
  }

  verify(entry: AuditEntry): boolean {
    const { checksum, ...rest } = entry
    return this.computeChecksum(rest) === checksum
  }

  getAll(): readonly AuditEntry[] {
    return this.entries
  }
}
