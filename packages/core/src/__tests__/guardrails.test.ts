import { describe, it, expect } from 'vitest'
import { GuardrailEngine } from '../guardrails/engine.js'
import type { PlannedAction } from '../types/index.js'

function action(overrides: Partial<PlannedAction> & { skillName: string; riskLevel: PlannedAction['riskLevel'] }): PlannedAction {
  return { id: '1', description: 'test', requiresConfirmation: false, params: {}, ...overrides }
}

describe('GuardrailEngine', () => {
  it('blocks hardcoded dangerous actions regardless of trust level', () => {
    const engine = new GuardrailEngine('autonomous')
    const result = engine.evaluate(action({ skillName: 'shell.exec_arbitrary', riskLevel: 'low' }))
    expect(result.status).toBe('blocked')
  })

  it('auto-approves low-risk action in autonomous mode', () => {
    const engine = new GuardrailEngine('autonomous')
    const result = engine.evaluate(action({ skillName: 'web.search', riskLevel: 'low' }))
    expect(result.status).toBe('approved')
  })

  it('requires confirmation for medium-risk in balanced mode', () => {
    const engine = new GuardrailEngine('balanced')
    const result = engine.evaluate(action({ skillName: 'email.send', riskLevel: 'medium' }))
    expect(result.status).toBe('pending_confirmation')
  })

  it('requires confirmation for low-risk in cautious mode', () => {
    const engine = new GuardrailEngine('cautious')
    const result = engine.evaluate(action({ skillName: 'web.search', riskLevel: 'low' }))
    expect(result.status).toBe('pending_confirmation')
  })

  it('blocks critical-risk actions in all trust levels', () => {
    for (const level of ['cautious', 'balanced', 'autonomous'] as const) {
      const engine = new GuardrailEngine(level)
      const result = engine.evaluate(action({ skillName: 'some.action', riskLevel: 'critical' }))
      expect(result.status).toBe('blocked')
    }
  })
})
