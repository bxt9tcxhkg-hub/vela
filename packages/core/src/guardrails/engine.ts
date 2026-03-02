// Guardrail Engine – enforces policy before any action executes

import type { PlannedAction, GuardrailDecision, TrustLevel, RiskLevel } from '../types/index.js'

const TRUST_LEVEL_POLICY: Record<TrustLevel, Record<RiskLevel, 'auto' | 'confirm' | 'block'>> = {
  cautious: {
    low: 'confirm',
    medium: 'confirm',
    high: 'confirm',
    critical: 'block',
  },
  balanced: {
    low: 'auto',
    medium: 'confirm',
    high: 'confirm',
    critical: 'block',
  },
  autonomous: {
    low: 'auto',
    medium: 'auto',
    high: 'confirm',
    critical: 'block',
  },
}

// These actions are ALWAYS blocked regardless of trust level
const HARDCODED_BLOCKS = new Set(['shell.exec_arbitrary', 'fs.delete_system', 'network.exfiltrate'])

export class GuardrailEngine {
  constructor(private trustLevel: TrustLevel = 'cautious') {}

  evaluate(action: PlannedAction): GuardrailDecision {
    // Hard block – no override possible
    if (HARDCODED_BLOCKS.has(action.skillName)) {
      return {
        actionId: action.id,
        status: 'blocked',
        reason: `Action '${action.skillName}' is permanently blocked by system policy.`,
        riskLevel: 'critical',
      }
    }

    const policy = TRUST_LEVEL_POLICY[this.trustLevel][action.riskLevel]

    if (policy === 'block') {
      return {
        actionId: action.id,
        status: 'blocked',
        reason: `Risk level '${action.riskLevel}' is blocked at trust level '${this.trustLevel}'.`,
        riskLevel: action.riskLevel,
      }
    }

    if (policy === 'confirm') {
      return {
        actionId: action.id,
        status: 'pending_confirmation',
        riskLevel: action.riskLevel,
      }
    }

    return {
      actionId: action.id,
      status: 'approved',
      riskLevel: action.riskLevel,
    }
  }

  setTrustLevel(level: TrustLevel): void {
    this.trustLevel = level
  }
}
