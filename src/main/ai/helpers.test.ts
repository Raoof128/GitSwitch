// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseAiResponse, redactSecrets } from './helpers'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseAiResponse', () => {
  it('parses valid JSON responses', () => {
    expect(
      parseAiResponse('{"title":"fix(api): handle timeout","description":"Add retry guard."}')
    ).toEqual({
      title: 'fix(api): handle timeout',
      body: 'Add retry guard.'
    })
  })

  it('parses fenced JSON and legacy body fields', () => {
    const response =
      '```json\n{"title":"feat(ui): add sync badge","body":"Expose fetch status."}\n```'

    expect(parseAiResponse(response)).toEqual({
      title: 'feat(ui): add sync badge',
      body: 'Expose fetch status.'
    })
  })

  it('falls back to regex extraction when JSON is malformed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const malformed =
      '{"title":"fix(store): recover account fallback","description":"Preserve sync after restart"'

    expect(parseAiResponse(malformed)).toEqual({
      title: 'fix(store): recover account fallback',
      body: 'Preserve sync after restart'
    })
  })
})

describe('redactSecrets', () => {
  it('redacts common credentials from text', () => {
    const input = [
      'ghp_1234567890abcdef',
      'github_pat_abcdefghijklmnopqrstuvwxyz_123456',
      'glpat-abcdefghijklmnopqrstuvwxyz123456',
      'AIzaSyA1234567890abcdefghi',
      'password=my-secret',
      'secret = another-secret'
    ].join('\n')

    expect(redactSecrets(input)).not.toContain('ghp_1234567890abcdef')
    expect(redactSecrets(input)).not.toContain('github_pat_abcdefghijklmnopqrstuvwxyz_123456')
    expect(redactSecrets(input)).not.toContain('glpat-abcdefghijklmnopqrstuvwxyz123456')
    expect(redactSecrets(input)).not.toContain('AIzaSyA1234567890abcdefghi')
    expect(redactSecrets(input)).toContain('password=[REDACTED]')
    expect(redactSecrets(input)).toContain('secret=[REDACTED]')
  })

  it('redacts email addresses', () => {
    const input = 'Author: user@example.com committed a change'
    const result = redactSecrets(input)
    expect(result).not.toContain('user@example.com')
    expect(result).toContain('[EMAIL-REDACTED]')
  })

  it('redacts URLs', () => {
    const input = 'Fetching from https://internal.company.com/api/v2/resource'
    const result = redactSecrets(input)
    expect(result).not.toContain('https://internal.company.com')
    expect(result).toContain('[URL-REDACTED]')
  })

  it('redacts AWS access keys', () => {
    const input = 'aws_access_key_id = AKIAIOSFODNN7EXAMPLE'
    const result = redactSecrets(input)
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(result).toContain('[REDACTED]')
  })

  it('redacts token="value" patterns', () => {
    const input = 'token="abc123secret"'
    const result = redactSecrets(input)
    expect(result).not.toContain('abc123secret')
    expect(result).toContain('token=[REDACTED]')
  })
})
