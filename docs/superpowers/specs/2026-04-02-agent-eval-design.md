# Agent Eval — Skill Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Parent Skill:** `harness` + `agent-tdd` — completes the development-to-verification cycle

---

## Overview

A skill for evaluating whether a harness implementation is correct, complete, and secure. Works in conjunction with `agent-tdd` — `agent-tdd` provides test fixtures during development, and `agent-eval` uses those fixtures for full verification after implementation.

**User Journey:** Developer builds a harness → uses harness skill for architecture → uses agent-tdd for testing methodology → implements → uses agent-eval to verify correctness and completeness.

**Output Form:** Detailed evaluation logs + pass/fail results for CI integration.

---

## Core Principle

**Evaluation has three dimensions, in priority order:**

| Priority | Dimension | Verification Method |
|----------|-----------|-------------------|
| 1 | Functionality | Black-box: run harness with fixture inputs, verify outputs |
| 2 | Security | White-box: check internal state (permissions, session isolation) |
| 3 | Performance | Metrics: token usage, latency, resource leaks |

---

## Architecture

```
agent-tdd (development)
  ↓ writes fixtures
fixtures/*.json
  ↓ read by
agent-eval (verification)
  ↓ produces
evaluation-logs/ + pass-fail.json
```

**Hybrid Architecture:** agent-eval can run in two modes:
1. **Fixture-based:** Reuses agent-tdd fixtures for functionality testing
2. **Standalone:** Runs security and performance checks independently

---

## Input Specification

### 1. Harness Under Evaluation

The harness implementation to be evaluated (provided by user).

### 2. Test Fixtures (from agent-tdd)

```json
{
  "description": "Agent lists all test files",
  "layer": "loop",
  "input": "list all test files",
  "expected_tools": ["glob", "read_file"],
  "session_config": {
    "permission": "ReadOnly"
  }
}
```

### 3. Evaluation Configuration

```json
{
  "timeout_per_test_ms": 30000,
  "max_concurrent_tests": 4,
  "token_budget_per_session": 100000,
  "enable_performance_metrics": true
}
```

---

## Evaluation Dimensions

### Dimension 1: Functionality (Priority 1)

**Method:** Black-box testing with agent-tdd fixtures.

**Process:**
1. Load fixture from `fixtures/agent-tdd/`
2. Run harness with fixture input
3. Capture tool call sequence
4. Compare against `expected_tools` in fixture

**Checklist:**
- [ ] All agent-tdd fixtures pass
- [ ] Session persistence works (save → load → equivalent)
- [ ] Message immutability maintained
- [ ] Loop termination works (max_turns respected)

### Dimension 2: Security (Priority 2)

**Method:** White-box testing — inspect internal state.

**Checklist:**

**Permission Enforcement:**
- [ ] ReadOnly session blocks bash/exec
- [ ] ReadOnly session blocks write operations
- [ ] Permission escalation is prevented
- [ ] Child session inherits subset of parent permissions

**Input Validation:**
- [ ] Malformed tool input is rejected
- [ ] Schema validation errors are caught
- [ ] Empty/null inputs handled gracefully

**Session Isolation:**
- [ ] Parent and child have separate Session IDs
- [ ] Child cannot access parent's message history directly
- [ ] Session cleanup after termination

### Dimension 3: Performance (Priority 3)

**Method:** Metrics collection during evaluation.

**Metrics:**
| Metric | Description | Threshold |
|--------|-------------|-----------|
| `tokens_per_session` | Average token usage per session | User-defined budget |
| `avg_latency_ms` | Average tool execution latency | < 500ms |
| `p95_latency_ms` | 95th percentile latency | < 2000ms |
| `memory_leak_detected` | Memory growth during extended sessions | false |
| `concurrent_capacity` | Max parallel tool executions | ≥ 4 |

**Process:**
1. Run harness through representative workload
2. Collect metrics during execution
3. Compare against configured thresholds
4. Report violations

---

## Output Formats

### 1. Detailed Log (Primary Output)

```
=== Agent Eval Report ===
Timestamp: 2026-04-02T00:00:00Z
Harness: /path/to/implementation
Fixtures: 12 loaded

[Layer 1: Harness Core]
✓ Session persistence: PASS (3/3)
  - persist-001: ✓
  - persist-002: ✓
  - persist-003: ✓
✗ Permission enforcement: FAIL (2/3)
  - perm-001: ✓
  - perm-002: ✗ bash not blocked in ReadOnly
  - perm-003: ✓
✓ Loop termination: PASS (2/2)

[Layer 2: Tool System]
✓ Tool selection: PASS (5/5)
✓ Schema validation: PASS (4/4)
✗ Permission boundary: FAIL (1/2)
  - tool-perm-001: ✗ write_file allowed in ReadOnly

[Security]
✓ Permission escalation prevented
✓ Session isolation verified
✓ Input validation enforced

[Performance]
- Avg token usage: 1,234 tokens/session (budget: 5000)
- Avg latency: 230ms (threshold: 500ms)
- P95 latency: 890ms (threshold: 2000ms)
- Memory leak: none detected

=== Summary ===
PASS: 16/19 checks
FAIL: 3/19 checks

Failed checks:
  - perm-002: bash not blocked in ReadOnly session
  - tool-perm-001: write_file allowed in ReadOnly session
  - loop-003: max_turns not respected (ran 105 turns)
```

### 2. Pass/Fail for CI Integration

```json
{
  "timestamp": "2026-04-02T00:00:00Z",
  "passed": false,
  "summary": {
    "functionality": { "passed": 10, "failed": 1 },
    "security": { "passed": 3, "failed": 0 },
    "performance": { "passed": 2, "failed": 1 }
  },
  "total": { "passed": 15, "failed": 2 },
  "failed_checks": [
    {
      "id": "perm-002",
      "layer": "layer1",
      "description": "bash not blocked in ReadOnly session",
      "fixture": "fixtures/security/perm-002.json"
    },
    {
      "id": "tool-perm-001",
      "layer": "layer2",
      "description": "write_file allowed in ReadOnly session",
      "fixture": "fixtures/security/tool-perm-001.json"
    }
  ],
  "performance_metrics": {
    "avg_tokens_per_session": 1234,
    "avg_latency_ms": 230,
    "p95_latency_ms": 890
  }
}
```

---

## Skill Deliverable Structure

```
skills/agent-eval/
├── SKILL.md                        ← Entry point
├── README.md                       ← Full evaluation guide
├── specs/
│   ├── evaluation-dimensions.md ← 功能/安全/性能三大维度详细说明
│   └── output-formats.md       ← 详细日志 + CI 格式
└── references/
    ├── eval-runner.md           ← 评估执行器设计
    ├── security-checks.md        ← 安全检查项清单
    └── performance-metrics.md    ← 性能指标定义
```

---

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| `harness` | What to build (architecture) |
| `agent-tdd` | How to test during development |
| `agent-eval` | How to verify after implementation |

**Flow:**
```
harness (design) → agent-tdd (develop & test) → agent-eval (verify)
```

agent-eval reads agent-tdd fixtures directly — no duplication of test cases.

---

## Verification & Self-Review

- [x] All 3 evaluation dimensions covered (functionality, security, performance)
- [x] Priority order matches user requirements (B: functionality → performance → security)
- [x] Hybrid approach: reuses agent-tdd fixtures + standalone security checks
- [x] Output formats: detailed log + CI pass/fail (matches option B)
- [x] No placeholder content (no TBD, TODO, or vague requirements)
- [x] Design is approved by user before proceeding to implementation plan
