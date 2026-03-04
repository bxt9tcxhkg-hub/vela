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
  reason:      string          // Was der Skill damit tut, in Laien-Sprache
  riskNote?:   string          // Optionaler Risikohinweis
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

export class PermissionManager {
  private granted = new Map<SkillPermission, PermissionGrant>()
  private onRequest?: (req: PermissionRequest) => Promise<boolean>

  /**
   * Callback wird aufgerufen wenn ein Skill eine neue Permission anfordert.
   * Muss vom UI registriert werden (zeigt Bestätigungs-Dialog).
   */
  setRequestHandler(handler: (req: PermissionRequest) => Promise<boolean>): void {
    this.onRequest = handler
  }

  /**
   * Prüft ob eine Permission bereits erteilt wurde.
   */
  has(permission: SkillPermission): boolean {
    return this.granted.has(permission)
  }

  /**
   * Fordert eine Permission an. Wenn noch nicht erteilt, wird der
   * Request-Handler aufgerufen (UI zeigt Dialog).
   * Gibt true zurück wenn die Permission jetzt vorliegt.
   */
  async request(req: PermissionRequest): Promise<boolean> {
    if (this.has(req.permission)) return true

    if (!this.onRequest) {
      throw new Error('Kein Permission-Request-Handler registriert.')
    }

    const label = PERMISSION_LABELS[req.permission]
    const confirmed = await this.onRequest({
      ...req,
      reason:   req.reason || label.description,
      riskNote: req.riskNote ?? (label.risk === 'high' ? '⚠ Diese Berechtigung hat hohe Auswirkungen.' : undefined),
    })

    if (confirmed) {
      this.granted.set(req.permission, {
        permission:  req.permission,
        grantedAt:   new Date(),
        grantedBy:   'user',
        description: label.description,
      })
    }

    return confirmed
  }

  /**
   * Widerruft eine Permission. Der nächste Skill-Aufruf muss
   * sie erneut anfragen.
   */
  revoke(permission: SkillPermission): void {
    this.granted.delete(permission)
  }

  /**
   * Gibt alle erteilten Permissions zurück (für Einstellungsseite).
   */
  listGranted(): PermissionGrant[] {
    return Array.from(this.granted.values())
  }

  /**
   * Serialisierung für persistente Speicherung (SQLite / localStorage).
   */
  serialize(): Record<string, PermissionGrant> {
    const out: Record<string, PermissionGrant> = {}
    for (const [k, v] of this.granted.entries()) {
      out[k] = v
    }
    return out
  }

  restore(data: Record<string, PermissionGrant>): void {
    for (const [k, v] of Object.entries(data)) {
      this.granted.set(k as SkillPermission, {
        ...v,
        grantedAt: new Date(v.grantedAt),
      })
    }
  }
}

// Singleton
export const permissionManager = new PermissionManager()
