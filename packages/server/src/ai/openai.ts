// OpenAI Adapter – stub for later implementation
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function* streamOpenAI(
  _messages: ChatMessage[],
  _systemPrompt?: string,
): AsyncGenerator<string> {
  throw new Error('OpenAI adapter not yet implemented')
  yield '' // satisfy TypeScript generator requirement
}
