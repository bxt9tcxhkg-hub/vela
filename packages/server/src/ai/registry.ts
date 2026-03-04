/**
 * Backend-Adapter Registry
 * Zentrale Auswahl des aktiven Adapters basierend auf VELA_BACKEND.
 * Fallback-Logik: Groq → Anthropic → Fehlermeldung
 */

import type { BackendAdapter } from './types.js'
import { anthropicAdapter } from './anthropic.js'
import { groqAdapter }      from './groq.js'
import { ollamaAdapter }    from './ollama.js'
import { geminiAdapter }    from './gemini.js'
import { openaiAdapter }    from './openai.js'

export type BackendName = 'anthropic' | 'groq' | 'local' | 'openai'

const ADAPTERS: Record<string, BackendAdapter> = {
  anthropic: anthropicAdapter,
  groq:      groqAdapter,
  local:     ollamaAdapter,
  gemini:    geminiAdapter,
  openai:    openaiAdapter,
}

export function getAdapter(backend?: string): BackendAdapter {
  const name = backend ?? process.env.VELA_BACKEND ?? 'anthropic'
  return ADAPTERS[name] ?? anthropicAdapter
}

/** Fallback-Adapter: versucht bevorzugten Backend, dann nächsten verfügbaren */
export async function getAvailableAdapter(preferred?: string): Promise<BackendAdapter> {
  const preferredAdapter = getAdapter(preferred)
  if (await preferredAdapter.isAvailable()) return preferredAdapter

  // Fallback-Reihenfolge
  const fallbacks: BackendAdapter[] = [anthropicAdapter, groqAdapter, geminiAdapter, ollamaAdapter, openaiAdapter]
  for (const adapter of fallbacks) {
    if (adapter.name !== preferredAdapter.name && await adapter.isAvailable()) {
      console.log(`✦ Backend-Fallback: ${preferredAdapter.name} → ${adapter.name}`)
      return adapter
    }
  }

  // Kein Backend verfügbar
  return preferredAdapter  // Wird beim chat() einen sprechenden Fehler werfen
}

export { anthropicAdapter, groqAdapter, ollamaAdapter, geminiAdapter, openaiAdapter }
