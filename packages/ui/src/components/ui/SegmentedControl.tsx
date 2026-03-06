import React from 'react'

interface Option<T extends string> { value: T; label: string }

export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] border bg-[var(--surface-2)] border-[var(--border)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-9 rounded-[8px] text-sm font-semibold ${value === opt.value ? 'bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border-strong)]' : 'text-[var(--text-secondary)]'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
