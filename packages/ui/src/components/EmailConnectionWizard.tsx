// EmailConnectionWizard – erweiterbare Email-Provider-Verbindung
// Gmail zuerst, Architektur offen für Outlook, IMAP etc.
import React, { useState, useEffect } from 'react'

export interface EmailConnection {
  id:         string
  provider:   'gmail' | 'outlook' | string
  email:      string
  created_at: string
}

interface Props {
  onClose: () => void
  onConnected: (conn: EmailConnection) => void
}

type WizardStep = 'provider-select' | 'gmail-setup' | 'gmail-waiting' | 'success' | 'manual-token'

const PROVIDER_LABELS: Record<string, { icon: string; label: string; available: boolean }> = {
  gmail:   { icon: '📧', label: 'Gmail',   available: true  },
  outlook: { icon: '📨', label: 'Outlook', available: false }, // Phase 2
}

export function EmailConnectionWizard({ onClose, onConnected }: Props) {
  const [step,          setStep]          = useState<WizardStep>('provider-select')
  const [provider,      setProvider]      = useState<string>('gmail')
  const [authUrl,       setAuthUrl]       = useState<string>('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  // Manual token fallback
  const [manualEmail,   setManualEmail]   = useState('')
  const [manualToken,   setManualToken]   = useState('')
  const [manualRefresh, setManualRefresh] = useState('')

  // Auf URL-Parameter lauschen (nach OAuth-Callback Redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('email_connected')
    const email     = params.get('email')
    const emailErr  = params.get('email_error')

    if (connected && email) {
      // URL bereinigen
      window.history.replaceState({}, '', window.location.pathname)
      onConnected({ id: '', provider: connected, email: decodeURIComponent(email), created_at: new Date().toISOString() })
      onClose()
    } else if (emailErr) {
      window.history.replaceState({}, '', window.location.pathname)
      setError(`OAuth fehlgeschlagen: ${emailErr}`)
      setStep('gmail-setup')
    }
  }, [])

  async function startGmailOAuth() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3000/api/email/gmail/auth-url')
      const data = await res.json() as { url?: string; error?: string; hint?: string }

      if (!data.url) {
        setError(data.hint ?? data.error ?? 'OAuth-URL konnte nicht geladen werden.')
        setLoading(false)
        return
      }
      setAuthUrl(data.url)
      setStep('gmail-waiting')
      window.open(data.url, '_blank', 'width=600,height=700')
    } catch {
      setError('Server nicht erreichbar.')
    } finally {
      setLoading(false)
    }
  }

  async function saveManualToken() {
    if (!manualEmail || !manualToken) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3000/api/email/connections', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider:     provider,
          email:        manualEmail,
          accessToken:  manualToken,
          refreshToken: manualRefresh || undefined,
        }),
      })
      const data = await res.json() as EmailConnection
      setStep('success')
      setTimeout(() => { onConnected(data); onClose() }, 1500)
    } catch {
      setError('Verbindung konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">E-Mail-Konto verbinden</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Schritt 1: Provider-Auswahl */}
        {step === 'provider-select' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Welchen E-Mail-Dienst möchtest du verbinden?</p>
            <div className="space-y-2">
              {Object.entries(PROVIDER_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  disabled={!info.available}
                  onClick={() => { setProvider(key); setStep('gmail-setup') }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    info.available
                      ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-950/20'
                      : 'border-gray-700 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-white font-medium">{info.label}</p>
                    {!info.available && <p className="text-xs text-gray-500">Demnächst verfügbar</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schritt 2: Gmail Setup-Erklärung */}
        {step === 'gmail-setup' && (
          <div className="space-y-4">
            <div className="bg-blue-950/30 border border-blue-700 rounded-xl p-4 text-sm text-gray-300 space-y-2">
              <p className="font-medium text-blue-300">So funktioniert die Verbindung:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Du wirst zu Google weitergeleitet</li>
                <li>Du meldest dich mit deinem Gmail-Konto an</li>
                <li>Google fragt nach Leserecht für E-Mails</li>
                <li>Vela speichert den Token sicher auf deinem Gerät</li>
              </ol>
              <p className="text-xs text-gray-400 mt-2">
                🔒 Tokens werden lokal in SQLite gespeichert — kein Cloud-Upload.
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('provider-select')}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
              >
                Zurück
              </button>
              <button
                onClick={() => void startGmailOAuth()}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {loading ? 'Lädt…' : 'Mit Google verbinden →'}
              </button>
            </div>
            <button
              onClick={() => setStep('manual-token')}
              className="w-full text-xs text-gray-500 hover:text-gray-400 mt-1"
            >
              Manuell mit Token einrichten (Experten-Modus)
            </button>
          </div>
        )}

        {/* Schritt 2b: Warten auf OAuth-Rückkehr */}
        {step === 'gmail-waiting' && (
          <div className="text-center space-y-4 py-4">
            <span className="text-5xl">🌐</span>
            <p className="text-white font-medium">Google-Fenster geöffnet</p>
            <p className="text-gray-400 text-sm">
              Melde dich in dem neuen Fenster an und bestätige den Zugriff.<br />
              Danach schließt sich dieser Dialog automatisch.
            </p>
            <p className="text-xs text-gray-500 animate-pulse">Warte auf Bestätigung…</p>
            {authUrl && (
              <button
                onClick={() => window.open(authUrl, '_blank', 'width=600,height=700')}
                className="text-blue-400 text-sm underline"
              >
                Fenster erneut öffnen
              </button>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={() => setStep('gmail-setup')} className="text-gray-500 text-xs hover:text-gray-400">
              Abbrechen
            </button>
          </div>
        )}

        {/* Experten-Modus: Token manuell eingeben */}
        {step === 'manual-token' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Access-Token manuell eingeben (für Entwickler)</p>
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={manualEmail}
              onChange={e => setManualEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Access Token"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Refresh Token (optional)"
              value={manualRefresh}
              onChange={e => setManualRefresh(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep('gmail-setup')} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition text-sm">Zurück</button>
              <button
                onClick={() => void saveManualToken()}
                disabled={loading || !manualEmail || !manualToken}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition text-sm"
              >
                {loading ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Erfolg */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-3">
            <span className="text-5xl">✅</span>
            <p className="text-white font-bold">Verbunden!</p>
            <p className="text-gray-400 text-sm">E-Mail-Konto wurde erfolgreich gespeichert.</p>
          </div>
        )}
      </div>
    </div>
  )
}
