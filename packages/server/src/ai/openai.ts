import type { BackendAdapter, ChatMessage, ChatOptions, ChatResult } from './types.js'

// Re-export legacy interface for compat
export type { ChatMessage }

const DEFAULT_MODEL   = 'gpt-4o-mini'
const DEFAULT_BASE    = 'https://api.openai.com/v1'

export class OpenAIAdapter implements BackendAdapter {
  readonly name = 'openai'

  private get apiKey():  string { return process.env.OPENAI_API_KEY ?? 'no-key' }
  private get baseUrl(): string { return process.env.VELA_OPENAI_BASE_URL ?? DEFAULT_BASE }

  async isAvailable(): Promise<boolean> {
    if (this.baseUrl !== DEFAULT_BASE) return true
    return Boolean(process.env.OPENAI_API_KEY)
  }

  async chat(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<string> {
    const result = await this.chatWithUsage(messages, systemPrompt, options)
    return result.text
  }

  async chatWithUsage(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<ChatResult> {
    if (this.baseUrl === DEFAULT_BASE && !process.env.OPENAI_API_KEY) {
      throw new Error('Kein OpenAI API Key konfiguriert.')
    }
    const model = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model, max_tokens: options?.maxTokens ?? 1024,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 429) throw new Error('Rate-Limit erreicht. Bitte kurz warten.')
      throw new Error(`OpenAI-Fehler (${res.status}): ${errText}`)
    }
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
      usage?: { prompt_tokens:number; completion_tokens:number; total_tokens:number }
    }
    const r: import('./types.js').ChatResult = { text: data.choices[0]?.message?.content ?? '' }
    if (data.usage) r.tokenUsage = { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
    return r
  }

  async *stream(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): AsyncGenerator<string> {
    if (this.baseUrl === DEFAULT_BASE && !process.env.OPENAI_API_KEY) {
      throw new Error('Kein OpenAI API Key konfiguriert.')
    }
    const model = options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model, max_tokens: options?.maxTokens ?? 1024, stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    if (!res.ok || !res.body) throw new Error(`OpenAI-Stream-Fehler (${res.status})`)
    const reader = res.body.getReader()
    const dec    = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { choices: Array<{ delta?: { content?: string } }> }
          const text = parsed.choices[0]?.delta?.content
          if (text) yield text
        } catch { /* skip malformed */ }
      }
    }
  }
}

export const openaiAdapter = new OpenAIAdapter()
