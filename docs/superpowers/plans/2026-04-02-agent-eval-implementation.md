# Agent Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete `agent-eval` skill under `skills/agent-eval/` — a harness verification skill that evaluates functionality, security, and performance using agent-tdd fixtures and standalone checks.

**Architecture:** Hybrid evaluation approach: reuses agent-tdd fixtures for functionality testing, runs standalone security checks for permission boundaries, and collects performance metrics during execution. Output is detailed logs plus CI-compatible pass/fail JSON.

**Tech Stack:** Markdown documentation, YAML frontmatter, TypeScript pseudocode for eval logic, JSON for fixture/result formats.

---

## File Structure

```
skills/agent-eval/
├── SKILL.md                           ← Entry point (name: agent-eval)
├── README.md                           ← Full evaluation guide
├── specs/
│   ├── evaluation-dimensions.md    ← Functionality/Security/Performance details
│   └── output-formats.md           ← Detailed log + CI JSON formats
└── references/
    ├── eval-runner.md              ← Evaluation runner design and pseudocode
    ├── security-checks.md          ← Security check清单
    └── performance-metrics.md      ← Performance指标定义
```

---

## Task 1: Create Directory Structure and SKILL.md

**Files:**
- Create: `skills/agent-eval/SKILL.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p skills/agent-eval/specs skills/agent-eval/references
ls -R skills/agent-eval/
```

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: agent-eval
description: Use when verifying that an Agent harness implementation is correct, complete, and secure. Evaluates functionality (via agent-tdd fixtures), security (permission boundaries, session isolation), and performance (token usage, latency). Outputs detailed logs and CI-compatible pass/fail results.
---

# Agent Eval

A skill for evaluating whether a harness implementation is correct, complete, and secure.

## When to Use

**You should use this skill when:**
- Completed implementing a harness and want to verify correctness
- Evaluating an existing harness against the 4-layer architecture
- Running CI verification on a harness implementation
- Pre-deployment validation

**Prerequisite:** Complete harness skill first (architecture), then agent-tdd skill (testing methodology).

## Core Principle

**Evaluation has three dimensions, in priority order:**

| Priority | Dimension | Verification Method |
|----------|-----------|-------------------|
| 1 | Functionality | Black-box: run harness with fixture inputs, verify outputs |
| 2 | Security | White-box: check internal state (permissions, session isolation) |
| 3 | Performance | Metrics: token usage, latency, resource leaks |

## Quick Start

1. Read `README.md` for the full evaluation guide
2. Configure evaluation: provide harness path, fixture directory, thresholds
3. Run evaluation: `eval-runner.evaluate(harness_path, config)`
4. Review detailed logs + pass/fail summary

## Skill Structure

```
specs/
  evaluation-dimensions.md    ← 3 dimensions detailed
  output-formats.md         ← Log + CI formats
references/
  eval-runner.md           ← Runner design
  security-checks.md       ← Security check清单
  performance-metrics.md   ← Performance指标
```

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| `harness` | What to build (architecture) |
| `agent-tdd` | How to test during development |
| `agent-eval` | How to verify after implementation |

agent-eval reads agent-tdd fixtures directly — no duplication.
```

- [ ] **Step 3: Verify file exists**

```bash
ls -la skills/agent-eval/SKILL.md
cat skills/agent-eval/SKILL.md | head -5
```

- [ ] **Step 4: Commit**

```bash
git add skills/agent-eval/
git commit -m "feat: create agent-eval skill directory and SKILL.md entry point"
```

---

## Task 2: Write README.md

**Files:**
- Create: `skills/agent-eval/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# Agent Eval — Harness Verification Skill

## Overview

A complete evaluation methodology for verifying harness implementations. Works with agent-tdd fixtures to verify functionality, runs standalone security checks, and collects performance metrics.

## Evaluation Flow

```
harness implementation
    ↓
agent-eval loads fixtures + config
    ↓
┌─────────────────────────────────────┐
│ 1. Functionality (Priority 1)       │
│    - Run agent-tdd fixtures         │
│    - Black-box verify outputs      │
├─────────────────────────────────────┤
│ 2. Security (Priority 2)            │
│    - Permission boundary checks     │
│    - Session isolation checks       │
│    - White-box internal state      │
├─────────────────────────────────────┤
│ 3. Performance (Priority 3)          │
│    - Token usage metrics            │
│    - Latency measurements           │
│    - Resource leak detection        │
└─────────────────────────────────────┘
    ↓
Detailed logs + CI pass/fail JSON
```

