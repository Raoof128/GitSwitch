// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { detectGitProvider, parseGitHubRepo, parseGitLabProjectPath } from './git-utils'

describe('git-utils', () => {
  it('detects supported git providers from remotes', () => {
    expect(detectGitProvider('git@github.com:Raoof128/GitSwitch.git')).toBe('github')
    expect(detectGitProvider('https://gitlab.com/group/project.git')).toBe('gitlab')
    expect(detectGitProvider('https://example.com/group/project.git')).toBe('unknown')
  })

  it('parses GitHub SSH and HTTPS remotes', () => {
    expect(parseGitHubRepo('git@github.com:Raoof128/GitSwitch.git')).toEqual({
      owner: 'Raoof128',
      repo: 'GitSwitch'
    })
    expect(parseGitHubRepo('https://github.com/Raoof128/GitSwitch.git')).toEqual({
      owner: 'Raoof128',
      repo: 'GitSwitch'
    })
    expect(parseGitHubRepo('https://example.com/Raoof128/GitSwitch.git')).toBeNull()
  })

  it('parses GitLab SSH and HTTPS remotes', () => {
    expect(parseGitLabProjectPath('git@gitlab.com:group/project.git')).toBe('group/project')
    expect(parseGitLabProjectPath('https://gitlab.com/group/project.git')).toBe('group/project')
    expect(parseGitLabProjectPath('https://example.com/group/project.git')).toBeNull()
  })
})
