import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MessageSquare, Activity, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Chat', icon: MessageSquare },
  { to: '/activity', label: 'Aktivität', icon: Activity },
  { to: '/settings', label: 'Einstellungen', icon: Settings },
]

export function Sidebar() {
  const [uiMode, setUiMode] = useState<'simple' | 'advanced'>(() => (localStorage.getItem('vela_ui_mode') as 'simple' | 'advanced') || 'simple')

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', uiMode)
    localStorage.setItem('vela_ui_mode', uiMode)
  }, [uiMode])

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--surface-1)] h-screen sticky top-0 shrink-0">
        <div className="px-6 pt-7 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[10px] bg-[var(--accent-soft)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] font-semibold text-sm">
              V
            </div>
            <div>
              <div className="text-[var(--text-primary)] font-semibold text-lg leading-none">Vela</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--success)]" />
                Bereit
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] mb-1.5 text-sm font-medium border ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] border-[var(--accent)]/40'
                      : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)]">
            <button onClick={() => setUiMode('simple')} className={`h-8 rounded-[8px] text-xs font-semibold ${uiMode === 'simple' ? 'bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>Einfach</button>
            <button onClick={() => setUiMode('advanced')} className={`h-8 rounded-[8px] text-xs font-semibold ${uiMode === 'advanced' ? 'bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>Experte</button>
          </div>
          <div className="px-2 text-xs text-[var(--text-disabled)]">Vela v0.2.x</div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-1)] border-t border-[var(--border)] flex">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[11px] font-medium ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
