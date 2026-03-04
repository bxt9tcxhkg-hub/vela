import Anthropic from '@anthropic-ai/sdk'
import type { BackendAdapter, ChatMessage, ChatOptions, ChatResult } from './types.js'

export class AnthropicAdapter implements BackendAdapter {
  readonly name = 'anthropic'

  private get apiKey(): string { return process.env.ANTHROPIC_API_KEY ?? '' }
  private get model(): string  { return process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001' }

  async isAvailable(): Promise<boolean> { return Boolean(this.apiKey) }

  async chat(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<string> {
    const result = await this.chatWithUsage(messages, systemPrompt, options)
    return result.text
  }

  async chatWithUsage(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<ChatResult> {
    if (!this.apiKey) throw new Error('Kein Anthropic API Key konfiguriert.')
    const client = new Anthropic({ apiKey: this.apiKey })
    const response = await client.messages.create({
      model:      options?.model ?? this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system:     systemPrompt,
      messages,
    })
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type:'text'; text:string }).text)
      .join('')
    return {
      text,
      tokenUsage: {
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:  response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  async *stream(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('Kein Anthropic API Key konfiguriert.')
    const client = new Anthropic({ apiKey: this.apiKey })
    const stream = client.messages.stream({
      model:      options?.model ?? this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system:     systemPrompt,
      messages,
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}

export const anthropicAdapter = new AnthropicAdapter()
