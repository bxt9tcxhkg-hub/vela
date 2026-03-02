import React from 'react'
import { Message } from '../store/useVelaStore'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-warm rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-ink text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-8 h-8 rounded-full bg-sky-light flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sky text-sm font-fraunces font-semibold">&#10022;</span>
      </div>
      <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-sky-light rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="text-ink text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-8 h-8 rounded-full bg-sky-light flex items-center justify-center shrink-0">
        <span className="text-sky text-sm font-fraunces font-semibold">&#10022;</span>
      </div>
      <div className="bg-sky-light rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
          <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
          <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
        </div>
      </div>
    </div>
  )
}
