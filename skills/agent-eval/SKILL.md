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
