/**
 * Groq Backend-Adapter
 * Kostenloser Cloud-Dienst für Open-Source-Modelle (Llama, Gemma).
 * Datenschutz: Anfragen verlassen das Gerät — Groq speichert nicht dauerhaft.
 */

import Groq from 'groq-sdk'
import type { BackendAdapter, ChatMessage, ChatOptions } from './types.js'

const DEFAULT_GROQ_MODEL = 'llama3-8b-8192'

export class GroqAdapter implements BackendAdapter {
  readonly name = 'groq'

  private get apiKey(): string {
    return process.env.GROQ_API_KEY ?? ''
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey)
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Kein Groq API Key konfiguriert. Bitte in den Einstellungen hinterlegen.')
    }

    const client = new Groq({ apiKey: this.apiKey })
    const model  = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_GROQ_MODEL

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]

    try {
      const completion = await client.chat.completions.create({
        model,
        messages:   groqMessages,
        max_tokens: options?.maxTokens ?? 1024,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      })

      return completion.choices[0]?.message?.content ?? ''
    } catch (err: unknown) {
      // Rate-Limit-Handling: Nutzerfreundliche Meldung statt API-Fehler (K-06)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        throw new Error(
          'Vela macht eine kurze Pause — das kostenlose Tageslimit ist erreicht. ' +
          'Morgen geht es weiter, oder du kannst in den Einstellungen auf lokalen Betrieb wechseln.'
        )
      }
      throw err
    }
  }
}

// Legacy-Export für Rückwärtskompatibilität
export async function chatGroq(
  messages: ChatMessage[],
  systemPrompt?: string,
  model?: string,
): Promise<string> {
  const adapter = new GroqAdapter()
  return adapter.chat(messages, systemPrompt ?? '', model ? { model } : undefined)
}

export const groqAdapter = new GroqAdapter()
