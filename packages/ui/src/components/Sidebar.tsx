import React from 'react'
import { NavLink } from 'react-router-dom'
import { UIModeToggle } from './UIModeToggle'

const navItems = [
  { to: '/', label: 'Chat', icon: '💬' },
  { to: '/activity', label: 'Aktivität', icon: '📊' },
  { to: '/settings', label: 'Einstellungen', icon: '⚙️' },
]

export function Sidebar({ showMarketplace = false }: { showMarketplace?: boolean }) {
  const items = [
    ...navItems,
    ...(showMarketplace ? [{ to: '/marketplace', label: 'Marketplace', icon: '🏪' }] : []),
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-warm border-r border-sand h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-fraunces font-semibold text-ink tracking-tight">
              V<span className="italic text-sky">e</span>la
            </span>
            <span className="pulse-green w-2 h-2 rounded-full bg-moss inline-block"></span>
          </div>
          <p className="text-xs text-earth mt-1 font-epilogue">Dein persönlicher Assistent</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-light text-sky shadow-sm'
                    : 'text-earth hover:bg-sand/60 hover:text-ink'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* UI Mode Toggle */}
        <div className="px-4 pb-3">
          <UIModeToggle />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-bark font-epilogue">Vela v0.1.0</p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-warm border-t border-sand flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-sky' : 'text-earth'
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
