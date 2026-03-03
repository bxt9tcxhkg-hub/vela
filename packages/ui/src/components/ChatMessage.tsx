import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Message } from '../store/useVelaStore'

interface ChatMessageProps {
  message: Message
}

function formatTime(ts: Date): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(ts)
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex flex-col items-end mb-4">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-warm border border-sand rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-ink text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="text-bark text-xs mt-1 mr-1">{formatTime(message.timestamp)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-sky-light border border-sky/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sky text-sm font-fraunces font-semibold leading-none">&#10022;</span>
      </div>
      <div className="flex flex-col items-start">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-sky-light border border-sky/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-ink text-sm leading-relaxed">{message.content}</p>
        </div>
        {message.skillUsed && (
          <span className="text-xs text-bark mt-1 ml-1 flex items-center gap-1">
            🔍 Web-Suche verwendet
          </span>
        )}
        <span className="text-bark text-xs mt-1 ml-1">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-sky-light border border-sky/20 flex items-center justify-center shrink-0">
        <span className="text-sky text-sm font-fraunces font-semibold leading-none">&#10022;</span>
      </div>
      <div className="bg-sky-light border border-sky/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 items-center h-4">
            <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-sky inline-block"></span>
          </div>
          <span className="text-xs text-sky/80 italic">Vela denkt nach...</span>
        </div>
      </div>
    </div>
  )
}
