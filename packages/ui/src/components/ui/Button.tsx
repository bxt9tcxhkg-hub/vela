import React from 'react'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }: Props) {
  const base = 'h-10 px-4 rounded-[8px] text-sm font-semibold inline-flex items-center justify-center gap-2 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed'
  const variants: Record<Variant, string> = {
    primary: 'bg-[var(--accent)] border-transparent text-[#06231f] hover:brightness-110 shadow-[0_8px_20px_rgba(45,212,191,0.18)]',
    secondary: 'bg-transparent border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]/40',
    destructive: 'bg-[rgba(248,113,113,0.2)] border-[rgba(248,113,113,0.35)] text-[#fecaca] hover:bg-[rgba(248,113,113,0.26)]',
    ghost: 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]',
  }
  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? '…' : children}
    </button>
  )
}
