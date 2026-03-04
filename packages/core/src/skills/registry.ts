// SkillRegistry – lädt Community-Skills von GitHub-basierter Registry
// Registry-URL konfigurierbar für Self-Hosted-Nutzer

export interface RegistrySkill {
  id:          string
  name:        string
  version:     string
  author:      string
  verified:    boolean
  description: string
  permissions: string[]
  riskLevel:   'low' | 'medium' | 'high'
  category?:   string
  repository:  string
  downloadUrl: string
  icon?:       string
}

export interface RegistryIndex {
  skills:    RegistrySkill[]
  updatedAt: string
  version:   string
}

const DEFAULT_REGISTRY_URL =
  process.env.VELA_SKILL_REGISTRY_URL ??
  'https://raw.githubusercontent.com/bxt9tcxhkg-hub/vela-skills-registry/main/registry.json'

const CACHE_TTL_MS = 60 * 60 * 1000  // 1 Stunde

interface CacheEntry {
  data:      RegistryIndex
  fetchedAt: number
}

let cache: CacheEntry | null = null

export class SkillRegistry {
  private registryUrl: string

  constructor(registryUrl = DEFAULT_REGISTRY_URL) {
    this.registryUrl = registryUrl
  }

  /**
   * Lädt alle verfügbaren Skills aus der Registry (mit Caching).
   * Bei Netzwerkfehler: gibt gecachte Daten zurück (offline-fähig).
   */
  async fetchAvailable(): Promise<RegistrySkill[]> {
    const now = Date.now()
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.data.skills
    }

    try {
      const res = await fetch(this.registryUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'Vela/0.1.0' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json() as RegistryIndex
      cache = { data, fetchedAt: now }
      return data.skills
    } catch (err) {
      if (cache) {
        console.warn('[SkillRegistry] Offline – nutze gecachte Daten:', (err as Error).message)
        return cache.data.skills
      }
      console.error('[SkillRegistry] Registry nicht erreichbar:', (err as Error).message)
      return []
    }
  }

  /**
   * Gibt einen einzelnen Skill zurück.
   */
  async find(skillId: string): Promise<RegistrySkill | undefined> {
    const skills = await this.fetchAvailable()
    return skills.find(s => s.id === skillId)
  }

  /**
   * Sucht Skills nach Name/Beschreibung.
   */
  async search(query: string): Promise<RegistrySkill[]> {
    const skills = await this.fetchAvailable()
    const q = query.toLowerCase()
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q),
    )
  }

  /**
   * Installiert einen Skill – lädt Dateien in ~/.vela/skills/<skillId>/
   */
  async install(skillId: string, targetDir: string): Promise<{ success: boolean; error?: string }> {
    const skill = await this.find(skillId)
    if (!skill) return { success: false, error: `Skill '${skillId}' nicht in Registry gefunden.` }

    try {
      const { mkdir, writeFile } = await import('node:fs/promises')
      const { join } = await import('node:path')

      const skillDir = join(targetDir, skillId)
      await mkdir(skillDir, { recursive: true })

      // Manifest herunterladen
      const manifestUrl = skill.downloadUrl.replace(/\/$/, '') + '/manifest.yaml'
      const codeUrl     = skill.downloadUrl.replace(/\/$/, '') + '/index.ts'

      const [manifestRes, codeRes] = await Promise.all([
        fetch(manifestUrl, { signal: AbortSignal.timeout(15_000) }),
        fetch(codeUrl,     { signal: AbortSignal.timeout(15_000) }),
      ])

      if (!manifestRes.ok || !codeRes.ok) {
        return { success: false, error: 'Download fehlgeschlagen – Dateien nicht erreichbar.' }
      }

      await Promise.all([
        writeFile(join(skillDir, 'manifest.yaml'), await manifestRes.text(), 'utf-8'),
        writeFile(join(skillDir, 'index.ts'),      await codeRes.text(),     'utf-8'),
      ])

      // Meta-Datei für spätere Verwaltung
      await writeFile(join(skillDir, '.vela-skill.json'), JSON.stringify({
        id:          skill.id,
        version:     skill.version,
        author:      skill.author,
        verified:    skill.verified,
        installedAt: new Date().toISOString(),
      }, null, 2), 'utf-8')

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Deinstalliert einen Skill.
   */
  async uninstall(skillId: string, targetDir: string): Promise<void> {
    const { rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    await rm(join(targetDir, skillId), { recursive: true, force: true })
  }

  /**
   * Prüft welche installierten Skills Updates haben.
   */
  async checkForUpdates(installedSkills: Array<{ id: string; version: string }>): Promise<Array<{
    id:             string
    currentVersion: string
    newVersion:     string
  }>> {
    const available = await this.fetchAvailable()
    const updates: Array<{ id: string; currentVersion: string; newVersion: string }> = []

    for (const installed of installedSkills) {
      const latest = available.find(s => s.id === installed.id)
      if (latest && latest.version !== installed.version) {
        updates.push({ id: installed.id, currentVersion: installed.version, newVersion: latest.version })
      }
    }

    return updates
  }

  /**
   * Security-Check: Ist ein Skill verifiziert?
   */
  getSecurityInfo(skill: RegistrySkill): {
    verified:   boolean
    riskLevel:  'low' | 'medium' | 'high'
    requiresTypedConfirmation: boolean
  } {
    return {
      verified:   skill.verified,
      riskLevel:  skill.riskLevel,
      requiresTypedConfirmation: skill.riskLevel === 'high' && !skill.verified,
    }
  }
}

export const skillRegistry = new SkillRegistry()
