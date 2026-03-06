import React from 'react'

export function Card({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-[14px] border p-5 bg-[var(--surface-1)] border-[var(--border)] ${className}`}>
      {children}
    </div>
  )
}
