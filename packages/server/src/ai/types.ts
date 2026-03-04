export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface TokenUsage {
  inputTokens:  number
  outputTokens: number
  totalTokens:  number
}

export interface ChatResult {
  text:       string
  tokenUsage?: TokenUsage
}

export interface BackendAdapter {
  /** Blockierender Chat-Call */
  chat(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<string>

  /** Streaming-Call — yield chunks as they arrive */
  stream?(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): AsyncGenerator<string>

  /** Chat mit Token-Zählung */
  chatWithUsage?(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<ChatResult>

  isAvailable(): Promise<boolean>
  readonly name: string
}
