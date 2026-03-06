import { MessengerWizard } from '../components/MessengerWizard.tsx'
import { BackendSelector, type BackendMode } from '../components/BackendSelector.js'
import React, { useState, useEffect } from 'react'
import { Card, Button, Input, SegmentedControl } from '../components/ui'
import { useVelaStore } from '../store/useVelaStore'

type TrustLevel = 'cautious' | 'balanced' | 'autonomous'

const trustOptions: { value: TrustLevel; label: string; description: string }[] = [
  { value: 'cautious', label: 'Vorsichtig', description: 'Vela fragt bei jeder Aktion nach Bestaetigung. Sicher, aber etwas langsamer.' },
  { value: 'balanced', label: 'Ausgewogen', description: 'Vela entscheidet selbst bei einfachen Aufgaben, fragt bei wichtigen Aktionen nach.' },
  { value: 'autonomous', label: 'Autonom', description: 'Vela handelt selbststaendig und informiert dich im Nachhinein. Maximale Effizienz.' },
]

const models = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'groq',      label: 'Groq — Llama/Gemma (kostenlos) ⚡' },
  { value: 'gemini',    label: 'Gemini (Google, kostenlos) 🆓' },
  { value: 'openai',    label: 'OpenAI / Kompatibel (Experten)' },
  { value: 'local',     label: 'Ollama (lokal, kein Internet)' },
]

