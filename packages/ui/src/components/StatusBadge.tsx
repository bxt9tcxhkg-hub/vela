import React from 'react'

interface StatusBadgeProps {
  status: 'done' | 'pending' | 'cancelled'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.35)] text-[#86efac]">
        <span>✓</span> Erledigt
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.35)] text-[#fde68a]">
        <span>!</span> Bestätigung nötig
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.35)] text-[#fecaca]">
      <span>×</span> Abgebrochen
    </span>
  )
}
