import React from 'react'

interface StatusBadgeProps {
  status: 'done' | 'pending' | 'cancelled'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span>&#10003;</span> Erledigt
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <span>&#9888;</span> Bestätigung nötig
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <span>&#10007;</span> Abgebrochen
    </span>
  )
}