export function SettingsPage() {
  const { state, dispatch } = useVelaStore()
  const [isAdvanced, setIsAdvanced] = useState<boolean>(() => (localStorage.getItem('vela_ui_mode') || 'simple') === 'advanced')

  // KI-Verbindung state
  const [backendMode, setBackendMode] = useState<BackendMode>('local')
  const [activeModel, setActiveModel] = useState('claude')
  const [apiKey, setApiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('https://api.openai.com/v1')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  // Persönlichkeit state
  const [velaName, setVelaName] = useState('Vela')
  const [systemPrompt, setSystemPrompt] = useState('Hilfsbereit, präzise, auf Deutsch')
  const [personalitySaveStatus, setPersonalitySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Gmail state
  const [hasGmailConfig, setHasGmailConfig] = useState(false)
  const [gmailModalOpen, setGmailModalOpen] = useState(false)
  const [gmailClientId, setGmailClientId] = useState('')
  const [gmailClientSecret, setGmailClientSecret] = useState('')
  const [gmailRefreshToken, setGmailRefreshToken] = useState('')
  const [gmailSaveStatus, setGmailSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('http://localhost:3000/api/settings')
      .then((r) => r.json())
      .then((data: { hasAnthropicKey: boolean; model: string; velaName?: string; systemPrompt?: string; hasGmailConfig?: boolean }) => {
        if (data.model) setActiveModel(data.model)
        if ((data as Record<string,unknown>).openaiBaseUrl) setOpenaiBaseUrl((data as Record<string,unknown>).openaiBaseUrl as string)
        if (data.backend) setBackendMode(data.backend as BackendMode)
        if (data.velaName) setVelaName(data.velaName)
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt)
        setHasGmailConfig(data.hasGmailConfig ?? false)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const syncMode = () => setIsAdvanced((document.documentElement.getAttribute('data-mode') || 'simple') === 'advanced')
    syncMode()
    window.addEventListener('storage', syncMode)
    const id = window.setInterval(syncMode, 600)
    return () => {
      window.removeEventListener('storage', syncMode)
      window.clearInterval(id)
    }
  }, [])

  async function handleBackendChange(mode: BackendMode) {
    setBackendMode(mode)
    await fetch('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backend: mode }),
    }).catch(() => {})
  }

  async function saveApiKey() {
    setSaveStatus('saving')
    try {
      const body: Record<string, string> = {}
      if (activeModel === 'anthropic') body.anthropicKey = apiKey
      else if (activeModel === 'openai') body.openaiKey = apiKey
      else if (activeModel === 'gemini' && geminiKey) body.geminiKey = geminiKey
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

  async function savePersonality() {
    setPersonalitySaveStatus('saving')
    try {
      await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ velaName: velaName.trim(), systemPrompt: systemPrompt.trim() }),
      })
      setPersonalitySaveStatus('saved')
      setTimeout(() => setPersonalitySaveStatus('idle'), 2000)
    } catch {
      setPersonalitySaveStatus('error')
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

  async function saveGmailConfig() {
    setGmailSaveStatus('saving')
    try {
      await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleClientId: gmailClientId.trim(),
          googleClientSecret: gmailClientSecret.trim(),
          googleRefreshToken: gmailRefreshToken.trim(),
        }),
      })
      setGmailSaveStatus('saved')
      setHasGmailConfig(true)
      setTimeout(() => {
        setGmailSaveStatus('idle')
        setGmailModalOpen(false)
      }, 1500)
    } catch {
      setGmailSaveStatus('error')
    }
  }

  return (
    <div className="flex-1 min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-6 py-8 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center gap-3"><h1 className="text-2xl text-[var(--text-primary)]">Einstellungen</h1><span className="text-xs px-2 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">{isAdvanced ? 'Expertenmodus' : 'Einfachmodus'}</span></div>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Passe Vela an deine Bedürfnisse an</p>
      </header>

      <div className="px-4 md:px-8 py-8 max-w-4xl space-y-10">

        {/* KI-Verbindung */}
        <section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">KI-Verbindung</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Verbinde Vela mit deinem KI-Anbieter.</p>

          <BackendSelector
            current={backendMode}
            onChange={handleBackendChange}
            requiresConfirmation={true}
          />

          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[var(--text-secondary)] text-sm">Aktives Modell:</span>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] px-3 py-1.5 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {activeModel !== 'ollama' && (
              <label className="block">
                <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeModel === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                />
              </label>
            )}
            {activeModel === 'ollama' && (
              <p className="text-[var(--text-secondary)] text-sm">Ollama läuft lokal – kein API Key nötig.</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testConnection}
                disabled={testStatus === 'loading'}
                className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[var(--text-primary)] text-sm font-medium hover:border-[var(--border-strong)] transition-colors disabled:opacity-50"
              >
                {testStatus === 'loading' ? '...' : 'Verbindung testen'}
              </button>
              {activeModel !== 'ollama' && (
                <button
                  onClick={saveApiKey}
                  disabled={saveStatus === 'saving' || !apiKey}
                  className="px-4 py-2 bg-[var(--accent)] text-[#06231f] rounded-[8px] text-sm font-semibold hover:brightness-110 transition-colors disabled:opacity-50"
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

        {/* Persönlichkeit */}
        <section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">Persönlichkeit</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Wie soll Vela heißen und sich verhalten?</p>

          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] p-5 space-y-4">
            <label className="block">
              <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Name</span>
              <input
                type="text"
                value={velaName}
                onChange={(e) => setVelaName(e.target.value)}
                placeholder="Vela"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Persönlichkeit / Verhalten</span>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Hilfsbereit, präzise, auf Deutsch"
                rows={4}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors resize-none leading-relaxed"
              />
              <span className="text-xs text-[var(--text-secondary)] mt-1 block">Beschreibe, wie Vela sprechen und handeln soll.</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={savePersonality}
                disabled={personalitySaveStatus === 'saving'}
                className="px-4 py-2 bg-[var(--accent)] text-[#06231f] rounded-[8px] text-sm font-semibold hover:brightness-110 transition-colors disabled:opacity-50"
              >
                {personalitySaveStatus === 'saving' ? 'Speichern...' : personalitySaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
              {personalitySaveStatus === 'error' && <span className="text-red-500 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </section>

        {/* Experten: OpenAI-kompatibler Endpunkt */}
        {isAdvanced && activeModel === 'openai' && (
          <section>
            <h2 className="text-lg text-[var(--text-primary)] mb-1">OpenAI-kompatibler Endpunkt</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Für Experten: Beliebigen OpenAI-kompatiblen Server einbinden.</p>
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] p-5 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                <p className="font-medium mb-1">Kompatible Endpunkte:</p>
                <p>• LM Studio: http://localhost:1234/v1</p>
                <p>• Ollama (OpenAI-Mode): http://localhost:11434/v1</p>
                <p>• OpenRouter: https://openrouter.ai/api/v1</p>
                <p>• Together AI: https://api.together.xyz/v1</p>
                <p>• lokale llama.cpp: http://localhost:8080/v1</p>
              </div>
              <label className="block">
                <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Base URL</span>
                <input
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors font-mono"
                />
              </label>
              <button
                onClick={async () => {
                  await fetch('http://localhost:3000/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ openaiBaseUrl, backend: 'openai' }),
                  })
                }}
                className="px-4 py-2 bg-[var(--accent)] text-[#06231f] rounded-[8px] text-sm font-semibold hover:brightness-110 transition-colors"
              >
                Endpunkt speichern
              </button>
            </div>
          </section>
        )}

        {/* Trust Level */}
        <section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">Vertrauensstufe</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Wie selbststaendig darf Vela handeln?</p>
          <div className="flex gap-2 mb-4">
            {trustOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: 'SET_TRUST', payload: opt.value })}
                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  state.trustLevel === opt.value
                    ? 'bg-[var(--accent)] text-[#06231f] border-transparent shadow-[0_8px_20px_rgba(45,212,191,0.18)]'
                    : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-3">
            <p className="text-[var(--text-primary)] text-sm">
              {trustOptions.find((o) => o.value === state.trustLevel)?.description}
            </p>
          </div>
        </section>

        {/* KI-Modell (legacy selector kept for store state) */}
        {isAdvanced && (<section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">KI-Modell (Store)</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Welches Sprachmodell soll Vela intern verwenden?</p>
          <select
            value={state.activeModel}
            onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
            className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </section>)}

        {/* Messenger */}
        <section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">Messenger</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Chatte mit Vela über Telegram oder Discord.</p>
          <MessengerWizard />
        </section>

        {/* Verbundene Dienste */}
        <section>
          <h2 className="text-lg text-[var(--text-primary)] mb-1">Verbundene Dienste</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Welche Apps kann Vela verwenden?</p>
          <div className="space-y-3">
            {/* Gmail */}
            <div className="flex items-center gap-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-5 py-4">
              <span className="text-2xl">📧</span>
              <div className="flex-1">
                <p className="text-[var(--text-primary)] text-sm font-medium">Gmail</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {hasGmailConfig ? '✅ Verbunden' : '❌ Nicht verbunden'}
                </p>
              </div>
              <button
                onClick={() => setGmailModalOpen(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  hasGmailConfig
                    ? 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    : 'bg-[var(--accent)] text-[#06231f] hover:brightness-110'
                }`}
              >
                {hasGmailConfig ? 'Neu verbinden' : 'Gmail verbinden'}
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Gmail OAuth Modal */}
      {gmailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-[var(--text-primary)]">Gmail verbinden</h3>
              <button
                onClick={() => setGmailModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-secondary)] space-y-1">
              <p className="font-medium text-[var(--text-primary)] mb-2">Anleitung:</p>
              <p>1. Google Cloud Console öffnen</p>
              <p>2. OAuth Client erstellen</p>
              <p>3. Refresh Token generieren</p>
            </div>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Client ID</span>
              <input
                type="text"
                value={gmailClientId}
                onChange={(e) => setGmailClientId(e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Client Secret</span>
              <input
                type="password"
                value={gmailClientSecret}
                onChange={(e) => setGmailClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm font-medium mb-1.5 block">Refresh Token</span>
              <input
                type="password"
                value={gmailRefreshToken}
                onChange={(e) => setGmailRefreshToken(e.target.value)}
                placeholder="1//0g..."
                className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveGmailConfig}
                disabled={gmailSaveStatus === 'saving' || !gmailClientId || !gmailClientSecret || !gmailRefreshToken}
                className="px-5 py-2 bg-[var(--accent)] text-[#06231f] rounded-[8px] text-sm font-semibold hover:brightness-110 transition-colors disabled:opacity-50"
              >
                {gmailSaveStatus === 'saving' ? 'Speichern...' : gmailSaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
              <button
                onClick={() => setGmailModalOpen(false)}
                className="px-5 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm font-medium hover:border-[var(--border-strong)] transition-colors"
              >
                Abbrechen
              </button>
              {gmailSaveStatus === 'error' && <span className="text-red-500 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
