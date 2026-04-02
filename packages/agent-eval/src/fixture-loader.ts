import * as fs from 'fs/promises'
import * as path from 'path'
import type { Fixture } from './types'

export function isValidFixture(f: unknown): f is Fixture {
  if (!f || typeof f !== 'object') return false
  const obj = f as Record<string, unknown>
  return (
    typeof obj.description === 'string' &&
    typeof obj.layer === 'string' &&
    typeof obj.input === 'string' &&
    Array.isArray(obj.expected_tools) &&
    typeof obj.session_config === 'object'
  )
}

export async function loadFixtures(dir: string): Promise<Fixture[]> {
  const fixtures: Fixture[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const nested = await loadFixtures(fullPath)
        fixtures.push(...nested)
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        const fixture = JSON.parse(content)
        if (isValidFixture(fixture)) {
          fixtures.push(fixture)
        }
      }
    }
  } catch {
    // Directory doesn't exist or is empty
  }

  return fixtures
}