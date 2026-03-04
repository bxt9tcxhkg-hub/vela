import React from 'react'
import { useVelaStore } from '../store/useVelaStore'

export function ActivityPage() {
  const { state } = useVelaStore()
  const { activities, uiMode } = state

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Aktivität</h1>
          <p className="text-gray-400 text-sm mt-0.5">Was Vela zuletzt getan hat</p>
        </div>
        {uiMode === 'expert' && (
          <span className="text-xs text-purple-400 border border-purple-800 rounded-full px-3 py-1">
            Experten-Ansicht
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Noch keine Aktivitäten</p>
          <p className="text-sm mt-1">Starte eine Unterhaltung mit Vela</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(activity => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl"
            >
              <span className="text-xl mt-0.5">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">{activity.timestamp}</p>
                {/* Expert Mode: zeigt Status-Badge */}
                {uiMode === 'expert' && (
                  <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded-full ${
                    activity.status === 'done'      ? 'bg-green-900/40 text-green-400' :
                    activity.status === 'pending'   ? 'bg-yellow-900/40 text-yellow-400' :
                                                      'bg-red-900/40 text-red-400'
                  }`}>
                    {activity.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expert Mode: Audit Log Link */}
      {uiMode === 'expert' && (
        <div className="mt-8 p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl">
          <h2 className="text-sm font-semibold text-purple-300 mb-1">🔍 Audit Log</h2>
          <p className="text-xs text-gray-400">
            Alle Aktionen werden HMAC-gesichert im lokalen Audit Log gespeichert.
            Der Log ist unveränderlich und kann zur Diagnose exportiert werden.
          </p>
          <button className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline">
            Log exportieren (JSON)
          </button>
        </div>
      )}
    </div>
  )
}
