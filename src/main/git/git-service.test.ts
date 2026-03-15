// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

// --------------- Mocks ---------------

vi.mock('simple-git', () => {
  const mockGit: Record<string, unknown> = {}
  return {
    simpleGit: vi.fn(() => mockGit),
    __mockGit: mockGit
  }
})

vi.mock('../secure/key-manager', () => ({
  loadKey: vi.fn().mockResolvedValue('mock-private-key'),
  getSettings: vi.fn(() => ({
    diffLimitKb: 80,
    diffLimitLines: 400
  }))
}))

vi.mock('./commit-generator', () => ({
  generateOfflineCommitMessage: vi.fn(() => ({ title: 'chore: update files' }))
}))

import { simpleGit } from 'simple-git'
import { getStatus, listBranches, getDiff, getStagedDiff, getRemotes } from './git-service'

const setupMockGit = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const mock: Record<string, unknown> = { ...overrides }
  ;(simpleGit as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  return mock
}

afterEach(() => {
  vi.restoreAllMocks()
})

// --------------- getStatus ---------------

describe('getStatus', () => {
  it('returns status with files mapped correctly', async () => {
    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `file${i}.ts`,
      index: 'M',
      working_dir: ' '
    }))
    setupMockGit({
      status: vi.fn().mockResolvedValue({
        current: 'main',
        ahead: 0,
        behind: 1,
        files,
        staged: ['file0.ts']
      })
    })

    const result = await getStatus('/repo')
    expect(result.current).toBe('main')
    expect(result.ahead).toBe(0)
    expect(result.behind).toBe(1)
    expect(result.files).toHaveLength(5)
    expect(result.truncated).toBe(false)
  })

  it('caps files at 1000 and sets truncated true', async () => {
    const files = Array.from({ length: 1200 }, (_, i) => ({
      path: `file${i}.ts`,
      index: 'M',
      working_dir: ' '
    }))
    setupMockGit({
      status: vi.fn().mockResolvedValue({
        current: 'main',
        ahead: 0,
        behind: 0,
        files,
        staged: []
      })
    })

    const result = await getStatus('/repo')
    expect(result.files).toHaveLength(1000)
    expect(result.truncated).toBe(true)
  })
})

// --------------- listBranches ---------------

describe('listBranches', () => {
  it('returns branches capped at 500', async () => {
    const all = Array.from({ length: 600 }, (_, i) => `branch-${i}`)
    setupMockGit({
      branch: vi.fn().mockResolvedValue({
        all,
        current: 'branch-0'
      })
    })

    const result = await listBranches('/repo')
    expect(result).toHaveLength(500)
    expect(result[0].name).toBe('branch-0')
    expect(result[0].current).toBe(true)
    expect(result[1].current).toBe(false)
  })

  it('translates git error messages on failure', async () => {
    setupMockGit({
      branch: vi.fn().mockRejectedValue(new Error('fatal: not a git repository'))
    })

    await expect(listBranches('/repo')).rejects.toThrow(
      'This folder is not a Git repository. Run "git init" to create one.'
    )
  })
})

// --------------- getDiff ---------------

describe('getDiff', () => {
  it('returns diff content when within size limits', async () => {
    setupMockGit({
      diff: vi.fn().mockImplementation((args: string[]) => {
        if (args.includes('--shortstat')) {
          return Promise.resolve(' 1 file changed, 10 insertions(+), 5 deletions(-)')
        }
        return Promise.resolve('diff --git a/file.ts b/file.ts\n+hello')
      })
    })

    const result = await getDiff('/repo', 'unstaged')
    expect(result).toContain('+hello')
  })

  it('returns DIFF TOO LARGE when shortstat exceeds line limit', async () => {
    setupMockGit({
      diff: vi.fn().mockImplementation((args: string[]) => {
        if (args.includes('--shortstat')) {
          return Promise.resolve(' 5 files changed, 500 insertions(+), 200 deletions(-)')
        }
        return Promise.resolve('diff content')
      })
    })

    const result = await getDiff('/repo', 'unstaged')
    expect(result).toContain('[DIFF TOO LARGE]')
  })
})

// --------------- getStagedDiff ---------------

describe('getStagedDiff', () => {
  it('returns staged diff content when within size limits', async () => {
    setupMockGit({
      diff: vi.fn().mockImplementation((args: string[]) => {
        if (args.includes('--shortstat')) {
          return Promise.resolve(' 1 file changed, 5 insertions(+)')
        }
        return Promise.resolve('staged diff content')
      })
    })

    const result = await getStagedDiff('/repo')
    expect(result).toBe('staged diff content')
  })

  it('returns DIFF TOO LARGE when staged diff exceeds line limit', async () => {
    setupMockGit({
      diff: vi.fn().mockImplementation((args: string[]) => {
        if (args.includes('--shortstat')) {
          return Promise.resolve(' 10 files changed, 999 insertions(+), 500 deletions(-)')
        }
        return Promise.resolve('large staged diff')
      })
    })

    const result = await getStagedDiff('/repo')
    expect(result).toContain('[DIFF TOO LARGE]')
  })
})

// --------------- getRemotes (error translation) ---------------

describe('getRemotes', () => {
  it('translates Permission denied error', async () => {
    setupMockGit({
      getRemotes: vi.fn().mockRejectedValue(new Error('Permission denied (publickey)'))
    })

    await expect(getRemotes('/repo')).rejects.toThrow(
      'SSH key not authorized. Please ensure your SSH key is added to your GitHub/GitLab account.'
    )
  })
})
