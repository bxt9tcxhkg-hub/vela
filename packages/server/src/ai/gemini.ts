/**
 * Google Gemini Backend-Adapter
 *
 * Zwei Authentifizierungsmodi:
 *
 * 1. API-Key (empfohlen für Einsteiger):
 *    Kostenlos auf aistudio.google.com — kein Credit Card nötig.
 *    GEMINI_API_KEY=... in .env setzen.
 *
 * 2. OAuth via Google-Account (für Power-User):
 *    Über OpenClaw: `openclaw models auth login --provider google-gemini-cli`
 *    Danach wird der Token automatisch erkannt (GEMINI_OAUTH_TOKEN).
 *
 * Für Entwickler / Experten:
 *    Jedes OpenAI-kompatible Modell kann über VELA_OPENAI_COMPAT_BASE_URL
 *    und VELA_OPENAI_COMPAT_KEY eingebunden werden (OpenRouter, LM Studio,
 *    lokale llama.cpp Server, etc.)
 */

import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import type { BackendAdapter, ChatMessage, ChatOptions } from './types.js'

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

export class GeminiAdapter implements BackendAdapter {
  readonly name = 'gemini'

  private get apiKey(): string {
    return process.env.GEMINI_API_KEY ?? ''
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
      throw new Error(
        'Kein Gemini API Key konfiguriert. Kostenlos erstellen auf aistudio.google.com → API Key → "Create API Key".',
      )
    }

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_GEMINI_MODEL,
      systemInstruction: systemPrompt,
    })

    // Konvertiere Chat-History ins Gemini-Format
    const history: Content[] = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) throw new Error('Keine Nachricht zum Senden.')

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 1024,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      },
    })

    try {
      const result = await chat.sendMessage(lastMessage.content)
      return result.response.text()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Rate-Limit nutzerfreundlich
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        throw new Error(
          'Vela macht eine kurze Pause — das Gemini-Tageslimit ist erreicht. ' +
          'Das kostenlose Kontingent erneuert sich täglich.',
        )
      }
      throw err
    }
  }
}

export const geminiAdapter = new GeminiAdapter()
