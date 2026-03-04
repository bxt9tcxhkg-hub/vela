import React from 'react'
import { NavLink } from 'react-router-dom'
import { UIModeToggle } from './UIModeToggle'

const navItems = [
  { to: '/',           label: 'Chat',          icon: '💬' },
  { to: '/activity',  label: 'Aktivität',      icon: '📊' },
  { to: '/playground', label: 'Playground',     icon: '🧪' },
  { to: '/workflows',  label: 'Workflows',      icon: '🔄' },
  { to: '/settings',  label: 'Einstellungen',  icon: '⚙️' },
]

export function Sidebar({ showMarketplace = false }: { showMarketplace?: boolean }) {
  const items = [
    ...navItems,
    ...(showMarketplace ? [{ to: '/marketplace', label: 'Marketplace', icon: '🏪' }] : []),
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm shadow-lg">
              ✦
            </div>
            <span className="text-white font-fraunces font-semibold text-lg tracking-tight">Vela</span>
            <span className="pulse-green w-2 h-2 rounded-full bg-green-500 inline-block ml-auto"></span>
          </div>
          <p className="text-vtext3 text-xs mt-2 font-inter">Dein persönlicher Assistent</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-700/40'
                    : 'text-vtext2 hover:bg-surface2 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* UI Mode Toggle */}
        <div className="px-4 pb-3">
          <UIModeToggle />
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 border-t border-border pt-4">
          <p className="text-vtext3 text-xs font-inter">Vela v0.1.0</p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-400' : 'text-vtext3'
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
