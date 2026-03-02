// AI Provider abstraction layer

import type { CompletionOptions, CompletionResult, StreamChunk, Message } from '../types/index.js'

export interface AIProvider {
  name: string
  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>
  stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>
  isAvailable(): Promise<boolean>
}

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>()
  private defaultProvider: string | null = null

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name
    }
  }

  get(name?: string): AIProvider {
    const key = name ?? this.defaultProvider
    if (!key) throw new Error('No AI provider registered')
    const provider = this.providers.get(key)
    if (!provider) throw new Error(`Provider not found: ${key}`)
    return provider
  }

  list(): string[] {
    return Array.from(this.providers.keys())
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) throw new Error(`Provider not found: ${name}`)
    this.defaultProvider = name
  }
}

export const registry = new ProviderRegistry()
