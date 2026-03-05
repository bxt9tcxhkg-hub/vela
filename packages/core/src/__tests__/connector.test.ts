import { describe, it, expect, vi } from 'vitest'
import { BackendConnector } from '../ai/connector.js'

describe('BackendConnector', () => {
  it('defaults to local mode', () => {
    const c = new BackendConnector()
    expect(c.getMode()).toBe('local')
    expect(c.isLocal()).toBe(true)
    expect(c.isCloud()).toBe(false)
  })

  it('switches to cloud when confirmed and provider is set', async () => {
    const mockProvider = {
      name: 'mock-cloud',
      complete: vi.fn(),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    }
    const c = new BackendConnector({ onCloudWarning: async () => true })
    c.setCloudProvider(mockProvider)
    const ok = await c.setMode('cloud')
    expect(ok).toBe(true)
    expect(c.getMode()).toBe('cloud')
  })

  it('stays local when cloud warning is rejected', async () => {
    const c = new BackendConnector({ onCloudWarning: async () => false })
    const ok = await c.setMode('cloud')
    expect(ok).toBe(false)
    expect(c.getMode()).toBe('local')
  })

  it('throws when switching to cloud without provider', async () => {
    const c = new BackendConnector({ onCloudWarning: async () => true })
    await expect(c.setMode('cloud')).rejects.toThrow('Kein Cloud-Provider konfiguriert')
  })

  it('no-ops when setting same mode', async () => {
    const c = new BackendConnector()
    const ok = await c.setMode('local')
    expect(ok).toBe(true)
  })
})
