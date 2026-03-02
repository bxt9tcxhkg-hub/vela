// Skill Runtime – loads, validates, and executes skill manifests

import { parse as parseYaml } from 'yaml'
import type { SkillManifest } from '../types/index.js'

export class SkillRuntime {
  private skills = new Map<string, SkillManifest>()

  loadFromYaml(yamlContent: string): SkillManifest {
    const manifest = parseYaml(yamlContent) as SkillManifest
    this.validate(manifest)
    this.skills.set(manifest.name, manifest)
    return manifest
  }

  private validate(manifest: SkillManifest): void {
    if (!manifest.name) throw new Error('Skill manifest missing required field: name')
    if (!manifest.version) throw new Error('Skill manifest missing required field: version')
    if (!Array.isArray(manifest.permissions)) throw new Error('Skill manifest: permissions must be an array')
  }

  get(name: string): SkillManifest | undefined {
    return this.skills.get(name)
  }

  list(): SkillManifest[] {
    return Array.from(this.skills.values())
  }
}
