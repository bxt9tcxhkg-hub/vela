/**
 * Einheitliches Backend-Adapter Interface
 * Alle Adapter implementieren dieses Interface — egal ob Ollama, Groq oder Cloud.
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface BackendAdapter {
  chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<string>

  /** Health-Check: Ist der Backend-Dienst erreichbar? */
  isAvailable(): Promise<boolean>

  /** Name des Adapters für Logging */
  readonly name: string
}
