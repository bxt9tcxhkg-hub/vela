import React from 'react'
import { useVelaStore } from '../store/useVelaStore'
import { StatusBadge } from '../components/StatusBadge'
import type { Activity } from '../store/useVelaStore'
import { Trash2, CalendarDays, Mail, Sparkles } from 'lucide-react'

function ActivityIcon({ name }: { name: string }) {
  const cls = 'w-4 h-4'
  if (name === 'trash') return <Trash2 className={cls} />
  if (name === 'calendar') return <CalendarDays className={cls} />
  if (name === 'mail') return <Mail className={cls} />
  return <Sparkles className={cls} />
}

export function ActivityPage() {
  const { state } = useVelaStore()

  return (
    <div className="flex-1 min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-6 py-8 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <h1 className="text-2xl text-[var(--text-primary)]">Aktivität</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Was Vela für dich erledigt hat</p>
      </header>

      <div className="px-4 md:px-8 py-6 max-w-3xl">
        {state.activities.length === 0 && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
            <p className="text-[var(--text-secondary)] text-sm">Noch keine Aktivität. Starte eine erste Aufgabe im Chat.</p>
          </div>
        )}
        {state.activities.map((activity: Activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 bg-[var(--surface-1)] rounded-[14px] border border-[var(--border)] px-5 py-4 mb-3 hover:border-[var(--border-strong)]"
          >
            <span className="shrink-0 mt-0.5 w-8 h-8 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] inline-flex items-center justify-center text-[var(--text-secondary)]">
              <ActivityIcon name={activity.icon} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-sm font-medium leading-snug">{activity.description}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">{activity.timestamp}</p>
            </div>
            <StatusBadge status={activity.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
