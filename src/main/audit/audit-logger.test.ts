import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => {
  const mod = {
    promises: {
      appendFile: vi.fn(),
      readFile: vi.fn().mockResolvedValue('{"event":"test"}\n'),
      stat: vi.fn().mockResolvedValue({ size: 100 }),
      rename: vi.fn(),
      mkdir: vi.fn()
    },
    existsSync: vi.fn().mockReturnValue(true)
  }
  return { ...mod, default: mod }
})
vi.mock('os', () => {
  const mod = { homedir: () => '/mock-home' }
  return { ...mod, default: mod }
})

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('appends a JSONL entry', async () => {
    const { auditLog } = await import('./audit-logger')
    await auditLog('key.access', 'Loaded key abc')
    const { promises: mockFs } = await import('fs')
    expect(mockFs.appendFile).toHaveBeenCalledOnce()
    const written = vi.mocked(mockFs.appendFile).mock.calls[0][1] as string
    const parsed = JSON.parse(written.trim())
    expect(parsed.event).toBe('key.access')
    expect(parsed.detail).toBe('Loaded key abc')
    expect(parsed.ts).toBeDefined()
  })

  it('includes repoPath when provided', async () => {
    const { auditLog } = await import('./audit-logger')
    await auditLog('push', 'pushed', '/repo')
    const { promises: mockFs } = await import('fs')
    const written = vi.mocked(mockFs.appendFile).mock.calls[0][1] as string
    expect(JSON.parse(written.trim()).repoPath).toBe('/repo')
  })

  it('exports log contents', async () => {
    const { exportAuditLog } = await import('./audit-logger')
    const result = await exportAuditLog()
    expect(result).toContain('test')
  })

  it('truncates detail to 500 chars', async () => {
    const { auditLog } = await import('./audit-logger')
    const longDetail = 'x'.repeat(1000)
    await auditLog('key.save', longDetail)
    const { promises: mockFs } = await import('fs')
    const written = vi.mocked(mockFs.appendFile).mock.calls[0][1] as string
    expect(JSON.parse(written.trim()).detail.length).toBe(500)
  })
})
