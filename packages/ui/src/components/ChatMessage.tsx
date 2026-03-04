import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Message } from '../store/useVelaStore'

interface ChatMessageProps {
  message: Message
}

function formatTime(ts: Date): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(ts)
}


async function speakText(text: string) {
  try {
    const res = await fetch('http://localhost:3000/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1000) }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play(); return
    }
  } catch { /* fallback */ }
  if ('speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(text.slice(0, 500))
    utt.lang = 'de-DE'
    window.speechSynthesis.speak(utt)
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [speaking, setSpeaking] = useState(false)

  if (isUser) {
    return (
      <div className="flex flex-col items-end mb-4">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-surface2 border border-border rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-white text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="text-vtext3 text-xs mt-1 mr-1">{formatTime(message.timestamp)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-4 group">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-700/40 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-blue-400 text-sm font-fraunces font-semibold leading-none">&#10022;</span>
      </div>
      <div className="flex flex-col items-start">
        <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-blue-900/20 border border-blue-800/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-white text-sm leading-relaxed">{message.content}</p>
        </div>
        {message.skillUsed && (
          <span className="text-xs text-vtext3 mt-1 ml-1 flex items-center gap-1">
            🔍 Web-Suche verwendet
          </span>
        )}
        <div className="flex items-center gap-2 ml-1 mt-1">
          <span className="text-vtext3 text-xs">{formatTime(message.timestamp)}</span>
          <button
            onClick={() => { setSpeaking(true); void speakText(message.content).finally(() => setSpeaking(false)) }}
            title="Vorlesen"
            className={`text-xs px-1.5 py-0.5 rounded-lg border transition-all ${speaking ? 'text-blue-400 border-blue-700 animate-pulse' : 'text-vtext3 border-transparent hover:border-border hover:text-white'}`}
          >
            {speaking ? '🔊 …' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4 group">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-700/40 flex items-center justify-center shrink-0">
        <span className="text-blue-400 text-sm font-fraunces font-semibold leading-none">&#10022;</span>
      </div>
      <div className="bg-blue-900/20 border border-blue-800/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 items-center h-4">
            <span className="typing-dot w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
          </div>
          <span className="text-xs text-blue-400/70 italic">Vela denkt nach...</span>
        </div>
      </div>
    </div>
  )
}
