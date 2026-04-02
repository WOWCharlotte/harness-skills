import { describe, it, expect } from 'vitest'
import { EvalRunner } from '../src/eval-runner'

describe('EvalRunner', () => {
  it('should be instantiable', () => {
    const runner = new EvalRunner({
      harness: {} as any,
      fixtures_dir: './fixtures'
    })
    expect(runner).toBeDefined()
  })
})