## Input Specification

### Harness Under Evaluation

Provide the path to the harness implementation:

```typescript
interface EvalConfig {
  harness_path: string        // Path to harness implementation
  fixtures_dir: string         // Path to agent-tdd fixtures
  config: {
    timeout_per_test_ms: number
    max_concurrent_tests: number
    token_budget_per_session: number
    enable_performance_metrics: boolean
  }
}
```

### Test Fixtures (from agent-tdd)

```json
{
  "description": "Agent lists all test files",
  "layer": "loop",
  "input": "list all test files",
  "expected_tools": ["glob", "read_file"],
  "session_config": { "permission": "ReadOnly" }
}
```

## Output Formats

### Detailed Log (Primary)

```
=== Agent Eval Report ===
Timestamp: 2026-04-02T00:00:00Z
Harness: /path/to/implementation

[Functionality]
✓ Session persistence: PASS (3/3)
✗ Permission enforcement: FAIL (2/3)
...

[Security]
✓ Permission escalation prevented
✓ Session isolation verified

[Performance]
- Avg token usage: 1,234 tokens/session
- Avg latency: 230ms
```

### CI Pass/Fail

```json
{
  "passed": false,
  "summary": {
    "functionality": { "passed": 10, "failed": 1 },
    "security": { "passed": 3, "failed": 0 },
    "performance": { "passed": 2, "failed": 1 }
  }
}
```

## Running Evaluation

### JavaScript

```javascript
import { EvalRunner } from '@harness/agent-eval'

const runner = new EvalRunner()
const result = await runner.evaluate({
  harness_path: './my-harness',
  fixtures_dir: './fixtures/agent-tdd',
  config: {
    timeout_per_test_ms: 30000,
    max_concurrent_tests: 4,
    token_budget_per_session: 5000,
    enable_performance_metrics: true
  }
})

console.log(result.summary)
console.log(result.detailed_log)
```

## How to Use This Skill

**Pre-deployment verification:**
1. Read `specs/evaluation-dimensions.md` for evaluation methodology
2. Read `references/security-checks.md` for security checklist
3. Run eval-runner against your harness
4. Fix any FAIL checks before deployment

**CI Integration:**
1. Configure eval in your CI pipeline
2. Use CI JSON output for pass/fail gating
3. Review detailed logs for debugging

## References

- `specs/evaluation-dimensions.md` — Full dimension methodology
- `specs/output-formats.md` — Output format specifications
- `references/eval-runner.md` — Runner design
- `references/security-checks.md` — Security checklist
- `references/performance-metrics.md` — Performance metrics
- `harness` skill — Architecture reference
- `agent-tdd` skill — Fixture format reference
```

- [ ] **Step 2: Verify file exists**

```bash
wc -l skills/agent-eval/README.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/README.md
git commit -m "feat: add agent-eval README.md with full evaluation guide"
```

---

## Task 3: Write evaluation-dimensions.md

**Files:**
- Create: `skills/agent-eval/specs/evaluation-dimensions.md`

- [ ] **Step 1: Write evaluation-dimensions.md**

```markdown
# Evaluation Dimensions — Detailed Specification

**Status:** Approved
**Layer:** Core methodology

---

## Dimension 1: Functionality (Priority 1)

**Method:** Black-box testing with agent-tdd fixtures.

### Overview

Functionality verification uses agent-tdd fixtures to verify that the harness behaves correctly. Each fixture defines an input, expected tool sequence, and session configuration.

### Process

1. Load fixture from `fixtures/agent-tdd/`
2. Initialize harness with session_config from fixture
3. Run harness with fixture input
4. Capture tool call sequence
5. Compare against `expected_tools` in fixture

### Pseudocode

```typescript
function evaluate_functionality(harness, fixture) {
  // Setup
  session = harness.create_session(fixture.session_config)

  // Execute
  harness.run(session, fixture.input)

  // Verify
  actual_tools = session.tool_calls.map(tc => tc.name)
  expected_tools = fixture.expected_tools

  if (actual_tools == expected_tools) {
    return { passed: true }
  } else {
    return {
      passed: false,
      reason: `Expected ${expected_tools}, got ${actual_tools}`
    }
  }
}
```

### Fixture Format

```json
{
  "description": "Human-readable description",
  "layer": "layer1 | layer2 | layer3 | layer4",
  "input": "User input string",
  "expected_tools": ["tool_name_1", "tool_name_2"],
  "session_config": {
    "permission": "ReadOnly | WorkspaceWrite | DangerFullAccess"
  }
}
```

