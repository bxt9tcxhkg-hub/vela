// Groq Provider – OpenAI-kompatible API, kostenlos, schnell
// Dokumentation: https://console.groq.com/docs/openai

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL  = 'llama-3.3-70b-versatile'

export async function chatGroq(
  messages: GroqMessage[],
  apiKey: string,
  model = DEFAULT_MODEL,
  systemPrompt?: string,
): Promise<string> {
  const msgs: GroqMessage[] = []
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
  msgs.push(...messages)

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: msgs,
      max_tokens: 1024,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  // Rate-Limit-Header auswerten
  const remaining = res.headers.get('x-ratelimit-remaining-requests')
  const resetAt   = res.headers.get('x-ratelimit-reset-requests')
  if (remaining === '0') {
    throw new GroqRateLimitError(resetAt ?? 'morgen')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Groq HTTP ${res.status}`)
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message?.content ?? ''
}

export class GroqRateLimitError extends Error {
  constructor(public resetAt: string) {
    super(`Groq Rate-Limit erreicht. Reset: ${resetAt}`)
    this.name = 'GroqRateLimitError'
  }
}

export async function listGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { data: Array<{ id: string }> }
    return data.data.map(m => m.id).filter(id => id.includes('llama') || id.includes('mixtral'))
  } catch {
    return []
  }
}
