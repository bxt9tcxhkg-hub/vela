import React, { useState, useEffect, useRef } from 'react'

type OperationMode = 'local' | 'cloud'
type TrustLevel    = 'cautious' | 'balanced' | 'autonomous'
type UIMode        = 'simple' | 'expert'
type Personality   = 'warm' | 'direct' | 'formal'

interface OnboardingPageProps {
  onComplete: (mode: OperationMode, trustLevel: TrustLevel) => void
}

type Stage =
  | 'intro'
  | 'name'
  | 'personality'
  | 'level'
  | 'mode'
  | 'mode-tiles'
  | 'trust'
  | 'trust-chips'
  | 'done'

interface ChatMsg {
  role: 'vela' | 'user'
  text: string
  chips?: Chip[]
  inputMode?: boolean
}

interface Chip {
  label: string
  icon?: string
  value: string
  sub?: string
}

// ─── Personality texts ────────────────────────────────────────────────────────
const GREET: Record<Personality, (name: string) => string> = {
  warm:   (n) => `Schön dich kennenzulernen, ${n}! 😊 Ich freue mich, mit dir zusammenzuarbeiten.`,
  direct: (n) => `Alles klar, ${n}. Dann lass uns die letzten Einstellungen klären.`,
  formal: (n) => `Angenehm, ${n}. Ich werde Ihre Präferenzen nun festhalten.`,
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [msgs,        setMsgs]        = useState<ChatMsg[]>([])
  const [stage,       setStage]       = useState<Stage>('intro')
  const [mode,        setMode]        = useState<OperationMode>('local')
  const [trust,       setTrust]       = useState<TrustLevel>('balanced')
  const [uiMode,      setUiMode]      = useState<UIMode>('simple')
  const [personality, setPersonality] = useState<Personality>('warm')
  const [userName,    setUserName]    = useState('')
  const [textVal,     setTextVal]     = useState('')
  const [showInput,   setShowInput]   = useState(false)
  const [isTyping,    setIsTyping]    = useState(false)
  const [canFinish,   setCanFinish]   = useState(false)
  const [cloudWarn,   setCloudWarn]   = useState(false)
  const [cloudConfirm,setCloudConfirm]= useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didBootRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, isTyping])

  // --- helpers ---------------------------------------------------------------
  async function velaSay(text: string, chips?: Chip[], inputMode?: boolean) {
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 700 + Math.random() * 300))
    setIsTyping(false)
    setMsgs(prev => [...prev, { role: 'vela', text, chips, inputMode }])
    if (inputMode) setShowInput(true)
  }

  function userSay(text: string) {
    // disable all remaining chips
    setMsgs(prev => prev.map(m => ({ ...m, chips: undefined })))
    setMsgs(prev => [...prev, { role: 'user', text }])
  }

  // --- boot ------------------------------------------------------------------
  useEffect(() => {
    if (didBootRef.current) return
    didBootRef.current = true

    void (async () => {
      await velaSay('Hallo! Ich bin Vela — dein persönlicher KI-Assistent. 👋')
      await velaSay('Ich kann viel mehr als nur Chat: Ich passe mich deinem Stil an, nutze Tools, arbeite mit Dateien/Bildern und übernehme — je nach Modus — auch komplexe Agenten-Workflows.')
      await velaSay('Keine Sorge: Wir richten alles jetzt Schritt für Schritt gemeinsam ein.')
      await velaSay('Wie heißt du? Ich würde dich gerne persönlich ansprechen.', undefined, true)
    })()
  }, [])

  // --- name submit -----------------------------------------------------------
  async function submitName() {
    const val = textVal.trim()
    if (!val) return
    const name = val.charAt(0).toUpperCase() + val.slice(1)
    setUserName(name)
    setShowInput(false)
    setTextVal('')
    userSay(name)
    setStage('personality')
    await velaSay(
      `Schön, ${name}! Eine kurze Frage noch: Wie soll ich mit dir kommunizieren?`,
      [
        { label: 'Warm & persönlich',  icon: '😊', value: 'warm',   sub: 'Locker, empathisch, mit Emoji' },
        { label: 'Direkt & präzise',   icon: '⚡', value: 'direct', sub: 'Auf den Punkt, kein Schnörkel' },
        { label: 'Förmlich & sachlich',icon: '🎩', value: 'formal', sub: 'Professionell, distanziert' },
      ],
    )
  }

  // --- chip handler ----------------------------------------------------------
  async function onChip(value: string, label: string) {
    userSay(label)

    if (stage === 'personality') {
      const p = value as Personality
      setPersonality(p)
      setStage('level')
      await velaSay(
        GREET[p](userName) + '\n\nNoch eine wichtige Frage: Wie möchtest du Vela nutzen?',
        [
          { label: 'Einsteiger',  icon: '🌱', value: 'simple', sub: 'Chat, E-Mail, Suche — einfach loslegen' },
          { label: 'Experte',     icon: '⚙️', value: 'expert', sub: 'Skills selbst bauen, Modell wählen, volle Kontrolle' },
        ],
      )
    }

    else if (stage === 'level') {
      const level = value as UIMode
      setUiMode(level)
      localStorage.setItem('vela_ui_mode', level)
      setStage('mode')
      const levelText = level === 'expert'
        ? 'Perfekt — du bekommst vollen Zugriff auf Skills, Audit-Log, Modell-Auswahl und Marketplace.'
        : 'Gut — ich halte es übersichtlich für dich.'
      await velaSay(levelText + '\n\nWie soll ich deine Daten verarbeiten?')
      // Mode step uses full tiles — handled separately below
      setStage('mode-tiles')
    }

    else if (stage === 'trust-chips') {
      const t = value as TrustLevel
      setTrust(t)
      localStorage.setItem('vela_trust', t)
      setStage('done')
      const trustMsg = {
        cautious:   'Verstanden — ich frage immer bevor ich handle.',
        balanced:   'Gut — ich entscheide selbst bei einfachen Dingen.',
        autonomous: 'Alles klar — ich handle selbstständig und berichte danach.',
      }[t]
      await velaSay(`${trustMsg}\n\nAlles eingerichtet${userName ? `, ${userName}` : ''}! Ich bin bereit. 🚀`)
      setCanFinish(true)
    }
  }

  // --- mode tile select (full-width tiles) -----------------------------------
  async function onModeSelect(m: OperationMode) {
    setMode(m)
    localStorage.setItem('vela_mode', m)
    localStorage.setItem('vela_model', m === 'local' ? 'ollama' : 'claude')
    if (m === 'cloud') {
      setCloudWarn(true)
    } else {
      await afterModeConfirmed('local')
    }
  }

  async function afterModeConfirmed(m: OperationMode) {
    setCloudWarn(false)
    setStage('trust-chips')
    const modeText = m === 'local'
      ? '🔒 Lokal — alles bleibt auf deinem Gerät.'
      : '☁️ Cloud — du nutzt externe KI-Anbieter.'
    await velaSay(`${modeText}\n\nLetzte Frage: Wie viel Eigeninitiative soll ich haben?`,
      [
        { label: 'Vorsichtig',  icon: '🛡️', value: 'cautious',   sub: 'Immer erst fragen' },
        { label: 'Ausgewogen',  icon: '⚖️', value: 'balanced',   sub: 'Selbst bei einfachem, fragen bei wichtigem' },
        { label: 'Autonom',     icon: '🚀', value: 'autonomous',  sub: 'Selbst entscheiden, dann berichten' },
      ],
    )
  }

  const stageLabel: Record<string, string> = {
    intro: 'Vorstellung', name: 'Name', personality: 'Stil',
    level: 'Modus', 'mode-tiles': 'Infrastruktur', 'trust-chips': 'Autonomie', done: 'Fertig'
  }
  const stageList = ['intro', 'name', 'personality', 'level', 'mode-tiles', 'trust-chips', 'done']
  const progress  = Math.round((stageList.indexOf(stage) / (stageList.length - 1)) * 100)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl flex flex-col" style={{ height: '640px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0 shadow-lg">
            ✦
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-sm leading-tight">Vela einrichten</h1>
            <p className="text-gray-500 text-xs">{stageLabel[stage] ?? ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs">{progress}%</span>
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
          {msgs.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              {msg.chips && (
                <div className="flex flex-col gap-1.5 max-w-xs w-full">
                  {msg.chips.map(chip => (
                    <button
                      key={chip.value}
                      onClick={() => void onChip(chip.value, `${chip.icon ?? ''} ${chip.label}`.trim())}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-700/60 bg-blue-950/30 hover:bg-blue-900/40 text-left transition-all group"
                    >
                      {chip.icon && <span className="text-base">{chip.icon}</span>}
                      <div className="flex-1">
                        <p className="text-blue-200 text-sm font-medium group-hover:text-white">{chip.label}</p>
                        {chip.sub && <p className="text-gray-500 text-xs">{chip.sub}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing */}
          {isTyping && (
            <div className="flex items-start">
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center shadow-sm">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Mode Tiles (full width) */}
          {stage === 'mode-tiles' && !isTyping && !cloudWarn && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => void onModeSelect('local')}
                className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-green-700/60 bg-green-950/20 hover:border-green-500 hover:bg-green-950/30 text-left transition-all"
              >
                <span className="text-3xl">🔒</span>
                <div>
                  <p className="text-white font-semibold text-sm">Lokal</p>
                  <p className="text-gray-400 text-xs mt-0.5">Ollama · alles bleibt bei dir</p>
                </div>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  <li>✓ Kein API-Key nötig</li>
                  <li>✓ 100% privat</li>
                  <li>✓ Kostenlos</li>
                </ul>
              </button>
              <button
                onClick={() => void onModeSelect('cloud')}
                className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-blue-700/60 bg-blue-950/20 hover:border-blue-500 hover:bg-blue-950/30 text-left transition-all"
              >
                <span className="text-3xl">☁️</span>
                <div>
                  <p className="text-white font-semibold text-sm">Cloud</p>
                  <p className="text-gray-400 text-xs mt-0.5">Claude · GPT-4o · Gemini</p>
                </div>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  <li>✓ Deutlich leistungsfähiger</li>
                  <li>✓ Kein Setup</li>
                  <li className="text-yellow-400">⚠ Daten verlassen dein Gerät</li>
                </ul>
              </button>
            </div>
          )}

          {/* Cloud Warning */}
          {cloudWarn && (
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4 space-y-3">
              <p className="text-yellow-300 font-semibold text-sm">☁️ Cloud-Modus — kurze Info</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Deine Nachrichten werden an externe Anbieter (Anthropic, OpenAI, Google) gesendet.
                Vertrauliche Infos solltest du mit Bedacht teilen. Du kannst jederzeit zu Lokal wechseln.
              </p>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudConfirm}
                  onChange={e => setCloudConfirm(e.target.checked)}
                  className="accent-blue-500"
                />
                Ich habe verstanden
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCloudWarn(false); setCloudConfirm(false) }}
                  className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-xs transition"
                >
                  Zurück
                </button>
                <button
                  onClick={() => void afterModeConfirmed('cloud')}
                  disabled={!cloudConfirm}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-40 transition"
                >
                  Cloud aktivieren
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Text input */}
        {showInput && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submitName() }}
              placeholder="Dein Name…"
              autoFocus
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              onClick={() => void submitName()}
              disabled={!textVal.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-40 transition"
            >
              →
            </button>
          </div>
        )}

        {/* Finish */}
        {canFinish && (
          <button
            onClick={() => onComplete(mode, trust)}
            className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition shadow-lg"
          >
            Vela starten →
          </button>
        )}
      </div>
    </div>
  )
}