### Checklist

- [ ] All agent-tdd fixtures pass
- [ ] Session persistence works (save → load → equivalent)
- [ ] Message immutability maintained
- [ ] Loop termination works (max_turns respected)
- [ ] Tool selection matches prompt expectation

### Layer Coverage

**Layer 1 (Harness Core):**
- Session creation and persistence
- Message history immutability
- Permission enforcement at harness level
- Loop termination

**Layer 2 (Tool System):**
- Tool selection based on prompt
- Schema validation
- Permission boundaries per tool
- Error handling

**Layer 3 (Plugin & Hooks):**
- PreToolUse hook execution
- PostToolUse hook execution
- Hook error handling

**Layer 4 (Multi-Agent):**
- Sub-agent spawning
- Parent-child communication
- Timeout termination
- Parallel agent merge

---

## Dimension 2: Security (Priority 2)

**Method:** White-box testing — inspect internal state and verify constraints.

### Overview

Security verification checks that the harness enforces permission boundaries, isolates sessions, and handles malicious inputs.

### Permission Model Verification

The harness must implement 5 permission modes:

| Mode | Read | Write | Execute | Network |
|------|------|-------|---------|---------|
| ReadOnly | ✓ | ✗ | ✗ | GET only |
| WorkspaceWrite | ✓ | ✓ | ✗ | ✗ |
| DangerFullAccess | ✓ | ✓ | ✓ | ✓ |
| Prompt | Requires user confirmation |
| Allow | All operations allowed |

### Security Checks

#### Permission Enforcement

```typescript
test("bash blocked in ReadOnly session") {
  session = harness.create_session({ permission: "ReadOnly" })
  harness.run(session, "delete everything")

  // Verify bash was blocked
  blocked = session.get_blocked_tools()
  expect(blocked).to_contain("bash")
}
```

#### Permission Escalation Prevention

```typescript
test("child cannot escalate permissions") {
  parent = harness.fork_session({
    permission: "DangerFullAccess",
    child_permission: "ReadOnly"
  })

  child = harness.get_child_session(parent)
  expect(child.config.permission).to_equal("ReadOnly")
  expect(child.config.permission).to_be_less_than(parent.config.permission)
}
```

#### Session Isolation

```typescript
test("parent and child have separate message histories") {
  parent = harness.fork_session({ task: "explore" })
  child = harness.get_child_session(parent)

  // Child adds messages
  child.add_message({ role: "assistant", content: "I am child" })

  // Parent history unchanged
  expect(parent.messages.length).to_equal(child.messages.length - 1)
}
```

### Checklist

- [ ] ReadOnly blocks bash/exec
- [ ] ReadOnly blocks write operations
- [ ] Permission escalation prevented
- [ ] Child inherits subset of parent permissions
- [ ] Malformed tool input rejected
- [ ] Schema validation errors caught
- [ ] Empty/null inputs handled gracefully
- [ ] Session cleanup after termination

---

## Dimension 3: Performance (Priority 3)

**Method:** Metrics collection during evaluation.

### Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| tokens_per_session | Average token usage per session | User-defined budget |
| avg_latency_ms | Average tool execution latency | < 500ms |
| p95_latency_ms | 95th percentile latency | < 2000ms |
| memory_leak_detected | Memory growth during extended sessions | false |
| concurrent_capacity | Max parallel tool executions | ≥ 4 |

### Token Usage Tracking

```typescript
interface TokenMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_estimate_usd: number
}

function track_token_usage(session) {
  usage = session.usage
  return {
    tokens_per_session: usage.total_tokens,
    cost_estimate_usd: calculate_cost(usage)
  }
}
```

### Latency Measurement

```typescript
function measure_latency(harness, fixture) {
  start = performance.now()
  harness.run(session, fixture.input)
  end = performance.now()

  return {
    total_latency_ms: end - start,
    tool_latencies: session.tool_calls.map(tc => tc.elapsed_ms)
  }
}
```

### Memory Leak Detection

```typescript
function detect_memory_leak(harness, iterations = 100) {
  initial_memory = process.memoryUsage().heapUsed

  for (i = 0; i < iterations; i++) {
    session = harness.create_session()
    harness.run(session, "read file")
    harness.close_session(session)
  }

  final_memory = process.memoryUsage().heapUsed
  growth = (final_memory - initial_memory) / initial_memory

  return {
    leak_detected: growth > 0.1,  // 10% growth threshold
    growth_ratio: growth
  }
}
```

