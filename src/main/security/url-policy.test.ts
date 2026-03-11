// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from './url-policy'

describe('isAllowedExternalUrl', () => {
  it('allows trusted GitHub and GitLab hosts over HTTPS', () => {
    expect(isAllowedExternalUrl('https://github.com/Raoof128/GitSwitch')).toBe(true)
    expect(isAllowedExternalUrl('https://docs.github.com/en')).toBe(true)
    expect(isAllowedExternalUrl('https://gitlab.com/groups/example/-/projects')).toBe(true)
    expect(isAllowedExternalUrl('https://about.gitlab.com/releases')).toBe(true)
  })

  it('rejects lookalike, insecure, and malformed URLs', () => {
    expect(isAllowedExternalUrl('https://evilgithub.com/Raoof128/GitSwitch')).toBe(false)
    expect(isAllowedExternalUrl('https://mygitlab.com/example/project')).toBe(false)
    expect(isAllowedExternalUrl('http://github.com/Raoof128/GitSwitch')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('not-a-url')).toBe(false)
  })
})
