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
  | 'personality-custom'
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
  const [customStyle, setCustomStyle] = useState('')
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

  function startNewTopic() {
    setMsgs([])
    setShowInput(false)
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

    if (stage === 'name') {
      const name = val.charAt(0).toUpperCase() + val.slice(1)
      setUserName(name)
      setShowInput(false)
      setTextVal('')
      userSay(name)
      startNewTopic()
      setStage('personality')
      await velaSay(
        `Schön, ${name}! Eine kurze Frage noch: Wie soll ich mit dir kommunizieren?`,
        [
          { label: 'Warm & persönlich',   icon: '😊', value: 'warm',   sub: 'Locker, empathisch, mit Emoji' },
          { label: 'Direkt & präzise',    icon: '⚡', value: 'direct', sub: 'Auf den Punkt, kein Schnörkel' },
          { label: 'Förmlich & sachlich', icon: '🎩', value: 'formal', sub: 'Professionell, distanziert' },
          { label: 'Eigener Stil',        icon: '✍️', value: 'custom', sub: 'Ich beschreibe es selbst' },
        ],
      )
      return
    }

    if (stage === 'personality-custom') {
      setCustomStyle(val)
      localStorage.setItem('vela_custom_style', val)
      setShowInput(false)
      setTextVal('')
      userSay(val)
      startNewTopic()
      setStage('level')
      await velaSay(
        `Perfekt — ich richte mich nach: „${val}“.

Noch eine wichtige Frage: Wie möchtest du Vela nutzen?`,
        [
          { label: 'Einsteiger', icon: '🌱', value: 'simple', sub: 'Chat, E-Mail, Suche — einfach loslegen' },
          { label: 'Experte',    icon: '⚙️', value: 'expert', sub: 'Skills selbst bauen, Modell wählen, volle Kontrolle' },
        ],
      )
    }
  }

  // --- chip handler ----------------------------------------------------------
  async function onChip(value: string, label: string) {
    userSay(label)

    if (stage === 'personality') {
      const p = value as Personality
      setPersonality(p)
      startNewTopic()
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
      startNewTopic()
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
      startNewTopic()
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
    startNewTopic()
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
    intro: 'Willkommen',
    name: 'Name',
    personality: 'Kommunikationsstil',
    'personality-custom': 'Eigener Kommunikationsstil',
    level: 'Nutzerlevel',
    'mode-tiles': 'Betriebsmodus',
    'trust-chips': 'Autonomie',
    done: 'Startklar',
  }
  const stageList = ['intro', 'name', 'personality', 'personality-custom', 'level', 'mode-tiles', 'trust-chips', 'done']
  const currentStep = Math.max(1, stageList.indexOf(stage) + 1)
  const progress  = Math.round((stageList.indexOf(stage) / (stageList.length - 1)) * 100)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl flex flex-col" style={{ height: '640px' }}>

        {/* Header */}
        <div className="mb-4 rounded-2xl border border-gray-800/80 bg-gray-900/70 backdrop-blur px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
                ✦
              </div>
              <div>
                <h1 className="text-white font-semibold text-base leading-tight">Vela einrichten</h1>
                <p className="text-gray-400 text-sm">{stageLabel[stage] ?? ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-sm font-semibold">Schritt {currentStep}/{stageList.length}</p>
              <p className="text-gray-500 text-xs">{progress}% abgeschlossen</p>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Topic */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-800/70 bg-blue-950/40 px-3 py-1.5">
            <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">Topic</span>
            <span className="text-blue-100 text-sm font-medium">{stageLabel[stage] ?? 'Onboarding'}</span>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
          {msgs.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`w-full max-w-full px-5 py-4 rounded-2xl text-base leading-relaxed whitespace-pre-line shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              {msg.chips && (
                <div className="flex flex-col gap-2 max-w-full w-full">
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
              placeholder={stage === 'personality-custom' ? 'z. B. locker, klar, ohne Floskeln…' : 'Dein Name…'}
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