### Performance Thresholds

Default thresholds (configurable):

```json
{
  "max_tokens_per_session": 50000,
  "max_avg_latency_ms": 500,
  "max_p95_latency_ms": 2000,
  "max_memory_growth_ratio": 0.1,
  "min_concurrent_capacity": 4
}
```

### Checklist

- [ ] Token usage tracked per session
- [ ] Average latency within threshold
- [ ] P95 latency within threshold
- [ ] No memory leak detected
- [ ] Concurrent capacity meets minimum
- [ ] Resource cleanup after session close

---

## Priority Summary

| Priority | Dimension | Method | Output |
|----------|-----------|--------|--------|
| 1 | Functionality | Black-box with fixtures | Pass/Fail per fixture |
| 2 | Security | White-box state inspection | Pass/Fail per check |
| 3 | Performance | Metrics collection | Metrics + threshold pass/fail |
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la skills/agent-eval/specs/evaluation-dimensions.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/specs/evaluation-dimensions.md
git commit -m "feat: add evaluation-dimensions.md specification"
```

---

## Task 4: Write output-formats.md

**Files:**
- Create: `skills/agent-eval/specs/output-formats.md`

- [ ] **Step 1: Write output-formats.md**

```markdown
# Output Formats — Detailed Specification

**Status:** Approved
**Layer:** Core methodology

---

## Overview

agent-eval produces two output formats:
1. **Detailed Log** (primary) — Human-readable for debugging
2. **CI JSON** — Machine-readable for CI integration

---

## Detailed Log Format

### Structure

```
=== Agent Eval Report ===
Timestamp: ISO8601 timestamp
Harness: /path/to/implementation
Fixtures: N loaded

[Functionality]
✓ category: PASS (X/Y)
  - check-001: ✓
  - check-002: ✗ failure reason

[Security]
✓ check-name: PASS (X/Y)
...

[Performance]
- metric: value (threshold)

=== Summary ===
PASS: X/Y checks
FAIL: Z/Y checks

Failed checks:
  - check-id: description
  - check-id: description
```

### Example

```
=== Agent Eval Report ===
Timestamp: 2026-04-02T10:30:00Z
Harness: /projects/my-harness
Fixtures: 12 loaded

[Layer 1: Harness Core]
✓ Session persistence: PASS (3/3)
  - persist-001: ✓
  - persist-002: ✓
  - persist-003: ✓
✗ Permission enforcement: FAIL (2/3)
  - perm-001: ✓
  - perm-002: ✗ bash not blocked in ReadOnly mode
  - perm-003: ✓
✓ Loop termination: PASS (2/2)

[Layer 2: Tool System]
✓ Tool selection: PASS (5/5)
✓ Schema validation: PASS (4/4)
✗ Permission boundary: FAIL (1/2)
  - tool-perm-001: ✗ write_file allowed in ReadOnly

[Layer 3: Plugin & Hooks]
✓ Hook execution: PASS (3/3)
✓ Hook error handling: PASS (2/2)

[Layer 4: Multi-Agent]
✓ Sub-agent spawn: PASS (2/2)
✓ Timeout termination: PASS (1/1)
✗ Permission inheritance: FAIL (1/1)
  - child-perm-001: ✗ child has equal permission to parent

[Security]
✓ Permission escalation prevented: PASS
✓ Session isolation verified: PASS
✓ Input validation enforced: PASS

[Performance]
- Avg token usage: 1,234 tokens/session (budget: 5000) ✓
- Avg latency: 230ms (threshold: 500ms) ✓
- P95 latency: 890ms (threshold: 2000ms) ✓
- Memory leak: none detected ✓
- Concurrent capacity: 8 (min: 4) ✓

=== Summary ===
PASS: 24/28 checks
FAIL: 4/28 checks

Failed checks:
  - perm-002: bash not blocked in ReadOnly session
  - tool-perm-001: write_file allowed in ReadOnly session
  - child-perm-001: child has equal permission to parent
  - perf-001: token usage exceeded budget (12000 > 5000)
```

### Log Levels

| Level | Trigger | Example |
|-------|---------|---------|
| ✓ PASS | Check passed | `✓ Session persistence: PASS` |
| ✗ FAIL | Check failed | `✗ Permission enforcement: FAIL` |
| ⚠ WARN | Threshold approached | `⚠ Token usage: 4800/5000` |
| ℹ INFO | Informational | `ℹ Running 12 fixtures` |
| 🔍 DEBUG | Detailed trace | `🔍 Tool call: glob({"pattern": "*.ts"})` |

