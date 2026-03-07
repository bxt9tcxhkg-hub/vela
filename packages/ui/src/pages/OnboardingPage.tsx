import React, { useState, useEffect } from 'react'

type Tab = 'claude' | 'groq' | 'gemini' | 'openai' | 'ollama'
type TrustLevel = 'cautious' | 'balanced' | 'autonomous'
type TopicKey = 'terminassistenz' | 'ernaehrung' | 'alltag'

interface HardwareInfo {
  ram_gb: number
  has_gpu: boolean
  free_disk_gb: number
  recommended_backend: 'local' | 'groq' | 'cloud'
}

interface OnboardingPageProps {
  onComplete: () => void
}

const topicOptions: { value: TopicKey; label: string }[] = [
  { value: 'terminassistenz', label: 'Terminassistenz' },
  { value: 'ernaehrung', label: 'Ernährung' },
  { value: 'alltag', label: 'Alltag' },
]

const trustOptions: { value: TrustLevel; icon: string; label: string; description: string }[] = [
  {
    value: 'cautious',
    icon: '🛡️',
    label: 'Vorsichtig',
    description: 'Vela fragt bei jeder Aktion nach Bestätigung. Sicher, aber etwas langsamer. Ideal für den Einstieg.',
  },
  {
    value: 'balanced',
    icon: '⚖️',
    label: 'Ausgewogen',
    description: 'Vela entscheidet selbst bei einfachen Aufgaben, fragt bei wichtigen Aktionen nach.',
  },
  {
    value: 'autonomous',
    icon: '🚀',
    label: 'Autonom',
    description: 'Vela handelt selbstständig und informiert dich im Nachhinein. Maximale Effizienz.',
  },
]

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(1)
  const [tab, setTab] = useState<Tab>('ollama')
  const [claudeKey, setClaudeKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [trust, setTrust] = useState<TrustLevel>('cautious')
  const [level, setLevel] = useState<'laie' | 'poweruser' | 'entwickler'>('laie')
  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>(['alltag'])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [hwLoading, setHwLoading] = useState(false)

  // Fetch hardware info on mount
  useEffect(() => {
    setHwLoading(true)
    fetch('http://localhost:3000/api/onboarding/hardware')
      .then((r) => r.json())
      .then((data: HardwareInfo) => {
        setHardware(data)
        // Auto-select recommended tab
        if (data.recommended_backend === 'groq') setTab('groq')
        else if (data.recommended_backend === 'local') setTab('ollama')
        else setTab('ollama')
      })
      .catch(() => {})
      .finally(() => setHwLoading(false))
  }, [])

  async function testConnection() {
    setTestStatus('loading')
    setTestError('')
    try {
      const body: Record<string, string> = {}
      if (tab === 'claude' && claudeKey) body.anthropicKey = claudeKey
      if (tab === 'openai' && openaiKey) body.openaiKey = openaiKey
      if (tab === 'groq' && groqKey) body.groqKey = groqKey
      if (tab === 'gemini' && geminiKey) body.geminiKey = geminiKey
      if (Object.keys(body).length > 0) {
        await fetch('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      // Set backend
      const backendMap: Record<Tab, string> = { claude: 'anthropic', groq: 'groq', gemini: 'gemini', openai: 'openai', ollama: 'local' }
      await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend: backendMap[tab] }),
      })
      const res = await fetch('http://localhost:3000/api/health')
      if (res.ok) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setTestError(`Server antwortete mit Status ${res.status}`)
      }
    } catch (e) {
      setTestStatus('error')
      setTestError(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen')
    }
  }

  function ensureUserId(): string {
    const existing = localStorage.getItem('vela_user_id')
    if (existing) return existing
    const created = `vela-user-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('vela_user_id', created)
    return created
  }

  async function finish() {
    localStorage.setItem('vela_trust', trust)
    localStorage.setItem('vela_onboarded', 'true')
    localStorage.setItem('vela_topics', JSON.stringify(selectedTopics))
    const userId = ensureUserId()

    await fetch('http://localhost:3000/api/onboarding/topics/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, topics: selectedTopics }),
    }).catch(() => {})

    // Persist level preference to server
    await fetch('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefLevel: level }),
    }).catch(() => {})
    onComplete()
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      {/* Step indicators */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              s === step ? 'bg-[var(--accent)] w-6' : s < step ? 'bg-[var(--accent)]/50' : 'bg-sand'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Step 1 – Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className=" text-7xl font-semibold text-[var(--text-primary)] tracking-tight">
              V<span className="italic text-[var(--accent)]">e</span>la
            </div>
            <div>
              <h1 className=" text-3xl font-semibold text-[var(--text-primary)] mb-3">
                Willkommen bei Vela
              </h1>
              <p className="text-[var(--text-secondary)] text-lg">
                Dein persönlicher KI-Agent. Richte ihn in 3 Schritten ein.
              </p>
            </div>
            {/* Hardware Badge */}
            {hardware && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] text-sm">
                <span>💻</span>
                <span>{hardware.ram_gb} GB RAM</span>
                {hardware.has_gpu && <span>· GPU ✓</span>}
                <span>·</span>
                <span className={hardware.recommended_backend === 'local' ? 'text-green-600' : hardware.recommended_backend === 'groq' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}>
                  {hardware.recommended_backend === 'local' ? '✓ Lokal empfohlen' : hardware.recommended_backend === 'groq' ? '⚡ Groq empfohlen' : '☁ Cloud empfohlen'}
                </span>
              </div>
            )}
            {hwLoading && <p className="text-[var(--text-secondary)] text-sm">Hardware wird erkannt...</p>}
            <button
              onClick={() => setStep(2)}
              className="mt-4 inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-white font-medium rounded-2xl hover:bg-[var(--accent)]/90 transition-all shadow-sm text-lg"
            >
              Los geht's →
            </button>
          </div>
        )}

        {/* Step 2 – API Key */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className=" text-2xl font-semibold text-[var(--text-primary)] mb-1">
                KI-Modell verbinden
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">Verbinde Vela mit deinem bevorzugten KI-Anbieter.</p>
              {hardware && (
                <p className="text-[var(--accent)] text-xs mt-1">
                  ⚡ Empfehlung für dein System: <strong>{hardware.recommended_backend === 'local' ? 'Lokal (Ollama)' : hardware.recommended_backend === 'groq' ? 'Groq (kostenlos, schnell)' : 'Cloud (Anthropic/OpenAI)'}</strong>
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1 flex-wrap">
              {(['claude', 'groq', 'gemini', 'openai', 'ollama'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setTestStatus('idle') }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all min-w-0 ${
                    tab === t ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-strong)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t === 'claude' ? 'Anthropic' : t === 'openai' ? 'OpenAI' : t === 'groq' ? 'Groq ⚡' : t === 'gemini' ? 'Gemini 🆓' : 'Ollama'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
              {tab === 'claude' && (
                <>
                  <label className="block">
                    <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">ANTHROPIC_API_KEY</span>
                    <input
                      type="password"
                      value={claudeKey}
                      onChange={(e) => setClaudeKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                    />
                  </label>
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] text-xs hover:underline">
                    ↗ API Key erstellen auf console.anthropic.com
                  </a>
                </>
              )}
              {tab === 'groq' && (
                <>
                  <div className="bg-[var(--accent)]/10 border border-[var(--border-strong)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)]">
                    <p className="font-medium mb-1">⚡ Groq — kostenlos & sehr schnell</p>
                    <p className="text-[var(--text-secondary)] text-xs">Vela sendet deine Anfragen an Groqs Server. Groq speichert keine Konversationen dauerhaft. Ideal wenn dein Computer weniger Leistung hat.</p>
                  </div>
                  <label className="block">
                    <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">GROQ_API_KEY</span>
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                    />
                  </label>
                  <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] text-xs hover:underline">
                    ↗ Kostenlosen API Key erstellen auf console.groq.com
                  </a>
                </>
              )}
              {tab === 'openai' && (
                <label className="block">
                  <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">OPENAI_API_KEY</span>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                  />
                </label>
              )}
              {tab === 'gemini' && (
                <>
                  <div className="bg-[var(--accent-soft)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)]">
                    <p className="font-medium mb-1">🆓 Google Gemini — kostenlos</p>
                    <p className="text-[var(--text-secondary)] text-xs">Kostenloser API-Key auf aistudio.google.com. Kein Credit Card nötig. Daten gehen an Google-Server.</p>
                  </div>
                  <label className="block">
                    <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">GEMINI_API_KEY</span>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                    />
                  </label>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] text-xs hover:underline">
                    ↗ Kostenloser API Key auf aistudio.google.com
                  </a>
                </>
              )}
              {tab === 'ollama' && (
                <div className="space-y-3">
                  <p className="text-[var(--text-secondary)] text-sm">
                    Ollama läuft lokal – kein API Key nötig. Stelle sicher, dass Ollama auf deinem System läuft.
                  </p>
                  <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] text-xs hover:underline">
                    ↗ Ollama installieren auf ollama.com
                  </a>
                </div>
              )}
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testConnection}
                disabled={testStatus === 'loading'}
                className="px-5 py-2.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm font-medium hover:border-bark transition-colors disabled:opacity-50"
              >
                {testStatus === 'loading' ? '...' : 'Test Connection'}
              </button>
              {testStatus === 'success' && (
                <span className="text-green-600 text-sm font-medium">✓ Verbindung erfolgreich</span>
              )}
              {testStatus === 'error' && (
                <span className="text-red-500 text-sm">✗ {testError}</span>
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-[var(--accent)] text-white font-medium rounded-2xl hover:bg-[var(--accent)]/90 transition-all shadow-sm"
            >
              Weiter →
            </button>
          </div>
        )}

        {/* Step 3 – Trust Level */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className=" text-2xl font-semibold text-[var(--text-primary)] mb-1">
                Vertrauen konfigurieren
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">Wie selbstständig darf Vela handeln?</p>
            </div>

            {/* Level Selection */}
            <div>
              <p className="text-[var(--text-primary)] text-sm font-medium mb-2">Wie vertraut bist du mit KI-Tools?</p>
              <div className="flex gap-2">
                {([
                  { value: 'laie' as const, label: '🌱 Neu dabei' },
                  { value: 'poweruser' as const, label: '⚡ Kenne mich aus' },
                  { value: 'entwickler' as const, label: '🛠 Bin Entwickler' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(opt.value)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                      level === opt.value
                        ? 'bg-[var(--accent)] text-white border-sky shadow-sm'
                        : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:border-bark'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[var(--text-primary)] text-sm font-medium mb-2">Themen für V1</p>
              <div className="flex gap-2 flex-wrap">
                {topicOptions.map((topic) => {
                  const active = selectedTopics.includes(topic.value)
                  return (
                    <button
                      key={topic.value}
                      onClick={() => {
                        setSelectedTopics((prev) => {
                          if (prev.includes(topic.value)) return prev.length === 1 ? prev : prev.filter((t) => t !== topic.value)
                          return [...prev, topic.value]
                        })
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        active
                          ? 'bg-[var(--accent)] text-white border-sky shadow-sm'
                          : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:border-bark'
                      }`}
                    >
                      {active ? '✓ ' : ''}{topic.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              {trustOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrust(opt.value)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    trust === opt.value
                      ? 'border-sky bg-[var(--accent)]-light'
                      : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-bark'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl">{opt.icon}</span>
                    <span className=" font-semibold text-[var(--text-primary)]">{opt.label}</span>
                    {trust === opt.value && (
                      <span className="ml-auto text-[var(--accent)] text-sm font-medium">✓ Ausgewählt</span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm ml-9">{opt.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={finish}
              className="w-full py-4 bg-[var(--accent)] text-white font-semibold rounded-2xl hover:bg-[var(--accent)]/90 transition-all shadow-sm text-lg "
            >
              Vela starten →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
