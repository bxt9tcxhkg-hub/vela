import React from 'react'

export interface PermissionDialogProps {
  skillName:  string
  permission: string
  label:      string
  description: string
  reason:     string
  riskNote?:  string
  risk:       'low' | 'medium' | 'high'
  onConfirm:  () => void
  onDeny:     () => void
}

const riskColors = {
  low:    'border-green-600 bg-green-950/20',
  medium: 'border-yellow-600 bg-yellow-950/20',
  high:   'border-red-600 bg-red-950/20',
}

const riskBadge = {
  low:    { label: 'Niedriges Risiko',    color: 'text-green-400 bg-green-900/40' },
  medium: { label: 'Mittleres Risiko',   color: 'text-yellow-400 bg-yellow-900/40' },
  high:   { label: 'Hohes Risiko',       color: 'text-red-400 bg-red-900/40' },
}

export default function PermissionDialog({
  skillName,
  label,
  description,
  reason,
  riskNote,
  risk,
  onConfirm,
  onDeny,
}: PermissionDialogProps) {
  const badge = riskBadge[risk]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl border-2 p-6 space-y-4 shadow-2xl bg-gray-900 ${riskColors[risk]}`}>
        
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl">🔐</span>
          <div>
            <h2 className="text-lg font-bold text-white">{label} aktivieren</h2>
            <p className="text-sm text-gray-400">angefordert von Skill: <code className="text-blue-400">{skillName}</code></p>
          </div>
        </div>

        {/* Risk Badge */}
        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}>
          {badge.label}
        </span>

        {/* Beschreibung */}
        <div className="bg-gray-800/60 rounded-xl p-4 text-sm text-gray-300 space-y-2">
          <p>{description}</p>
          {reason && reason !== description && (
            <p className="text-gray-400 text-xs border-t border-gray-700 pt-2">
              <strong>Warum braucht der Skill das?</strong> {reason}
            </p>
          )}
          {riskNote && (
            <p className="text-yellow-300 text-xs">{riskNote}</p>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Du kannst diese Berechtigung jederzeit in den Einstellungen unter „Berechtigungen" widerrufen.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onDeny}
            className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition text-sm"
          >
            Ablehnen
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg font-medium text-white transition text-sm ${
              risk === 'high'
                ? 'bg-red-700 hover:bg-red-600'
                : risk === 'medium'
                  ? 'bg-yellow-700 hover:bg-yellow-600'
                  : 'bg-green-700 hover:bg-green-600'
            }`}
          >
            Berechtigung erteilen
          </button>
        </div>
      </div>
    </div>
  )
}
