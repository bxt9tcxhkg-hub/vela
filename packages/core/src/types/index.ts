// Core domain types for Vela

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface Conversation {
  id: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type TrustLevel = 'cautious' | 'balanced' | 'autonomous'
export type ActionStatus = 'approved' | 'pending_confirmation' | 'blocked' | 'rejected'

export interface PlannedAction {
  id: string
  skillName: string
  params: Record<string, unknown>
  riskLevel: RiskLevel
  description: string
  requiresConfirmation: boolean
}

export interface GuardrailDecision {
  actionId: string
  status: ActionStatus
  reason?: string
  riskLevel: RiskLevel
}

export interface AuditEntry {
  id: string
  timestamp: Date
  actionId: string
  skillName: string
  params: Record<string, unknown>
  decision: GuardrailDecision
  result?: unknown
  executionMs?: number
  checksum: string
}

export interface SkillManifest {
  name: string
  version: string
  description: string
  permissions: SkillPermission[]
  inputs: SkillInput[]
  guardrails: SkillGuardrails
}

export type SkillPermission = 'network:read' | 'network:write' | 'fs:read' | 'fs:write' | 'shell' | 'email:read' | 'email:write' | 'calendar:read' | 'calendar:write'

export interface SkillInput {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  required: boolean
  description?: string
}

export interface SkillGuardrails {
  confirmBeforeExecute: boolean
  maxTokensOutput?: number
  allowedDomains?: string[]
  riskLevel?: RiskLevel
}

export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface CompletionResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'done'
  content?: string
  toolCall?: {
    name: string
    params: Record<string, unknown>
  }
}
