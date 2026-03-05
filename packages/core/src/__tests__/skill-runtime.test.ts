import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SkillRuntime } from '../skills/runtime.js'
import type { SkillManifest, PlannedAction } from '../types/index.js'

// Mock permission manager – auto-grant everything
vi.mock('../skills/permissions.js', () => ({
  permissionManager: {
    request: vi.fn().mockResolvedValue(true),
  },
}))

// Mock audit logger
vi.mock('../audit/logger.js', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    log: vi.fn(),
  })),
}))

const dummyManifest: SkillManifest = {
  name: 'test-skill',
  version: '1.0.0',
  description: 'Test skill',
  permissions: [],
  inputs: [],
  guardrails: { maxExecutionsPerHour: 100 },
}

const dummyAction: PlannedAction = {
  id: 'act-1',
  skillName: 'test-skill',
  params: { query: 'hello' },
  riskLevel: 'low',
  description: 'Test action',
  requiresConfirmation: false,
}

describe('SkillRuntime', () => {
  let runtime: SkillRuntime

  beforeEach(() => {
    runtime = new SkillRuntime()
  })

  it('registers a skill and lists it', () => {
    runtime.register(dummyManifest, { execute: vi.fn() })
    expect(runtime.list()).toHaveLength(1)
    expect(runtime.list()[0].name).toBe('test-skill')
  })

  it('executes a registered skill and returns output', async () => {
    const executor = { execute: vi.fn().mockResolvedValue({ success: true, output: 'result' }) }
    runtime.register(dummyManifest, executor)
    const result = await runtime.execute(dummyAction, 'device-key')
    expect(result.success).toBe(true)
    expect(result.output).toBe('result')
  })

  it('returns error when skill is not registered', async () => {
    const result = await runtime.execute({ ...dummyAction, skillName: 'unknown-skill' }, 'device-key')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Unbekannter Skill/i)
  })

  it('returns error when executor throws', async () => {
    const executor = { execute: vi.fn().mockRejectedValue(new Error('Boom')) }
    runtime.register(dummyManifest, executor)
    const result = await runtime.execute(dummyAction, 'device-key')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Boom/)
  })

  it('loadManifest registers a stub executor', () => {
    runtime.loadManifest(dummyManifest)
    const skill = runtime.get('test-skill')
    expect(skill).toBeDefined()
    expect(skill!.manifest.name).toBe('test-skill')
  })

  it('throws on invalid manifest (missing name)', () => {
    expect(() => runtime.register({ ...dummyManifest, name: '' }, { execute: vi.fn() })).toThrow()
  })

  it('throws on invalid manifest (missing version)', () => {
    expect(() => runtime.register({ ...dummyManifest, version: '' }, { execute: vi.fn() })).toThrow()
  })

  it('includes durationMs in successful result', async () => {
    const executor = { execute: vi.fn().mockResolvedValue({ success: true }) }
    runtime.register(dummyManifest, executor)
    const result = await runtime.execute(dummyAction, 'device-key')
    expect(result.durationMs).toBeTypeOf('number')
  })
})
