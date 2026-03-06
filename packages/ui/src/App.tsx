import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { VelaProvider } from './store/useVelaStore'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'


type UiTheme = 'dark' | 'light'
type UiMode = 'simple' | 'advanced'

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean>(
    () => localStorage.getItem('vela_onboarded') === 'true'
  )
  const [uiTheme] = useState<UiTheme>(() => (localStorage.getItem('vela_ui_theme') as UiTheme) || 'dark')
  const [uiMode] = useState<UiMode>(() => (localStorage.getItem('vela_ui_mode') as UiMode) || 'simple')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme)
    document.documentElement.setAttribute('data-mode', uiMode)
  }, [uiTheme, uiMode])

  function completeOnboarding() {
    localStorage.setItem('vela_onboarded', 'true')
    setOnboarded(true)
  }

  if (!onboarded) {
    return <OnboardingPage onComplete={completeOnboarding} />
  }

  return (
    <VelaProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden pb-16 md:pb-0" style={{ background: 'var(--bg)' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </VelaProvider>
  )
}
