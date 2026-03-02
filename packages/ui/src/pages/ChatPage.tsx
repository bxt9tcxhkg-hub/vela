import React, { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { ChatMessage, TypingIndicator } from '../components/ChatMessage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useVelaStore } from '../store/useVelaStore'
import type { Message, ConfirmAction } from '../store/useVelaStore'

function randomId() {
  return Math.random().toString(36).slice(2)
}

export function ChatPage() {
  const { state, dispatch } = useVelaStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Show demo confirm dialog on mount if no pending confirmation
  useEffect(() => {
    if (!state.pendingConfirmation) {
      const confirm: ConfirmAction = {
        id: 'demo-confirm',
        description: 'Vela moechte 23 E-Mails archivieren',
        risk: 'medium',
        onConfirm: () => {
          dispatch({ type: 'SET_CONFIRMATION', payload: null })
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { id: randomId(), role: 'vela', content: 'Erledigt! Ich habe 23 Spam-Mails archiviert.', timestamp: new Date() },
          })
          dispatch({
            type: 'ADD_ACTIVITY',
            payload: { id: randomId(), icon: 'trash', description: '23 Spam-Mails archiviert', timestamp: 'gerade eben', status: 'done' },
          })
        },
        onCancel: () => {
          dispatch({ type: 'SET_CONFIRMATION', payload: null })
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { id: randomId(), role: 'vela', content: 'Verstanden, ich lasse die E-Mails unberuehrt.', timestamp: new Date() },
          })
        },
      }
      dispatch({ type: 'SET_CONFIRMATION', payload: confirm })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function sendMessage() {
    const text = input.trim()
    if (!text) return

    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: randomId(), role: 'user', content: text, timestamp: new Date() },
    })
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    dispatch({ type: 'SET_TYPING', payload: true })
    setTimeout(() => {
      dispatch({ type: 'SET_TYPING', payload: false })
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: randomId(),
          role: 'vela',
          content: 'Ich verstehe. Soll ich das fuer dich erledigen?',
          timestamp: new Date(),
        },
      })
    }, 1500)
  }

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-sand bg-warm shrink-0">
        <div className="w-8 h-8 rounded-full bg-sky-light flex items-center justify-center">
          <span className="text-sky font-fraunces font-semibold">&#10022;</span>
        </div>
        <div>
          <h1 className="font-fraunces font-semibold text-ink text-lg leading-none">
            V<span className="italic text-sky">e</span>la
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-green w-1.5 h-1.5 rounded-full bg-moss inline-block"></span>
            <span className="text-xs text-earth">Online</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {state.messages.map((msg: Message) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {state.pendingConfirmation && (
          <ConfirmDialog action={state.pendingConfirmation} />
        )}

        {state.isTyping && <TypingIndicator />}
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
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-sky text-white flex items-center justify-center hover:bg-sky/90 transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="text-xs text-bark mt-1.5 text-center">Enter zum Senden · Shift+Enter fuer neue Zeile</p>
      </div>
    </div>
  )
}
