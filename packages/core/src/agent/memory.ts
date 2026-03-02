// Memory Manager – working memory + episodic retrieval

import type { Message, Conversation } from '../types/index.js'

export class MemoryManager {
  private conversations = new Map<string, Conversation>()
  private maxContextMessages = 20

  createConversation(): Conversation {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.conversations.set(conv.id, conv)
    return conv
  }

  addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
    const conv = this.conversations.get(conversationId)
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`)

    const fullMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...message,
    }

    conv.messages.push(fullMessage)
    conv.updatedAt = new Date()
    return fullMessage
  }

  getContextWindow(conversationId: string): Message[] {
    const conv = this.conversations.get(conversationId)
    if (!conv) return []
    return conv.messages.slice(-this.maxContextMessages)
  }
}
