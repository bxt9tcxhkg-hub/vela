import React, { useState, useEffect } from 'react'

type MessengerType = 'telegram' | 'discord'
type WizardStep = 'select' | 'guide' | 'input' | 'test' | 'done'

interface MessengerStatus {
  type: MessengerType
  connected: boolean
  displayName?: string
}

const MESSENGER_INFO = {
  telegram: {
    icon: '✈️',
    name: 'Telegram',
    color: 'sky',
    guide: [
      'Öffne Telegram und suche nach @BotFather',
      'Schreibe /newbot und folge den Anweisungen',
      'Du erhältst einen Token — kopiere ihn (sieht so aus: 123456:ABC-DEF...)',
      'Schreibe deinem neuen Bot einmal "Hallo" damit er deine Chat-ID kennt',
    ],
  },
  discord: {
    icon: '🎮',
    name: 'Discord',
    color: 'indigo',
    guide: [
      'Öffne deinen Discord-Server und gehe zu Einstellungen → Integrationen',
      'Klicke auf "Webhooks" → "Neuer Webhook"',
      'Wähle den Kanal und kopiere die Webhook-URL',
    ],
  },
}

export function MessengerWizard() {
  const [statuses, setStatuses] = useState<MessengerStatus[]>([])
  const [selected, setSelected] = useState<MessengerType | null>(null)
  const [step, setStep] = useState<WizardStep>('select')

  // Telegram
  const [botToken, setBotToken] = useState('')
  // Discord
  const [webhookUrl, setWebhookUrl] = useState('')
  const [channelName, setChannelName] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [connectedName, setConnectedName] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/messenger/status')
      .then(r => r.json())
      .then((data: MessengerStatus[]) => setStatuses(data))
      .catch(() => {})
  }, [])

  function getStatus(type: MessengerType): MessengerStatus | undefined {
    return statuses.find(s => s.type === type)
  }

  function startWizard(type: MessengerType) {
    setSelected(type)
    setStep('guide')
    setError('')
    setBotToken('')
    setWebhookUrl('')
    setChannelName('')
  }

  async function handleConnect() {
    if (!selected) return
    setSaving(true)
    setError('')

    try {
      let res: Response
      if (selected === 'telegram') {
        res = await fetch('http://localhost:3000/api/messenger/telegram/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken }),
        })
      } else {
        res = await fetch('http://localhost:3000/api/messenger/discord/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl, channelName }),
        })
      }

      const data = await res.json() as { ok?: boolean; error?: string; botName?: string; channelName?: string }

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Verbindung fehlgeschlagen.')
        return
      }

      setConnectedName(data.botName ?? data.channelName ?? selected)
      setStep(selected === 'telegram' ? 'test' : 'done')

      // Update statuses
      setStatuses(prev => prev.map(s =>
        s.type === selected
          ? { ...s, connected: true, displayName: data.botName ?? data.channelName }
          : s
      ))
    } catch {
      setError('Server nicht erreichbar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3000/api/messenger/telegram/test', { method: 'POST' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.ok) {
        setStep('done')
      } else {
        setError(data.error ?? 'Test fehlgeschlagen.')
      }
    } catch {
      setError('Server nicht erreichbar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect(type: MessengerType) {
    await fetch(`http://localhost:3000/api/messenger/${type}/disconnect`, { method: 'POST' })
    setStatuses(prev => prev.map(s => s.type === type ? { ...s, connected: false, displayName: undefined } : s))
  }

  const info = selected ? MESSENGER_INFO[selected] : null

  return (
    <div className="space-y-3">
      {/* Messenger-Liste */}
      {(['telegram', 'discord'] as MessengerType[]).map((type) => {
        const status = getStatus(type)
        const mInfo = MESSENGER_INFO[type]
        return (
          <div key={type} className="flex items-center gap-4 bg-warm border border-sand rounded-2xl px-5 py-4">
            <span className="text-2xl">{mInfo.icon}</span>
            <div className="flex-1">
              <p className="text-ink text-sm font-medium">{mInfo.name}</p>
              <p className="text-xs text-earth mt-0.5">
                {status?.connected
                  ? `✅ Verbunden${status.displayName ? ` — ${status.displayName}` : ''}`
                  : '❌ Nicht verbunden'}
              </p>
            </div>
            {status?.connected ? (
              <button
                onClick={() => handleDisconnect(type)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-cream border border-sand text-earth hover:border-bark transition-colors"
              >
                Trennen
              </button>
            ) : (
              <button
                onClick={() => startWizard(type)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium bg-sky text-white hover:bg-sky/90 transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>
        )
      })}

      {/* Wizard Modal */}
      {selected && step !== 'select' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream border border-sand rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-fraunces font-semibold text-lg text-ink">
                {info?.icon} {info?.name} verbinden
              </h3>
              <button onClick={() => setSelected(null)} className="text-earth hover:text-ink text-xl">×</button>
            </div>

            {/* Step: Guide */}
            {step === 'guide' && (
              <div className="space-y-4">
                <p className="text-earth text-sm">Folge diesen Schritten:</p>
                <ol className="space-y-2">
                  {info?.guide.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink">
                      <span className="text-sky font-medium min-w-[1.5rem]">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => setStep('input')}
                  className="w-full py-3 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors"
                >
                  Ich habe die Zugangsdaten →
                </button>
              </div>
            )}

            {/* Step: Input */}
            {step === 'input' && (
              <div className="space-y-4">
                {selected === 'telegram' && (
                  <label className="block">
                    <span className="text-ink text-sm font-medium mb-1.5 block">Bot-Token</span>
                    <input
                      type="password"
                      value={botToken}
                      onChange={e => setBotToken(e.target.value)}
                      placeholder="123456789:ABC-DEFghijklmno..."
                      className="w-full bg-warm border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky"
                    />
                  </label>
                )}
                {selected === 'discord' && (
                  <>
                    <label className="block">
                      <span className="text-ink text-sm font-medium mb-1.5 block">Webhook-URL</span>
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-warm border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky"
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink text-sm font-medium mb-1.5 block">Kanalname (optional)</span>
                      <input
                        type="text"
                        value={channelName}
                        onChange={e => setChannelName(e.target.value)}
                        placeholder="#allgemein"
                        className="w-full bg-warm border border-sand rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-sky"
                      />
                    </label>
                  </>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  onClick={handleConnect}
                  disabled={saving || (selected === 'telegram' ? !botToken : !webhookUrl)}
                  className="w-full py-3 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Wird verbunden...' : 'Verbinden'}
                </button>
              </div>
            )}

            {/* Step: Test (nur Telegram) */}
            {step === 'test' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-800 text-sm font-medium">✓ Bot verbunden: {connectedName}</p>
                </div>
                <p className="text-earth text-sm">
                  Schreibe deinem Bot jetzt einmal "Hallo" in Telegram, dann klicke auf Test.
                </p>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={handleTest}
                  disabled={saving}
                  className="w-full py-3 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Sende Testnachricht...' : 'Test senden'}
                </button>
              </div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="space-y-4 text-center">
                <div className="text-4xl">✅</div>
                <p className="text-ink font-medium">
                  {info?.name} erfolgreich verbunden!
                </p>
                <p className="text-earth text-sm">
                  Du kannst jetzt über {info?.name} mit Vela kommunizieren.
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="w-full py-3 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors"
                >
                  Fertig
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
