/**
 * OpenAI / OpenAI-kompatibler Backend-Adapter
 *
 * Unterstützt:
 * - OpenAI direkt (api.openai.com) mit API-Key
 * - Jeden OpenAI-kompatiblen Endpunkt via VELA_OPENAI_BASE_URL:
 *     LM Studio       → http://localhost:1234/v1
 *     Ollama OpenAI   → http://localhost:11434/v1
 *     OpenRouter      → https://openrouter.ai/api/v1
 *     Together AI     → https://api.together.xyz/v1
 *     lokale llama.cpp → http://localhost:8080/v1
 *     etc.
 *
 * Für Experten: Setze VELA_OPENAI_BASE_URL + OPENAI_API_KEY (oder leer lassen
 * für lokale Endpoints die keinen Key brauchen).
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

import type { BackendAdapter, ChatOptions } from './types.js'

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL     = 'https://api.openai.com/v1'

export class OpenAIAdapter implements BackendAdapter {
  readonly name = 'openai'

  private get apiKey(): string {
    return process.env.OPENAI_API_KEY ?? 'no-key'  // lokale Endpoints brauchen oft keinen Key
  }

  private get baseUrl(): string {
    return process.env.VELA_OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  }

  async isAvailable(): Promise<boolean> {
    // Lokale Endpunkte (LM Studio, Ollama OpenAI-compat) brauchen keinen Key
    if (this.baseUrl !== DEFAULT_BASE_URL) return true
    return Boolean(process.env.OPENAI_API_KEY)
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<string> {
    if (this.baseUrl === DEFAULT_BASE_URL && !process.env.OPENAI_API_KEY) {
      throw new Error(
        'Kein OpenAI API Key konfiguriert. Erstellen auf platform.openai.com → API keys.',
      )
    }

    const model = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_OPENAI_MODEL

    const body = JSON.stringify({
      model,
      max_tokens: options?.maxTokens ?? 1024,
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 429) {
        throw new Error('Rate-Limit erreicht. Bitte kurz warten oder auf ein anderes Backend wechseln.')
      }
      throw new Error(`OpenAI-Fehler (${res.status}): ${errText}`)
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }
}

export const openaiAdapter = new OpenAIAdapter()
