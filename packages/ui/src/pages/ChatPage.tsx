import React, { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { ChatMessage, TypingIndicator } from '../components/ChatMessage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useVelaStore } from '../store/useVelaStore'
import type { Message, ConfirmAction } from '../store/useVelaStore'

function randomId() {
  return Math.random().toString(36).slice(2)
}

const API_BASE = 'http://localhost:3000'

export function ChatPage() {
  const { state, dispatch } = useVelaStore()
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [lastMessage, setLastMessage] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.isTyping])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  function handleClearMessages() {
    if (window.confirm('Gespräch zurücksetzen? Alle Nachrichten werden gelöscht.')) {
      dispatch({ type: 'CLEAR_MESSAGES' })
    }
  }

  async function sendMessage(retryText?: string) {
    const text = retryText ?? input.trim()
    if (!text) return

    setLastMessage(text)

    // Add user message (only if not retrying)
    if (!retryText) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: randomId(), role: 'user', content: text, timestamp: new Date() },
      })
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
      }
    }

    // Show typing indicator
    dispatch({ type: 'SET_TYPING', payload: true })

    // Build messages array for API (convert 'vela' role to 'assistant')
    const apiMessages = [
      ...state.messages
        .filter((m: Message) => m.role === 'user' || m.role === 'vela')
        .map((m: Message) => ({
          role: m.role === 'vela' ? 'assistant' : 'user' as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user' as const, content: text },
    ]

    const velaId = randomId()

    // Streaming placeholder
    setStreamingId(velaId)
    setStreamingContent('')

    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) continue
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          try {
            const evt = JSON.parse(raw) as {
              text?: string; message?: string;
              warnings?: string[]; tokenUsage?: unknown
            }
            if ('text' in evt && evt.text && !evt.warnings) {
              // chunk
              fullText += evt.text
              setStreamingContent(prev => prev + evt.text!)
            } else if (evt.warnings !== undefined) {
              // done event — append warnings
              dispatch({ type: 'SET_TYPING', payload: false })
              let finalContent = fullText
              if (evt.warnings?.length) {
                finalContent += '\n\n---\n' + evt.warnings.join('\n')
              }
              dispatch({
                type: 'ADD_MESSAGE',
                payload: { id: velaId, role: 'vela', content: finalContent, timestamp: new Date() },
              })
              setStreamingId(null)
              setStreamingContent('')
            } else if (evt.message) {
              // error event
              throw new Error(evt.message)
            }
          } catch (parseErr) { /* skip */ }
        }
      }

      // Focus input
      textareaRef.current?.focus()
    } catch (err) {
      dispatch({ type: 'SET_TYPING', payload: false })
      setStreamingId(null)
      setStreamingContent('')
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: velaId, role: 'vela', content: `⚠️ ${errorMsg}`, timestamp: new Date(), skillUsed: '__error__' },
      })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-2)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--border-strong)] flex items-center justify-center">
          <span className="text-[var(--accent)] font-semibold">V</span>
        </div>
        <div className="flex-1">
          <h1 className="font-brand font-semibold text-[var(--text-primary)] text-lg leading-none">
            Vela
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-green w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block"></span>
            <span className="text-xs text-[var(--text-secondary)]">Online</span>
          </div>
        </div>
        {state.messages.length > 0 && (
          <button
            onClick={handleClearMessages}
            title="Neues Gespräch"
            className="px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-slate-600 text-xs hover:border-slate-300 hover:text-[var(--text-primary)] transition-colors"
          >
            Neues Gespräch
          </button>
        )}
      </header>

      {/* Session info */}
      {state.messages.length > 0 && (
        <div className="px-6 py-2 bg-[var(--surface-1)] border-b border-slate-100">
          <p className="text-xs text-[var(--text-secondary)]">{state.messages.length} Nachricht{state.messages.length !== 1 ? 'en' : ''} in dieser Session</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {state.messages.map((msg: Message) => {
          if (msg.skillUsed === '__error__') {
            return (
              <div key={msg.id} className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 border border-[rgba(248,113,113,0.35)] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-sm">!</span>
                </div>
                <div className="flex flex-col items-start">
                  <div className="max-w-xs lg:max-w-md bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.35)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-[#fecaca] text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => sendMessage(lastMessage)}
                    className="mt-2 px-3 py-1.5 bg-[var(--accent)] text-white rounded-xl text-xs font-medium hover:bg-[var(--accent)]/90 transition-colors"
                  >
                    Nochmal versuchen
                  </button>
                </div>
              </div>
            )
          }
          return <ChatMessage key={msg.id} message={msg} />
        })}

        {state.pendingConfirmation && (
          <ConfirmDialog action={state.pendingConfirmation} />
        )}

        {streamingId && (
          <ChatMessage
            key={streamingId + '-stream'}
            message={{ id: streamingId, role: 'vela', content: streamingContent || '…', timestamp: new Date() }}
          />
        )}
        {state.isTyping && !streamingId && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-8 py-4 border-t border-[var(--border)] bg-[var(--surface-1)] shrink-0">
        <div className="flex items-end gap-3 bg-[var(--surface-2)] rounded-[12px] border border-[var(--border)] px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Schreib Vela etwas..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] leading-relaxed max-h-40"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:brightness-110 transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 text-center">Enter zum Senden · Shift+Enter für neue Zeile</p>
      </div>
    </div>
  )
}
