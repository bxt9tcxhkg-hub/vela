import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import type { BackendAdapter, ChatMessage, ChatOptions, ChatResult } from './types.js'

const DEFAULT_MODEL = 'gemini-2.0-flash'

export class GeminiAdapter implements BackendAdapter {
  readonly name = 'gemini'

  private get apiKey(): string { return process.env.GEMINI_API_KEY ?? '' }

  async isAvailable(): Promise<boolean> { return Boolean(this.apiKey) }

  async chat(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<string> {
    const result = await this.chatWithUsage(messages, systemPrompt, options)
    return result.text
  }

  async chatWithUsage(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): Promise<ChatResult> {
    if (!this.apiKey) throw new Error('Kein Gemini API Key. Kostenlos: aistudio.google.com → API Key → Create.')
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL,
      systemInstruction: systemPrompt,
    })
    const history: Content[] = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) throw new Error('Keine Nachricht.')
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 1024,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      },
    })
    try {
      const result = await chat.sendMessage(lastMsg.content)
      const response = result.response
      const usageMeta = response.usageMetadata
      const r: import('./types.js').ChatResult = { text: response.text() }
      if (usageMeta) r.tokenUsage = { inputTokens: usageMeta.promptTokenCount ?? 0, outputTokens: usageMeta.candidatesTokenCount ?? 0, totalTokens: usageMeta.totalTokenCount ?? 0 }
      return r
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        throw new Error('Vela macht eine kurze Pause — das Gemini-Tageslimit ist erreicht. Das kostenlose Kontingent erneuert sich täglich.')
      }
      throw err
    }
  }

  async *stream(messages: ChatMessage[], systemPrompt: string, options?: ChatOptions): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('Kein Gemini API Key.')
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: options?.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL,
      systemInstruction: systemPrompt,
    })
    const history: Content[] = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) throw new Error('Keine Nachricht.')
    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastMsg.content)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }
}

export const geminiAdapter = new GeminiAdapter()
