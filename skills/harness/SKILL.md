---
name: harness
description: Use when building a production Agent system from scratch, or evaluating/refactoring an existing Agent harness architecture. Covers core runtime (Agent loop, session, permissions), tool system (registry, executor, schema), plugin hooks (PreToolUse/PostToolUse, lifecycle), and multi-agent patterns (spawn, state handoff, collaboration).
---

# Harness Engineering

## Overview

A complete engineering methodology for building production-grade Agent systems — derived from battle-tested claude-code architecture and organized as a 5-layer framework.

**This is methodology, not code.** The goal is a complete engineering blueprint that teams can follow to design, implement, and evaluate their own Agent harnesses.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have understood the architecture scope and presented an adoption/implementation plan to the user.
</HARD-GATE>

## When to Use

Trigger this skill when:
- Starting a new Agent system project from scratch
- Evaluating an existing Agent framework against proven patterns
- Refactoring a messy or overgrown agent implementation
- Onboarding to a new Agent system codebase and needing the full architectural picture

## Prerequisites

This skill depends on the **superpowers** plugin for execution workflows. See `references/superpowers-installation.md` for platform-specific installation instructions and the list of required skills.


## Anti-Pattern: "Just Start Coding"

A harness is foundational infrastructure — building without understanding the 5-layer architecture leads to:
- Security gaps (missing permission boundaries)
- Context overflow (no session compaction)
- Infinite loops (no explicit termination)
- Permission escalation (child inherits parent's full access)
- Hook-breaking failures (exceptions not isolated)

**Take time to assess before implementing.** The architecture will save you months of debugging.

## Checklist

You MUST complete these items in order:

1. **Assess scope** — Is this a greenfield harness, evaluating existing framework, or refactoring? What layers are in scope?
2. **Map to layers** — Which of the 5 layers does this project need? (Layer 0 is always needed)
3. **Present architecture overview** — Show the 5-layer table, explain each layer's responsibility
4. **Identify gaps** — Compare against `references/implementation-checklist.md` — what does the existing system lack?
5. **Propose layer-by-layer implementation order** — Layer 1 first (core), then Layer 2 (tools), etc.
6. **Evaluate if design is needed** — If significant architectural decisions needed, use `superpowers:brainstorming` first
7. **Create implementation plan** — Use `superpowers:writing-plans` to break work into tasks
8. **Transition to execution** — Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`

## Process Flow

```dot
digraph harness {
    rankdir=TB;

    "Assess scope" [shape=box];
    "Greenfield?" [shape=diamond];
    "Evaluate existing?" [shape=diamond];
    "Refactor?" [shape=diamond];
    "Map to layers" [shape=box];
    "Present 5-layer overview" [shape=box];
    "Identify gaps\n(compare vs checklist)" [shape=box];
    "Design needed?" [shape=diamond];
    "Invoke brainstorming\nfirst" [shape=box];
    "Propose implementation\norder" [shape=box];
    "Create plan\n(writing-plans)" [shape=box];
    "Execute\n(subagent-driven or executing-plans)" [shape=box];

    "Assess scope" -> "Greenfield?";
    "Greenfield?" -> "Map to layers" [label="yes"];
    "Greenfield?" -> "Evaluate existing?" [label="no"];
    "Evaluate existing?" -> "Refactor?" [label="no"];
    "Evaluate existing?" -> "Map to layers" [label="yes"];
    "Refactor?" -> "Map to layers" [label="yes"];
    "Map to layers" -> "Present 5-layer overview";
    "Present 5-layer overview" -> "Identify gaps\n(compare vs checklist)";
    "Identify gaps\n(compare vs checklist)" -> "Design needed?";
    "Design needed?" -> "Invoke brainstorming\nfirst" [label="yes, major decisions"];
    "Design needed?" -> "Propose implementation\norder" [label="no"];
    "Invoke brainstorming\nfirst" -> "Propose implementation\norder";
    "Propose implementation\norder" -> "Create plan\n(writing-plans)";
    "Create plan\n(writing-plans)" -> "Execute\n(subagent-driven or executing-plans)";
}
```

## The 5-Layer Architecture

| Layer | Component | Key Responsibility | Always Needed |
|-------|-----------|-------------------|--------------|
| **Layer 0** | System Prompt | Tool usage patterns, task workflow, fork/subagent, context compaction, security, hooks | **Yes** |
| **Layer 1** | Harness Core | Agent loop, session management, config & permissions | **Yes** |
| **Layer 2** | Tool System | Tool registry, executor, permission model, execution context | **Yes** |
| **Layer 3** | Plugin & Hooks | PreToolUse, PostToolUse, plugin lifecycle | Often |
| **Layer 4** | Multi-Agent | Sub-agent spawn, state handoff, collaboration patterns | Sometimes |

### Layer Dependencies

```dot
digraph layers {
    rankdir=TB;
    "Layer 0\nSystem Prompt" [shape=box];
    "Layer 1\nHarness Core" [shape=box];
    "Layer 2\nTool System" [shape=box];
    "Layer 3\nPlugin & Hooks" [shape=box];
    "Layer 4\nMulti-Agent" [shape=box];

    "Layer 1" -> "Layer 0" [style=dashed,label="runtime config\n& session state"];
    "Layer 2" -> "Layer 1" [label="session + permissions"];
    "Layer 3" -> "Layer 1" [label="session hooks"];
    "Layer 3" -> "Layer 2" [label="tool executor\nhooks"];
    "Layer 4" -> "Layer 1" [label="fork session\nwith scoped permissions"];
    "Layer 4" -> "Layer 2" [label="MCP tool\ndiscovery"];
    "Layer 4" -> "Layer 3" [style=dashed,label="optional\nagent hooks"];
}
```

**Layer 2–4 all depend on Layer 1.** Layer 3 depends on both Layer 1 and Layer 2. Layer 4 can optionally use Layer 3 hooks.

## Key Principles

1. **Layer 1 is foundation** — Don't add Layer 2 tools without Layer 1 session management and permission model
2. **Security at every layer** — Permission boundaries at Layer 1, input validation at Layer 2, hook isolation at Layer 3
3. **Session compaction is non-negotiable** — Without it, context overflow will break production systems
4. **Layer 4 inherits carefully** — Sub-agents must have independent sessions and scoped permissions
5. **YAGNI for plugins** — Layer 3 and Layer 4 are optional — add them only when needed
6. **Hot-swap tools, not core** — Tool registry allows adding/removing tools without touching harness core

## Core Resources

### Layer Specifications (read in order for greenfield, jump as needed for evaluation)

- **Layer 0 (System Prompt):** `specs/layer0-system-prompt.md`
- **Layer 1 (Harness Core):** `specs/layer1-harness-core.md`
- **Layer 2 (Tool System):** `specs/layer2-tool-system.md`
- **Layer 3 (Plugin & Hooks):** `specs/layer3-plugin-hooks.md`
- **Layer 4 (Multi-Agent):** `specs/layer4-multi-agent.md`

### Reference Materials

- **System prompt patterns:** `references/system-prompts/` (40+ reference files)
- **claw-code mapping:** `references/claw-code-patterns.md`
- **Engineering checklist:** `references/implementation-checklist.md`
- **Common pitfalls:** `references/common-pitfalls.md`
- **Superpowers installation:** `references/superpowers-installation.md`

## Layer 0 Quick Reference — System Prompt

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

## Layer 1 Quick Reference — Harness Core

- [ ] Agent Loop has explicit termination (no infinite loops)
- [ ] Session history is serializable and resumable
- [ ] Session compaction prevents context overflow (`should_compact()`, `compact_session()`)
- [ ] Permission model covers all tools (5 modes: ReadOnly, WorkspaceWrite, DangerFullAccess, Prompt, Allow)
- [ ] LLM failures have exponential backoff retry
- [ ] Tool execution can be forcibly terminated
- [ ] Token usage is tracked (`UsageTracker`, `TokenUsage`)

## Layer 2 Quick Reference — Tool System

- [ ] All tools have complete input_schema
- [ ] Dangerous tools have timeout and resource limits
- [ ] Tool errors return standardized format to LLM
- [ ] Tools are hot-swappable (no core code changes)
- [ ] File operations (read/write/edit/glob/grep) have permission boundaries
- [ ] Bash execution has shell timeout and resource limits

## Layer 3 Quick Reference — Plugin & Hooks

- [ ] Hook errors cannot break tool execution
- [ ] Hooks are configurable on/off
- [ ] Plugin version constraints prevent conflicts
- [ ] Hook logs are traceable
- [ ] MCP servers can be integrated via stdio or WebSocket

## Layer 4 Quick Reference — Multi-Agent

- [ ] Sub-agents have independent Session IDs
- [ ] Parent-child communication has explicit protocol
- [ ] Sub-agents have independent timeouts
- [ ] Parallel agents have resource quotas
- [ ] MCP tools are discoverable from parent to child agents
- [ ] Session can be forked with permission inheritance

## Red Flags — Diagnose by Symptom

Use this table when **evaluating or debugging** an existing harness. Start from the symptom column.

| Symptom | Root Cause | Missing Layer |
|---------|-----------|--------------|
| LLM picks wrong tool, or crashes on valid input | Vague tool descriptions or no input_schema validation | Layer 0 + Layer 2 |
| Context window overflows in long sessions | No session compaction | Layer 1 |
| Agent runs forever without stopping | No explicit loop termination | Layer 1 |
| Tool calls have no effect, no error shown | Hook exception swallowed silently | Layer 3 |
| File operations succeed without permission | Permission checks only at tool level | Layer 1 + Layer 2 |
| Bash command hangs forever | No bash timeout | Layer 2 |
| Sub-agent inherits admin-level permissions | No permission inheritance scoping | Layer 4 |
| MCP tools missing from child agent | No MCP tool discovery protocol | Layer 4 |
| Adding a tool requires changing harness core | Tools not hot-swappable | Layer 2 |
| Non-deterministic behavior between runs | Shared mutable session state | Layer 1 |

Full analysis with prevention: `references/common-pitfalls.md`


## After the Architecture

Once the architecture assessment is complete and the plan is created:

1. **Execute the plan** — Use `superpowers:subagent-driven-development` for task-by-task implementation with two-stage review
2. **Test per layer** — Use `agent-tdd` skill for layer-specific TDD strategies
3. **Need code review** — Use `superpowers:requesting-code-review`
4. **Debugging issues** — Use `superpowers:systematic-debugging`
