// SQLite-backed PermissionStore für den Vela-Server
import type { PermissionGrant, PermissionStore } from '@vela/core'
import type { SkillPermission } from '@vela/core'
import { PERMISSION_LABELS } from '@vela/core'
import db from './database.js'

interface PermissionRow {
  permission_type: string
  skill_id:        string
  granted_at:      string
  granted_by:      string
  risk_level:      string
  description:     string
}

export class SQLitePermissionStore implements PermissionStore {
  load(): PermissionGrant[] {
    const rows = db.prepare('SELECT * FROM permissions').all() as PermissionRow[]
    return rows.map(row => ({
      permission: row.permission_type as SkillPermission,
      grantedAt:  new Date(row.granted_at),
      grantedBy:  'user' as const,
      description: row.description,
    }))
  }

  save(grant: PermissionGrant): void {
    const label = PERMISSION_LABELS[grant.permission]
    db.prepare(`
      INSERT OR REPLACE INTO permissions
        (permission_type, skill_id, granted_at, granted_by, risk_level, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      grant.permission,
      'user',
      grant.grantedAt.toISOString(),
      grant.grantedBy,
      label?.risk ?? 'low',
      grant.description,
    )
  }

  remove(permission: SkillPermission): void {
    db.prepare('DELETE FROM permissions WHERE permission_type = ?').run(permission)
  }
}
