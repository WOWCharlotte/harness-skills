# Harness Engineering — Skill Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Target User:** Experienced developers building production Agent systems

---

## Overview

A skill that provides a complete engineering methodology for building production-grade Agent systems, derived from实战验证的 claw-code architecture. The skill delivers a 4-layer architectural framework that users can follow to design, implement, and evaluate their own Agent harnesses.

**User Journey:** Developer has an Agent system project → uses this skill → gets complete engineering methodology → implements following the framework.

**Output Form:** Methodological documentation — architecture diagrams, interface contracts, design decisions, and engineering checklists. Not runnable code, but a complete engineering blueprint.

---

## Design Principles

1. **Layer Isolation** — Each layer has a single clear purpose, communicates through well-defined interfaces, can be understood and implemented independently.
2. **Minimal YAGNI** — No features beyond what was validated in the claw-code实战. Every element maps to real, working code.
3. **Practical Orientation** — Each layer includes common pitfalls and engineering checklists derived from real implementation experience.
4. **Hierarchical Decomposition** — 4 layers, each building on the previous. Users can adopt layers incrementally.

---

## Architecture: 4 Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Multi-Agent System                                  │
│ Agent Spawn / State Handoff / Collaboration Patterns        │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Plugin & Hooks                                      │
│ PreToolUse Hook / PostToolUse Hook / Plugin Lifecycle       │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Tool System                                         │
│ Tool Registry / Permission Model / Execution Context         │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Harness Core                                        │
│ Agent Loop / Session Management / Config & Permissions      │
└─────────────────────────────────────────────────────────────┘
         ↕                                      ↕
  Anthropic API (Claude)              External Tools
  (Filesystem, Bash, Web, etc.)
