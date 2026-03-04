/**
 * Anthropic Claude Backend-Adapter
 */

import Anthropic from '@anthropic-ai/sdk'
import type { BackendAdapter, ChatMessage, ChatOptions } from './types.js'

export class AnthropicAdapter implements BackendAdapter {
  readonly name = 'anthropic'

  private get apiKey(): string {
    return process.env.ANTHROPIC_API_KEY ?? ''
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
      throw new Error('Kein Anthropic API Key konfiguriert. Bitte in den Einstellungen hinterlegen.')
    }

    const client = new Anthropic({ apiKey: this.apiKey })

    const response = await client.messages.create({
      model:      options?.model ?? process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: options?.maxTokens ?? 1024,
      system:     systemPrompt,
      messages,
    })

    return response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
  }
}

export const anthropicAdapter = new AnthropicAdapter()
