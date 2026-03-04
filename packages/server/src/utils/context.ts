/**
 * T-07: Kontextfenster-Indikator
 * Schätzt die Tokenanzahl und warnt bei 70% Auslastung.
 */

export interface ContextStats {
  estimatedTokens: number
  maxTokens: number
  fillPercent: number
  warningThreshold: boolean  // true wenn >= 70%
}

// Grobe Schätzung: ~4 Zeichen = 1 Token (gilt für DE/EN)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-haiku-4-5-20251001': 200000,
  'claude-sonnet': 200000,
  'llama3.1:8b': 131072,
  'llama3-8b-8192': 8192,   // Groq
  'gemma2-9b-it': 8192,     // Groq
  'mixtral-8x7b-32768': 32768, // Groq
  'default': 8192,
}

function getContextWindow(model: string): number {
  for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (model.includes(key)) return value
  }
  return MODEL_CONTEXT_WINDOWS['default'] ?? 8192
}

export function analyzeContext(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string,
): ContextStats {
  const allText = systemPrompt + messages.map((m) => m.content).join(' ')
  const estimatedTokens = estimateTokens(allText)
  const maxTokens = getContextWindow(model)
  const fillPercent = Math.round((estimatedTokens / maxTokens) * 100)

  return {
    estimatedTokens,
    maxTokens,
    fillPercent,
    warningThreshold: fillPercent >= 70,
  }
}

export function getContextWarningMessage(stats: ContextStats, level: string): string {
  if (!stats.warningThreshold) return ''

  if (level === 'entwickler') {
    return `[Kontext: ${stats.estimatedTokens}/${stats.maxTokens} Tokens (~${stats.fillPercent}%) — Komprimierung empfohlen]`
  }
  if (level === 'poweruser') {
    return `Unser Gespräch wird lang (${stats.fillPercent}% Kapazität). Soll ich es kurz zusammenfassen?`
  }
  // laie default
  return `Unser Gespräch wird sehr lang — soll ich kurz zusammenfassen was wir bisher besprochen haben?`
}