---

## CI JSON Format

### Structure

```json
{
  "version": "1.0",
  "timestamp": "ISO8601",
  "harness": "/path/to/implementation",
  "passed": boolean,

  "summary": {
    "functionality": { "passed": number, "failed": number, "total": number },
    "security": { "passed": number, "failed": number, "total": number },
    "performance": { "passed": number, "failed": number, "total": number }
  },

  "total": { "passed": number, "failed": number, "total": number },

  "checks": [
    {
      "id": "string",
      "layer": "layer1 | layer2 | layer3 | layer4 | security | performance",
      "category": "string",
      "description": "string",
      "status": "passed | failed",
      "fixture": "optional path to fixture",
      "error": "failure reason if failed",
      "duration_ms": number
    }
  ],

  "failed_checks": [
    {
      "id": "string",
      "description": "string",
      "layer": "string",
      "fixture": "optional"
    }
  ],

  "performance_metrics": {
    "avg_tokens_per_session": number,
    "avg_latency_ms": number,
    "p95_latency_ms": number,
    "max_tokens_per_session": number,
    "memory_growth_ratio": number,
    "concurrent_capacity": number
  },

  "configuration": {
    "timeout_per_test_ms": number,
    "token_budget_per_session": number,
    "max_concurrent_tests": number
  }
}
```

### Example

```json
{
  "version": "1.0",
  "timestamp": "2026-04-02T10:30:00Z",
  "harness": "/projects/my-harness",
  "passed": false,

  "summary": {
    "functionality": { "passed": 10, "failed": 1, "total": 11 },
    "security": { "passed": 3, "failed": 1, "total": 4 },
    "performance": { "passed": 2, "failed": 1, "total": 3 }
  },

  "total": { "passed": 15, "failed": 3, "total": 18 },

  "checks": [
    {
      "id": "perm-002",
      "layer": "layer1",
      "category": "permission-enforcement",
      "description": "bash not blocked in ReadOnly session",
      "status": "failed",
      "fixture": "fixtures/security/perm-002.json",
      "error": "bash tool was called but should have been blocked",
      "duration_ms": 150
    }
  ],

  "failed_checks": [
    {
      "id": "perm-002",
      "description": "bash not blocked in ReadOnly session",
      "layer": "layer1",
      "fixture": "fixtures/security/perm-002.json"
    },
    {
      "id": "tool-perm-001",
      "description": "write_file allowed in ReadOnly session",
      "layer": "layer2",
      "fixture": "fixtures/security/tool-perm-001.json"
    },
    {
      "id": "perf-token-budget",
      "description": "token usage exceeded budget",
      "layer": "performance"
    }
  ],

  "performance_metrics": {
    "avg_tokens_per_session": 1234,
    "avg_latency_ms": 230,
    "p95_latency_ms": 890,
    "max_tokens_per_session": 15000,
    "memory_growth_ratio": 0.02,
    "concurrent_capacity": 8
  },

  "configuration": {
    "timeout_per_test_ms": 30000,
    "token_budget_per_session": 5000,
    "max_concurrent_tests": 4
  }
}
```

---

## Output Configuration

### Log Verbosity

```typescript
type LogLevel = 'quiet' | 'normal' | 'verbose' | 'debug'

interface OutputConfig {
  log_level: LogLevel
  log_file: string | null        // null = stdout only
  json_file: string | null      // null = no JSON output
  show_passed_checks: boolean    // default: true
  show_warnings: boolean          // default: true
}
```

### Default Configuration

```json
{
  "log_level": "normal",
  "log_file": null,
  "json_file": "eval-result.json",
  "show_passed_checks": true,
  "show_warnings": true
}
```
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la skills/agent-eval/specs/output-formats.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/specs/output-formats.md
git commit -m "feat: add output-formats.md specification"
```

---

## Task 5: Write eval-runner.md

**Files:**
- Create: `skills/agent-eval/references/eval-runner.md`

- [ ] **Step 1: Write eval-runner.md**

```markdown
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
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la skills/agent-eval/references/eval-runner.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/references/eval-runner.md
git commit -m "feat: add eval-runner.md reference design"
```

---

## Task 6: Write security-checks.md

**Files:**
- Create: `skills/agent-eval/references/security-checks.md`

- [ ] **Step 1: Write security-checks.md**

```markdown
# Security Checks — Complete Checklist

## Overview

Security verification ensures the harness properly enforces permission boundaries, isolates sessions, and handles malicious inputs.

