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


  // Expert Mode state
  const [auditLog,       setAuditLog]       = React.useState<{id:string;skill_name:string;decision:string;execution_ms:number;created_at:string}[]>([])
  const [auditTotal,     setAuditTotal]     = React.useState(0)
  const [skillConfig,    setSkillConfig]    = React.useState<Record<string,boolean>>({})
  const [permissions,    setPermissions]    = React.useState<{permission_type:string;skill_id:string;risk_level:string;description:string}[]>([])
  const [modelParams,    setModelParams]    = React.useState({ temperature: 0.7, maxTokens: 4096, contextWindow: 8192 })
  const [modelParamSave, setModelParamSave] = React.useState<'idle'|'saving'|'saved'>('idle')
  const [diagnostics,    setDiagnostics]    = React.useState<{uptime:number;nodeVersion:string;memUsed:number;memTotal:number;dbSizeMb:number;counts:{messages:number;audit_log:number;conversations:number}}>()
  const [webhooks,       setWebhooks]       = React.useState<{id:string;name:string;created_at:string}[]>([])
  const [webhookName,    setWebhookName]    = React.useState('')
  const [newWebhookSecret, setNewWebhookSecret] = React.useState('')
  const [skills,         setSkills]         = React.useState<{name:string;description:string}[]>([])
  const [scheduledTasks, setScheduledTasks] = React.useState<{id:string;name:string;cron_expr:string;prompt:string;enabled:number;last_run:string|null}[]>([])
  const [newTask,        setNewTask]        = React.useState({ name: '', cronExpr: '0 9 * * *', prompt: '' })
  const [documents,      setDocuments]      = React.useState<{id:string;name:string;size_bytes:number;created_at:string;preview:string}[]>([])
  const [docUploading,   setDocUploading]   = React.useState(false)
  const docInputRef = React.useRef<HTMLInputElement>(null)
  const [tokenUsage,     setTokenUsage]     = React.useState<{rows:{provider:string;model:string;total_tokens:number;requests:number}[];totalTokens:number;estimatedCostUSD:number}>()
  const { t } = useTranslation()
  const isExpert = state.uiMode === 'expert'
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


  React.useEffect(() => {
    if (!isExpert) return
    // Load audit log
    fetch('http://localhost:3000/api/audit-log?limit=20')
      .then(r => r.json() as Promise<{rows: typeof auditLog; total: number}>)
      .then(d => { setAuditLog(d.rows); setAuditTotal(d.total) })
      .catch(() => {})
    // Load skill config + list
    fetch('http://localhost:3000/api/skills')
      .then(r => r.json() as Promise<{name:string;description:string}[]>)
      .then(d => setSkills(Array.isArray(d) ? d : []))
      .catch(() => {})
    fetch('http://localhost:3000/api/skills/config')
      .then(r => r.json() as Promise<{config:Record<string,boolean>}>)
      .then(d => setSkillConfig(d.config))
      .catch(() => {})
    // Load permissions
    fetch('http://localhost:3000/api/permissions')
      .then(r => r.json() as Promise<{permissions: typeof permissions}>)
      .then(d => setPermissions(d.permissions))
      .catch(() => {})
    // Load model params
    fetch('http://localhost:3000/api/model-params')
      .then(r => r.json() as Promise<typeof modelParams>)
      .then(d => setModelParams(d))
      .catch(() => {})
    // Load diagnostics
    fetch('http://localhost:3000/api/diagnostics')
      .then(r => r.json() as Promise<typeof diagnostics>)
      .then(d => setDiagnostics(d))
      .catch(() => {})
    // Load documents
    fetch('http://localhost:3000/api/documents')
      .then(r => r.json() as Promise<{documents: typeof documents}>)
      .then(d => setDocuments(d.documents))
      .catch(() => {})
    // Load scheduler
    fetch('http://localhost:3000/api/scheduler')
      .then(r => r.json() as Promise<{tasks: typeof scheduledTasks}>)
      .then(d => setScheduledTasks(d.tasks))
      .catch(() => {})
    // Load token usage
    fetch('http://localhost:3000/api/token-usage')
      .then(r => r.json() as Promise<typeof tokenUsage>)
      .then(d => setTokenUsage(d))
      .catch(() => {})
    // Load webhooks
    fetch('http://localhost:3000/api/webhooks')
      .then(r => r.json() as Promise<{webhooks: typeof webhooks}>)
      .then(d => setWebhooks(d.webhooks))
      .catch(() => {})
  }, [isExpert])

  async function saveModelParams() {
    setModelParamSave('saving')
    await fetch('http://localhost:3000/api/model-params', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(modelParams)
    })
    setModelParamSave('saved')
    setTimeout(() => setModelParamSave('idle'), 2000)
  }

  async function toggleSkill(name: string, enabled: boolean) {
    await fetch(`http://localhost:3000/api/skills/${name}/toggle`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ enabled })
    })
    setSkillConfig(prev => ({...prev, [name]: enabled}))
  }



  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDocUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('http://localhost:3000/api/documents/upload', { method: 'POST', body: form })
      const d = await res.json() as typeof documents[0]
      setDocuments(prev => [d, ...prev])
    } catch { /* ignore */ } finally {
      setDocUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function deleteDocument(id: string) {
    await fetch(`http://localhost:3000/api/documents/${id}`, { method: 'DELETE' })
    setDocuments(prev => prev.filter(d => d.id !== id))
  }


  async function createTask() {
    if (!newTask.name || !newTask.prompt) return
    const res = await fetch('http://localhost:3000/api/scheduler', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(newTask)
    })
    if (res.ok) {
      const d = await res.json() as typeof scheduledTasks[0]
      setScheduledTasks(prev => [d, ...prev])
      setNewTask({ name: '', cronExpr: '0 9 * * *', prompt: '' })
    }
  }

  async function toggleTask(id: string, enabled: boolean) {
    await fetch(`http://localhost:3000/api/scheduler/${id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ enabled })
    })
    setScheduledTasks(prev => prev.map(t => t.id === id ? {...t, enabled: enabled ? 1 : 0} : t))
  }

  async function deleteTask(id: string) {
    await fetch(`http://localhost:3000/api/scheduler/${id}`, { method: 'DELETE' })
    setScheduledTasks(prev => prev.filter(t => t.id !== id))
  }

  async function createWebhook() {
    if (!webhookName.trim()) return
    const res = await fetch('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: webhookName })
    })
    const data = await res.json() as {id:string;name:string;secret:string}
    setWebhooks(prev => [...prev, {id: data.id, name: data.name, created_at: new Date().toISOString()}])
    setNewWebhookSecret(data.secret)
    setWebhookName('')
  }

  async function deleteWebhook(id: string) {
    await fetch(`http://localhost:3000/api/webhooks/${id}`, { method: 'DELETE' })
    setWebhooks(prev => prev.filter(w => w.id !== id))
  }

  async function revokePermission(type: string) {
    await fetch(`http://localhost:3000/api/permissions/${type}`, { method: 'DELETE' })
    setPermissions(prev => prev.filter(p => p.permission_type !== type))
  }

  return (
    <div className="flex-1 bg-bg min-h-screen">
      <header className="px-6 py-8 border-b border-border bg-surface">
        <div className="flex items-center gap-3"><h1 className="font-fraunces font-semibold text-2xl text-white">Einstellungen</h1><span className={`text-xs px-2 py-1 rounded-full font-medium ${isExpert ? "bg-purple-900/40 text-purple-300 border border-purple-700/50" : "bg-blue-900/40 text-blue-300 border border-blue-700/50"}`}>{isExpert ? "Experte" : "Einsteiger"}</span></div>
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

        {/* KI-Verbindung – nur Experte */}
        {isExpert && <section>
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
        </section>}

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

            {isExpert && (
            <label className="block">
              <span className="text-white text-sm font-medium mb-1.5 block">Persönlichkeit / Verhalten <span className="text-xs text-accent2 ml-1">Experte</span></span>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Hilfsbereit, präzise, auf Deutsch"
                rows={4}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
              />
              <span className="text-xs text-vtext3 mt-1 block">Beschreibe, wie Vela sprechen und handeln soll.</span>
            </label>
            )}

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

        {/* KI-Modell (legacy) – nur Experte */}
        {isExpert && <section>
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
        </section>}

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


        {/* ── Expert: Skill Management ─────────────────────────────── */}
        {isExpert && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">⚙️ Skill-Management</h2>
          <p className="text-vtext2 text-sm mb-4">Skills aktivieren oder deaktivieren.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            {skills.length === 0 && <p className="text-vtext3 text-sm">Keine Skills gefunden.</p>}
            {skills.map(s => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  <p className="text-vtext3 text-xs">{s.description}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skillConfig[s.name] !== false}
                    onChange={e => void toggleSkill(s.name, e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-xs text-vtext2">{skillConfig[s.name] !== false ? 'Aktiv' : 'Inaktiv'}</span>
                </label>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Expert: Audit-Log ─────────────────────────────────────── */}
        {isExpert && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-fraunces font-semibold text-lg text-white">📋 Audit-Log</h2>
            <a href="http://localhost:3000/api/audit-log/export" download className="text-xs text-blue-400 hover:text-blue-300 border border-blue-700/40 px-2 py-1 rounded-lg">
              ⬇ Export CSV
            </a>
          </div>
          <p className="text-vtext2 text-sm mb-4">{auditTotal} Einträge gesamt</p>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {auditLog.length === 0 && <p className="text-vtext3 text-sm p-5">Noch keine Einträge.</p>}
            {auditLog.map(row => (
              <div key={row.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 text-sm">
                <div>
                  <span className="text-white font-medium">{row.skill_name}</span>
                  <span className="text-vtext3 text-xs ml-2">{row.created_at}</span>
                </div>
                <div className="flex items-center gap-2">
                  {row.execution_ms && <span className="text-vtext3 text-xs">{row.execution_ms}ms</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    row.decision === 'approved'  ? 'bg-green-900/40 text-green-400' :
                    row.decision === 'blocked'   ? 'bg-red-900/40 text-red-400' :
                                                   'bg-yellow-900/40 text-yellow-400'
                  }`}>{row.decision}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Expert: Permission-Matrix ─────────────────────────────── */}
        {isExpert && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">🛡️ Permission-Matrix</h2>
          <p className="text-vtext2 text-sm mb-4">Erteilte Berechtigungen für Skills.</p>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {permissions.length === 0 && <p className="text-vtext3 text-sm p-5">Keine Berechtigungen erteilt.</p>}
            {permissions.map(p => (
              <div key={p.permission_type} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{p.permission_type}</p>
                  <p className="text-vtext3 text-xs">{p.description} · Skill: {p.skill_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.risk_level === 'low'    ? 'bg-green-900/40 text-green-400' :
                    p.risk_level === 'medium' ? 'bg-yellow-900/40 text-yellow-400' :
                                                'bg-red-900/40 text-red-400'
                  }`}>{p.risk_level}</span>
                  <button
                    onClick={() => void revokePermission(p.permission_type)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Widerrufen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Expert: Modell-Parameter ──────────────────────────────── */}
        {isExpert && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">🎛️ Modell-Parameter</h2>
          <p className="text-vtext2 text-sm mb-4">Feineinstellung des KI-Verhaltens.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <label className="block">
              <div className="flex justify-between mb-1.5">
                <span className="text-white text-sm font-medium">Temperatur</span>
                <span className="text-blue-400 text-sm font-mono">{modelParams.temperature.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                value={modelParams.temperature}
                onChange={e => setModelParams(p => ({...p, temperature: parseFloat(e.target.value)}))}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-vtext3">0 = deterministisch · 1 = kreativ</span>
            </label>
            <label className="block">
              <div className="flex justify-between mb-1.5">
                <span className="text-white text-sm font-medium">Max. Tokens</span>
                <span className="text-blue-400 text-sm font-mono">{modelParams.maxTokens}</span>
              </div>
              <input
                type="range" min="512" max="16384" step="512"
                value={modelParams.maxTokens}
                onChange={e => setModelParams(p => ({...p, maxTokens: parseInt(e.target.value)}))}
                className="w-full accent-blue-500"
              />
            </label>
            <label className="block">
              <div className="flex justify-between mb-1.5">
                <span className="text-white text-sm font-medium">Context-Window</span>
                <span className="text-blue-400 text-sm font-mono">{modelParams.contextWindow}</span>
              </div>
              <input
                type="range" min="2048" max="128000" step="2048"
                value={modelParams.contextWindow}
                onChange={e => setModelParams(p => ({...p, contextWindow: parseInt(e.target.value)}))}
                className="w-full accent-blue-500"
              />
            </label>
            <button
              onClick={() => void saveModelParams()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              {modelParamSave === 'saving' ? 'Speichert…' : modelParamSave === 'saved' ? '✓ Gespeichert' : 'Speichern'}
            </button>
          </div>
        </section>
        )}

        {/* ── Expert: Diagnostics ───────────────────────────────────── */}
        {isExpert && diagnostics && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">🔍 Diagnose</h2>
          <p className="text-vtext2 text-sm mb-4">Server-Status und Laufzeitinformationen.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 grid grid-cols-2 gap-4 text-sm">
            {[
              ['Uptime',      `${Math.floor(diagnostics.uptime / 60)}m ${diagnostics.uptime % 60}s`],
              ['Node.js',     diagnostics.nodeVersion],
              ['RAM genutzt', `${diagnostics.memUsed} MB`],
              ['RAM gesamt',  `${diagnostics.memTotal} MB`],
              ['DB-Größe',    `${diagnostics.dbSizeMb} MB`],
              ['Nachrichten', String(diagnostics.counts.messages)],
              ['Audit-Einträge', String(diagnostics.counts.audit_log)],
              ['Gespräche',   String(diagnostics.counts.conversations)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-2">
                <span className="text-vtext2">{k}</span>
                <span className="text-white font-mono text-xs">{v}</span>
              </div>
            ))}
          </div>
        </section>
        )}




        {/* ── Dokument-Bibliothek (Laie + Experte) ────────────────── */}
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">📚 Dokument-Bibliothek</h2>
          <p className="text-vtext2 text-sm mb-4">Lade Dokumente hoch — Vela kann darin suchen und Fragen beantworten.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => docInputRef.current?.click()}
                disabled={docUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {docUploading ? '⏳ Wird hochgeladen…' : '⬆ Dokument hochladen'}
              </button>
              <input
                ref={docInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py,.html,.xml"
                className="hidden"
                onChange={e => void uploadDocument(e)}
              />
            </div>
            {documents.length === 0 && <p className="text-vtext3 text-sm">Noch keine Dokumente. Lade Dateien hoch die Vela kennen soll.</p>}
            {documents.map(doc => (
              <div key={doc.id} className="flex items-start justify-between py-2 border-t border-border">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white text-sm font-medium">{doc.name}</p>
                  <p className="text-vtext3 text-xs">{(doc.size_bytes / 1024).toFixed(1)} KB · {doc.created_at}</p>
                  <p className="text-vtext3 text-xs truncate">{doc.preview}</p>
                </div>
                <button onClick={() => void deleteDocument(doc.id)} className="text-red-400 hover:text-red-300 text-xs flex-shrink-0">🗑</button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Expert: Scheduler / Cron ─────────────────────────────── */}
        {isExpert && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">⏰ Scheduler</h2>
          <p className="text-vtext2 text-sm mb-4">Vela führt Aufgaben automatisch zu festgelegten Zeiten aus.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            {/* New task form */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Name (z.B. Tages-Brief)" value={newTask.name}
                  onChange={e => setNewTask(p => ({...p, name: e.target.value}))}
                  className="bg-surface2 border border-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                <input type="text" placeholder="Cron (z.B. 0 9 * * *)" value={newTask.cronExpr}
                  onChange={e => setNewTask(p => ({...p, cronExpr: e.target.value}))}
                  className="bg-surface2 border border-border rounded-xl px-3 py-2 text-white text-sm font-mono outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Aufgabe (z.B. Fasse meine Mails zusammen)" value={newTask.prompt}
                  onChange={e => setNewTask(p => ({...p, prompt: e.target.value}))}
                  className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                <button onClick={() => void createTask()} disabled={!newTask.name || !newTask.prompt}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors">
                  + Hinzufügen
                </button>
              </div>
              <p className="text-vtext3 text-xs">Cron-Format: Minute Stunde Tag Monat Wochentag · z.B. <code className="text-blue-400">0 9 * * 1-5</code> = Mo-Fr um 09:00</p>
            </div>
            {/* Task list */}
            {scheduledTasks.length === 0 && <p className="text-vtext3 text-sm">Keine Aufgaben.</p>}
            {scheduledTasks.map(t => (
              <div key={t.id} className="flex items-start justify-between py-2 border-t border-border">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white text-sm font-medium">{t.name}</p>
                  <p className="text-vtext3 text-xs font-mono">{t.cron_expr}</p>
                  <p className="text-vtext3 text-xs truncate">{t.prompt}</p>
                  {t.last_run && <p className="text-vtext3 text-xs">Zuletzt: {t.last_run}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={t.enabled === 1}
                      onChange={e => void toggleTask(t.id, e.target.checked)}
                      className="accent-blue-500" />
                    <span className="text-xs text-vtext2">{t.enabled ? 'An' : 'Aus'}</span>
                  </label>
                  <button onClick={() => void deleteTask(t.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Expert: Token-Kosten ─────────────────────────────────── */}
        {isExpert && tokenUsage && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-fraunces font-semibold text-lg text-white">💰 Token-Kosten</h2>
            <span className="text-xs text-vtext2">{tokenUsage.totalTokens.toLocaleString()} Tokens gesamt · <span className="text-green-400">${tokenUsage.estimatedCostUSD} USD est.</span></span>
          </div>
          <p className="text-vtext2 text-sm mb-4">Geschätzter Verbrauch pro Modell.</p>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {tokenUsage.rows.length === 0 && <p className="text-vtext3 text-sm p-5">Noch kein Verbrauch gemessen.</p>}
            {tokenUsage.rows.map(r => (
              <div key={r.model} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 text-sm">
                <div>
                  <p className="text-white font-medium">{r.model}</p>
                  <p className="text-vtext3 text-xs">{r.provider} · {r.requests} Anfragen</p>
                </div>
                <span className="text-blue-400 font-mono text-xs">{r.total_tokens.toLocaleString()} Tokens</span>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Expert: Webhooks ──────────────────────────────────────── */}
        {isExpert && (
        <section>
          <h2 className="font-fraunces font-semibold text-lg text-white mb-1">🔗 Webhooks</h2>
          <p className="text-vtext2 text-sm mb-4">Externe Systeme können Vela über Webhooks triggern.</p>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookName}
                onChange={e => setWebhookName(e.target.value)}
                placeholder="Name des Webhooks"
                className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={() => void createWebhook()}
                disabled={!webhookName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors"
              >
                Erstellen
              </button>
            </div>
            {newWebhookSecret && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3">
                <p className="text-yellow-300 text-xs font-medium mb-1">⚠️ Secret nur einmal sichtbar — jetzt kopieren!</p>
                <code className="text-yellow-200 text-xs break-all">{newWebhookSecret}</code>
              </div>
            )}
            {webhooks.length === 0 && <p className="text-vtext3 text-sm">Keine Webhooks.</p>}
            {webhooks.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{w.name}</p>
                  <p className="text-vtext3 text-xs font-mono">{w.id}</p>
                  <p className="text-vtext3 text-xs">Trigger: POST /api/webhooks/{w.id}/trigger</p>
                </div>
                <button
                  onClick={() => void deleteWebhook(w.id)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        </section>
        )}

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
