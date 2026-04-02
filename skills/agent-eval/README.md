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
