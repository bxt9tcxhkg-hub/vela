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
  const { uiMode } = state
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [lastMessage, setLastMessage] = useState<string>('')
  const [focusMode, setFocusMode] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [templatesOpen,  setTemplatesOpen]  = useState(false)
  const [templates, setTemplates] = useState<{id:string;name:string;prompt:string;category:string}[]>([])
  const [isListening, setIsListening] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [suggestions, setSuggestions] = useState<{id:string;label:string;value:string;count:number}[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<{id:string;title:string;body:string;read:number;created_at:string}[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
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


  function exportChat(format: 'md' | 'txt') {
    const msgs = state.messages
    if (!msgs.length) return
    const lines = msgs.map((m) => {
      const who = m.role === 'user' ? '**Du**' : '**Vela**'
      const time = new Date(m.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      return format === 'md'
        ? `### ${who} _(${time})_\n${m.content}\n`
        : `[${time}] ${m.role === 'user' ? 'Du' : 'Vela'}: ${m.content}\n`
    })
    const header = format === 'md'
      ? `# Vela Gespräch\n_Exportiert: ${new Date().toLocaleDateString('de-DE')}_\n\n---\n\n`
      : `Vela Gespräch – ${new Date().toLocaleDateString('de-DE')}\n${'─'.repeat(40)}\n\n`
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `vela-chat-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
    setExportMenuOpen(false)
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }


  // Poll notifications
  React.useEffect(() => {
    const poll = () => {
      fetch('http://localhost:3000/api/preferences/suggestions')
        .then(r => r.json() as Promise<{suggestions: typeof suggestions}>)
        .then(d => setSuggestions(d.suggestions))
        .catch(() => {})
      fetch('http://localhost:3000/api/notifications')
        .then(r => r.json() as Promise<{notifications: typeof notifications; unread: number}>)
        .then(d => { setNotifications(d.notifications); setUnreadCount(d.unread) })
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load templates
  React.useEffect(() => {
    fetch('http://localhost:3000/api/templates')
      .then(r => r.json() as Promise<{templates: typeof templates}>)
      .then(d => setTemplates(d.templates))
      .catch(() => {})
  }, [])

  function applyTemplate(prompt: string) {
    setInput(prompt)
    setTemplatesOpen(false)
    textareaRef.current?.focus()
  }

  function startVoice() {
    type SpeechRecognitionCtor = new () => { lang: string; interimResults: boolean; onstart: () => void; onend: () => void; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; start: () => void }
    const w = window as unknown as Record<string, unknown>
    const SpeechRecognition = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as SpeechRecognitionCtor | undefined
    if (!SpeechRecognition) { alert('Spracheingabe wird von diesem Browser nicht unterstützt.'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onend   = () => setIsListening(false)
    recognition.onresult = (e: { results: { 0: { transcript: string } }[] }) => {
      setInput(prev => prev + e.results[0][0].transcript)
      textareaRef.current?.focus()
    }
    recognition.start()
  }

  async function confirmSuggestion(id: string) {
    await fetch(`http://localhost:3000/api/preferences/suggestions/${id}/confirm`, { method: 'POST' })
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  async function rejectSuggestion(id: string) {
    await fetch(`http://localhost:3000/api/preferences/suggestions/${id}/reject`, { method: 'POST' })
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const preview = text.length > 3000 ? text.slice(0, 3000) + '\n\n[Datei gekürzt…]' : text
    setInput(`Hier ist der Inhalt von "${file.name}":\n\n${preview}\n\nMeine Frage dazu: `)
    textareaRef.current?.focus()
    if (e.target) e.target.value = ''
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
    <div className="flex flex-col h-screen bg-bg" onClick={() => setExportMenuOpen(false)}>
      {/* Header */}
      <header className={`flex items-center gap-3 px-6 py-4 border-b border-border bg-surface shrink-0 transition-all ${focusMode ? 'opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-700/40 flex items-center justify-center">
          <span className="text-blue-400 font-fraunces font-semibold">&#10022;</span>
        </div>
        <div className="flex-1">
          <h1 className="font-fraunces font-semibold text-white text-lg leading-none">
            V<span className="italic text-blue-400">e</span>la
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-green w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            <span className="text-xs text-vtext2">Online</span>
          </div>
        </div>
        {/* Export menu */}
        {state.messages.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(o => !o)}
              title="Chat exportieren"
              className="px-3 py-1.5 rounded-xl bg-surface2 border border-border text-vtext2 text-xs hover:border-border2 hover:text-white transition-colors"
            >
              ⬇ Export
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-9 bg-surface border border-border rounded-xl shadow-xl z-20 min-w-32 overflow-hidden">
                <button onClick={() => exportChat('md')} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-surface2 transition-colors">Markdown (.md)</button>
                <button onClick={() => exportChat('txt')} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-surface2 transition-colors">Text (.txt)</button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => { setFocusMode(f => !f); requestNotificationPermission() }}
          title={focusMode ? 'Fokus-Modus verlassen' : 'Fokus-Modus'}
          className="px-3 py-1.5 rounded-xl bg-surface2 border border-border text-vtext2 text-xs hover:border-border2 hover:text-white transition-colors"
        >
          {focusMode ? '⊠ Fokus' : '⊡ Fokus'}
        </button>
        {state.messages.length > 0 && (
          <button
            onClick={handleClearMessages}
            title="Neues Gespräch"
            className="px-3 py-1.5 rounded-xl bg-surface2 border border-border text-vtext2 text-xs hover:border-border2 hover:text-white transition-colors"
          >
            🗑️
          </button>
        )}
      </header>

      {/* Session info */}
      {state.messages.length > 0 && (
        <div className="px-6 py-1.5 bg-surface border-b border-border/50">
          <p className="text-xs text-vtext3">{state.messages.length} Nachricht{state.messages.length !== 1 ? 'en' : ''} in dieser Session</p>
        </div>
      )}

      {/* Adaptive Preference Suggestions */}
      {suggestions.map(s => (
        <div key={s.id} className="mx-4 mt-3 bg-blue-950 border border-blue-700 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-300 mb-0.5">🧠 Vela lernt — Vorschlag</p>
            <p className="text-white text-sm font-medium">{s.label}</p>
            <p className="text-blue-200 text-xs mt-0.5">Du hast das {s.count}× angefordert. Soll ich das dauerhaft übernehmen?</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 mt-0.5">
            <button
              onClick={() => void confirmSuggestion(s.id)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              ✓ Ja, immer
            </button>
            <button
              onClick={() => void rejectSuggestion(s.id)}
              className="px-3 py-1.5 bg-surface2 border border-border text-vtext2 text-xs rounded-lg hover:text-white transition-colors"
            >
              ✕ Nein
            </button>
          </div>
        </div>
      ))}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {state.messages.map((msg: Message) => {
          if (msg.skillUsed === '__error__') {
            return (
              <div key={msg.id} className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-400 text-sm">!</span>
                </div>
                <div className="flex flex-col items-start">
                  <div className="max-w-xs lg:max-w-md bg-red-900/20 border border-red-800/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-red-400 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => sendMessage(lastMessage)}
                    className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-500 transition-colors"
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
      <div className="px-4 md:px-8 py-4 border-t border-border bg-surface shrink-0">
        <div className="flex items-end gap-3 bg-surface2 rounded-2xl border border-border px-4 py-3 focus-within:border-blue-600/50">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Schreib Vela etwas..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder:text-vtext3 leading-relaxed max-h-40"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        {/* Quick actions row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setTemplatesOpen(o => !o)}
            className="flex items-center gap-1 text-xs text-vtext3 hover:text-white border border-border hover:border-border2 rounded-lg px-2 py-1 transition-colors"
          >
            ⚡ Templates
          </button>
          <button
            onClick={startVoice}
            className={`flex items-center gap-1 text-xs border rounded-lg px-2 py-1 transition-colors ${isListening ? 'text-red-400 border-red-700 animate-pulse' : 'text-vtext3 hover:text-white border-border hover:border-border2'}`}
          >
            🎤 {isListening ? 'Hört zu…' : 'Sprache'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-vtext3 hover:text-white border border-border hover:border-border2 rounded-lg px-2 py-1 transition-colors"
          >
            📎 Datei
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py" className="hidden" onChange={e => void handleFileUpload(e)} />
          <span className="ml-auto text-xs text-vtext3">Enter senden · Shift+Enter Zeilenumbruch</span>
        </div>

        {/* Template panel */}
        {templatesOpen && (
          <div className="mt-2 bg-surface border border-border rounded-xl overflow-hidden shadow-xl">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-white">Prompt-Templates</span>
              <button onClick={() => setTemplatesOpen(false)} className="text-vtext3 hover:text-white text-sm">✕</button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.prompt)}
                  className="w-full text-left px-3 py-2 hover:bg-surface2 border-b border-border last:border-0 transition-colors"
                >
                  <p className="text-white text-xs font-medium">{tpl.name}</p>
                  <p className="text-vtext3 text-xs truncate">{tpl.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
