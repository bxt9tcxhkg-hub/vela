import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'

const client = new Anthropic({ apiKey: config.anthropicApiKey })

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function* streamClaude(
  messages: ChatMessage[],
  systemPrompt?: string,
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: config.defaultModel,
    max_tokens: 1024,
    system: systemPrompt ?? `Du bist Vela, ein persönlicher KI-Assistent. Du bist hilfsbereit, präzise und auf Deutsch. Du handelst niemals ohne Bestätigung des Nutzers bei wichtigen Aktionen.`,
    messages,
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}