```

### Layer 1: Harness Core

**Core responsibility:** Runtime engine that drives the Agent loop, manages session lifecycle, and maintains configuration and permission boundaries.

**Components:**

1. **Agent Loop**
   ```
   while (!done) {
     messages ← render()
     response ← llm(messages)
     tools ← parse_tools(response)
     for tool in tools {
       result ← executor.run(tool)
       messages.push(result)
     }
   }
   ```
   Key decisions:
   - Messages are rendered as full context before each LLM call, not accumulated raw
   - Multiple tool calls from one response execute serially (not in parallel)
   - Termination: LLM returns `finish`, `max_turns` reached, or user interrupt

2. **Session Manager**
   ```
   Session {
     id: UUID
     messages: Message[]
     metadata: Map<string, any>
     created_at: DateTime
     updated_at: DateTime
   }
   ```
   Key decisions:
   - Messages are immutable — ToolResult messages appended after each tool execution
   - Each Session has isolated working directory, env vars, and tool cache
   - Persistence: Session can be written to disk/database and resumed

3. **Config & Permission Policy**
   ```
   PermissionMode:
     ReadOnly         → Read-only filesystem, no network
     WorkspaceWrite   → Write to working directory
     DangerFullAccess → Shell, system operations
   ```
   Key decisions:
   - Least-privilege principle: default to ReadOnly, elevate only when needed
   - Permission checks happen at Harness layer, not tool layer

**Engineering checklist:**
- [ ] Agent Loop has explicit termination conditions, cannot loop infinitely
- [ ] Session message history is serializable and resumable
- [ ] Permission model covers all tools with no gaps
- [ ] LLM call failures have retry mechanism (exponential backoff)
- [ ] Tool execution timeouts can be forcibly terminated

---

### Layer 2: Tool System

**Core responsibility:** Manages registration, discovery, execution, and permission control for all tools available in the system.

**Components:**

1. **Tool Registry**
   ```
   ToolSpec {
     name: string
     description: string
     input_schema: JSON Schema
     required_permission: PermissionMode
     execute: fn(input: Value) → Result<Value>
   }
   ```
   Key decisions:
   - Declarative registration: tools declare metadata via ToolSpec, discovered dynamically at runtime
   - Schema-driven validation: LLM sees input_schema, not implementation code
   - Tool classification: built-in tools (filesystem/Bash/network), MCP tools (external services), user-defined tools

2. **Tool Executor**
   ```
   trait ToolExecutor {
     async fn execute(
       &self,
       spec: &ToolSpec,
       input: Value,
       ctx: &ExecutionContext
     ) → Result<Value>
   }
   ```
   Key decisions:
   - Executor is pluggable: same ToolSpec can have different execution backends (e.g., BashTool locally or in remote container)
   - Dangerous tools execute in subprocess/container for isolation
   - Tool results are cacheable by input for idempotency

3. **Execution Context**
   ```
   ExecutionContext {
     session_id: UUID
     working_dir: Path
     env_vars: Map<string, string>
     tool_results_cache: Cache
   }
   ```
   Key decisions:
   - Context flows through the entire chain: Loop → Tool Executor → Hooks
   - Working directory is isolated per Session to prevent path conflicts
   - Results cache allows referencing output of previous tools

**Common pitfalls:**
- Tool description too vague → LLM selects wrong tool
- input_schema missing required field validation → tool receives invalid input and crashes
- Bash tool has no timeout limit → malicious/broken commands freeze the system

**Engineering checklist:**
- [ ] All tools have complete input_schema, validated through actual calls
- [ ] Dangerous tools (bash/write) have timeout and resource limits
- [ ] Tool execution errors return standardized error format to LLM
- [ ] New tools can be registered without modifying core code (hot-swap)

---

### Layer 3: Plugin & Hooks

**Core responsibility:** Provides extensible interception mechanisms for injecting custom logic before and after tool execution, without breaking the core flow.

**Components:**

1. **Hook System**
   ```
   HookRunner {
     pre_hooks: Vec<PreToolUseHook>
     post_hooks: Vec<PostToolUseHook>
   }

   PreToolUseHook {
     name: string
     run: fn(ctx, tool_spec, input) → HookResult
       // HookResult: ModifiedInput | Blocked | SkipHooks
   }

   PostToolUseHook {
     name: string
     run: fn(ctx, tool_spec, input, output) → HookResult
       // HookResult: ModifiedOutput | Error | SkipHooks
   }
   ```
   Key decisions:
   - PreToolUse typical uses: param validation, PII sanitization, auto-inject context, permission re-check, rate limiting
   - PostToolUse typical uses: output formatting, auto-format code, result caching, error classification, auto-retry
   - Short-circuit evaluation: PreToolUse returning `Blocked` skips all subsequent Hooks and tool execution
   - Hook ordering: executed by priority, higher-priority Hook can modify lower-priority Hook's input context

2. **Plugin System**
   ```
   Plugin {
     name: string
     version: string
     tools: Vec<ToolSpec>
     hooks: Vec<Hook>
     lifecycle: PluginLifecycle  // init / enable / disable / unload
   }
   ```
   Key decisions:
   - Plugins are isolated from each other, communicate through well-defined interfaces
   - Lifecycle management: plugins can be dynamically loaded/unloaded without affecting system running
   - Tools can come from plugins; plugins can also provide only Hooks

**Common pitfalls:**
- Hook throws uncaught exception → entire tool execution chain breaks
- Hook modifies input but LLM doesn't know → LLM continues with wrong assumptions
- Multiple Hooks apply to same tool but execution order is undefined → non-reproducible behavior

**Engineering checklist:**
- [ ] Hook execution runs in an independent error-handling domain, cannot pollute tool execution
- [ ] Hooks are configurable on/off, debug Hooks can be disabled in production
- [ ] Plugins have version constraints to avoid loading incompatible versions
- [ ] Hook logs are traceable for debugging (record Hook name, tool name, input/output summary)

---

### Layer 4: Multi-Agent System

**Core responsibility:** Manages creation, state transfer, lifecycle, and collaboration patterns for sub-agents.

**Components:**

1. **Agent Spawn**
   ```
   AgentTool {
     forkSubagent(config)    // Sub-agent with independent Session
     runAgent(agent_type)    // Run specified type of built-in Agent
     resumeAgent(agent_id)   // Resume paused Agent
   }
   ```
   Key decisions:
   - Fork vs Run: forkSubagent creates independent Session; runAgent shares parent Agent context
   - State transfer: sub-agents communicate via message passing, not shared memory (prevents state pollution)
   - Lifecycle: sub-agents can terminate independently or be forcibly terminated by parent

2. **Built-in Agent Types**
   ```
   builtInAgents = {
     clawCodeGuideAgent:    // Project guidance, CLAUDE.md interpretation
     exploreAgent:          // File exploration, codebase analysis
     generalPurposeAgent:   // General task execution
     planAgent:             // Planning mode, decompose complex tasks
     verificationAgent:     // Code verification, test running
     statuslineSetup:       // UI status bar configuration
   }
   ```
   Key decisions:
   - Specialization principle: each Agent type has clear responsibilities, avoid catch-all Agent
   - On-demand activation: Agent types activate as needed, not pre-loaded
   - Communication protocol: standardized message protocol between parent and child Agents

3. **Collaboration Patterns**
   ```
   Collaboration patterns:
   ├── Sequential → Agent A completes → Agent B takes over
   ├── Parallel   → Agent A and B work simultaneously → results merged
   ├── Hierarchical → Parent Agent coordinates multiple sub-agents
   └── Debates    → Multiple Agents propose solutions to same problem → vote / parent decides
   ```
   Key decisions:
   - Communication overhead: Agent-to-Agent communication has latency; design for batched messages, not frequent interactions
   - Trust boundary: sub-agent permissions can be a subset of parent Agent permissions (more secure)
   - Conflict resolution: when multiple Agent outputs are inconsistent, explicit arbitration mechanism is needed

**Common pitfalls:**
- Parent and child Agent share same Session → message history bloat, LLM context exhausted
- Sub-agent blocks parent Agent → lacking independent timeout and termination mechanism
- Too many parallel Agents → resource contention, context overwrite

**Engineering checklist:**
- [ ] Each sub-agent has independent Session ID to prevent message collision
- [ ] Parent-child communication has explicit protocol (shared message format)
- [ ] Sub-agents have independent timeout settings, cannot block permanently
- [ ] Agent types are extensible, support user-defined Agents
- [ ] Parallel Agents have resource quotas to prevent system overload

---

## Data Flow

```
1.  User  → Harness:     input
2.  Harness → LLM:       messages[] (rendered full context)
3.  LLM → Harness:       tool_calls
4.  Harness → ToolSystem: execute()
5.  ToolSystem → Hooks → Tools: tool execution
6.  Tools → Hooks → ToolSystem: result
7.  ToolSystem → Harness: tool_result
8.  Harness → Session:    persist message history
9.  Harness ↔ MultiAgent: fork/resume sub-Agent

