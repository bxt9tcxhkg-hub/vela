import React from 'react'
import { ConfirmAction } from '../store/useVelaStore'

interface ConfirmDialogProps {
  action: ConfirmAction
}

const riskColors = {
  low: 'bg-green-50 border-green-200',
  medium: 'bg-amber-50 border-amber-200',
  high: 'bg-red-50 border-red-200',
}

const riskLabels = {
  low: 'Niedriges Risiko',
  medium: 'Mittleres Risiko',
  high: 'Hohes Risiko',
}

export function ConfirmDialog({ action }: ConfirmDialogProps) {
  return (
    <div className={`rounded-2xl border p-4 my-3 mx-auto max-w-sm ${riskColors[action.risk]}`}>
      <p className="font-medium text-white mb-1 text-sm">
        Vela möchte folgendes tun:
      </p>
      <p className="text-white text-sm mb-3">{action.description}</p>
      <p className="text-xs text-vtext2 mb-3">{riskLabels[action.risk]}</p>
      <div className="flex gap-2">
        <button
          onClick={action.onConfirm}
          className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          Ja, ausführen
        </button>
        <button
          onClick={action.onCancel}
          className="flex-1 py-2 rounded-xl bg-surface2 text-white text-sm font-medium hover:bg-surface border border-border transition-colors"
        >
          Nein, abbrechen
        </button>
      </div>
    </div>
  )
}
