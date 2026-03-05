import { describe, it, expect } from 'vitest'
import { AuditLogger } from '../audit/logger.js'

const dummyDecision = { actionId: '1', status: 'approved' as const, riskLevel: 'low' as const }

describe('AuditLogger', () => {
  it('creates an entry with id, timestamp, checksum', () => {
    const logger = new AuditLogger('test-key')
    const entry = logger.log({ actionId: '1', skillName: 'web-search', params: {}, decision: dummyDecision })
    expect(entry.id).toBeDefined()
    expect(entry.timestamp).toBeInstanceOf(Date)
    expect(entry.checksum).toBeDefined()
    expect(entry.checksum.length).toBeGreaterThan(10)
  })

  it('verifies a valid entry', () => {
    const logger = new AuditLogger('test-key')
    const entry = logger.log({ actionId: '1', skillName: 'web-search', params: {}, decision: dummyDecision })
    expect(logger.verify(entry)).toBe(true)
  })

  it('rejects a tampered entry', () => {
    const logger = new AuditLogger('test-key')
    const entry = logger.log({ actionId: '1', skillName: 'web-search', params: {}, decision: dummyDecision })
    const tampered = { ...entry, skillName: 'shell.exec_arbitrary' }
    expect(logger.verify(tampered)).toBe(false)
  })

  it('accumulates entries in getAll()', () => {
    const logger = new AuditLogger('test-key')
    logger.log({ actionId: '1', skillName: 'a', params: {}, decision: dummyDecision })
    logger.log({ actionId: '2', skillName: 'b', params: {}, decision: dummyDecision })
    expect(logger.getAll()).toHaveLength(2)
  })

  it('different device keys produce different checksums', () => {
    const l1 = new AuditLogger('key-1')
    const l2 = new AuditLogger('key-2')
    const e1 = l1.log({ actionId: '1', skillName: 'x', params: {}, decision: dummyDecision })
    const e2 = l2.log({ actionId: '1', skillName: 'x', params: {}, decision: dummyDecision })
    expect(e1.checksum).not.toBe(e2.checksum)
  })
})
