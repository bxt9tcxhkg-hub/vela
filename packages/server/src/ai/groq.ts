import Groq from 'groq-sdk'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatGroq(
  messages: ChatMessage[],
  systemPrompt?: string,
  model = 'llama3-8b-8192',
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY ?? ''
  if (!apiKey) throw new Error('GROQ_API_KEY nicht konfiguriert')

  const client = new Groq({ apiKey })

  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const completion = await client.chat.completions.create({
    model,
    messages: groqMessages,
    max_tokens: 1024,
  })

  return completion.choices[0]?.message?.content ?? ''
}
