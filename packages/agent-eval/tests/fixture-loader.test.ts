import { describe, it, expect } from 'vitest'
import { loadFixtures, isValidFixture } from '../src/fixture-loader'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('fixture-loader', () => {
  it('should validate a correct fixture', () => {
    const fixture = {
      description: 'Test fixture',
      layer: 'layer1',
      input: 'test input',
      expected_tools: ['bash'],
      session_config: { permission: 'ReadOnly' }
    }
    expect(isValidFixture(fixture)).toBe(true)
  })

  it('should reject fixture without description', () => {
    const fixture = {
      layer: 'layer1',
      input: 'test',
      expected_tools: [],
      session_config: {}
    }
    expect(isValidFixture(fixture)).toBe(false)
  })

  it('should reject fixture without expected_tools array', () => {
    const fixture = {
      description: 'Test',
      layer: 'layer1',
      input: 'test',
      session_config: {}
    }
    expect(isValidFixture(fixture)).toBe(false)
  })

  it('should accept fixture with minimal valid structure', () => {
    const fixture = {
      description: 'Minimal fixture',
      layer: 'layer2',
      input: 'do work',
      expected_tools: ['read_file'],
      session_config: { permission: 'ReadOnly' }
    }
    expect(isValidFixture(fixture)).toBe(true)
  })
})