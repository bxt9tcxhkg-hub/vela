/**
 * T-07: Kontextfenster-Indikator
 * Nutzt echte Token-Zahlen aus der API-Antwort wenn verfügbar,
 * fällt auf Schätzung zurück (~4 Zeichen = 1 Token).
 */

import type { TokenUsage } from '../ai/types.js'

export interface ContextStats {
  estimatedTokens:  number
  maxTokens:        number
  fillPercent:      number
  warningThreshold: boolean
  isExact:          boolean   // true = echte Tokens, false = Schätzung
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const MODEL_CONTEXT: Record<string, number> = {
  'claude-haiku-4-5': 200000,
  'claude-sonnet':    200000,
  'claude-opus':      200000,
  'llama3.1:8b':      131072,
  'llama3-8b-8192':   8192,
  'llama3-70b-8192':  8192,
  'gemma2-9b-it':     8192,
  'mixtral-8x7b':     32768,
  'gemini-2.0-flash': 1048576,
  'gemini-1.5-flash': 1048576,
  'gpt-4o':           128000,
  'gpt-4o-mini':      128000,
  'gpt-4':            8192,
  'default':          8192,
}

function getContextWindow(model: string): number {
  for (const [key, value] of Object.entries(MODEL_CONTEXT)) {
    if (model.toLowerCase().includes(key)) return value
  }
  return MODEL_CONTEXT['default'] ?? 8192
}

export function analyzeContext(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string,
  tokenUsage?: TokenUsage,
): ContextStats {
  const maxTokens = getContextWindow(model)

  // Wenn echte Token-Zahlen vorhanden: direkt verwenden
  if (tokenUsage?.totalTokens) {
    const fillPercent = Math.round((tokenUsage.totalTokens / maxTokens) * 100)
    return {
      estimatedTokens:  tokenUsage.totalTokens,
      maxTokens,
      fillPercent,
      warningThreshold: fillPercent >= 70,
      isExact: true,
    }
  }

  // Fallback: Schätzung
  const allText        = systemPrompt + messages.map(m => m.content).join(' ')
  const estimatedTokens = estimateTokens(allText)
  const fillPercent    = Math.round((estimatedTokens / maxTokens) * 100)

  return {
    estimatedTokens,
    maxTokens,
    fillPercent,
    warningThreshold: fillPercent >= 70,
    isExact: false,
  }
}

export function getContextWarningMessage(stats: ContextStats, level: string): string {
  if (!stats.warningThreshold) return ''
  const exact = stats.isExact ? '' : ' (Schätzung)'

  if (level === 'entwickler') {
    return `[Kontext: ${stats.estimatedTokens}/${stats.maxTokens} Tokens (~${stats.fillPercent}%)${exact} — Komprimierung empfohlen]`
  }
  if (level === 'poweruser') {
    return `Unser Gespräch wird lang (${stats.fillPercent}% Kapazität). Soll ich es kurz zusammenfassen?`
  }
  return 'Unser Gespräch wird sehr lang — soll ich kurz zusammenfassen was wir bisher besprochen haben?'
}
