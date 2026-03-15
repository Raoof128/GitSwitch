// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

// --------------- Mocks ---------------

const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn()
}

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => mockWatcher)
  }
}))

vi.mock('./git-service', () => ({
  getStatus: vi.fn().mockResolvedValue({
    current: 'main',
    ahead: 0,
    behind: 0,
    files: [],
    staged: []
  })
}))

import { createRepoWatcher } from './watcher'
import chokidar from 'chokidar'

afterEach(() => {
  vi.restoreAllMocks()
})

// --------------- Tests ---------------

describe('createRepoWatcher', () => {
  it('throws if path exceeds 4096 characters', () => {
    const longPath = '/repo/' + 'a'.repeat(4096)
    expect(() => createRepoWatcher(longPath, vi.fn())).toThrow('Repository path too long')
  })

  it('returns a watcher from chokidar.watch', () => {
    const onStatus = vi.fn()
    const watcher = createRepoWatcher('/repo', onStatus)
    expect(chokidar.watch).toHaveBeenCalledWith('/repo', expect.any(Object))
    expect(watcher).toBe(mockWatcher)
  })

  it('registers expected file system event listeners', () => {
    createRepoWatcher('/repo', vi.fn())
    const registeredEvents = (mockWatcher.on.mock.calls as [string, ...unknown[]][]).map(
      (call) => call[0]
    )
    expect(registeredEvents).toContain('add')
    expect(registeredEvents).toContain('change')
    expect(registeredEvents).toContain('unlink')
    expect(registeredEvents).toContain('error')
  })
})
