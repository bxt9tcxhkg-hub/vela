// Agent Planner – zerlegt Nutzereingaben in ausführbare PlannedActions
// Nutzt den BackendConnector (Ollama lokal oder Cloud-Provider)

import type { Message, PlannedAction, RiskLevel } from '../types/index.js'
import { connector } from '../ai/connector.js'

export interface PlannerOptions {
  maxSteps?: number
  verbose?:  boolean
}

// Skill-Registry: welche Skills sind verfügbar und wie werden sie erkannt
const SKILL_PATTERNS: Array<{
  skill:        string
  patterns:     RegExp[]
  riskLevel:    RiskLevel
  description:  (match: string) => string
}> = [
  {
    skill:    'web-search',
    patterns: [
      /such(e|en|t)( nach)?|find(e|en)|recherchier/i,
      /was ist|wer ist|wo ist|wann ist|wie funktioniert/i,
      /aktuelle? (news|nachrichten|infos?)/i,
    ],
    riskLevel:   'low',
    description: (input) => `Websuche: "${input.slice(0, 60)}"`,
  },
  {
    skill:    'file-manager',
    patterns: [
      /datei(en)?|ordner|verzeichnis/i,
      /lese?|öffne?|schreibe?|speichere?|erstell(e|en)/i,
      /dokument(e|en)?|desktop|downloads?/i,
    ],
    riskLevel:   'medium',
    description: (input) => `Dateizugriff: "${input.slice(0, 60)}"`,
  },
  {
    skill:    'email-reader',
    patterns: [
      /e-?mail(s)?( lesen| prüfen| checken| anzeigen)?/i,
      /posteingang|inbox|ungelesene?/i,
    ],
    riskLevel:   'medium',
    description: (_input) => 'E-Mails lesen',
  },
  {
    skill:    'email-sender',
    patterns: [
      /e-?mail( schreiben| senden| schicken)?/i,
      /schreib(e|en)?.*(an|@)/i,
      /send(e|en)? .*mail/i,
    ],
    riskLevel:   'high',
    description: (input) => `E-Mail senden: "${input.slice(0, 40)}"`,
  },
]

// Erkennt benötigte Skills aus dem Nutzer-Input per Pattern-Matching
function detectSkills(input: string): PlannedAction[] {
  const actions: PlannedAction[] = []

  for (const def of SKILL_PATTERNS) {
    if (def.patterns.some(p => p.test(input))) {
      actions.push({
        id:                   crypto.randomUUID(),
        skillName:            def.skill,
        params:               { query: input },
        riskLevel:            def.riskLevel,
        description:          def.description(input),
        requiresConfirmation: def.riskLevel !== 'low',
      })
    }
  }

  return actions
}

// LLM-basierte Plan-Verbesserung (optional, wenn Connector verfügbar)
async function refinePlanWithLLM(
  input:   string,
  actions: PlannedAction[],
): Promise<PlannedAction[]> {
  if (!(await connector.isAvailable())) return actions

  const systemPrompt = `Du bist ein Agent-Planner. Analysiere die Nutzeranfrage und entscheide welche Skills benötigt werden.
Verfügbare Skills: web-search, file-manager, email-reader, email-sender.
Antworte NUR mit JSON: [{"skillName":"...","description":"...","riskLevel":"low|medium|high"}]
Wenn keine Skills benötigt werden, antworte mit: []`

  try {
    const result = await connector.complete(
      [{ id: 'plan', role: 'user', content: input, timestamp: new Date() }],
      { systemPrompt, maxTokens: 256, temperature: 0.1 },
    )

    const jsonMatch = result.content.match(/\[.*\]/s)
    if (!jsonMatch) return actions

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      skillName:   string
      description: string
      riskLevel:   RiskLevel
    }>

    return parsed.map(item => ({
      id:                   crypto.randomUUID(),
      skillName:            item.skillName,
      params:               { query: input },
      riskLevel:            item.riskLevel ?? 'medium',
      description:          item.description,
      requiresConfirmation: item.riskLevel !== 'low',
    }))
  } catch {
    // LLM-Planung fehlgeschlagen → Pattern-Matching als Fallback
    return actions
  }
}

export class AgentPlanner {
  constructor(private options: PlannerOptions = {}) {}

  async plan(
    input:               string,
    _conversationHistory: Message[],
  ): Promise<PlannedAction[]> {
    const maxSteps = this.options.maxSteps ?? 5

    // Phase 1: Pattern-Matching (immer verfügbar, kein LLM nötig)
    let actions = detectSkills(input)

    // Phase 2: LLM-Verfeinerung (wenn Connector verfügbar)
    if (actions.length === 0) {
      actions = await refinePlanWithLLM(input, actions)
    }

    if (this.options.verbose && actions.length > 0) {
      console.log('[Planner] Plan:', actions.map(a => `${a.skillName}(${a.riskLevel})`).join(', '))
    }

    return actions.slice(0, maxSteps)
  }
}
