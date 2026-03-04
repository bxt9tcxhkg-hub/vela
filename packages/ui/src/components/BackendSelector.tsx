import React, { useState } from 'react'

export type BackendMode = 'local' | 'groq' | 'cloud'

interface BackendOption {
  mode: BackendMode
  icon: string
  title: string
  subtitle: string
  privacy: 'high' | 'medium' | 'low'
  privacyLabel: string
  pros: string[]
  cons: string[]
  requiresKey: boolean
}

const BACKEND_OPTIONS: BackendOption[] = [
  {
    mode: 'local',
    icon: '🏠',
    title: 'Lokal',
    subtitle: 'Alles auf deinem Gerät',
    privacy: 'high',
    privacyLabel: '🔒 Maximale Privatsphäre',
    pros: ['Keine Daten verlassen dein Gerät', 'Funktioniert offline', 'Kein Account nötig'],
    cons: ['Benötigt min. 8 GB RAM', 'Langsamerer Start'],
    requiresKey: false,
  },
  {
    mode: 'groq',
    icon: '⚡',
    title: 'Groq',
    subtitle: 'Kostenlos & sehr schnell',
    privacy: 'medium',
    privacyLabel: '~ Daten verlassen kurz dein Gerät',
    pros: ['Kostenlos', 'Sehr schnell (< 1s)', 'Funktioniert auf schwacher Hardware'],
    cons: ['Anfragen gehen an Groq-Server', 'Tageslimit (kostenlos)'],
    requiresKey: true,
  },
  {
    mode: 'cloud',
    icon: '☁️',
    title: 'Cloud',
    subtitle: 'Anthropic, OpenAI, etc.',
    privacy: 'low',
    privacyLabel: '⚠ Externe Anbieter – deren AGB gelten',
    pros: ['Leistungsstärkste Modelle', 'Kein Hardware-Limit'],
    cons: ['Kostenpflichtig', 'Daten an externe Anbieter', 'Account erforderlich'],
    requiresKey: true,
  },
]

interface BackendSelectorProps {
  current: BackendMode
  onChange: (mode: BackendMode) => void
  requiresConfirmation?: boolean  // T-11: 2-Schritt-Bestätigung bei Cloud
}

export function BackendSelector({ current, onChange, requiresConfirmation = true }: BackendSelectorProps) {
  const [pendingMode, setPendingMode] = useState<BackendMode | null>(null)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)

  function handleSelect(mode: BackendMode) {
    if (mode === current) return

    // T-11: Cloud-Wechsel braucht 2-Schritt-Bestätigung
    if (requiresConfirmation && (mode === 'cloud' || mode === 'groq')) {
      setPendingMode(mode)
      setConfirmStep(1)
      return
    }

    onChange(mode)
  }

  function confirmChange() {
    if (confirmStep === 1 && pendingMode === 'cloud') {
      setConfirmStep(2)
      return
    }
    if (pendingMode) {
      onChange(pendingMode)
    }
    setPendingMode(null)
    setConfirmStep(1)
  }

  function cancelChange() {
    setPendingMode(null)
    setConfirmStep(1)
  }

  const privacyColor: Record<string, string> = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-red-500',
  }

  return (
    <div className="space-y-3">
      {BACKEND_OPTIONS.map((opt) => {
        const isActive = opt.mode === current
        const isPending = opt.mode === pendingMode

        return (
          <button
            key={opt.mode}
            onClick={() => handleSelect(opt.mode)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
              isActive
                ? 'border-sky bg-sky/5 shadow-sm'
                : isPending
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-sand bg-warm hover:border-bark'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-fraunces font-semibold text-ink text-base">{opt.title}</span>
                  <span className="text-earth text-sm">— {opt.subtitle}</span>
                  {isActive && (
                    <span className="ml-auto text-sky text-xs font-medium bg-sky/10 px-2 py-0.5 rounded-full">
                      Aktiv
                    </span>
                  )}
                </div>

                <p className={`text-xs font-medium mb-2 ${privacyColor[opt.privacy]}`}>
                  {opt.privacyLabel}
                </p>

                <div className="flex gap-4 text-xs text-earth">
                  <div>
                    {opt.pros.map((p) => (
                      <div key={p}>✓ {p}</div>
                    ))}
                  </div>
                  <div>
                    {opt.cons.map((c) => (
                      <div key={c} className="opacity-70">✗ {c}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </button>
        )
      })}

      {/* T-11: 2-Schritt-Bestätigung Modal */}
      {pendingMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream border border-sand rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-fraunces font-semibold text-lg text-ink">
              {confirmStep === 1 ? 'Backend wechseln?' : 'Wirklich sicher?'}
            </h3>

            {confirmStep === 1 && (
              <div className="space-y-3">
                <p className="text-earth text-sm">
                  Du wechselst zu <strong>{BACKEND_OPTIONS.find(o => o.mode === pendingMode)?.title}</strong>.
                </p>
                {pendingMode === 'groq' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                    <p className="font-medium mb-1">~ Deine Anfragen verlassen dieses Gerät</p>
                    <p className="text-xs">Groq speichert keine Konversationen dauerhaft. Kostenlos nutzbar.</p>
                  </div>
                )}
                {pendingMode === 'cloud' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                    <p className="font-medium mb-1">⚠ Deine Daten gehen an externe Anbieter</p>
                    <p className="text-xs">Deren Datenschutzrichtlinien gelten. Dies ist nicht kostenlos.</p>
                  </div>
                )}
              </div>
            )}

            {confirmStep === 2 && pendingMode === 'cloud' && (
              <div className="space-y-2">
                <p className="text-earth text-sm">
                  Du verlässt den lokalen Modus. Deine Anfragen werden von einem externen Anbieter verarbeitet.
                </p>
                <p className="text-ink text-sm font-medium">
                  Ich habe das verstanden und möchte trotzdem wechseln.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmChange}
                className="flex-1 py-2.5 bg-sky text-white rounded-xl text-sm font-medium hover:bg-sky/90 transition-colors"
              >
                {confirmStep === 1 ? 'Weiter →' : 'Ja, wechseln'}
              </button>
              <button
                onClick={cancelChange}
                className="flex-1 py-2.5 bg-warm border border-sand rounded-xl text-ink text-sm font-medium hover:border-bark transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
