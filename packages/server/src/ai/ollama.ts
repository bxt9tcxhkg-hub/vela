/**
 * Ollama Backend-Adapter
 * Kommuniziert mit dem lokalen Ollama-Dienst auf 127.0.0.1:11434.
 * Kein API-Key benötigt. Vollständig lokal — keine Daten verlassen das Gerät.
 */

import type { BackendAdapter, ChatMessage, ChatOptions } from './types.js'

const DEFAULT_OLLAMA_HOST  = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b'
const REQUEST_TIMEOUT_MS   = 120_000   // 2 Minuten (lokale Modelle können langsam sein)

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OllamaChatResponse {
  model: string
  message: { role: string; content: string }
  done: boolean
  total_duration?: number
}

interface OllamaTagsResponse {
  models: Array<{ name: string; size: number }>
}

export class OllamaAdapter implements BackendAdapter {
  readonly name = 'ollama'

  private get host(): string {
    return process.env.OLLAMA_HOST
      ? `http://${process.env.OLLAMA_HOST}`
      : DEFAULT_OLLAMA_HOST
  }

  private get defaultModel(): string {
    return process.env.DEFAULT_MODEL ?? DEFAULT_OLLAMA_MODEL
  }

  async isAvailable(): Promise<boolean> {
    try {
      const ctrl   = new AbortController()
      const timer  = setTimeout(() => ctrl.abort(), 3000)
      const res    = await fetch(`${this.host}/api/tags`, { signal: ctrl.signal })
      clearTimeout(timer)
      return res.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res  = await fetch(`${this.host}/api/tags`)
      if (!res.ok) return []
      const data = await res.json() as OllamaTagsResponse
      return data.models.map(m => m.name)
    } catch {
      return []
    }
  }

  async pullModel(model: string): Promise<void> {
    const res = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    })
    if (!res.ok) throw new Error(`Modell '${model}' konnte nicht geladen werden.`)
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<string> {
    const model = options?.model ?? this.defaultModel

    // Prüfen ob Modell verfügbar ist
    const available = await this.isAvailable()
    if (!available) {
      throw new Error(
        'Ollama ist nicht erreichbar. Stelle sicher, dass Ollama läuft. ' +
        'Starte es mit: ollama serve'
      )
    }

    const ollamaMessages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]

    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: false,
          options: {
            ...(options?.temperature !== undefined && { temperature: options.temperature }),
            ...(options?.maxTokens   !== undefined && { num_predict: options.maxTokens }),
          },
        }),
        signal: ctrl.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      throw new Error(`Ollama-Fehler (${res.status}): ${err}`)
    }

    const data = await res.json() as OllamaChatResponse
    return data.message?.content ?? ''
  }
}

// Singleton-Instanz
export const ollamaAdapter = new OllamaAdapter()