---

## Permission Enforcement Checks

### ReadOnly Blocks Dangerous Operations

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-perm-001 | bash blocked in ReadOnly | Black-box: run "delete everything" |
| sec-perm-002 | exec blocked in ReadOnly | Black-box: run "run shell command" |
| sec-perm-003 | write_file blocked in ReadOnly | Black-box: run "write to /etc/passwd" |
| sec-perm-004 | network blocked in ReadOnly | Black-box: verify no outbound connections |

**Pseudocode:**
```typescript
test("bash blocked in ReadOnly") {
  session = harness.create_session({ permission: "ReadOnly" })
  harness.run(session, "delete all files")
  expect(session.tool_calls).to_not_contain("bash")
  expect(session.blocked_tools).to_contain("bash")
}
```

### Permission Escalation Prevention

| Check ID | Description |
|----------|-------------|
| sec-esc-001 | Child cannot exceed parent permission |
| sec-esc-002 | Child permission is strict subset |
| sec-esc-003 | No privilege escalation via fork |

**Pseudocode:**
```typescript
test("child cannot escalate permissions") {
  parent = harness.fork_session({
    permission: "DangerFullAccess",
    child_permission: "ReadOnly"
  })
  child = harness.get_child_session(parent)

  expect(child.config.permission).to_equal("ReadOnly")
  expect(child.config.permission).to_be_less_than(parent.config.permission)
}
```

---

## Session Isolation Checks

### Parent-Child Isolation

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-iso-001 | Separate Session IDs | Verify child.id != parent.id |
| sec-iso-002 | Separate message histories | Child cannot read parent messages |
| sec-iso-003 | Separate working directories | Verify child.working_dir != parent.working_dir |
| sec-iso-004 | Session cleanup on termination | Child resources freed |

**Pseudocode:**
```typescript
test("separate message histories") {
  parent = harness.fork_session({ task: "do work" })
  child = harness.get_child_session(parent)

  child.add_message({ role: "assistant", content: "child only" })

  expect(parent.messages.find(m => m.content === "child only")).to_be_null()
  expect(child.messages.find(m => m.content === "child only")).to_not_be_null()
}
```

### Session Persistence Isolation

| Check ID | Description |
|----------|-------------|
| sec-persist-001 | Save/load creates independent copy |
| sec-persist-002 | Modifications to loaded session don't affect original |

---

## Input Validation Checks

### Malformed Input Handling

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-input-001 | Invalid JSON rejected | Pass `{invalid: json}` as tool input |
| sec-input-002 | Empty string handled | Pass `""` as required parameter |
| sec-input-003 | Null value handled | Pass `null` where string expected |
| sec-input-004 | Overflow value handled | Pass extremely long string |

### Schema Validation

| Check ID | Description |
|----------|-------------|
| sec-schema-001 | Type mismatch rejected |
| sec-schema-002 | Missing required field rejected |
| sec-schema-003 | Extra unknown field ignored (not rejected) |

---

## Resource Limits

### Execution Limits

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-limit-001 | Tool timeout enforced | Run slow tool, verify timeout |
| sec-limit-002 | Memory limit enforced | Run memory-intensive task |
| sec-limit-003 | Max iterations enforced | Set max_turns=5, run loop |
| sec-limit-004 | Token budget enforced | Run long session |

---

## Hook Security

### PreToolUse Hook

| Check ID | Description |
|----------|-------------|
| sec-hook-pre-001 | Hook cannot bypass permission |
| sec-hook-pre-002 | Hook error doesn't expose sensitive data |
| sec-hook-pre-003 | Hook can block dangerous operations |

### PostToolUse Hook

| Check ID | Description |
|----------|-------------|
| sec-hook-post-001 | Hook cannot modify tool result |
| sec-hook-post-002 | Hook error doesn't break execution |

---

## Summary Checklist

### Permission Enforcement
- [ ] sec-perm-001: bash blocked in ReadOnly
- [ ] sec-perm-002: exec blocked in ReadOnly
- [ ] sec-perm-003: write_file blocked in ReadOnly
- [ ] sec-perm-004: network blocked in ReadOnly
- [ ] sec-esc-001: Child cannot exceed parent permission
- [ ] sec-esc-002: Child permission is strict subset
- [ ] sec-esc-003: No privilege escalation via fork

### Session Isolation
- [ ] sec-iso-001: Separate Session IDs
- [ ] sec-iso-002: Separate message histories
- [ ] sec-iso-003: Separate working directories
- [ ] sec-iso-004: Session cleanup on termination
- [ ] sec-persist-001: Save/load creates independent copy
- [ ] sec-persist-002: Modifications to loaded session don't affect original

