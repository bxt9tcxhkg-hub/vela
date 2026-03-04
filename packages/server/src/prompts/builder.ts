import { BACKBONE_PROMPT } from './backbone.js'
import { LEVEL_LAIE, LEVEL_POWERUSER, LEVEL_ENTWICKLER } from './levels.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export type UserLevel = 'laie' | 'poweruser' | 'entwickler'
export type BackendMode = 'local' | 'groq' | 'cloud'

export interface PromptVars {
  name?: string
  language?: string
  tone?: string
  purpose?: string
  level?: UserLevel
  backendMode?: BackendMode
  backendModel?: string
}

function getLevelModule(level: UserLevel): string {
  switch (level) {
    case 'poweruser': return LEVEL_POWERUSER
    case 'entwickler': return LEVEL_ENTWICKLER
    default: return LEVEL_LAIE
  }
}

export function buildSystemPrompt(vars: PromptVars): string {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const checkpointPath = join(__dirname, '../../../.vela_checkpoint.json')

  const level: UserLevel = vars.level ?? 'laie'
  const backendMode: BackendMode = vars.backendMode ?? 'local'
  const backendModel = vars.backendModel ?? process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001'

  const combined = BACKBONE_PROMPT + '\n\n' + getLevelModule(level)

  return combined
    .replace(/\{\{prefs\.name\}\}/g, vars.name ?? '')
    .replace(/\{\{prefs\.language\}\}/g, vars.language ?? 'Deutsch')
    .replace(/\{\{prefs\.tone\}\}/g, vars.tone ?? 'einfach')
    .replace(/\{\{prefs\.purpose\}\}/g, vars.purpose ?? 'alltag')
    .replace(/\{\{prefs\.level\}\}/g, level)
    .replace(/\{\{backend\.mode\}\}/g, backendMode)
    .replace(/\{\{backend\.model\}\}/g, backendModel)
    .replace(/\{\{storage\.checkpoint_path\}\}/g, checkpointPath)
}
