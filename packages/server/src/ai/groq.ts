import Groq from 'groq-sdk'
import type { BackendAdapter, ChatMessage, ChatOptions, ChatResult } from './types.js'

const DEFAULT_MODEL = 'llama3-8b-8192'

export class GroqAdapter implements BackendAdapter {
  readonly name = 'groq'

  private get apiKey(): string { return process.env.GROQ_API_KEY ?? '' }

  async isAvailable(): Promise<boolean> { return Boolean(this.apiKey) }

  async chat(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<string> {
    const result = await this.chatWithUsage(messages, systemPrompt, options)
    return result.text
  }

  async chatWithUsage(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<ChatResult> {
    if (!this.apiKey) throw new Error('Kein Groq API Key konfiguriert.')
    const client = new Groq({ apiKey: this.apiKey })
    const model  = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]
    try {
      const completion = await client.chat.completions.create({
        model, messages: groqMessages, max_tokens: options?.maxTokens ?? 1024,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      })
      const usage = completion.usage
      const r: import('./types.js').ChatResult = { text: completion.choices[0]?.message?.content ?? '' }
      if (usage) r.tokenUsage = { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
      return r
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        throw new Error('Vela macht eine kurze Pause — das kostenlose Tageslimit ist erreicht. Morgen geht es weiter, oder du kannst in den Einstellungen auf lokalen Betrieb wechseln.')
      }
      throw err
    }
  }

  async *stream(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('Kein Groq API Key konfiguriert.')
    const client = new Groq({ apiKey: this.apiKey })
    const model  = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]
    try {
      const stream = await client.chat.completions.create({
        model, messages: groqMessages, max_tokens: options?.maxTokens ?? 1024, stream: true,
      })
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) yield text
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        throw new Error('Vela macht eine kurze Pause — das kostenlose Tageslimit ist erreicht.')
      }
      throw err
    }
  }
}

// Legacy
export async function chatGroq(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  return new GroqAdapter().chat(messages, systemPrompt ?? '')
}

export const groqAdapter = new GroqAdapter()
