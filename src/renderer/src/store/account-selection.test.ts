import { describe, expect, it } from 'vitest'
import { getEffectiveAccountId } from './account-selection'

describe('getEffectiveAccountId', () => {
  it('prefers the explicitly selected account', () => {
    expect(getEffectiveAccountId('selected-id', 'default-id')).toBe('selected-id')
  })

  it('falls back to the default account when nothing is selected', () => {
    expect(getEffectiveAccountId(null, 'default-id')).toBe('default-id')
  })

  it('returns null when no account is available', () => {
    expect(getEffectiveAccountId(null, null)).toBeNull()
  })
})