Loop back to step 2 until LLM returns finish or max_turns reached
```

Key constraints:
- Step 5 internally must execute each tool serially (not in parallel)
- Step 6 result is appended to messages[] before the next Loop iteration
- Step 8 persistence is async, does not slow down Loop execution

---

## Skill Deliverable Structure

```
skills/
└── harness/
    ├── SKILL.md                          ← Skill entry point (required)
    ├── README.md                          ← Complete methodology document
    ├── specs/
    │   ├── layer1-harness-core.md        ← Layer 1 detailed spec
    │   ├── layer2-tool-system.md         ← Layer 2 detailed spec
    │   ├── layer3-plugin-hooks.md        ← Layer 3 detailed spec
    │   └── layer4-multi-agent.md         ← Layer 4 detailed spec
    ├── diagrams/
    │   ├── architecture-overview.drawio  ← Architecture overview
    │   ├── layer-breakdown.drawio         ← Layer breakdown
    │   └── data-flow.drawio              ← Data flow diagram
    └── references/
        ├── claw-code-patterns.md         ← claw-code实战 mapping
        ├── implementation-checklist.md   ← Engineering checklist
        └── common-pitfalls.md           ← Common pitfalls and fixes
```

---

## Verification & Self-Review

- [x] All 4 layers are internally consistent — architecture matches layer descriptions
- [x] No placeholder content (no TBD, TODO, or vague requirements)
- [x] Scope is focused — this is a single implementation plan, no decomposition needed
- [x] Every requirement has a single interpretation, no ambiguity
- [x] Design is approved by user before proceeding to implementation plan
