// Ollama Provider – lokaler LLM-Betrieb (kein API-Key erforderlich)
// Kommuniziert mit dem Ollama-Dienst auf localhost:11434

import type { AIProvider } from './provider.js'
import type { CompletionOptions, CompletionResult, StreamChunk, Message } from '../types/index.js'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL    = 'llama3.1:8b'

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OllamaChatRequest {
  model: string
  messages: OllamaMessage[]
  stream: boolean
  options?: {
    temperature?: number | undefined
    num_predict?: number | undefined
  }
}

interface OllamaChatResponse {
  model: string
  message: OllamaMessage
  done: boolean
  eval_count?: number
  prompt_eval_count?: number
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama'

  constructor(
    private baseUrl: string = DEFAULT_BASE_URL,
    private defaultModel: string = DEFAULT_MODEL,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res  = await fetch(`${this.baseUrl}/api/tags`)
      const data = await res.json() as { models: Array<{ name: string }> }
      return data.models.map(m => m.name)
    } catch {
      return []
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model    = options.model ?? this.defaultModel
    const body: OllamaChatRequest = {
      model,
      stream: false,
      messages: this.toOllamaMessages(messages, options.systemPrompt),
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Ollama-Fehler: ${res.status} ${err}`)
    }

    const data = await res.json() as OllamaChatResponse

    return {
      content: data.message.content,
      model,
      usage: {
        promptTokens:     data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens:      (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    }
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const model    = options.model ?? this.defaultModel
    const body: OllamaChatRequest = {
      model,
      stream: true,
      messages: this.toOllamaMessages(messages, options.systemPrompt),
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (!res.ok || !res.body) {
      throw new Error(`Ollama-Stream-Fehler: ${res.status}`)
    }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n').filter(l => l.trim())
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line) as OllamaChatResponse
          if (chunk.message?.content) {
            yield { type: 'text', content: chunk.message.content }
          }
          if (chunk.done) {
            yield { type: 'done' }
          }
        } catch {
          // unvollständige Zeile – ignorieren
        }
      }
    }
  }

  private toOllamaMessages(messages: Message[], systemPrompt?: string): OllamaMessage[] {
    const result: OllamaMessage[] = []
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt })
    }
    for (const m of messages) {
      result.push({ role: m.role === 'system' ? 'system' : m.role, content: m.content })
    }
    return result
  }
}
