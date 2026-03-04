import React, { useState, useEffect, useRef } from 'react'

type OperationMode = 'local' | 'cloud'
type TrustLevel    = 'cautious' | 'balanced' | 'autonomous'
type OnboardingStep = 'mode-select' | 'hardware-warn' | 'trust-select' | 'assistant-chat' | 'done'

interface OnboardingPageProps {
  onComplete: (mode: OperationMode, trustLevel: TrustLevel) => void
}

interface HardwareStatus {
  ramGb:       number
  ramOk:       boolean
  ollamaReady: boolean
  checking:    boolean
}

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// ─── Schritt 1: Moduswahl ────────────────────────────────────────────────────
function ModeSelectStep({
  hwStatus,
  onSelect,
}: {
  hwStatus: HardwareStatus
  onSelect: (mode: OperationMode) => void
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Wie möchtest du Vela betreiben?</h1>
        <p className="text-gray-400">
          Du kannst diese Entscheidung jederzeit in den Einstellungen ändern.
        </p>
      </div>

      {hwStatus.checking && (
        <p className="text-gray-500 text-sm animate-pulse">Hardware wird geprüft…</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <button
          onClick={() => onSelect('local')}
          className={`
            flex flex-col gap-4 p-6 rounded-2xl border-2 text-left transition-all
            ${
              !hwStatus.checking && hwStatus.ramOk && hwStatus.ollamaReady
                ? 'border-green-500 hover:border-green-400 hover:bg-green-950/30 bg-green-950/10'
                : 'border-yellow-600 hover:border-yellow-500 hover:bg-yellow-950/20 bg-yellow-950/10'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔒</span>
            <div>
              <h2 className="text-xl font-bold text-white">Sicher & Lokal</h2>
              <p className="text-sm text-gray-400">Empfohlen für den Einstieg</p>
            </div>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Keine Daten verlassen dein Gerät</li>
            <li>✓ Kein API-Key erforderlich</li>
            <li>✓ Funktioniert ohne Internet</li>
            <li>✓ Kostenlos – unbegrenzt</li>
          </ul>
          <div className="text-xs text-gray-500 mt-2 border-t border-gray-700 pt-2">
            <strong>Benötigt:</strong> Ollama + llama3.1:8b (ca. 5 GB), min. 8 GB RAM
          </div>
          {!hwStatus.checking && (
            <div className={`text-xs mt-1 font-medium ${hwStatus.ramOk && hwStatus.ollamaReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {hwStatus.ramOk && hwStatus.ollamaReady
                ? `✓ Dein Gerät ist bereit (${hwStatus.ramGb} GB RAM, Ollama aktiv)`
                : !hwStatus.ramOk
                  ? `⚠ Wenig RAM (${hwStatus.ramGb} GB) – wird langsam sein`
                  : '⚠ Ollama nicht gefunden – wird im Setup installiert'
              }
            </div>
          )}
        </button>

        <button
          onClick={() => onSelect('cloud')}
          className="flex flex-col gap-4 p-6 rounded-2xl border-2 border-blue-600 hover:border-blue-500 hover:bg-blue-950/20 bg-blue-950/10 text-left transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">☁️</span>
            <div>
              <h2 className="text-xl font-bold text-white">Cloud-verbunden</h2>
              <p className="text-sm text-gray-400">Maximale Leistung</p>
            </div>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Deutlich leistungsfähiger</li>
            <li>✓ Funktioniert auf jedem Gerät</li>
            <li>✓ Keine Installation erforderlich</li>
            <li className="text-yellow-300">⚠ Daten werden an externe Server gesendet</li>
          </ul>
          <div className="text-xs text-gray-500 mt-2 border-t border-gray-700 pt-2">
            <strong>Benötigt:</strong> API-Key (Claude, GPT-4o oder Gemini)
          </div>
          <div className="text-xs mt-1 text-blue-400 font-medium">
            → Du entscheidest bewusst, welche Daten du teilst
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Schritt 1b: Cloud-Risikohinweis ─────────────────────────────────────────
function CloudWarningStep({ onConfirm, onBack }: { onConfirm: () => void; onBack: () => void }) {
  const [understood, setUnderstood] = useState(false)

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl text-center">
      <span className="text-6xl">☁️</span>
      <h2 className="text-2xl font-bold text-white">Kurz innehalten</h2>
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-5 text-left space-y-3 text-sm text-gray-300">
        <p><strong className="text-yellow-300">Was bedeutet Cloud-Modus?</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Deine Nachrichten werden an externe KI-Anbieter gesendet (z. B. Anthropic, OpenAI)</li>
          <li>Diese Anbieter verarbeiten deine Anfragen auf ihren Servern</li>
          <li>Je nach Anbieter und Tarif können Daten für Trainingsszwecke genutzt werden</li>
          <li>Vertrauliche Informationen solltest du im Cloud-Modus mit Bedacht teilen</li>
        </ul>
        <p className="text-gray-400 text-xs mt-2">
          Du kannst jederzeit in den lokalen Modus wechseln. Vela zeigt diesen Hinweis erneut an,
          wenn du zurück zu Cloud wechselst.
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
        <input
          type="checkbox"
          checked={understood}
          onChange={e => setUnderstood(e.target.checked)}
          className="w-4 h-4 accent-blue-500"
        />
        Ich habe die Konsequenzen verstanden und entscheide mich bewusst für den Cloud-Modus
      </label>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
        >
          Zurück
        </button>
        <button
          onClick={onConfirm}
          disabled={!understood}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Cloud-Modus aktivieren
        </button>
      </div>
    </div>
  )
}

// ─── Schritt 2: Trust Level ───────────────────────────────────────────────────
const trustOptions = [
  {
    value:       'cautious' as TrustLevel,
    icon:        '🛡️',
    label:       'Vorsichtig',
    description: 'Vela fragt bei jeder Aktion nach Bestätigung. Sicher, aber etwas langsamer. Ideal für den Einstieg.',
  },
  {
    value:       'balanced' as TrustLevel,
    icon:        '⚖️',
    label:       'Ausgewogen',
    description: 'Vela entscheidet selbst bei einfachen Aufgaben, fragt bei wichtigen Aktionen nach.',
  },
  {
    value:       'autonomous' as TrustLevel,
    icon:        '🚀',
    label:       'Autonom',
    description: 'Vela handelt selbstständig und informiert dich im Nachhinein. Maximale Effizienz.',
  },
]

function TrustSelectStep({
  mode,
  onSelect,
  onBack,
}: {
  mode: OperationMode
  onSelect: (t: TrustLevel) => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<TrustLevel>('balanced')

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">Wie viel Autonomie soll Vela haben?</h2>
        <p className="text-gray-400 text-sm">
          {mode === 'local' ? '🔒 Lokaler Modus' : '☁️ Cloud-Modus'} – du kannst das jederzeit ändern
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {trustOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              selected === opt.value
                ? 'border-blue-500 bg-blue-950/30'
                : 'border-gray-700 hover:border-gray-500 bg-gray-900/40'
            }`}
          >
            <span className="text-2xl mt-0.5">{opt.icon}</span>
            <div>
              <p className="font-semibold text-white">{opt.label}</p>
              <p className="text-sm text-gray-400">{opt.description}</p>
            </div>
            {selected === opt.value && <span className="ml-auto text-blue-400 text-lg">✓</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition">
          Zurück
        </button>
        <button
          onClick={() => onSelect(selected)}
          className="px-8 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

// ─── Schritt 3: KI-Onboarding-Dialog ─────────────────────────────────────────
function AssistantChatStep({
  mode,
  trustLevel,
  onComplete,
}: {
  mode:       OperationMode
  trustLevel: TrustLevel
  onComplete: () => void
}) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [complete,  setComplete]  = useState(false)
  const [fallback,  setFallback]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Erste KI-Nachricht beim Laden abrufen
  useEffect(() => {
    void sendToLLM([])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendToLLM(msgs: ChatMessage[]) {
    setLoading(true)
    try {
      const os = navigator.platform ?? 'Unbekannt'
      const ramGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null
      const res = await fetch('http://localhost:3000/api/onboarding/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: msgs, mode, trustLevel, os,
          hardware: ramGb ? { ramGb, hasGpu: false } : undefined,
        }),
      })
      const data = await res.json() as { text: string; complete: boolean; fallback: boolean }
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
      if (data.fallback) setFallback(true)
      if (data.complete) setComplete(true)
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Willkommen bei Vela! Deine Einstellungen wurden gespeichert. Du kannst jetzt loslegen. 🚀',
      }])
      setFallback(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    await sendToLLM(newMessages)
  }

  return (
    <div className="flex flex-col w-full max-w-2xl" style={{ height: '480px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
          ✦
        </div>
        <div>
          <h2 className="text-white font-bold">Vela</h2>
          <p className="text-xs text-gray-400">
            {fallback ? 'Bereit zum Starten' : mode === 'local' ? '🔒 Lokal' : '☁️ Cloud'}
          </p>
        </div>
      </div>

      {/* Chat-Verlauf */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm">
              <span className="text-gray-400 text-sm animate-pulse">Vela schreibt…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input oder Abschluss-Button */}
      {complete || fallback ? (
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition"
        >
          Vela starten →
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSend() }}
            placeholder="Schreib einfach los…"
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 transition"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Haupt-Onboarding-Komponente ─────────────────────────────────────────────
export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step,       setStep]       = useState<OnboardingStep>('mode-select')
  const [mode,       setMode]       = useState<OperationMode>('local')
  const [trustLevel, setTrustLevel] = useState<TrustLevel>('balanced')
  const [hwStatus,   setHwStatus]   = useState<HardwareStatus>({
    ramGb: 0, ramOk: false, ollamaReady: false, checking: true,
  })

  useEffect(() => {
    const checkHardware = async () => {
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
        const ollamaReady = res.ok
        const ramGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4
        setHwStatus({ ramGb, ramOk: ramGb >= 8, ollamaReady, checking: false })
      } catch {
        setHwStatus(prev => ({ ...prev, ollamaReady: false, checking: false }))
      }
    }
    void checkHardware()
  }, [])

  const handleModeSelect = (selectedMode: OperationMode) => {
    setMode(selectedMode)
    setStep(selectedMode === 'cloud' ? 'hardware-warn' : 'trust-select')
  }

  const handleTrustSelect = (t: TrustLevel) => {
    setTrustLevel(t)
    setStep('assistant-chat')
  }

  const handleComplete = () => onComplete(mode, trustLevel)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      {/* Progress-Dots */}
      <div className="flex gap-2 mb-10">
        {(['mode-select', 'trust-select', 'assistant-chat'] as const).map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              step === s || (step === 'hardware-warn' && i === 0)
                ? 'bg-blue-400 w-6'
                : ['trust-select', 'assistant-chat', 'done'].includes(step) && i === 0
                  ? 'bg-gray-500'
                  : step === 'assistant-chat' && i === 1
                    ? 'bg-gray-500'
                    : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {step === 'mode-select'    && <ModeSelectStep hwStatus={hwStatus} onSelect={handleModeSelect} />}
      {step === 'hardware-warn'  && <CloudWarningStep onConfirm={() => setStep('trust-select')} onBack={() => setStep('mode-select')} />}
      {step === 'trust-select'   && <TrustSelectStep mode={mode} onSelect={handleTrustSelect} onBack={() => setStep(mode === 'cloud' ? 'hardware-warn' : 'mode-select')} />}
      {step === 'assistant-chat' && <AssistantChatStep mode={mode} trustLevel={trustLevel} onComplete={handleComplete} />}
    </div>
  )
}
