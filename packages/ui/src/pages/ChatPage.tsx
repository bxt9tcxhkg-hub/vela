import React, { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { ChatMessage, TypingIndicator } from '../components/ChatMessage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import PermissionDialog from '../components/PermissionDialog'
import { PERMISSION_LABELS } from '@vela/core'
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
  const [permissionRequest, setPermissionRequest] = useState<{
    skillName: string
    permission: string
    label: string
    description: string
    reason: string
    risk: 'low' | 'medium' | 'high'
    resolve: (granted: boolean) => void
  } | null>(null)
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

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok) {
        const errData = await response.json() as { error?: string }
        throw new Error(errData.error ?? `Server error: ${response.status}`)
      }

      const data = await response.json() as { text: string; skillUsed?: string; activity?: { icon: string; description: string; status: string } }
      dispatch({ type: 'SET_TYPING', payload: false })
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: velaId, role: 'vela', content: data.text, timestamp: new Date(), skillUsed: data.skillUsed ?? undefined, },
      })

      // Dispatch activity if present
      if (data.activity) {
        dispatch({
          type: 'ADD_ACTIVITY',
          payload: {
            id: randomId(),
            icon: data.activity.icon,
            description: data.activity.description,
            timestamp: new Date().toISOString(),
            status: data.activity.status as 'done' | 'pending' | 'cancelled',
          },
        })
      }

      // Focus input after receiving response
      textareaRef.current?.focus()
    } catch (err) {
      dispatch({ type: 'SET_TYPING', payload: false })
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: velaId,
          role: 'vela',
          content: `⚠️ ${errorMsg}`,
          timestamp: new Date(),
          skillUsed: '__error__',
        },
      })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-sand bg-warm shrink-0">
        <div className="w-8 h-8 rounded-full bg-sky-light flex items-center justify-center">
          <span className="text-sky font-fraunces font-semibold">&#10022;</span>
        </div>
        <div className="flex-1">
          <h1 className="font-fraunces font-semibold text-ink text-lg leading-none">
            V<span className="italic text-sky">e</span>la
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-green w-1.5 h-1.5 rounded-full bg-moss inline-block"></span>
            <span className="text-xs text-earth">Online</span>
          </div>
        </div>
        {state.messages.length > 0 && (
          <button
            onClick={handleClearMessages}
            title="Neues Gespräch"
            className="px-3 py-1.5 rounded-xl bg-cream border border-sand text-earth text-xs hover:border-bark hover:text-ink transition-colors"
          >
            🗑️ Neues Gespräch
          </button>
        )}
      </header>

      {/* Session info */}
      {state.messages.length > 0 && (
        <div className="px-6 py-1.5 bg-warm border-b border-sand/50">
          <p className="text-xs text-bark">{state.messages.length} Nachricht{state.messages.length !== 1 ? 'en' : ''} in dieser Session</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {state.messages.map((msg: Message) => {
          if (msg.skillUsed === '__error__') {
            return (
              <div key={msg.id} className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-sm">!</span>
                </div>
                <div className="flex flex-col items-start">
                  <div className="max-w-xs lg:max-w-md bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-red-700 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => sendMessage(lastMessage)}
                    className="mt-2 px-3 py-1.5 bg-sky text-white rounded-xl text-xs font-medium hover:bg-sky/90 transition-colors"
                  >
                    Nochmal versuchen
                  </button>
                </div>
              </div>
            )
          }
          return <ChatMessage key={msg.id} message={msg} />
        })}

        {permissionRequest && (
        <PermissionDialog
          skillName={permissionRequest.skillName}
          permission={permissionRequest.permission}
          label={permissionRequest.label}
          description={permissionRequest.description}
          reason={permissionRequest.reason}
          risk={permissionRequest.risk}
          onConfirm={() => permissionRequest.resolve(true)}
          onDeny={() => permissionRequest.resolve(false)}
        />
      )}

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
      <div className="px-4 md:px-8 py-4 border-t border-sand bg-warm shrink-0">
        <div className="flex items-end gap-3 bg-cream rounded-2xl border border-sand px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Schreib Vela etwas..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-bark leading-relaxed max-h-40"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-sky text-white flex items-center justify-center hover:bg-sky/90 transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="text-xs text-bark mt-1.5 text-center">Enter zum Senden · Shift+Enter für neue Zeile</p>
      </div>
    </div>
  )
}
