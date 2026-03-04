// Feedback-Analyse Dashboard – nur im Expert Mode
import React, { useState, useEffect } from 'react'

interface FeedbackRow {
  id: number
  rating: 'good' | 'okay' | 'bad'
  category: string
  message: string | null
  os: string | null
  mode: string | null
  vela_version: string | null
  created_at: string
}

interface FeedbackStats {
  total:      number
  byRating:   Array<{ rating: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  recent:     FeedbackRow[]
}

const RATING_EMOJI: Record<string, string> = { good: '😊', okay: '😐', bad: '😞' }

export function FeedbackDashboard() {
  const [stats,   setStats]   = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/feedback/stats')
      .then(r => r.json())
      .then((data: FeedbackStats) => { setStats(data); setLoading(false) })
      .catch(() => { setError('Feedback-Daten nicht abrufbar.'); setLoading(false) })
  }, [])

  function exportCSV() {
    window.open('http://localhost:3000/api/feedback/export', '_blank')
  }

  if (loading) return <div className="text-gray-400 p-6 animate-pulse">Lade Feedback…</div>
  if (error)   return <div className="text-red-400 p-6">{error}</div>
  if (!stats)  return null

  const maxCat = Math.max(...stats.byCategory.map(c => c.count), 1)

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Feedback-Übersicht</h2>
          <p className="text-gray-400 text-sm mt-0.5">{stats.total} Einträge gesamt</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-300 rounded-xl hover:border-gray-400 transition"
        >
          📥 CSV exportieren
        </button>
      </div>

      {/* Rating-Übersicht */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { rating: 'good', label: 'Gut',      color: 'border-green-700 bg-green-950/30' },
          { rating: 'okay', label: 'Okay',     color: 'border-yellow-700 bg-yellow-950/30' },
          { rating: 'bad',  label: 'Schlecht', color: 'border-red-700 bg-red-950/30' },
        ].map(({ rating, label, color }) => {
          const count = stats.byRating.find(r => r.rating === rating)?.count ?? 0
          return (
            <div key={rating} className={`border rounded-xl p-4 text-center ${color}`}>
              <div className="text-3xl mb-1">{RATING_EMOJI[rating]}</div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          )
        })}
      </div>

      {/* Kategorien-Balken */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-gray-300 mb-3">Häufigste Kategorien</p>
        {stats.byCategory.map(cat => (
          <div key={cat.category} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span className="capitalize">{cat.category}</span>
              <span>{cat.count}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(cat.count / maxCat) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Letzte Einträge */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Letzte Einträge</p>
        {stats.recent.length === 0 && (
          <p className="text-gray-500 text-sm">Noch kein Feedback eingegangen.</p>
        )}
        {stats.recent.map(entry => (
          <div key={entry.id} className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">{RATING_EMOJI[entry.rating]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                <span className="capitalize">{entry.category}</span>
                {entry.os && <span>· {entry.os}</span>}
                {entry.mode && <span>· {entry.mode}</span>}
                <span className="ml-auto">{new Date(entry.created_at).toLocaleDateString('de-DE')}</span>
              </div>
              <p className="text-sm text-gray-300 truncate">
                {entry.message ?? <span className="italic text-gray-500">_(kein Kommentar)_</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
