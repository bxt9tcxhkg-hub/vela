import React, { useState, useEffect, useRef } from 'react'

type OperationMode = 'local' | 'cloud'
type TrustLevel    = 'cautious' | 'balanced' | 'autonomous'

interface OnboardingPageProps {
  onComplete: (mode: OperationMode, trustLevel: TrustLevel) => void
}

type MessageRole = 'vela' | 'user'

interface Message {
  role:    MessageRole
  text:    string
  options?: QuickReply[]
  inputMode?: boolean   // show text input instead of chips
}

interface QuickReply {
  label:   string
  icon?:   string
  value:   string
  warning?: boolean
}

// ─── Conversation script (state machine) ────────────────────────────────────
type Stage =
  | 'greeting'
  | 'mode-selected'
  | 'cloud-confirm'
  | 'trust'
  | 'name'
  | 'focus'
  | 'done'

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [stage,       setStage]       = useState<Stage>('greeting')
  const [mode,        setMode]        = useState<OperationMode>('local')
  const [trustLevel,  setTrustLevel]  = useState<TrustLevel>('balanced')
  const [userName,    setUserName]    = useState('')
  const [inputValue,  setInputValue]  = useState('')
  const [showInput,   setShowInput]   = useState(false)
  const [isTyping,    setIsTyping]    = useState(false)
  const [canFinish,   setCanFinish]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Kick off conversation on mount
  useEffect(() => {
    void addVelaMessage(
      'Hallo! Ich bin Vela — dein persönlicher KI-Assistent. Schön, dass du da bist! 👋\n\nErste Frage: Wie soll ich mit deinen Daten umgehen?',
      [
        { label: 'Lokal — bleibt auf meinem Gerät', icon: '🔒', value: 'local' },
        { label: 'Cloud — mehr Leistung', icon: '☁️', value: 'cloud' },
      ],
      'greeting',
    )
  }, [])

  // Add a Vela message with a short typing delay
  async function addVelaMessage(text: string, options?: QuickReply[], _stage?: Stage, inputMode?: boolean) {
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    setIsTyping(false)
    setMessages(prev => [...prev, { role: 'vela', text, options, inputMode }])
    if (inputMode) setShowInput(true)
  }

  function addUserMessage(text: string) {
    setMessages(prev => [...prev, { role: 'user', text }])
  }

  // ─── Quick reply handler ─────────────────────────────────────────────────
  async function handleReply(value: string, label: string, currentStage: Stage) {
    // Disable all chips after selection
    setMessages(prev => prev.map(m =>
      m.options ? { ...m, options: undefined } : m
    ))

    addUserMessage(label)

    if (currentStage === 'greeting') {
      const selectedMode = value as OperationMode
      setMode(selectedMode)
      if (selectedMode === 'cloud') {
        setStage('cloud-confirm')
        await addVelaMessage(
          'Alles klar. Kurzer Hinweis: Im Cloud-Modus werden deine Anfragen an externe Anbieter wie Anthropic oder OpenAI gesendet. Deine Nachrichten verlassen dabei dein Gerät.\n\nBin ich damit einverstanden?',
          [
            { label: 'Ja, ich bin damit einverstanden', icon: '✓', value: 'confirm' },
            { label: 'Lieber doch Lokal', icon: '🔒', value: 'back', warning: true },
          ],
          'cloud-confirm',
        )
      } else {
        setStage('trust')
        await addVelaMessage(
          'Gute Wahl — alles bleibt bei dir. 🔒\n\nWie viel Eigeninitiative soll ich haben?',
          [
            { label: 'Vorsichtig — immer fragen', icon: '🛡️', value: 'cautious' },
            { label: 'Ausgewogen — bei wichtigem fragen', icon: '⚖️', value: 'balanced' },
            { label: 'Autonom — selbst entscheiden', icon: '🚀', value: 'autonomous' },
          ],
          'trust',
        )
      }
    }

    else if (currentStage === 'cloud-confirm') {
      if (value === 'back') {
        setMode('local')
        setStage('trust')
        await addVelaMessage(
          'Kein Problem, Lokal ist auch super. 🔒\n\nWie viel Eigeninitiative soll ich haben?',
          [
            { label: 'Vorsichtig — immer fragen', icon: '🛡️', value: 'cautious' },
            { label: 'Ausgewogen — bei wichtigem fragen', icon: '⚖️', value: 'balanced' },
            { label: 'Autonom — selbst entscheiden', icon: '🚀', value: 'autonomous' },
          ],
          'trust',
        )
      } else {
        setStage('trust')
        await addVelaMessage(
          'Danke für das Vertrauen. ☁️\n\nWie viel Eigeninitiative soll ich haben?',
          [
            { label: 'Vorsichtig — immer fragen', icon: '🛡️', value: 'cautious' },
            { label: 'Ausgewogen — bei wichtigem fragen', icon: '⚖️', value: 'balanced' },
            { label: 'Autonom — selbst entscheiden', icon: '🚀', value: 'autonomous' },
          ],
          'trust',
        )
      }
    }

    else if (currentStage === 'trust') {
      const trust = value as TrustLevel
      setTrustLevel(trust)
      const trustLabels = {
        cautious:   'Vorsichtig — ich frage bei jeder Aktion nach. Sicher, aber etwas langsamer.',
        balanced:   'Ausgewogen — ich entscheide selbst bei einfachen Dingen, frage bei wichtigem nach.',
        autonomous: 'Autonom — ich handle selbstständig. Du bekommst im Nachhinein eine Zusammenfassung.',
      }
      setStage('name')
      await addVelaMessage(
        `${trustLabels[trust]}\n\nWie heißt du? Dann kann ich dich persönlich ansprechen.`,
        undefined,
        'name',
        true, // show text input
      )
    }
  }

  // ─── Text input handler (name, focus) ───────────────────────────────────
  async function handleTextSubmit() {
    const val = inputValue.trim()
    if (!val) return
    setShowInput(false)
    setInputValue('')

    if (stage === 'name') {
      const name = val.charAt(0).toUpperCase() + val.slice(1)
      setUserName(name)
      addUserMessage(name)
      setStage('focus')
      await addVelaMessage(
        `Schön dich kennenzulernen, ${name}! 😊\n\nWobei kann ich dir am meisten helfen?`,
        [
          { label: 'E-Mails & Kommunikation', icon: '📧', value: 'email' },
          { label: 'Web-Suche & Recherche', icon: '🔍', value: 'search' },
          { label: 'Organisation & Aufgaben', icon: '📋', value: 'tasks' },
          { label: 'Alles davon', icon: '⚡', value: 'all' },
        ],
        'focus',
      )
    }
  }

  // ─── Focus reply (last step before done) ────────────────────────────────
  async function handleFocusReply(label: string) {
    setMessages(prev => prev.map(m =>
      m.options ? { ...m, options: undefined } : m
    ))
    addUserMessage(label)
    setStage('done')
    const name = userName || 'du'
    await addVelaMessage(
      `Perfekt, ${name}! Ich bin eingerichtet und bereit. Lass uns loslegen 🚀`,
    )
    setCanFinish(true)
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col" style={{ height: '600px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0">
            ✦
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Vela</h1>
            <p className="text-gray-500 text-xs">Einrichtung · {Math.min(Math.round(
              (['greeting','cloud-confirm','trust','name','focus','done'].indexOf(stage) / 5) * 100
            ), 100)}% abgeschlossen</p>
          </div>
          {/* Progress bar */}
          <div className="ml-auto w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min((['greeting','cloud-confirm','trust','name','focus','done'].indexOf(stage) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Bubble */}
              <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>

              {/* Quick reply chips */}
              {msg.options && (
                <div className="flex flex-wrap gap-2 max-w-sm">
                  {msg.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (stage === 'focus') {
                          void handleFocusReply(opt.label)
                        } else {
                          void handleReply(opt.value, `${opt.icon ?? ''} ${opt.label}`.trim(), stage)
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                        opt.warning
                          ? 'border-yellow-600 text-yellow-300 hover:bg-yellow-900/30'
                          : 'border-blue-500 text-blue-300 hover:bg-blue-900/40'
                      }`}
                    >
                      {opt.icon && <span>{opt.icon}</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-2">
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Text input (for name step) */}
        {showInput && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleTextSubmit() }}
              placeholder="Dein Name…"
              autoFocus
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => void handleTextSubmit()}
              disabled={!inputValue.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 transition"
            >
              →
            </button>
          </div>
        )}

        {/* Finish button */}
        {canFinish && (
          <button
            onClick={() => onComplete(mode, trustLevel)}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition"
          >
            Vela starten →
          </button>
        )}
      </div>
    </div>
  )
}