### Input Validation
- [ ] sec-input-001: Invalid JSON rejected
- [ ] sec-input-002: Empty string handled
- [ ] sec-input-003: Null value handled
- [ ] sec-input-004: Overflow value handled
- [ ] sec-schema-001: Type mismatch rejected
- [ ] sec-schema-002: Missing required field rejected

### Resource Limits
- [ ] sec-limit-001: Tool timeout enforced
- [ ] sec-limit-002: Memory limit enforced
- [ ] sec-limit-003: Max iterations enforced
- [ ] sec-limit-004: Token budget enforced

### Hook Security
- [ ] sec-hook-pre-001: Hook cannot bypass permission
- [ ] sec-hook-pre-002: Hook error doesn't expose sensitive data
- [ ] sec-hook-pre-003: Hook can block dangerous operations
- [ ] sec-hook-post-001: Hook cannot modify tool result
- [ ] sec-hook-post-002: Hook error doesn't break execution
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la skills/agent-eval/references/security-checks.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/references/security-checks.md
git commit -m "feat: add security-checks.md reference documentation"
```

---

## Task 7: Write performance-metrics.md

**Files:**
- Create: `skills/agent-eval/references/performance-metrics.md`

- [ ] **Step 1: Write performance-metrics.md**

```markdown
# Performance Metrics — Definitions and Thresholds

## Overview

Performance evaluation measures token usage, latency, memory behavior, and concurrency capacity.

---

## Token Usage Metrics

### Definition

```typescript
interface TokenUsage {
  prompt_tokens: number      // Tokens in system prompt + user input
  completion_tokens: number  // Tokens in model response
  total_tokens: number      // Sum of above
}

interface TokenMetrics {
  avg_tokens_per_session: number
  max_tokens_per_session: number
  min_tokens_per_session: number
  total_tokens_all_sessions: number
  cost_estimate_usd: number
}
```

### Calculation

```typescript
function calculate_token_metrics(sessions: Session[]): TokenMetrics {
  const token_counts = sessions.map(s => s.usage.total_tokens)

  return {
    avg_tokens_per_session: mean(token_counts),
    max_tokens_per_session: Math.max(...token_counts),
    min_tokens_per_session: Math.min(...token_counts),
    total_tokens_all_sessions: token_counts.reduce((a, b) => a + b, 0),
    cost_estimate_usd: calculate_cost(token_counts)
  }
}

function calculate_cost(total_tokens: number): number {
  // Claude Opus pricing (example)
  const PROMPT_COST_PER_1K = 0.015  // $15 per 1M input tokens
  const COMPLETION_COST_PER_1K = 0.075  // $75 per 1M output tokens

  return (total_tokens / 1000) * (PROMPT_COST_PER_1K + COMPLETION_COST_PER_1K)
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| avg_tokens_per_session | 5000 | token_budget_per_session |
| max_tokens_per_session | 50000 | token_budget_per_session |
| cost_estimate_usd | $1.00 | max_cost_per_session |

---

## Latency Metrics

### Definition

```typescript
interface LatencyMetrics {
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  p99_latency_ms: number
  max_latency_ms: number
}
```

### Measurement

```typescript
function measure_latency(harness: Harness, fixture: Fixture): LatencyMetrics {
  const tool_latencies: number[] = []

  session = harness.create_session(fixture.session_config)

  harness.on('tool_call', (tool) => {
    tool.start_time = Date.now()
  })

  harness.on('tool_result', (tool) => {
    tool.elapsed_ms = Date.now() - tool.start_time
    tool_latencies.push(tool.elapsed_ms)
  })

  harness.run(session, fixture.input)

  return calculate_percentiles(tool_latencies)
}

