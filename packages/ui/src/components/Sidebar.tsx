import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Chat', icon: '💬' },
  { to: '/activity', label: 'Aktivität', icon: '📋' },
  { to: '/settings', label: 'Einstellungen', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-warm border-r border-sand h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-fraunces font-semibold text-ink">
            V<span className="italic text-sky">e</span>la
          </span>
          <span className="pulse-green w-2 h-2 rounded-full bg-moss inline-block"></span>
        </div>
        <p className="text-xs text-earth mt-1">Dein persönlicher Assistent</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sand text-ink'
                  : 'text-earth hover:bg-sand/50 hover:text-ink'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 pb-6">
        <p className="text-xs text-bark font-epilogue">Vela v0.1.0</p>
      </div>
    </aside>
  )
}
