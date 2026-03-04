import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'
import { EmailConnectionWizard, type EmailConnection } from '../components/EmailConnectionWizard'
import { FeedbackDashboard } from '../components/FeedbackDashboard'
import { FeedbackDialog } from '../components/FeedbackButton'
import { useVelaStore } from '../store/useVelaStore'
import type { OperationMode } from '../store/useVelaStore'

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

export function SettingsPage() {
  const { state, dispatch } = useVelaStore()

  // KI-Verbindung state
  const [activeModel, setActiveModel] = useState('claude')
  const [apiKey, setApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  // Persönlichkeit state
  const [velaName, setVelaName] = useState('Vela')
  const [systemPrompt, setSystemPrompt] = useState('Hilfsbereit, präzise, auf Deutsch')
  const [personalitySaveStatus, setPersonalitySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const { t } = useTranslation()
  const isExpert = localStorage.getItem('vela_mode') === 'cloud'
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Language state
  const [language, setLanguage] = useState<string>('auto')

  // Email connections state
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([])
  const [emailWizardOpen, setEmailWizardOpen] = useState(false)
  const operationMode = state.operationMode
  const [modeChanging, setModeChanging] = useState(false)
  const [cloudWarning, setCloudWarning] = useState(false)
  const [cloudConfirmed, setCloudConfirmed] = useState(false)
  // Gmail Modal state
  const [gmailModalOpen, setGmailModalOpen] = useState(false)
  const [gmailClientId, setGmailClientId] = useState('')
  const [gmailClientSecret, setGmailClientSecret] = useState('')
  const [gmailRefreshToken, setGmailRefreshToken] = useState('')
  const [gmailSaveStatus, setGmailSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [hasGmailConfig, setHasGmailConfig] = useState(false)

  async function handleModeChange(newMode: OperationMode) {
    if (newMode === operationMode) return
    if (newMode === 'cloud') {
      setCloudWarning(true)
      return
    }
    dispatch({ type: 'SET_MODE', payload: newMode })
    dispatch({ type: 'SET_MODEL', payload: 'ollama' })
  }

  function confirmCloudMode() {
    dispatch({ type: 'SET_MODE', payload: 'cloud' })
    dispatch({ type: 'SET_MODEL', payload: 'claude' })
    setCloudWarning(false)
    setCloudConfirmed(false)
  }


  useEffect(() => {
    fetch('http://localhost:3000/api/settings')
      .then((r) => r.json())
      .then((data: { hasAnthropicKey: boolean; model: string; velaName?: string; systemPrompt?: string; hasGmailConfig?: boolean }) => {
        if (data.model) setActiveModel(data.model)
        if (data.velaName) setVelaName(data.velaName)
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt)
        setHasGmailConfig(data.hasGmailConfig ?? false)
      })
      .catch(() => {})
    // Email-Verbindungen laden
    fetch('http://localhost:3000/api/email/connections')
      .then(r => r.json())
      .then((data: { connections: EmailConnection[] }) => {
        setEmailConnections(data.connections ?? [])
      })
      .catch(() => {})
    fetch('http://localhost:3000/api/settings')
      .then(r => r.json())
      .then((data: { language?: string }) => {
        if (data.language) {
          setLanguage(data.language)
          if (data.language !== 'auto') void i18n.changeLanguage(data.language)
        }
      })
      .catch(() => {})
  }, [])

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
    <div className="flex-1 bg-bg min-h-screen">
      <header className="px-6 py-8 border-b border-border bg-surface">
        <h1 className="font-fraunces font-semibold text-2xl text-white">Einstellungen</h1>
        <p className="text-vtext2 text-sm mt-1">Passe Vela an deine Bedürfnisse an</p>
      </header>

      <div className="px-4 md:px-8 py-8 max-w-xl space-y-10">


        {/* ── Betriebsmodus ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">Betriebsmodus</h2>
          <p className="text-vtext2 text-sm mb-4">Du kannst jederzeit zwischen lokalem und Cloud-Betrieb wechseln.</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleModeChange('local')}
              className={`flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                operationMode === 'local'
                  ? 'border-green-500 bg-green-950/20'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-900/40'
              }`}
            >
              <span className="text-2xl">🔒</span>
              <p className="font-semibold text-white text-sm">Lokal</p>
              <p className="text-xs text-gray-400">Ollama · keine Daten nach außen</p>
              {operationMode === 'local' && <span className="text-xs text-green-400 font-medium">✓ Aktiv</span>}
            </button>

            <button
              onClick={() => handleModeChange('cloud')}
              className={`flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                operationMode === 'cloud'
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-900/40'
              }`}
            >
              <span className="text-2xl">☁️</span>
              <p className="font-semibold text-white text-sm">Cloud</p>
              <p className="text-xs text-gray-400">Claude · GPT-4o · Gemini</p>
              {operationMode === 'cloud' && <span className="text-xs text-blue-400 font-medium">✓ Aktiv</span>}
            </button>
          </div>

          {/* Cloud-Risikowarnung */}
          {cloudWarning && (
            <div className="mt-4 bg-yellow-900/30 border border-yellow-600 rounded-xl p-4 space-y-3">
              <p className="text-yellow-300 font-medium text-sm">⚠ Zu Cloud wechseln?</p>
              <p className="text-gray-300 text-xs">
                Deine Nachrichten werden an externe KI-Anbieter gesendet und verlassen dein Gerät.
                Du kannst jederzeit zurück zum lokalen Modus wechseln.
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudConfirmed}
                  onChange={e => setCloudConfirmed(e.target.checked)}
                  className="accent-blue-500"
                />
                Ich habe verstanden und möchte trotzdem wechseln
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCloudWarning(false)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmCloudMode}
                  disabled={!cloudConfirmed}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition"
                >
                  Cloud aktivieren
                </button>
              </div>
            </div>
          )}
        </section>

        {/* KI-Verbindung */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">KI-Verbindung</h2>
          <p className="text-vtext2 text-sm mb-4">Verbinde Vela mit deinem KI-Anbieter.</p>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-vtext2 text-sm">Aktives Modell:</span>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-surface2 border border-border rounded-xl px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {activeModel !== 'ollama' && (
              <label className="block">
                <span className="text-white text-sm font-medium mb-1.5 block">API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeModel === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </label>
            )}
            {activeModel === 'ollama' && (
              <p className="text-vtext2 text-sm">Ollama läuft lokal – kein API Key nötig.</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testConnection}
                disabled={testStatus === 'loading'}
                className="px-4 py-2 bg-surface2 border border-border rounded-xl text-white text-sm font-medium hover:border-border2 transition-colors disabled:opacity-50"
              >
                {testStatus === 'loading' ? '...' : 'Verbindung testen'}
              </button>
              {activeModel !== 'ollama' && (
                <button
                  onClick={saveApiKey}
                  disabled={saveStatus === 'saving' || !apiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Speichern...' : saveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
                </button>
              )}
              {testStatus === 'success' && <span className="text-green-400 text-sm">✓ Verbindung erfolgreich</span>}
              {testStatus === 'error' && <span className="text-red-400 text-sm">✗ {testError}</span>}
              {saveStatus === 'error' && <span className="text-red-400 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </section>

        {/* Persönlichkeit */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">Persönlichkeit</h2>
          <p className="text-vtext2 text-sm mb-4">Wie soll Vela heißen und sich verhalten?</p>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Name</span>
              <input
                type="text"
                value={velaName}
                onChange={(e) => setVelaName(e.target.value)}
                placeholder="Vela"
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Persönlichkeit / Verhalten</span>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Hilfsbereit, präzise, auf Deutsch"
                rows={4}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
              />
              <span className="text-xs text-vtext3 mt-1 block">Beschreibe, wie Vela sprechen und handeln soll.</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={savePersonality}
                disabled={personalitySaveStatus === 'saving'}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {personalitySaveStatus === 'saving' ? 'Speichern...' : personalitySaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
              {personalitySaveStatus === 'error' && <span className="text-red-400 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </section>

        {/* Trust Level */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">Vertrauensstufe</h2>
          <p className="text-vtext2 text-sm mb-4">Wie selbststaendig darf Vela handeln?</p>
          <div className="flex gap-2 mb-4">
            {trustOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: 'SET_TRUST', payload: opt.value })}
                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  state.trustLevel === opt.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-surface2 text-vtext2 border-border hover:border-border2'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-2xl px-4 py-3">
            <p className="text-white text-sm">
              {trustOptions.find((o) => o.value === state.trustLevel)?.description}
            </p>
          </div>
        </section>

        {/* KI-Modell (legacy selector kept for store state) */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">KI-Modell (Store)</h2>
          <p className="text-vtext2 text-sm mb-4">Welches Sprachmodell soll Vela intern verwenden?</p>
          <select
            value={state.activeModel}
            onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </section>

        {/* Sprache / Language */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">{t('settings.language.label')}</h2>
          <select
            value={language}
            onChange={async e => {
              const lang = e.target.value
              setLanguage(lang)
              if (lang === 'auto') {
                void i18n.changeLanguage(navigator.language.split('-')[0])
              } else {
                void i18n.changeLanguage(lang)
              }
              await fetch('http://localhost:3000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang }),
              })
            }}
            className="bg-surface2 border border-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="auto">{t('settings.language.auto')}</option>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </section>

        {/* Verbundene Dienste */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">Verbundene Dienste</h2>
          <p className="text-vtext2 text-sm mb-4">Welche Apps kann Vela verwenden?</p>
          <div className="space-y-3">
            {emailConnections.length === 0 ? (
              <div className="flex items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4">
                <span className="text-2xl">📧</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">E-Mail</p>
                  <p className="text-xs text-vtext2 mt-0.5">❌ Kein Konto verbunden</p>
                </div>
                <button
                  onClick={() => setEmailWizardOpen(true)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  Verbinden
                </button>
              </div>
            ) : (
              emailConnections.map(conn => (
                <div key={conn.id} className="flex items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4">
                  <span className="text-2xl">{conn.provider === 'gmail' ? '📧' : '📨'}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium capitalize">{conn.provider}</p>
                    <p className="text-xs text-vtext2 mt-0.5">✅ {conn.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`http://localhost:3000/api/email/connections/${conn.id}`, { method: 'DELETE' })
                      setEmailConnections(prev => prev.filter(c => c.id !== conn.id))
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium bg-surface2 border border-border text-vtext2 hover:border-red-500 hover:text-red-400 transition-colors"
                  >
                    Trennen
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setEmailWizardOpen(true)}
              className="text-xs text-vtext3 hover:text-white transition-colors"
            >
              + Weiteres Konto verbinden
            </button>
          </div>
        </section>

      </div>

      {/* Gmail OAuth Modal */}
      {gmailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-fraunces font-semibold text-lg text-white">Gmail verbinden</h3>
              <button
                onClick={() => setGmailModalOpen(false)}
                className="text-vtext2 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-surface2 border border-border rounded-xl p-4 text-sm text-vtext2 space-y-1">
              <p className="font-medium text-white mb-2">Anleitung:</p>
              <p>1. Google Cloud Console öffnen</p>
              <p>2. OAuth Client erstellen</p>
              <p>3. Refresh Token generieren</p>
            </div>

            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Client ID</span>
              <input
                type="text"
                value={gmailClientId}
                onChange={(e) => setGmailClientId(e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Client Secret</span>
              <input
                type="password"
                value={gmailClientSecret}
                onChange={(e) => setGmailClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Refresh Token</span>
              <input
                type="password"
                value={gmailRefreshToken}
                onChange={(e) => setGmailRefreshToken(e.target.value)}
                placeholder="1//0g..."
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveGmailConfig}
                disabled={gmailSaveStatus === 'saving' || !gmailClientId || !gmailClientSecret || !gmailRefreshToken}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {gmailSaveStatus === 'saving' ? 'Speichern...' : gmailSaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
              <button
                onClick={() => setGmailModalOpen(false)}
                className="px-5 py-2 bg-surface2 border border-border rounded-xl text-white text-sm font-medium hover:border-border2 transition-colors"
              >
                Abbrechen
              </button>
              {gmailSaveStatus === 'error' && <span className="text-red-400 text-sm">Fehler beim Speichern</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
