import React, { useState, useEffect } from 'react'

type Tab = 'claude' | 'groq' | 'gemini' | 'openai' | 'ollama'
type TrustLevel = 'cautious' | 'balanced' | 'autonomous'

interface HardwareInfo {
  ram_gb: number
  has_gpu: boolean
  free_disk_gb: number
  recommended_backend: 'local' | 'groq' | 'cloud'
}

interface OnboardingPageProps {
  onComplete: () => void
}

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
  const [tab, setTab] = useState<Tab>('claude')
  const [claudeKey, setClaudeKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [trust, setTrust] = useState<TrustLevel>('cautious')
  const [level, setLevel] = useState<'laie' | 'poweruser' | 'entwickler'>('laie')
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
        else setTab('claude')
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

  async function finish() {
    localStorage.setItem('vela_trust', trust)
    localStorage.setItem('vela_onboarded', 'true')
    // Persist level preference to server
    await fetch('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefLevel: level }),
    }).catch(() => {})
    onComplete()
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      {/* Step indicators */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              s === step ? 'bg-sky w-6' : s < step ? 'bg-sky/50' : 'bg-sand'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Step 1 – Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="font-fraunces text-7xl font-semibold text-ink tracking-tight">
              V<span className="italic text-sky">e</span>la
            </div>
            <div>
              <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
                Willkommen bei Vela
              </h1>
              <p className="text-earth text-lg">
                Dein persönlicher KI-Agent. Richte ihn in 3 Schritten ein.
              </p>
            </div>
            {/* Hardware Badge */}
            {hardware && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-warm border border-sand rounded-xl text-earth text-sm">
                <span>💻</span>
                <span>{hardware.ram_gb} GB RAM</span>
                {hardware.has_gpu && <span>· GPU ✓</span>}
                <span>·</span>
                <span className={hardware.recommended_backend === 'local' ? 'text-green-600' : hardware.recommended_backend === 'groq' ? 'text-sky' : 'text-bark'}>
                  {hardware.recommended_backend === 'local' ? '✓ Lokal empfohlen' : hardware.recommended_backend === 'groq' ? '⚡ Groq empfohlen' : '☁ Cloud empfohlen'}
                </span>
              </div>
            )}
            {hwLoading && <p className="text-earth text-sm">Hardware wird erkannt...</p>}
            <button
              onClick={() => setStep(2)}
              className="mt-4 inline-flex items-center gap-2 px-8 py-4 bg-sky text-white font-medium rounded-2xl hover:bg-sky/90 transition-all shadow-sm text-lg"
            >
              Los geht's →
            </button>
          </div>
        )}

        {/* Step 2 – API Key */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-fraunces text-2xl font-semibold text-ink mb-1">
                KI-Modell verbinden
              </h1>
              <p className="text-earth text-sm">Verbinde Vela mit deinem bevorzugten KI-Anbieter.</p>
              {hardware && (
                <p className="text-sky text-xs mt-1">
                  ⚡ Empfehlung für dein System: <strong>{hardware.recommended_backend === 'local' ? 'Lokal (Ollama)' : hardware.recommended_backend === 'groq' ? 'Groq (kostenlos, schnell)' : 'Cloud (Anthropic/OpenAI)'}</strong>
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-warm border border-sand rounded-xl p-1 flex-wrap">
              {(['claude', 'groq', 'gemini', 'openai', 'ollama'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setTestStatus('idle') }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all min-w-0 ${
                    tab === t ? 'bg-white text-ink shadow-sm' : 'text-earth hover:text-ink'
                  }`}
                >
                  {t === 'claude' ? 'Anthropic' : t === 'openai' ? 'OpenAI' : t === 'groq' ? 'Groq ⚡' : t === 'gemini' ? 'Gemini 🆓' : 'Ollama'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-warm border border-sand rounded-2xl p-5 space-y-4">
              {tab === 'claude' && (
                <>
                  <label className="block">
                    <span className="text-ink text-sm font-medium mb-1.5 block">ANTHROPIC_API_KEY</span>
                    <input
                      type="password"
                      value={claudeKey}
                      onChange={(e) => setClaudeKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors"
                    />
                  </label>
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-sky text-xs hover:underline">
                    ↗ API Key erstellen auf console.anthropic.com
                  </a>
                </>
              )}
              {tab === 'groq' && (
                <>
                  <div className="bg-sky/10 border border-sky/20 rounded-xl px-4 py-3 text-sm text-ink">
                    <p className="font-medium mb-1">⚡ Groq — kostenlos & sehr schnell</p>
                    <p className="text-earth text-xs">Vela sendet deine Anfragen an Groqs Server. Groq speichert keine Konversationen dauerhaft. Ideal wenn dein Computer weniger Leistung hat.</p>
                  </div>
                  <label className="block">
                    <span className="text-ink text-sm font-medium mb-1.5 block">GROQ_API_KEY</span>
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors"
                    />
                  </label>
                  <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-sky text-xs hover:underline">
                    ↗ Kostenlosen API Key erstellen auf console.groq.com
                  </a>
                </>
              )}
              {tab === 'openai' && (
                <label className="block">
                  <span className="text-ink text-sm font-medium mb-1.5 block">OPENAI_API_KEY</span>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors"
                  />
                </label>
              )}
              {tab === 'gemini' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-ink">
                    <p className="font-medium mb-1">🆓 Google Gemini — kostenlos</p>
                    <p className="text-earth text-xs">Kostenloser API-Key auf aistudio.google.com. Kein Credit Card nötig. Daten gehen an Google-Server.</p>
                  </div>
                  <label className="block">
                    <span className="text-ink text-sm font-medium mb-1.5 block">GEMINI_API_KEY</span>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors"
                    />
                  </label>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-sky text-xs hover:underline">
                    ↗ Kostenloser API Key auf aistudio.google.com
                  </a>
                </>
              )}
              {tab === 'ollama' && (
                <div className="space-y-3">
                  <p className="text-earth text-sm">
                    Ollama läuft lokal – kein API Key nötig. Stelle sicher, dass Ollama auf deinem System läuft.
                  </p>
                  <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-sky text-xs hover:underline">
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
                className="px-5 py-2.5 bg-warm border border-sand rounded-xl text-ink text-sm font-medium hover:border-bark transition-colors disabled:opacity-50"
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
              className="w-full py-4 bg-sky text-white font-medium rounded-2xl hover:bg-sky/90 transition-all shadow-sm"
            >
              Weiter →
            </button>
          </div>
        )}

        {/* Step 3 – Trust Level */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-fraunces text-2xl font-semibold text-ink mb-1">
                Vertrauen konfigurieren
              </h1>
              <p className="text-earth text-sm">Wie selbstständig darf Vela handeln?</p>
            </div>

            {/* Level Selection */}
            <div>
              <p className="text-ink text-sm font-medium mb-2">Wie vertraut bist du mit KI-Tools?</p>
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
                        ? 'bg-sky text-white border-sky shadow-sm'
                        : 'bg-warm text-earth border-sand hover:border-bark'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {trustOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrust(opt.value)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    trust === opt.value
                      ? 'border-sky bg-sky-light'
                      : 'border-sand bg-warm hover:border-bark'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-fraunces font-semibold text-ink">{opt.label}</span>
                    {trust === opt.value && (
                      <span className="ml-auto text-sky text-sm font-medium">✓ Ausgewählt</span>
                    )}
                  </div>
                  <p className="text-earth text-sm ml-9">{opt.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={finish}
              className="w-full py-4 bg-sky text-white font-semibold rounded-2xl hover:bg-sky/90 transition-all shadow-sm text-lg font-fraunces"
            >
              Vela starten →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
