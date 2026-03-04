// FeedbackButton – dauerhaft sichtbar, nicht aufdringlich
// + FeedbackDialog – anonymes Feedback mit Rate-Limit-Schutz
import React, { useState, useEffect } from 'react'

type Rating   = 'good' | 'okay' | 'bad'
type Category = 'onboarding' | 'skills' | 'ui' | 'performance' | 'bug' | 'other'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'onboarding',   label: 'Onboarding' },
  { value: 'skills',       label: 'Skills' },
  { value: 'ui',           label: 'UI' },
  { value: 'performance',  label: 'Performance' },
  { value: 'bug',          label: 'Fehler' },
  { value: 'other',        label: 'Sonstiges' },
]

const RATING_OPTIONS: { value: Rating; emoji: string; label: string }[] = [
  { value: 'good', emoji: '😊', label: 'Gut' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad',  emoji: '😞', label: 'Schlecht' },
]

interface FeedbackDialogProps {
  onClose:   () => void
  initialRating?: Rating
}

export function FeedbackDialog({ onClose, initialRating }: FeedbackDialogProps) {
  const [rating,   setRating]   = useState<Rating | null>(initialRating ?? null)
  const [category, setCategory] = useState<Category>('ui')
  const [message,  setMessage]  = useState('')
  const [status,   setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error' | 'ratelimit'>('idle')

  async function handleSend() {
    if (!rating) return
    setStatus('sending')
    try {
      const res = await fetch('http://localhost:3000/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category,
          message: message.trim() || undefined,
          velaVersion: '0.1.0',
          os: navigator.platform.toLowerCase().includes('win') ? 'windows'
            : navigator.platform.toLowerCase().includes('mac') ? 'macos' : 'linux',
          mode: localStorage.getItem('vela_mode') ?? 'local',
        }),
      })
      if (res.status === 429) { setStatus('ratelimit'); return }
      if (!res.ok) throw new Error()
      // last_feedback_at aktualisieren
      await fetch('http://localhost:3000/api/feedback/reminder-state', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setStatus('sent')
      setTimeout(onClose, 1500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-5 space-y-4">

        {status === 'sent' ? (
          <div className="text-center py-4 space-y-2">
            <span className="text-4xl">🙏</span>
            <p className="text-white font-medium">Danke für dein Feedback!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Wie war deine Erfahrung?</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Rating */}
            <div className="flex gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRating(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    rating === opt.value
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs text-gray-300">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Freitext */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Was können wir verbessern? (optional)"
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />

            {/* Kategorie */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs transition-all border ${
                    category === cat.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {status === 'ratelimit' && (
              <p className="text-yellow-400 text-xs">Zu viele Feedbacks — bitte warte etwas.</p>
            )}
            {status === 'error' && (
              <p className="text-red-400 text-xs">Senden fehlgeschlagen. Server erreichbar?</p>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-800 transition">
                  Abbrechen
                </button>
                <button
                  onClick={() => void handleSend()}
                  disabled={!rating || status === 'sending'}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition"
                >
                  {status === 'sending' ? 'Sendet…' : 'Senden'}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Deine Eingaben werden anonym übermittelt. Keine persönlichen Daten, keine Gesprächsinhalte.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Floating Feedback Button ────────────────────────────────────────────────
export function FeedbackButton() {
  const [open,          setOpen]          = useState(false)
  const [showReminder,  setShowReminder]  = useState(false)

  // Erinnerungs-Logik: nach 3 Sessions ohne Feedback
  useEffect(() => {
    fetch('http://localhost:3000/api/feedback/reminder-state')
      .then(r => r.json())
      .then((data: { dismissed: boolean; sessionCount: number; lastFeedback: string | null }) => {
        if (data.dismissed) return
        if (data.sessionCount >= 3 && !data.lastFeedback) {
          setShowReminder(true)
        }
      })
      .catch(() => {})
  }, [])

  async function dismissReminder() {
    setShowReminder(false)
    await fetch('http://localhost:3000/api/feedback/reminder-state', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dismissed: true }),
    }).catch(() => {})
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        title="Feedback geben"
        className="fixed bottom-20 right-4 md:bottom-6 z-40 w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-blue-500 transition-all shadow-lg flex items-center justify-center text-lg"
      >
        💬
      </button>

      {/* Sanfte Erinnerung */}
      {showReminder && !open && (
        <div className="fixed bottom-36 right-4 md:bottom-20 z-40 bg-gray-900 border border-gray-700 rounded-xl p-3 max-w-xs shadow-xl">
          <p className="text-sm text-gray-300 mb-2">Vela schon ein bisschen genutzt? Kurzes Feedback wäre toll! 🙏</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowReminder(false); setOpen(true) }}
              className="flex-1 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
            >
              Feedback geben
            </button>
            <button
              onClick={() => void dismissReminder()}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white transition"
            >
              Nicht mehr
            </button>
          </div>
        </div>
      )}

      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  )
}
