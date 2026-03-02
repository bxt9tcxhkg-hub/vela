import React from 'react'
import { useVelaStore } from '../store/useVelaStore'
import { StatusBadge } from '../components/StatusBadge'
import type { Activity } from '../store/useVelaStore'

const iconMap: Record<string, string> = {
  trash: '🗑️',
  calendar: '📅',
  mail: '📧',
}

export function ActivityPage() {
  const { state } = useVelaStore()

  return (
    <div className="flex-1 bg-cream min-h-screen">
      <header className="px-6 py-8 border-b border-sand bg-warm">
        <h1 className="font-fraunces font-semibold text-2xl text-ink">Aktivität</h1>
        <p className="text-earth text-sm mt-1">Was Vela fuer dich erledigt hat</p>
      </header>

      <div className="px-4 md:px-8 py-6 max-w-2xl">
        {state.activities.length === 0 && (
          <p className="text-bark text-sm">Noch keine Aktivitaeten.</p>
        )}
        {state.activities.map((activity: Activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 bg-warm rounded-2xl border border-sand px-5 py-4 mb-3 hover:border-bark/50 transition-colors"
          >
            <span className="text-2xl shrink-0 mt-0.5">{iconMap[activity.icon] ?? '✦'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-sm font-medium leading-snug">{activity.description}</p>
              <p className="text-bark text-xs mt-0.5">{activity.timestamp}</p>
            </div>
            <StatusBadge status={activity.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
