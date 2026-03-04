import React, { useState, useEffect } from 'react'
import { useVelaStore } from '../store/useVelaStore'

type Agent = { id: string; name: string; description: string; system_prompt: string; model: string; enabled: number }
type Delegation = { id: string; agent_name: string; task: string; result: string; status: string; created_at: string }

export function AgentsPage() {
  const { state } = useVelaStore()
  const [agents, setAgents]         = useState<Agent[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [task, setTask]             = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('auto')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<{ agentName: string; result: string } | null>(null)

  useEffect(() => {
    fetch('http://localhost:3000/api/agents')
      .then(r => r.json() as Promise<{ agents: Agent[] }>)
      .then(d => setAgents(d.agents))
      .catch(() => {})
    fetch('http://localhost:3000/api/agents/delegations')
      .then(r => r.json() as Promise<{ delegations: Delegation[] }>)
      .then(d => setDelegations(d.delegations))
      .catch(() => {})
  }, [])

  async function delegate() {
    if (!task.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const endpoint = selectedAgent === 'auto'
        ? '/api/agents/auto-delegate'
        : `/api/agents/${selectedAgent}/delegate`
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      const data = await res.json() as { agentName: string; result: string; selectedAgent?: string }
      setResult(data)
      setDelegations(prev => [{
        id: Date.now().toString(), agent_name: data.agentName, task,
        result: data.result, status: 'done', created_at: new Date().toISOString()
      }, ...prev.slice(0, 19)])
    } finally { setLoading(false) }
  }

  if (state.uiMode !== 'expert') return (
    <div className="flex items-center justify-center h-full text-center text-vtext3">
      <div><p className="text-4xl mb-3">🔒</p><p>Sub-Agents sind nur im Experten-Modus verfügbar.</p></div>
    </div>
  )

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white font-fraunces">🤖 Sub-Agents</h1>
        <p className="text-vtext2 text-sm mt-0.5">Delegiere Aufgaben an spezialisierte Mini-Agents.</p>
      </div>

      {/* Delegation form */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-6 space-y-4">
        <div>
          <label className="text-white text-sm font-medium block mb-1.5">Aufgabe delegieren</label>
          <textarea value={task} onChange={e => setTask(e.target.value)}
            rows={3} placeholder="Beschreibe die Aufgabe für den Agent…"
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) void delegate() }}
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 resize-none" />
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-40">
            <label className="text-white text-sm font-medium block mb-1.5">Agent</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
              <option value="auto">🤖 Auto-Routing (beste Wahl)</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={() => void delegate()} disabled={loading || !task.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {loading ? '⏳ Delegiert…' : '→ Delegieren'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface border border-blue-800 rounded-2xl p-5 mb-6">
          <p className="text-blue-400 text-xs font-medium mb-2">🤖 {result.agentName}</p>
          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{result.result}</p>
        </div>
      )}

      {/* Agents grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {agents.map(a => (
          <div key={a.id} className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-0.5">{a.name}</p>
            <p className="text-vtext2 text-xs">{a.description}</p>
            <p className="text-vtext3 text-xs mt-2 font-mono">{a.model}</p>
          </div>
        ))}
      </div>

      {/* History */}
      {delegations.length > 0 && (
        <div>
          <p className="text-vtext3 text-xs mb-3 font-medium">VERLAUF</p>
          <div className="space-y-2">
            {delegations.slice(0, 5).map(d => (
              <div key={d.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-400 text-xs">{d.agent_name}</span>
                  <span className="text-vtext3 text-xs">{d.created_at.slice(0, 16)}</span>
                </div>
                <p className="text-white text-xs truncate">{d.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
