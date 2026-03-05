import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentPlanner } from '../agent/planner.js'

// Mock connector so planner doesn't need a real LLM
vi.mock('../ai/connector.js', () => ({
  connector: {
    isAvailable: vi.fn().mockResolvedValue(false), // force pattern-only mode
  },
}))

describe('AgentPlanner – Pattern Matching', () => {
  let planner: AgentPlanner

  beforeEach(() => {
    planner = new AgentPlanner()
  })

  it('detects web-search for "suche nach..." input', async () => {
    const actions = await planner.plan('suche nach dem Wetter in Wien', [])
    expect(actions.length).toBeGreaterThan(0)
    expect(actions[0].skillName).toBe('web-search')
    expect(actions[0].riskLevel).toBe('low')
  })

  it('detects file-manager for "öffne Datei" input', async () => {
    const actions = await planner.plan('öffne die Datei auf dem Desktop', [])
    expect(actions.length).toBeGreaterThan(0)
    expect(actions[0].skillName).toBe('file-manager')
    expect(actions[0].riskLevel).toBe('medium')
  })

  it('detects email-reader for "lies meine Mails"', async () => {
    const actions = await planner.plan('lies meine Mails', [])
    expect(actions.some(a => a.skillName === 'email-reader')).toBe(true)
  })

  it('detects email-sender for "schick eine Mail"', async () => {
    const actions = await planner.plan('schick eine Mail an muhi@test.de', [])
    expect(actions.some(a => a.skillName === 'email-sender')).toBe(true)
  })

  it('returns empty for non-matching input', async () => {
    const actions = await planner.plan('wie geht es dir?', [])
    expect(actions).toHaveLength(0)
  })

  it('respects maxSteps limit', async () => {
    const limited = new AgentPlanner({ maxSteps: 1 })
    const actions = await limited.plan('suche nach Dateien und schick eine Mail', [])
    expect(actions.length).toBeLessThanOrEqual(1)
  })

  it('sets requiresConfirmation=false for low-risk actions', async () => {
    const actions = await planner.plan('suche nach Vela AI', [])
    const search = actions.find(a => a.skillName === 'web-search')
    expect(search?.requiresConfirmation).toBe(false)
  })

  it('sets requiresConfirmation=true for medium-risk actions', async () => {
    const actions = await planner.plan('öffne meine Dokumente', [])
    const file = actions.find(a => a.skillName === 'file-manager')
    expect(file?.requiresConfirmation).toBe(true)
  })
})
