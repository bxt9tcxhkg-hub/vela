// Skill Runtime – lädt, validiert und führt Skills aus
// Zentrale Ausführungsschicht: alle Skill-Aufrufe laufen hierüber

import type { SkillManifest, PlannedAction } from '../types/index.js'
import { permissionManager } from './permissions.js'
import { AuditLogger } from '../audit/logger.js'

export interface SkillExecutor {
  execute(input: Record<string, unknown>): Promise<SkillResult>
}

export interface SkillResult {
  success:  boolean
  output?:  unknown
  summary?: string
  error?:   string
  durationMs?: number
}

export interface RegisteredSkill {
  manifest: SkillManifest
  executor: SkillExecutor
}

export class SkillRuntime {
  private skills = new Map<string, RegisteredSkill>()

  // Skill registrieren (Manifest + Executor)
  register(manifest: SkillManifest, executor: SkillExecutor): void {
    this.validate(manifest)
    this.skills.set(manifest.name, { manifest, executor })
  }

  // Skill aus YAML laden (Manifest-only, Executor wird später gebunden)
  loadManifest(manifest: SkillManifest): void {
    this.validate(manifest)
    // Executor als Stub bis er gebunden wird
    if (!this.skills.has(manifest.name)) {
      this.skills.set(manifest.name, {
        manifest,
        executor: {
          execute: async () => ({
            success: false,
            error:   `Skill '${manifest.name}' hat noch keinen Executor`,
          }),
        },
      })
    }
  }

  get(name: string): RegisteredSkill | undefined {
    return this.skills.get(name)
  }

  list(): SkillManifest[] {
    return Array.from(this.skills.values()).map(s => s.manifest)
  }

  // Skill ausführen mit Permission-Check + Audit-Log
  async execute(
    action:  PlannedAction,
    deviceKey = 'vela-default',
  ): Promise<SkillResult> {
    const skill = this.skills.get(action.skillName)
    if (!skill) {
      return { success: false, error: `Unbekannter Skill: ${action.skillName}` }
    }

    // Permission-Check für alle benötigten Permissions
    for (const permission of skill.manifest.permissions) {
      const granted = await permissionManager.request({
        skill:      action.skillName,
        permission,
        reason:     `Skill '${action.skillName}' benötigt diese Berechtigung`,
      })
      if (!granted) {
        return {
          success: false,
          error:   `Permission '${permission}' wurde verweigert`,
        }
      }
    }

    const logger = auditLogger(deviceKey)
    const start  = Date.now()

    try {
      const output     = await skill.executor.execute(action.params)
      const durationMs = Date.now() - start

      // Audit-Eintrag
      logger.log({
        actionId:  action.id,
        skillName: action.skillName,
        params:    action.params,
        decision:  { actionId: action.id, status: 'approved', riskLevel: action.riskLevel },
        result:    output,
        executionMs: durationMs,
      })

      return { ...output, durationMs }
    } catch (err) {
      logger.log({
        actionId:  action.id,
        skillName: action.skillName,
        params:    action.params,
        decision:  { actionId: action.id, status: 'rejected', riskLevel: action.riskLevel },
        result:    { error: String(err) },
      })
      return { success: false, error: String(err) }
    }
  }

  private validate(manifest: SkillManifest): void {
    if (!manifest.name)                       throw new Error('Skill: name fehlt')
    if (!manifest.version)                    throw new Error('Skill: version fehlt')
    if (!Array.isArray(manifest.permissions)) throw new Error('Skill: permissions muss ein Array sein')
  }
}


// Singleton
export const skillRuntime = new SkillRuntime()

function auditLogger(deviceKey: string) {
  return new AuditLogger(deviceKey)
}
