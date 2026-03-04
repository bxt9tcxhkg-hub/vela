// OpenAI Adapter – GPT-4o via openai npm SDK
import OpenAI from 'openai'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  model = 'gpt-4o-mini',
  systemPrompt?: string,
): Promise<string> {
  const client = new OpenAI({ apiKey })

  const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const res = await client.chat.completions.create({
    model,
    messages: fullMessages,
    max_tokens: 1024,
  })

  return res.choices[0]?.message?.content ?? ''
}

export async function* streamOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  model = 'gpt-4o-mini',
  systemPrompt?: string,
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey })

  const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const stream = await client.chat.completions.create({
    model,
    messages: fullMessages,
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}
