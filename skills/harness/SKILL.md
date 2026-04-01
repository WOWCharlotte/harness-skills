---
name: harness
description: Use when building a production Agent system from scratch, or evaluating/refactoring an existing Agent harness architecture. Covers core runtime (Agent loop, session, permissions), tool system (registry, executor, schema), plugin hooks (PreToolUse/PostToolUse, lifecycle), and multi-agent patterns (spawn, state handoff, collaboration).
---

# Harness Engineering

## Overview

A complete engineering methodology for building production-grade Agent systems — derived from battle-tested claude-code architecture and organized as a 4-layer framework.

**This is methodology, not code.** The goal is a complete engineering blueprint that teams can follow to design, implement, and evaluate their own Agent harnesses.

## When to Use

Trigger this skill when:
- Starting a new Agent system project from scratch
- Evaluating an existing Agent framework against proven patterns
- Refactoring a messy or overgrown agent implementation
- onboarding to a new Agent system codebase and needing the full architectural picture

## The 4-Layer Architecture

| Layer | Component | Key Responsibility |
|-------|-----------|-------------------|
| **Layer 1** | Harness Core | Agent loop, session management, config & permissions |
| **Layer 2** | Tool System | Tool registry, executor, permission model, execution context |
| **Layer 3** | Plugin & Hooks | PreToolUse, PostToolUse, plugin lifecycle |
| **Layer 4** | Multi-Agent | Sub-agent spawn, state handoff, collaboration patterns |

Start with Layer 1 if you're building from scratch. Jump to any layer if you're evaluating or improving a specific subsystem.

## Core Resources

- **Full methodology:** `README.md`
- **Layer 1 (Harness Core):** `specs/layer1-harness-core.md`
- **Layer 2 (Tool System):** `specs/layer2-tool-system.md`
- **Layer 3 (Plugin & Hooks):** `specs/layer3-plugin-hooks.md`
- **Layer 4 (Multi-Agent):** `specs/layer4-multi-agent.md`
- **claw-code mapping:** `references/claw-code-patterns.md`
- **Engineering checklist:** `references/implementation-checklist.md`
- **Common pitfalls:** `references/common-pitfalls.md`

## Quick Reference

### Layer 1 — Harness Core
- [ ] Agent Loop has explicit termination (no infinite loops)
- [ ] Session history is serializable and resumable
- [ ] Permission model covers all tools
- [ ] LLM failures have exponential backoff retry
- [ ] Tool execution can be forcibly terminated

### Layer 2 — Tool System
- [ ] All tools have complete input_schema
- [ ] Dangerous tools have timeout and resource limits
- [ ] Tool errors return standardized format to LLM
- [ ] Tools are hot-swappable (no core code changes)

### Layer 3 — Plugin & Hooks
- [ ] Hook errors cannot break tool execution
- [ ] Hooks are configurable on/off
- [ ] Plugin version constraints prevent conflicts
- [ ] Hook logs are traceable

### Layer 4 — Multi-Agent
- [ ] Sub-agents have independent Session IDs
- [ ] Parent-child communication has explicit protocol
- [ ] Sub-agents have independent timeouts
- [ ] Parallel agents have resource quotas

## Common Mistakes

**Layer 1:**
- No explicit loop termination → infinite loops
- Shared mutable session state → non-deterministic behavior
- Permission checks at tool level instead of harness level → gaps

**Layer 2:**
- Vague tool descriptions → LLM selects wrong tool
- Missing input_schema validation → crashes on bad input
- No bash timeout → system freeze

**Layer 3:**
- Uncaught hook exceptions → break the execution chain
- Hook modifies input without LLM awareness → wrong assumptions propagate
- Undefined hook execution order → non-reproducible behavior

**Layer 4:**
- Parent and child share Session → context exhaustion
- No sub-agent timeout → permanent blocking
- Too many parallel agents → resource contention

Full analysis: `references/common-pitfalls.md`

## Integration

- **Planning next:** Use `superpowers:writing-plans` to create implementation plan
- **Already building:** Use `superpowers:executing-plans` to execute with checkpoints
- **Need review:** Use `superpowers:requesting-code-review`
- **Debugging:** Use `superpowers:systematic-debugging`
