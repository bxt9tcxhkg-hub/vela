import React from 'react'
import { useVelaStore } from '../store/useVelaStore'
import type { UIMode } from '../store/useVelaStore'

export function UIModeToggle() {
  const { state, dispatch } = useVelaStore()
  const { uiMode } = state

  function toggle(mode: UIMode) {
    dispatch({ type: 'SET_UI_MODE', payload: mode })
  }

  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 text-xs">
      <button
        onClick={() => toggle('simple')}
        className={`px-3 py-1 rounded-md transition-all font-medium ${
          uiMode === 'simple'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Einfach
      </button>
      <button
        onClick={() => toggle('expert')}
        className={`px-3 py-1 rounded-md transition-all font-medium ${
          uiMode === 'expert'
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Experte
      </button>
    </div>
  )
}
