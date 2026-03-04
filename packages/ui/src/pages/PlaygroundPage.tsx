// Prompt-Playground – Prompts live testen (nur Experte)
import React, { useState } from 'react'
import { useVelaStore } from '../store/useVelaStore'

const PRESETS = [
  { label: 'Kreativ (1.0)', temperature: 1.0, maxTokens: 2048 },
  { label: 'Ausgewogen (0.7)', temperature: 0.7, maxTokens: 2048 },
  { label: 'Präzise (0.2)', temperature: 0.2, maxTokens: 1024 },
]

export function PlaygroundPage() {
  const { state } = useVelaStore()
  const [systemPrompt, setSystemPrompt] = useState('Du bist ein hilfreicher Assistent.')
  const [userPrompt, setUserPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [tokenCount, setTokenCount] = useState<number | null>(null)
  const [history, setHistory] = useState<{prompt:string;response:string;ms:number}[]>([])

  if (state.uiMode !== 'expert') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-vtext3">
          <p className="text-4xl mb-3">🔒</p>
          <p>Der Prompt-Playground ist nur im Experten-Modus verfügbar.</p>
        </div>
      </div>
    )
  }

  async function runPrompt() {
    if (!userPrompt.trim()) return
    setLoading(true)
    setResponse('')
    const t0 = Date.now()
    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          systemPrompt,
          temperature,
          maxTokens,
        }),
      })
      const data = await res.json() as { text?: string; usage?: { total_tokens?: number } }
      const ms = Date.now() - t0
      setResponse(data.text ?? 'Keine Antwort')
      setElapsed(ms)
      setTokenCount(data.usage?.total_tokens ?? null)
      setHistory(h => [{ prompt: userPrompt, response: data.text ?? '', ms }, ...h.slice(0, 9)])
    } catch (e) {
      setResponse('Fehler: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white font-fraunces">🧪 Prompt-Playground</h1>
        <p className="text-vtext2 text-sm mt-0.5">Prompts live testen und Parameter anpassen.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Preset</p>
            <div className="space-y-1">
              {PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setTemperature(p.temperature); setMaxTokens(p.maxTokens) }}
                  className="w-full text-left px-3 py-1.5 rounded-lg border border-border text-vtext2 text-xs hover:border-blue-600 hover:text-white transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white text-sm font-medium">Temperatur</span>
              <span className="text-blue-400 text-sm font-mono">{temperature.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.1" value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-500" />
          </div>

          {/* Max tokens */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white text-sm font-medium">Max. Tokens</span>
              <span className="text-blue-400 text-sm font-mono">{maxTokens}</span>
            </div>
            <input type="range" min="64" max="8192" step="64" value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-blue-500" />
          </div>

          {/* Stats */}
          {(elapsed !== null || tokenCount !== null) && (
            <div className="bg-surface2 border border-border rounded-xl p-3 text-xs space-y-1">
              {elapsed   !== null && <p className="text-vtext2">⏱ {elapsed}ms</p>}
              {tokenCount !== null && <p className="text-vtext2">🔢 {tokenCount} Tokens</p>}
            </div>
          )}
        </div>

        {/* Right: Prompts */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">System-Prompt</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              rows={2}
              style={{ color: '#f9fafb', caretColor: '#f9fafb', WebkitTextFillColor: '#f9fafb' }}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-vtext text-sm placeholder:text-vtext3 outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="text-white text-sm font-medium block mb-1.5">Benutzer-Prompt</label>
            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
              rows={4} placeholder="Schreib einen Test-Prompt…"
              style={{ color: '#f9fafb', caretColor: '#f9fafb', WebkitTextFillColor: '#f9fafb' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) void runPrompt() }}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-vtext text-sm placeholder:text-vtext3 outline-none focus:border-blue-500 resize-none" />
            <p className="text-vtext3 text-xs mt-1">Ctrl+Enter zum Ausführen</p>
          </div>

          <button onClick={() => void runPrompt()} disabled={loading || !userPrompt.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {loading ? '⏳ Läuft…' : '▶ Ausführen'}
          </button>

          {/* Response */}
          {response && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-vtext3 text-xs mb-2 font-medium">ANTWORT</p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <p className="text-vtext3 text-xs mb-2 font-medium">VERLAUF</p>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <button key={i} onClick={() => { setUserPrompt(h.prompt); setResponse(h.response) }}
                    className="w-full text-left bg-surface border border-border rounded-xl px-4 py-2 hover:border-border2 transition-colors">
                    <p className="text-white text-xs truncate">{h.prompt}</p>
                    <p className="text-vtext3 text-xs">{h.ms}ms</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
