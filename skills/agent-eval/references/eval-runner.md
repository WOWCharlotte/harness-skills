# Eval Runner — Reference Design

## Overview

The eval runner is the core component that orchestrates evaluation. It loads fixtures, runs checks, collects metrics, and produces output.

## Core Interface

```typescript
interface EvalConfig {
  harness_path: string
  fixtures_dir: string
  config: {
    timeout_per_test_ms: number
    max_concurrent_tests: number
    token_budget_per_session: number
    enable_performance_metrics: boolean
  }
  output: OutputConfig
}

interface EvalResult {
  passed: boolean
  summary: Summary
  checks: Check[]
  failed_checks: FailedCheck[]
  performance_metrics: PerformanceMetrics
  detailed_log: string
}
```

## EvalRunner Class

```typescript
class EvalRunner {
  private config: EvalConfig
  private harness: Harness
  private results: EvalResult

  constructor(config: EvalConfig) {
    this.config = config
    this.results = {
      passed: true,
      summary: { functionality: { passed: 0, failed: 0 },
                 security: { passed: 0, failed: 0 },
                 performance: { passed: 0, failed: 0 } },
      checks: [],
      failed_checks: [],
      performance_metrics: {},
      detailed_log: ''
    }
  }

  async evaluate(): Promise<EvalResult> {
    this.log('=== Agent Eval Report ===')
    this.log(`Timestamp: ${new Date().toISOString()}`)
    this.log(`Harness: ${this.config.harness_path}`)

    // Load fixtures
    fixtures = await this.load_fixtures()
    this.log(`Fixtures: ${fixtures.length} loaded`)

    // Phase 1: Functionality
    await this.evaluate_functionality(fixtures)

    // Phase 2: Security
    await this.evaluate_security()

    // Phase 3: Performance
    if (this.config.config.enable_performance_metrics) {
      await this.evaluate_performance()
    }

    // Generate summary
    this.generate_summary()

    // Write output
    await this.write_output()

    return this.results
  }

  private async load_fixtures(): Promise<Fixture[]> {
    // Load all fixtures from fixtures_dir
    // Filter by layer if specified
    return fixtures
  }

  private async evaluate_functionality(fixtures: Fixture[]) {
    this.log('\n[Functionality]')

    for (fixture of fixtures) {
      result = await this.run_fixture(fixture)
      this.record_check(result)
      this.log_check(result)
    }
  }

  private async run_fixture(fixture: Fixture): Promise<CheckResult> {
    start = Date.now()

    try {
      session = this.harness.create_session(fixture.session_config)
      this.harness.run(session, fixture.input)

      actual_tools = session.tool_calls.map(tc => tc.name)
      expected_tools = fixture.expected_tools

      if (arrays_equal(actual_tools, expected_tools)) {
        return { passed: true, duration_ms: Date.now() - start }
      } else {
        return {
          passed: false,
          error: `Expected ${expected_tools}, got ${actual_tools}`,
          duration_ms: Date.now() - start
        }
      }
    } catch (e) {
      return { passed: false, error: e.message, duration_ms: Date.now() - start }
    }
  }

  private async evaluate_security() {
    this.log('\n[Security]')

    checks = this.get_security_checks()

    for (check of checks) {
      result = await this.run_security_check(check)
      this.record_check(result)
      this.log_check(result)
    }
  }

  private async evaluate_performance() {
    this.log('\n[Performance]')

    metrics = await this.collect_performance_metrics()

    for (metric of metrics) {
      this.record_metric(metric)
      this.log_metric(metric)
    }
  }

  private record_check(result: CheckResult) {
    this.results.checks.push(result)
    if (!result.passed) {
      this.results.passed = false
      this.results.failed_checks.push(result)
    }
  }

  private generate_summary() {
    total_passed = this.results.checks.filter(c => c.passed).length
    total_failed = this.results.checks.filter(c => !c.passed).length

    this.results.summary.total = {
      passed: total_passed,
      failed: total_failed,
      total: this.results.checks.length
    }
  }
}
```

## Running the Runner

```typescript
const runner = new EvalRunner({
  harness_path: './my-harness',
  fixtures_dir: './fixtures/agent-tdd',
  config: {
    timeout_per_test_ms: 30000,
    max_concurrent_tests: 4,
    token_budget_per_session: 5000,
    enable_performance_metrics: true
  },
  output: {
    log_level: 'normal',
    json_file: 'eval-result.json'
  }
})

const result = await runner.evaluate()

if (!result.passed) {
  process.exit(1)
}
```

## Fixture Loading

```typescript
async function load_fixtures(dir: string): Promise<Fixture[]> {
  const files = await glob(`${dir}/**/*.json`)
  const fixtures = []

  for (const file of files) {
    const content = await read_file(file)
    const fixture = JSON.parse(content)

    // Validate fixture format
    if (is_valid_fixture(fixture)) {
      fixtures.push(fixture)
    }
  }

  return fixtures
}

function is_valid_fixture(f: any): boolean {
  return (
    typeof f.description === 'string' &&
    typeof f.layer === 'string' &&
    typeof f.input === 'string' &&
    Array.isArray(f.expected_tools) &&
    typeof f.session_config === 'object'
  )
}
```

## Error Handling

```typescript
async function safe_evaluate(runner: EvalRunner, fixture: Fixture): Promise<CheckResult> {
  try {
    return await runner.run_fixture(fixture)
  } catch (e) {
    return {
      passed: false,
      error: `Unexpected error: ${e.message}`,
      duration_ms: 0
    }
  }
}
```

## Output Writing

```typescript
async function write_output(results: EvalResult, config: OutputConfig) {
  // Write JSON
  if (config.json_file) {
    await write_file(config.json_file, JSON.stringify(results, null, 2))
  }

  // Write detailed log
  if (config.log_file) {
    await write_file(config.log_file, results.detailed_log)
  } else {
    console.log(results.detailed_log)
  }
}
```
