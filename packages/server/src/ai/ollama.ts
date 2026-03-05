// Ollama Server-seitiger Adapter
// Kommuniziert mit dem lokalen Ollama-Dienst auf localhost:11434

export interface OlamaChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function chatOllama(
  messages: OlamaChatMessage[],
  model = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
  systemPrompt?: string,
): Promise<string> {
  const payload = {
    model,
    stream: false,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama-Fehler ${res.status}: ${err}`)
  }

  const data = await res.json() as { message: { content: string } }
  return data.message.content
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const res  = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    const data = await res.json() as { models: Array<{ name: string }> }
    return data.models.map(m => m.name)
  } catch {
    return []
  }
}
