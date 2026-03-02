import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { VelaProvider } from './store/useVelaStore'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <VelaProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-cream">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
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
