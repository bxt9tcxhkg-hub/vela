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
      <p className="font-medium text-ink mb-1 text-sm">
        Vela möchte folgendes tun:
      </p>
      <p className="text-ink text-sm mb-3">{action.description}</p>
      <p className="text-xs text-earth mb-3">{riskLabels[action.risk]}</p>
      <div className="flex gap-2">
        <button
          onClick={action.onConfirm}
          className="flex-1 py-2 rounded-xl bg-sky text-white text-sm font-medium hover:bg-sky/90 transition-colors"
        >
          Ja, ausführen
        </button>
        <button
          onClick={action.onCancel}
          className="flex-1 py-2 rounded-xl bg-sand text-ink text-sm font-medium hover:bg-bark/30 transition-colors"
        >
          Nein, abbrechen
        </button>
      </div>
    </div>
  )
}
