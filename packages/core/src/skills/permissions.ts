// Permission-System – schrittweise Skill-Freischaltung
// Minimale Rechte bei Erstinstallation, Nutzer schaltet bewusst frei.

import type { SkillPermission } from '../types/index.js'

export interface PermissionGrant {
  permission:  SkillPermission
  grantedAt:   Date
  grantedBy:   'user'
  description: string
}

export interface PermissionRequest {
  skill:       string
  permission:  SkillPermission
  reason:      string
  riskNote?:   string | undefined
}

// Lesbare Beschreibungen pro Permission
export const PERMISSION_LABELS: Record<SkillPermission, { label: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  'fs:read':        { label: 'Dateien lesen',         description: 'Vela kann Dateien in von dir festgelegten Ordnern lesen.',               risk: 'low'    },
  'fs:write':       { label: 'Dateien schreiben',     description: 'Vela kann Dateien anlegen und verändern.',                               risk: 'medium' },
  'network:read':   { label: 'Internet lesen',        description: 'Vela kann Webseiten und APIs abfragen.',                                 risk: 'low'    },
  'network:write':  { label: 'Daten senden',          description: 'Vela kann Daten an externe Dienste senden.',                            risk: 'high'   },
  'email:read':     { label: 'E-Mails lesen',         description: 'Vela kann deine E-Mails lesen.',                                        risk: 'medium' },
  'email:write':    { label: 'E-Mails senden',        description: 'Vela kann E-Mails in deinem Namen verfassen und senden.',               risk: 'high'   },
  'calendar:read':  { label: 'Kalender lesen',        description: 'Vela kann deine Kalendertermine einsehen.',                             risk: 'low'    },
  'calendar:write': { label: 'Kalender bearbeiten',   description: 'Vela kann Termine in deinem Kalender anlegen und ändern.',              risk: 'medium' },
  'shell':          { label: 'Befehle ausführen',     description: 'Vela kann Terminal-Befehle auf deinem System ausführen.',               risk: 'high'   },
}

// ─── Persistence Adapter Interface ───────────────────────────────────────────
// Entkoppelt den PermissionManager von better-sqlite3 (läuft auch in UI/Tests)
export interface PermissionStore {
  load(): PermissionGrant[]
  save(grant: PermissionGrant): void
  remove(permission: SkillPermission): void
}

// No-op Store (Default, für UI / Tests ohne DB)
export class InMemoryPermissionStore implements PermissionStore {
  load(): PermissionGrant[] { return [] }
  save(_grant: PermissionGrant): void { /* no-op */ }
  remove(_permission: SkillPermission): void { /* no-op */ }
}

export class PermissionManager {
  private granted = new Map<SkillPermission, PermissionGrant>()
  private onRequest?: (req: PermissionRequest) => Promise<boolean>
  private store: PermissionStore

  constructor(store: PermissionStore = new InMemoryPermissionStore()) {
    this.store = store
    // Beim Initialisieren aus Store laden (synchron)
    const saved = this.store.load()
    for (const grant of saved) {
      this.granted.set(grant.permission, grant)
    }
  }

  /**
   * Callback wird aufgerufen wenn ein Skill eine neue Permission anfordert.
   */

  /**
   * Wechselt den Persistence-Store und lädt bestehende Grants.
   * Aufruf vor setRequestHandler empfohlen (Server-Startup).
   */
  setStore(store: PermissionStore): void {
    this.store = store
    const saved = store.load()
    for (const grant of saved) {
      this.granted.set(grant.permission, grant)
    }
  }

  setRequestHandler(handler: (req: PermissionRequest) => Promise<boolean>): void {
    this.onRequest = handler
  }

  has(permission: SkillPermission): boolean {
    return this.granted.has(permission)
  }

  async request(req: PermissionRequest): Promise<boolean> {
    if (this.has(req.permission)) return true

    if (!this.onRequest) {
      throw new Error('Kein Permission-Request-Handler registriert.')
    }

    const label = PERMISSION_LABELS[req.permission]
    const riskNote = req.riskNote ?? (label.risk === 'high' ? '⚠ Diese Berechtigung hat hohe Auswirkungen.' : undefined)
    const confirmed = await this.onRequest({
      skill:      req.skill,
      permission: req.permission,
      reason:     req.reason || label.description,
      ...(riskNote !== undefined ? { riskNote } : {}),
    })

    if (confirmed) {
      const grant: PermissionGrant = {
        permission:  req.permission,
        grantedAt:   new Date(),
        grantedBy:   'user',
        description: label.description,
      }
      this.granted.set(req.permission, grant)
      this.store.save(grant)
    }

    return confirmed
  }

  revoke(permission: SkillPermission): void {
    this.granted.delete(permission)
    this.store.remove(permission)
  }

  listGranted(): PermissionGrant[] {
    return Array.from(this.granted.values())
  }

  /** @deprecated Nutze store.load() / store.save() direkt */
  serialize(): Record<string, PermissionGrant> {
    const out: Record<string, PermissionGrant> = {}
    for (const [k, v] of this.granted.entries()) {
      out[k] = v
    }
    return out
  }

  /** @deprecated Nutze constructor(store) für Persistenz */
  restore(data: Record<string, PermissionGrant>): void {
    for (const [k, v] of Object.entries(data)) {
      this.granted.set(k as SkillPermission, {
        ...v,
        grantedAt: new Date(v.grantedAt),
      })
    }
  }
}

// Singleton mit InMemory-Store (wird vom Server mit SQLitePermissionStore überschrieben)
export const permissionManager = new PermissionManager()
