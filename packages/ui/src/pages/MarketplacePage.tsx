// Marketplace – Expert Mode only: Community Skills durchsuchen & installieren
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface RegistrySkill {
  id:               string
  name:             string
  version:          string
  author:           string
  verified:         boolean
  description:      string
  permissions:      string[]
  riskLevel:        'low' | 'medium' | 'high'
  category?:        string
  repository:       string
  installed:        boolean
  installedVersion: string | null
  hasUpdate:        boolean
}

const RISK_COLORS = {
  low:    'text-green-400 bg-green-950/30 border-green-700',
  medium: 'text-yellow-400 bg-yellow-950/30 border-yellow-700',
  high:   'text-red-400 bg-red-950/30 border-red-700',
}

const RISK_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

// ─── Security Confirmation Dialog ─────────────────────────────────────────────
function SecurityDialog({
  skill,
  onConfirm,
  onCancel,
}: {
  skill:     RegistrySkill
  onConfirm: () => void
  onCancel:  () => void
}) {
  const [typed, setTyped] = useState('')
  const needsTyped = skill.riskLevel === 'high' && !skill.verified

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{skill.verified ? '✅' : '⚠️'}</span>
          <div>
            <h3 className="text-white font-bold">{skill.name} installieren</h3>
            <p className="text-xs text-gray-400">{skill.author} · v{skill.version}</p>
          </div>
        </div>

        {!skill.verified && (
          <div className="bg-yellow-950/40 border border-yellow-700 rounded-xl p-4 text-sm text-yellow-200">
            <p className="font-medium mb-1">⚠ Nicht verifiziert</p>
            <p className="text-yellow-300/80">
              Dieser Skill stammt nicht vom Vela-Team und wurde nicht sicherheitsgeprüft.
              Installiere ihn nur wenn du der Quelle vertraust.
            </p>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Angeforderte Berechtigungen</p>
          {skill.permissions.map(p => (
            <div key={p} className="flex items-center gap-2 text-sm text-gray-300">
              <span className="text-gray-500">•</span> {p}
            </div>
          ))}
          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${RISK_COLORS[skill.riskLevel]}`}>
            Risk: {RISK_LABELS[skill.riskLevel]}
          </div>
        </div>

        {needsTyped && (
          <div className="space-y-1">
            <p className="text-sm text-red-300">
              Dieser Skill hat hohes Risiko. Tippe <strong>INSTALLIEREN</strong> zur Bestätigung:
            </p>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="INSTALLIEREN"
              className="w-full bg-gray-800 border border-red-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white font-medium hover:bg-gray-700 transition"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={needsTyped && typed !== 'INSTALLIEREN'}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              skill.verified
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-yellow-700 text-white hover:bg-yellow-600'
            } disabled:opacity-40`}
          >
            {skill.verified ? 'Installieren' : 'Trotzdem installieren'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skill Kachel ─────────────────────────────────────────────────────────────
function SkillCard({
  skill,
  onInstall,
  onUninstall,
  installing,
}: {
  skill:       RegistrySkill
  onInstall:   (skill: RegistrySkill) => void
  onUninstall: (skillId: string) => void
  installing:  string | null
}) {
  const isInstalling = installing === skill.id

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold">{skill.name}</h3>
            {skill.verified && (
              <span className="text-xs bg-blue-950/60 border border-blue-700 text-blue-300 px-1.5 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${RISK_COLORS[skill.riskLevel]}`}>
              {RISK_LABELS[skill.riskLevel]} Risk
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{skill.author} · v{skill.version}</p>
        </div>
      </div>

      <p className="text-sm text-gray-300 flex-1">{skill.description}</p>

      <div className="flex flex-wrap gap-1">
        {skill.permissions.map(p => (
          <span key={p} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{p}</span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        {skill.hasUpdate && (
          <span className="text-xs text-yellow-400">Update verfügbar → v{skill.version}</span>
        )}
        <div className="flex gap-2 ml-auto">
          {skill.installed ? (
            <>
              <span className="text-xs text-green-400 self-center">✓ Installiert</span>
              <button
                onClick={() => onUninstall(skill.id)}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-600 text-gray-400 hover:border-red-600 hover:text-red-400 transition"
              >
                Entfernen
              </button>
              {skill.hasUpdate && (
                <button
                  onClick={() => onInstall(skill)}
                  disabled={isInstalling}
                  className="px-3 py-1.5 rounded-lg text-xs bg-yellow-700 text-white hover:bg-yellow-600 disabled:opacity-50 transition"
                >
                  {isInstalling ? '…' : 'Update'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onInstall(skill)}
              disabled={isInstalling}
              className="px-4 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {isInstalling ? 'Installiert…' : 'Installieren'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Marketplace Seite ────────────────────────────────────────────────────────
export function MarketplacePage() {
  const { t: _t } = useTranslation()
  const [skills,      setSkills]      = useState<RegistrySkill[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [tab,         setTab]         = useState<'browse' | 'installed'>('browse')
  const [installing,  setInstalling]  = useState<string | null>(null)
  const [confirmSkill, setConfirmSkill] = useState<RegistrySkill | null>(null)
  const [error,       setError]       = useState('')

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filter !== 'all') params.set('filter', filter)
      const endpoint = tab === 'installed'
        ? 'http://localhost:3000/api/marketplace/installed'
        : `http://localhost:3000/api/marketplace/skills?${params.toString()}`
      const res  = await fetch(endpoint)
      const data = await res.json() as { skills: RegistrySkill[] }
      setSkills(data.skills ?? [])
    } catch {
      setError('Marketplace nicht erreichbar — stelle sicher, dass der Vela Server läuft.')
    } finally {
      setLoading(false)
    }
  }, [search, filter, tab])

  useEffect(() => { void fetchSkills() }, [fetchSkills])

  async function handleInstall(skill: RegistrySkill) {
    setConfirmSkill(null)
    setInstalling(skill.id)
    try {
      const res  = await fetch(`http://localhost:3000/api/marketplace/skills/${skill.id}/install`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setError(err.error ?? 'Installation fehlgeschlagen.')
      } else {
        await fetchSkills()
      }
    } catch {
      setError('Verbindungsfehler.')
    } finally {
      setInstalling(null)
    }
  }

  async function handleUninstall(skillId: string) {
    try {
      await fetch(`http://localhost:3000/api/marketplace/skills/${skillId}`, { method: 'DELETE' })
      await fetchSkills()
    } catch {
      setError('Deinstallation fehlgeschlagen.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white p-6 gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Skill Marketplace</h1>
        <p className="text-gray-400 text-sm mt-1">Erweitere Vela mit Community-Skills</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 w-fit">
        {(['browse', 'installed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'browse' ? 'Durchsuchen' : 'Installiert'}
          </button>
        ))}
      </div>

      {/* Search + Filter (nur im Browse-Tab) */}
      {tab === 'browse' && (
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Skills suchen…"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all">Alle</option>
            <option value="verified">✓ Verifiziert</option>
            <option value="low">🟢 Low Risk</option>
            <option value="medium">🟡 Medium Risk</option>
            <option value="high">🔴 High Risk</option>
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Skills Grid */}
      {loading ? (
        <div className="text-gray-400 text-sm animate-pulse">Lade Skills…</div>
      ) : skills.length === 0 ? (
        <div className="text-gray-500 text-sm">
          {tab === 'installed' ? 'Keine Skills installiert.' : 'Keine Skills gefunden.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onInstall={s => setConfirmSkill(s)}
              onUninstall={id => void handleUninstall(id)}
              installing={installing}
            />
          ))}
        </div>
      )}

      {/* Security Dialog */}
      {confirmSkill && (
        <SecurityDialog
          skill={confirmSkill}
          onConfirm={() => void handleInstall(confirmSkill)}
          onCancel={() => setConfirmSkill(null)}
        />
      )}
    </div>
  )
}
