import { describe, it, expect } from 'vitest'
import { getSecurityCheckIds } from '../src/security-checks'

describe('security-checks', () => {
  it('should have all required check IDs', () => {
    const ids = getSecurityCheckIds()
    expect(ids).toContain('sec-perm-001')
    expect(ids).toContain('sec-perm-004')
    expect(ids).toContain('sec-esc-001')
    expect(ids).toContain('sec-esc-002')
    expect(ids).toContain('sec-iso-001')
    expect(ids).toContain('sec-iso-002')
    expect(ids.length).toBe(8)
  })
})