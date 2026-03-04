import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { VelaProvider } from './store/useVelaStore'
import type { OperationMode } from './store/useVelaStore'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean>(
    () => localStorage.getItem('vela_onboarded') === 'true'
  )

  function completeOnboarding(mode: OperationMode, trustLevel: 'cautious' | 'balanced' | 'autonomous') {
    localStorage.setItem('vela_onboarded', 'true')
    localStorage.setItem('vela_mode', mode)
    localStorage.setItem('vela_trust', trustLevel)
    localStorage.setItem('vela_model', mode === 'local' ? 'ollama' : 'claude')
    setOnboarded(true)
  }

  if (!onboarded) {
    return <OnboardingPage onComplete={completeOnboarding} />
  }

  return (
    <VelaProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-gray-950 pb-16 md:pb-0">
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
