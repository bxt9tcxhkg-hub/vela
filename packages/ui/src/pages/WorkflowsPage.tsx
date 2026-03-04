import React, { useState, useEffect } from 'react'
import { useVelaStore } from '../store/useVelaStore'

type Step = { id: string; label: string; prompt: string; type: string }
type Workflow = { id: string; name: string; description: string; steps: Step[]; enabled: number; last_run: string | null }

export function WorkflowsPage() {
  const { state } = useVelaStore()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<{ step: string; result: string }[]>([])
  const [showResults, setShowResults] = useState(false)
  const [newWf, setNewWf] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/workflows')
      .then(r => r.json() as Promise<{ workflows: Workflow[] }>)
      .then(d => setWorkflows(d.workflows))
      .catch(() => {})
  }, [])

  async function runWorkflow(id: string) {
    setRunning(id)
    setShowResults(false)
    try {
      const res = await fetch(`http://localhost:3000/api/workflows/${id}/run`, { method: 'POST' })
      const data = await res.json() as { results: { step: string; result: string }[] }
      setResults(data.results)
      setShowResults(true)
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, last_run: new Date().toISOString() } : w))
    } finally {
      setRunning(null)
    }
  }

  async function toggleWorkflow(id: string, enabled: boolean) {
    await fetch(`http://localhost:3000/api/workflows/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: enabled ? 1 : 0 } : w))
  }

  async function deleteWorkflow(id: string) {
    await fetch(`http://localhost:3000/api/workflows/${id}`, { method: 'DELETE' })
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  async function createWorkflow() {
    if (!newWf.name) return
    const defaultSteps: Step[] = [{ id: '1', label: 'Schritt 1', prompt: '', type: 'prompt' }]
    const res = await fetch('http://localhost:3000/api/workflows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newWf, steps: defaultSteps })
    })
    const data = await res.json() as { id: string }
    setWorkflows(prev => [{ id: data.id, ...newWf, steps: defaultSteps, enabled: 1, last_run: null }, ...prev])
    setNewWf({ name: '', description: '' })
    setCreating(false)
  }

  if (state.uiMode !== 'expert') {
    return (
      <div className="flex items-center justify-center h-full text-center text-vtext3">
        <div><p className="text-4xl mb-3">🔒</p><p>Workflows sind nur im Experten-Modus verfügbar.</p></div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-fraunces">🔄 Workflows</h1>
          <p className="text-vtext2 text-sm mt-0.5">Skills in Abfolge automatisieren</p>
        </div>
        <button onClick={() => setCreating(c => !c)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors">
          + Workflow
        </button>
      </div>

      {creating && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-4 space-y-3">
          <input value={newWf.name} onChange={e => setNewWf(p => ({...p, name: e.target.value}))}
            placeholder="Workflow-Name"
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500" />
          <input value={newWf.description} onChange={e => setNewWf(p => ({...p, description: e.target.value}))}
            placeholder="Kurzbeschreibung (optional)"
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500" />
          <div className="flex gap-2">
            <button onClick={() => void createWorkflow()} disabled={!newWf.name}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-500 disabled:opacity-40 transition-colors">Erstellen</button>
            <button onClick={() => setCreating(false)}
              className="px-4 py-2 bg-surface2 border border-border text-vtext2 text-sm rounded-xl hover:text-white transition-colors">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {workflows.map(wf => (
          <div key={wf.id} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-white font-semibold">{wf.name}</h2>
                {wf.description && <p className="text-vtext2 text-sm">{wf.description}</p>}
                {wf.last_run && <p className="text-vtext3 text-xs mt-1">Zuletzt: {wf.last_run}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={wf.enabled === 1} onChange={e => void toggleWorkflow(wf.id, e.target.checked)} className="accent-blue-500" />
                  <span className="text-xs text-vtext2">{wf.enabled ? 'Aktiv' : 'Inaktiv'}</span>
                </label>
                <button onClick={() => void deleteWorkflow(wf.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
              </div>
            </div>

            {/* Steps preview */}
            <div className="flex gap-2 flex-wrap mb-3">
              {wf.steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                  <span className="bg-surface2 border border-border text-vtext2 text-xs px-2 py-1 rounded-lg">{i + 1}. {s.label}</span>
                  {i < wf.steps.length - 1 && <span className="text-vtext3 text-xs">→</span>}
                </div>
              ))}
            </div>

            <button onClick={() => void runWorkflow(wf.id)} disabled={running === wf.id}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors">
              {running === wf.id ? '⏳ Läuft…' : '▶ Ausführen'}
            </button>
          </div>
        ))}
      </div>

      {/* Results panel */}
      {showResults && results.length > 0 && (
        <div className="mt-6 bg-surface border border-border rounded-2xl p-5">
          <div className="flex justify-between mb-4">
            <h2 className="text-white font-semibold">Ergebnisse</h2>
            <button onClick={() => setShowResults(false)} className="text-vtext3 hover:text-white">✕</button>
          </div>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i}>
                <p className="text-blue-400 text-xs font-medium mb-1">Schritt {i + 1}: {r.step}</p>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{r.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
