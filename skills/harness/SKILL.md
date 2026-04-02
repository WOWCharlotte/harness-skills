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

## The 5-Layer Architecture

| Layer | Component | Key Responsibility |
|-------|-----------|-------------------|
| **Layer 0** | System Prompt | Tool usage patterns, task workflow, fork/subagent, context compaction, security, hooks |
| **Layer 1** | Harness Core | Agent loop, session management, config & permissions |
| **Layer 2** | Tool System | Tool registry, executor, permission model, execution context |
| **Layer 3** | Plugin & Hooks | PreToolUse, PostToolUse, plugin lifecycle |
| **Layer 4** | Multi-Agent | Sub-agent spawn, state handoff, collaboration patterns |

Start with Layer 1 if you're building from scratch. Jump to any layer if you're evaluating or improving a specific subsystem.

## Core Resources

- **Full methodology:** `README.md`
- **Layer 0 (System Prompt):** `specs/layer0-system-prompt.md`
- **Layer 1 (Harness Core):** `specs/layer1-harness-core.md`
- **Layer 2 (Tool System):** `specs/layer2-tool-system.md`
- **Layer 3 (Plugin & Hooks):** `specs/layer3-plugin-hooks.md`
- **Layer 4 (Multi-Agent):** `specs/layer4-multi-agent.md`
- **System prompt patterns:** `references/system-prompt-patterns.md`
- **claw-code mapping:** `references/claw-code-patterns.md`
- **Engineering checklist:** `references/implementation-checklist.md`
- **Common pitfalls:** `references/common-pitfalls.md`

## Source Code Reference

The 4-layer architecture is implemented in claw-code's Rust runtime:

| Layer | Crate | Key Files |
|-------|-------|-----------|
| **Layer 1** | `runtime` | `session.rs` (ConversationRuntime, Session, compaction), `permissions.rs` (5 modes), `config.rs`, `usage.rs` |
| **Layer 2** | `tools` | `lib.rs` (ToolSpec), `executor.rs`, `registry.rs`, `bash.rs`, `file_ops.rs` |
| **Layer 3** | `plugins` | `hook_runner.rs`, `plugin_manager.rs`, `lifecycle.rs` |
| **Layer 4** | `runtime` + `tools` | `mcp.rs`, `mcp_client.rs`, `mcp_stdio.rs` (MCP integration), `agents.rs` |

Quickstart for claw-code:
```bash
cd rust && cargo build --release
./target/release/claw --help
```

## Quick Reference

### Layer 0 — System Prompt
- [ ] Tool descriptions include specific use cases and parameter descriptions
- [ ] Tool input_schema is complete with required/optional properties
- [ ] Permission model aligned with tool capability requirements
- [ ] Error responses return structured format (not raw exceptions)
- [ ] All bash commands have timeout consideration
- [ ] File modifications read existing content first
- [ ] Fork prompts are directives, not situation reports
- [ ] No peek/race on fork completion notifications
- [ ] Context compaction uses structured summary format
- [ ] Pre-tool-use checks prevent injection attacks
- [ ] Hooks cannot break tool execution chain

### Layer 1 — Harness Core
- [ ] Agent Loop has explicit termination (no infinite loops)
- [ ] Session history is serializable and resumable
- [ ] Session compaction prevents context overflow (`should_compact()`, `compact_session()`)
- [ ] Permission model covers all tools (5 modes: ReadOnly, WorkspaceWrite, DangerFullAccess, Prompt, Allow)
- [ ] LLM failures have exponential backoff retry
- [ ] Tool execution can be forcibly terminated
- [ ] Token usage is tracked (`UsageTracker`, `TokenUsage`)

### Layer 2 — Tool System
- [ ] All tools have complete input_schema
- [ ] Dangerous tools have timeout and resource limits
- [ ] Tool errors return standardized format to LLM
- [ ] Tools are hot-swappable (no core code changes)
- [ ] File operations (read/write/edit/glob/grep) have permission boundaries
- [ ] Bash execution has shell timeout and resource limits

### Layer 3 — Plugin & Hooks
- [ ] Hook errors cannot break tool execution
- [ ] Hooks are configurable on/off
- [ ] Plugin version constraints prevent conflicts
- [ ] Hook logs are traceable
- [ ] MCP servers can be integrated via stdio or WebSocket

### Layer 4 — Multi-Agent
- [ ] Sub-agents have independent Session IDs
- [ ] Parent-child communication has explicit protocol
- [ ] Sub-agents have independent timeouts
- [ ] Parallel agents have resource quotas
- [ ] MCP tools are discoverable from parent to child agents
- [ ] Session can be forked with permission inheritance

## Common Mistakes

**Layer 0:**
- Vague tool descriptions → LLM selects wrong tool
- Missing input_schema validation → crashes on bad input
- Fork peeking mid-flight → context pollution
- Fork racing results → fabricated output
- No context compaction → context window overflow
- Hook breaks execution chain → silent failures

**Layer 1:**
- No explicit loop termination → infinite loops
- Shared mutable session state → non-deterministic behavior
- Permission checks at tool level instead of harness level → gaps
- No session compaction → context window overflow
- Missing token usage tracking → unbounded cost growth

**Layer 2:**
- Vague tool descriptions → LLM selects wrong tool
- Missing input_schema validation → crashes on bad input
- No bash timeout → system freeze
- File operations bypass permission model → security gaps

**Layer 3:**
- Uncaught hook exceptions → break the execution chain
- Hook modifies input without LLM awareness → wrong assumptions propagate
- Undefined hook execution order → non-reproducible behavior
- MCP server misconfiguration → tools unavailable silently

**Layer 4:**
- Parent and child share Session → context exhaustion
- No sub-agent timeout → permanent blocking
- Too many parallel agents → resource contention
- Child inherits parent's full permission → privilege escalation risk

Full analysis: `references/common-pitfalls.md`

## Integration

- **Testing your harness:** Use `agent-tdd` skill for layer-specific TDD strategies
- **Planning next:** Use `superpowers:writing-plans` to create implementation plan
- **Already building:** Use `superpowers:executing-plans` to execute with checkpoints
- **Need review:** Use `superpowers:requesting-code-review`
- **Debugging:** Use `superpowers:systematic-debugging`
