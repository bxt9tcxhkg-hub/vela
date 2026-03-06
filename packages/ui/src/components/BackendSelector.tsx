import React, { useMemo, useState } from 'react'
import { SegmentedControl, Card, Button } from './ui'

export type BackendMode = 'local' | 'groq' | 'cloud'

type SelectorView = 'simple' | 'expert'

interface BackendOption {
  mode: BackendMode
  icon: string
  title: string
  subtitle: string
  badge: string
  pros: string[]
  cons: string[]
}

const BACKEND_OPTIONS: BackendOption[] = [
  {
    mode: 'local',
    icon: 'L',
    title: 'Lokal',
    subtitle: 'Privat auf deinem Gerät',
    badge: 'Privat',
    pros: ['Offline nutzbar', 'Maximale Privatsphäre'],
    cons: ['Mehr RAM nötig'],
  },
  {
    mode: 'groq',
    icon: 'G',
    title: 'Groq',
    subtitle: 'Sehr schnell & günstig',
    badge: 'Schnell',
    pros: ['Sehr geringe Latenz', 'Gut für schwache Hardware'],
    cons: ['Daten gehen an Groq'],
  },
  {
    mode: 'cloud',
    icon: 'C',
    title: 'Cloud',
    subtitle: 'Leistungsstärkste Modelle',
    badge: 'Pro',
    pros: ['Beste Modellqualität', 'Skaliert ohne Hardwarelimit'],
    cons: ['Kosten + externer Anbieter'],
  },
]

interface BackendSelectorProps {
  current: BackendMode
  onChange: (mode: BackendMode) => void
  requiresConfirmation?: boolean
}

export function BackendSelector({ current, onChange, requiresConfirmation = true }: BackendSelectorProps) {
  const [pendingMode, setPendingMode] = useState<BackendMode | null>(null)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)
  const [selectorView, setSelectorView] = useState<SelectorView>('simple')

  const visibleOptions = useMemo(() => {
    if (selectorView === 'expert') return BACKEND_OPTIONS
    const simple = BACKEND_OPTIONS.filter((o) => o.mode !== 'cloud')
    if (current === 'cloud') return [...simple, BACKEND_OPTIONS.find((o) => o.mode === 'cloud')!]
    return simple
  }, [selectorView, current])

  function handleSelect(mode: BackendMode) {
    if (mode === current) return

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
    if (pendingMode) onChange(pendingMode)
    setPendingMode(null)
    setConfirmStep(1)
  }

  function cancelChange() {
    setPendingMode(null)
    setConfirmStep(1)
  }

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={selectorView}
        onChange={setSelectorView}
        options={[
          { value: 'simple', label: 'Einfach' },
          { value: 'expert', label: 'Experte' },
        ]}
      />

      {visibleOptions.map((opt) => {
        const isActive = opt.mode === current
        const isPending = opt.mode === pendingMode

        return (
          <button
            key={opt.mode}
            onClick={() => handleSelect(opt.mode)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              isActive
                ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                : isPending
                ? 'border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.14)]'
                : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-lg border flex items-center justify-center text-xs font-semibold ${isActive ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--surface-1)]' : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]'}`}>
                {opt.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{opt.title}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{opt.subtitle}</span>
                  <span className="ml-auto text-[11px] text-[var(--text-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full">{opt.badge}</span>
                  {isActive && <span className="text-[11px] font-medium text-blue-700">Aktiv</span>}
                </div>

                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {opt.pros.map((p) => (
                    <div key={p} className="text-[var(--text-primary)]">+ {p}</div>
                  ))}
                  {opt.cons.map((c) => (
                    <div key={c} className="text-[var(--text-secondary)]">− {c}</div>
                  ))}
                </div>
              </div>
            </div>
          </button>
        )
      })}

      {pendingMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-semibold text-lg text-[var(--text-primary)]">
              {confirmStep === 1 ? 'Backend wechseln?' : 'Wirklich wechseln?'}
            </h3>

            {confirmStep === 1 && (
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Du wechselst zu <strong className="text-[var(--text-primary)]">{BACKEND_OPTIONS.find((o) => o.mode === pendingMode)?.title}</strong>.
                </p>
                {pendingMode === 'groq' && (
                  <div className="bg-[rgba(251,191,36,0.14)] border border-[rgba(251,191,36,0.45)] rounded-xl p-3 text-[#fde68a] text-xs">
                    Anfragen gehen an Groq-Server.
                  </div>
                )}
                {pendingMode === 'cloud' && (
                  <div className="bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.35)] rounded-xl p-3 text-[#fecaca] text-xs">
                    Externer Anbieter verarbeitet deine Daten.
                  </div>
                )}
              </div>
            )}

            {confirmStep === 2 && pendingMode === 'cloud' && (
              <p className="text-sm text-[var(--text-primary)]">
                Ich habe verstanden, dass Anfragen extern verarbeitet werden und möchte trotzdem wechseln.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button onClick={confirmChange} className="flex-1">{confirmStep === 1 ? 'Weiter' : 'Ja, wechseln'}</Button>
              <Button onClick={cancelChange} variant="secondary" className="flex-1">Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
