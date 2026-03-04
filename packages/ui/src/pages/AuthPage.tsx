// Login / Register Page
import React, { useState } from 'react'
import { useVelaStore } from '../store/useVelaStore'

type Mode = 'login' | 'register'

interface AuthUser { id: string; username: string; email: string; role: string }

export function AuthPage({ onAuth }: { onAuth: (token: string, user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { state } = useVelaStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password }

      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      if (data.token && data.user) onAuth(data.token, data.user)
    } catch { setError('Server nicht erreichbar.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">✦</p>
          <h1 className="font-fraunces text-2xl font-bold text-white">
            {state.operationMode === 'cloud' ? 'Willkommen bei Vela' : 'Vela – Lokal'}
          </h1>
          <p className="text-vtext2 text-sm mt-1">{mode === 'login' ? 'Melde dich an' : 'Erstelle ein Konto'}</p>
        </div>

        <form onSubmit={e => void submit(e)} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-white text-sm font-medium block mb-1.5">Benutzername</label>
              <input type="text" required value={form.username}
                onChange={e => setForm(p => ({...p, username: e.target.value}))}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                placeholder="dein_name" />
            </div>
          )}
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">E-Mail</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              placeholder="du@beispiel.de" />
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">Passwort</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors">
            {loading ? '⏳ …' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <p className="text-center text-vtext3 text-sm mt-4">
          {mode === 'login' ? 'Noch kein Konto? ' : 'Schon ein Konto? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
            className="text-blue-400 hover:text-blue-300 transition-colors">
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </button>
        </p>
        <p className="text-center text-vtext3 text-xs mt-3">
          Oder{' '}
          <button onClick={() => onAuth('guest', { id: 'guest', username: 'Gast', email: '', role: 'guest' })}
            className="text-vtext2 hover:text-white transition-colors underline">
            als Gast fortfahren
          </button>
        </p>
      </div>
    </div>
  )
}
