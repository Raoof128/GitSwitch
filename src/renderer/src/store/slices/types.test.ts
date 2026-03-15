// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  getRepoName,
  bumpRecent,
  updateRecentBranches,
  normalizeErrorMessage,
  getActionSuggestion,
  MAX_RECENT_BRANCHES
} from './types'

describe('getRepoName', () => {
  it('returns last segment of Unix path', () => {
    expect(getRepoName('/Users/foo/project')).toBe('project')
  })

  it('returns last segment of Windows path', () => {
    expect(getRepoName('C:\\Users\\foo\\project')).toBe('project')
  })

  it('returns the full string when no separators', () => {
    expect(getRepoName('project')).toBe('project')
  })
})

describe('bumpRecent', () => {
  it('adds new item at front and respects limit', () => {
    expect(bumpRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b'])
  })

  it('deduplicates and moves existing item to front', () => {
    expect(bumpRecent(['a', 'b', 'c'], 'b', 3)).toEqual(['b', 'a', 'c'])
  })

  it('works with empty list', () => {
    expect(bumpRecent([], 'x', 5)).toEqual(['x'])
  })
})

describe('updateRecentBranches', () => {
  it('creates entry for new repo', () => {
    const result = updateRecentBranches({}, '/repo', 'main')
    expect(result).toEqual({ '/repo': ['main'] })
  })

  it('bumps branch for existing repo', () => {
    const current = { '/repo': ['develop', 'feature'] }
    const result = updateRecentBranches(current, '/repo', 'main')
    expect(result['/repo'][0]).toBe('main')
    expect(result['/repo']).toHaveLength(3)
  })

  it('respects MAX_RECENT_BRANCHES limit', () => {
    const branches = Array.from({ length: MAX_RECENT_BRANCHES }, (_, i) => `branch-${i}`)
    const current = { '/repo': branches }
    const result = updateRecentBranches(current, '/repo', 'new-branch')
    expect(result['/repo']).toHaveLength(MAX_RECENT_BRANCHES)
    expect(result['/repo'][0]).toBe('new-branch')
  })
})

describe('normalizeErrorMessage', () => {
  it('returns error message from Error instance', () => {
    expect(normalizeErrorMessage(new Error('test'), 'fallback')).toBe('test')
  })

  it('returns fallback for non-Error values', () => {
    expect(normalizeErrorMessage('not an error', 'fallback')).toBe('fallback')
  })

  it('returns fallback for null', () => {
    expect(normalizeErrorMessage(null, 'fallback')).toBe('fallback')
  })
})

describe('getActionSuggestion', () => {
  it('returns SSH suggestion for Permission denied', () => {
    const result = getActionSuggestion('Permission denied (publickey)')
    expect(result).toContain('SSH')
  })

  it('returns pull suggestion for behind the remote', () => {
    const result = getActionSuggestion('Push failed. Your branch may be behind the remote.')
    expect(result).toContain('Pull')
  })

  it('returns git repo suggestion for not a git repository', () => {
    const result = getActionSuggestion('This folder is not a git repository')
    expect(result).toContain('.git')
  })

  it('returns fallback when no match', () => {
    const result = getActionSuggestion('some unknown message', 'default hint')
    expect(result).toBe('default hint')
  })

  it('returns undefined when no match and no fallback', () => {
    expect(getActionSuggestion('completely unique xyz')).toBeUndefined()
  })
})
