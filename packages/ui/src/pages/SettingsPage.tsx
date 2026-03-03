import React, { useState, useEffect } from 'react'
import { useVelaStore } from '../store/useVelaStore'

type TrustLevel = 'cautious' | 'balanced' | 'autonomous'

const trustOptions: { value: TrustLevel; label: string; description: string }[] = [
  { value: 'cautious', label: 'Vorsichtig', description: 'Vela fragt bei jeder Aktion nach Bestaetigung. Sicher, aber etwas langsamer.' },
  { value: 'balanced', label: 'Ausgewogen', description: 'Vela entscheidet selbst bei einfachen Aufgaben, fragt bei wichtigen Aktionen nach.' },
  { value: 'autonomous', label: 'Autonom', description: 'Vela handelt selbststaendig und informiert dich im Nachhinein. Maximale Effizienz.' },
]

const models = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'gpt4o', label: 'GPT-4o (OpenAI)' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'ollama', label: 'Ollama (lokal)' },
]

const services = [
  { id: 'gmail', label: 'Gmail', icon: '📧', connected: true },
  { id: 'calendar', label: 'Kalender', icon: '📅', connected: true },
  { id: 'slack', label: 'Slack', icon: '💬', connected: false },
]

export function SettingsPage() {
  const { state, dispatch } = useVelaStore()
  const [connectedServices, setConnectedServices] = useState<Record<string, boolean>>({
    gmail: true,
    calendar: true,
    slack: false,
  })

  // KI-Verbindung state
  const [activeModel, setActiveModel] = useState('claude')
  const [apiKey, setApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/settings')
      .then((r) => r.json())
      .then((data: { hasAnthropicKey: boolean; model: string }) => {
        if (data.model) setActiveModel(data.model)
      })
      .catch(() => {})
  }, [])

  function connectService(id: string) {
    setConnectedServices((prev) => ({ ...prev, [id]: true }))
  }

  async function saveApiKey() {
    setSaveStatus('saving')
    try {
      const body: Record<string, string> = {}
      if (activeModel === 'claude') body.anthropicKey = apiKey
      else if (activeModel === 'gpt4o') body.openaiKey = apiKey
      body.model = activeModel
      await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  async function testConnection() {
    setTestStatus('loading')
    setTestError('')
    try {
      const res = await fetch('http://localhost:3000/api/health')
      if (res.ok) setTestStatus('success')
      else { setTestStatus('error'); setTestError(`Status ${res.status}`) }
    } catch (e) {
      setTestStatus('error')
      setTestError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  return (
    <div className="flex-1 bg-cream min-h-screen">
      <header className="px-6 py-8 border-b border-sand bg-warm">
        <h1 className="font-fraunces font-semibold text-2xl text-ink">Einstellungen</h1>
        <p className="text-earth text-sm mt-1">Passe Vela an deine Bedürfnisse an</p>
      </header>

      <div className="px-4 md:px-8 py-8 max-w-xl space-y-10">

        {/* KI-Verbindung – TOP */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-ink mb-1">KI-Verbindung</h2>
          <p className="text-earth text-sm mb-4">Verbinde Vela mit deinem KI-Anbieter.</p>

          <div className="bg-warm border border-sand rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-earth text-sm">Aktives Modell:</span>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-cream border border-sand rounded-xl px-3 py-1.5 text-ink text-sm outline-none focus:border-sky"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {activeModel !== 'ollama' && (
              <label className="block">
                <span className="text-ink text-sm font-medium mb-1.5 block">API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeModel === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors"
                />
              </label>
            )}
            {activeModel === 'ollama' && (
              <p className="text-earth text-sm">Ollama läuft lokal – kein API Key nötig.</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testConnection}
                disabled={testStatus === 'loading'}
                className="px-4 py-2 bg-cream border border-sand rounded-xl text-ink text-sm font-medium hover:border-bark transition-colors disabled:opacity-50"
              >
                {testStatus === 'loading' ? '...' : 'Verbindung testen'}
              </button>
              {activeModel !== 'ollama' && (
                <button
                  onClick={saveApiKey}
                  disabled={saveStatus === 'saving' || !apiKey}
                  className="px-4 py-2 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Speichern...' : saveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
                </button>
              )}
              {testStatus === 'success' && <span className="text-green-600 text-sm">✓ Verbindung erfolgreich</span>}
              {testStatus === 'error' && <span className="text-red-500 text-sm">✗ {testError}</span>}
              {saveStatus === 'error' && <span className="text-red-500 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </section>

        {/* Trust Level */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-ink mb-1">Vertrauensstufe</h2>
          <p className="text-earth text-sm mb-4">Wie selbststaendig darf Vela handeln?</p>
          <div className="flex gap-2 mb-4">
            {trustOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: 'SET_TRUST', payload: opt.value })}
                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  state.trustLevel === opt.value
                    ? 'bg-sky text-white border-sky shadow-sm'
                    : 'bg-warm text-earth border-sand hover:border-bark'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="bg-warm border border-sand rounded-2xl px-4 py-3">
            <p className="text-ink text-sm">
              {trustOptions.find((o) => o.value === state.trustLevel)?.description}
            </p>
          </div>
        </section>

        {/* KI-Modell (legacy selector kept for store state) */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-ink mb-1">KI-Modell (Store)</h2>
          <p className="text-earth text-sm mb-4">Welches Sprachmodell soll Vela intern verwenden?</p>
          <select
            value={state.activeModel}
            onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
            className="w-full bg-warm border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky transition-colors appearance-none cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </section>

        {/* Verbundene Dienste */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-ink mb-1">Verbundene Dienste</h2>
          <p className="text-earth text-sm mb-4">Welche Apps kann Vela verwenden?</p>
          <div className="space-y-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex items-center gap-4 bg-warm border border-sand rounded-2xl px-5 py-4"
              >
                <span className="text-2xl">{svc.icon}</span>
                <div className="flex-1">
                  <p className="text-ink text-sm font-medium">{svc.label}</p>
                  <p className="text-xs text-earth mt-0.5">
                    {connectedServices[svc.id] ? 'Verbunden' : 'Nicht verbunden'}
                  </p>
                </div>
                {connectedServices[svc.id] ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    &#10003; Aktiv
                  </span>
                ) : (
                  <button
                    onClick={() => connectService(svc.id)}
                    className="px-4 py-1.5 rounded-xl bg-sky text-white text-xs font-medium hover:bg-sky/90 transition-colors"
                  >
                    Verbinden
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
