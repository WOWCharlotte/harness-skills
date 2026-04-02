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
