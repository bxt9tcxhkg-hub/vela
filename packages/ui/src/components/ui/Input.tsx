import React from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
}

export function Input({ label, helper, error, className = '', ...props }: Props) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-xs font-semibold uppercase tracking-[0.03em] text-[var(--text-secondary)]">{label}</span>}
      <input
        {...props}
        className={`w-full h-10 px-3 rounded-[8px] border bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent ${error ? 'border-[rgba(248,113,113,0.6)]' : ''} ${className}`}
      />
      {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : helper ? <p className="text-xs text-[var(--text-secondary)]">{helper}</p> : null}
    </label>
  )
}