function calculate_percentiles(values: number[]): LatencyMetrics {
  sorted = values.sort((a, b) => a - b)

  return {
    avg_latency_ms: mean(sorted),
    p50_latency_ms: percentile(sorted, 50),
    p95_latency_ms: percentile(sorted, 95),
    p99_latency_ms: percentile(sorted, 99),
    max_latency_ms: Math.max(...sorted)
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| avg_latency_ms | 500 | max_avg_latency_ms |
| p95_latency_ms | 2000 | max_p95_latency_ms |
| max_latency_ms | 10000 | max_latency_ms |

---

## Memory Metrics

### Memory Leak Detection

```typescript
interface MemoryMetrics {
  initial_heap_bytes: number
  final_heap_bytes: number
  growth_bytes: number
  growth_ratio: number
  leak_detected: boolean
}

function detect_memory_leak(
  harness: Harness,
  iterations: number = 100
): MemoryMetrics {
  // Force GC if available
  if (global.gc) {
    global.gc()
  }

  initial = process.memoryUsage().heapUsed

  for (i = 0; i < iterations; i++) {
    session = harness.create_session()
    harness.run(session, 'read file')
    harness.close_session(session)
  }

  // Force GC again
  if (global.gc) {
    global.gc()
  }

  final = process.memoryUsage().heapUsed
  growth = final - initial
  ratio = growth / initial

  return {
    initial_heap_bytes: initial,
    final_heap_bytes: final,
    growth_bytes: growth,
    growth_ratio: ratio,
    leak_detected: ratio > 0.1  // 10% threshold
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| growth_ratio | 0.1 (10%) | max_memory_growth_ratio |
| growth_bytes | 100MB | max_memory_growth_bytes |

---

## Concurrency Metrics

### Capacity Testing

```typescript
interface ConcurrencyMetrics {
  max_concurrent_sessions: number
  avg_throughput_per_second: number
}

function measure_concurrency(harness: Harness): ConcurrencyMetrics {
  let max_concurrent = 0
  let active_count = 0

  harness.on('session_start', () => { active_count++ })
  harness.on('session_end', () => { active_count-- })

  start = Date.now()

  sessions = Array(20).fill().map(() => {
    s = harness.create_session()
    harness.run_async(s, 'do work')
    return s
  })

  await Promise.all(sessions.map(s => s.done))

  duration = Date.now() - start
  throughput = sessions.length / (duration / 1000)

  return {
    max_concurrent_sessions: max_concurrent,
    avg_throughput_per_second: throughput
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| max_concurrent_sessions | 4 | min_concurrent_capacity |
| avg_throughput_per_second | 10 | min_throughput |

---

## Complete Metrics Report

```typescript
interface PerformanceReport {
  tokens: TokenMetrics
  latency: LatencyMetrics
  memory: MemoryMetrics
  concurrency: ConcurrencyMetrics

  passed: boolean
  failed_metrics: string[]
}

function generate_performance_report(
  harness: Harness,
  fixtures: Fixture[],
  config: PerformanceConfig
): PerformanceReport {
  const report = {
    tokens: calculate_token_metrics(sessions),
    latency: measure_latency(harness, fixtures),
    memory: detect_memory_leak(harness),
    concurrency: measure_concurrency(harness),
    passed: true,
    failed_metrics: []
  }

  // Check thresholds
  if (report.tokens.avg_tokens_per_session > config.token_budget) {
    report.passed = false
    report.failed_metrics.push('token_budget_exceeded')
  }

  if (report.latency.p95_latency_ms > config.max_p95_latency_ms) {
    report.passed = false
    report.failed_metrics.push('p95_latency_exceeded')
  }

  if (report.memory.leak_detected) {
    report.passed = false
    report.failed_metrics.push('memory_leak_detected')
  }

  if (report.concurrency.max_concurrent_sessions < config.min_concurrent_capacity) {
    report.passed = false
    report.failed_metrics.push('insufficient_concurrency')
  }

  return report
}
```

---

## Summary Table

| Category | Metric | Default Threshold | Severity if Exceeded |
|----------|--------|-----------------|---------------------|
| Tokens | avg_tokens_per_session | 5000 | Warning |
| Tokens | max_tokens_per_session | 50000 | Error |
| Tokens | cost_estimate_usd | $1.00 | Warning |
| Latency | avg_latency_ms | 500 | Warning |
| Latency | p95_latency_ms | 2000 | Error |
| Latency | max_latency_ms | 10000 | Error |
| Memory | growth_ratio | 0.1 | Error |
| Memory | growth_bytes | 100MB | Error |
| Concurrency | max_concurrent_sessions | 4 | Warning |
| Concurrency | throughput | 10/sec | Warning |
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la skills/agent-eval/references/performance-metrics.md
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-eval/references/performance-metrics.md
git commit -m "feat: add performance-metrics.md reference documentation"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] All 7 files created in correct locations
- [ ] SKILL.md has `name: agent-eval` (not "agent-eval-engineering")
- [ ] All spec sections from design doc are covered
- [ ] No placeholder text (TBD, TODO)
- [ ] Cross-references consistent between files
- [ ] Design doc verification items all checked

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?