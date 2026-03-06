import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, Globe } from 'lucide-react'
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
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-[var(--surface-2)] border border-[var(--border)] rounded-[14px] rounded-tr-[6px] px-4 py-3">
          <p className="text-[var(--text-primary)] text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="text-[var(--text-secondary)] text-xs mt-1 mr-1">{formatTime(message.timestamp)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-soft)] border border-[var(--border-strong)] flex items-center justify-center shrink-0 mt-0.5 text-[var(--accent)]">
        <Bot size={16} />
      </div>
      <div className="flex flex-col items-start">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] rounded-tl-[6px] px-4 py-3">
          <div className="prose prose-invert prose-sm max-w-none text-[var(--text-primary)]">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
        {message.skillUsed && (
          <span className="text-xs text-[var(--text-secondary)] mt-1 ml-1 inline-flex items-center gap-1.5">
            <Globe size={13} /> Web-Suche verwendet
          </span>
        )}
        <span className="text-[var(--text-secondary)] text-xs mt-1 ml-1">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-soft)] border border-[var(--border-strong)] flex items-center justify-center shrink-0 text-[var(--accent)]">
        <Bot size={16} />
      </div>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] rounded-tl-[6px] px-4 py-3">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 items-center h-4">
            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] italic">Vela denkt nach...</span>
        </div>
      </div>
    </div>
  )
}
