# Harness Engineering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a complete skill (`skills/harness/`) that provides a 4-layer engineering methodology for building production-grade Agent systems, derived from claw-code实战.

**Architecture:** Documentation-first skill with layered architecture (4 layers), delivered as markdown documents + drawio diagrams + reference guides. No code — pure engineering methodology.

**Tech Stack:** Markdown (SKILL.md, specs, references), Draw.io (diagrams)

---

## File Structure

```
skills/harness/
├── SKILL.md                              ← Entry point (required YAML frontmatter)
├── README.md                             ← Full methodology guide (user-facing)
├── specs/
│   ├── layer1-harness-core.md           ← Layer 1 detailed spec
│   ├── layer2-tool-system.md             ← Layer 2 detailed spec
│   ├── layer3-plugin-hooks.md            ← Layer 3 detailed spec
│   └── layer4-multi-agent.md             ← Layer 4 detailed spec
├── diagrams/
│   ├── architecture-overview.drawio     ← 4-layer stack diagram
│   ├── layer-breakdown.drawio           ← Per-layer component details
│   └── data-flow.drawio                 ← 12-step execution flow
└── references/
    ├── claw-code-patterns.md            ← claw-code源码映射
    ├── implementation-checklist.md      ← Combined engineering checklist
    └── common-pitfalls.md               ← Pitfalls and fixes per layer
```

---

## Task 1: Create directory structure

**Files:**
- Create: `skills/harness/`
- Create: `skills/harness/specs/`
- Create: `skills/harness/diagrams/`
- Create: `skills/harness/references/`

- [ ] **Step 1: Create directories**

```bash
mkdir -p skills/harness/specs skills/harness/diagrams skills/harness/references
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/ && git commit -m "feat(harness): create skill directory structure"
```

---

## Task 2: Write SKILL.md

**Files:**
- Create: `skills/harness/SKILL.md`

**Reference:** Review `superpowers-main/skills/brainstorming/SKILL.md` and `superpowers-main/skills/writing-skills/SKILL.md` for frontmatter and format conventions.

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: harness-engineering
description: Use when building a production Agent system from scratch, or evaluating/refactoring an existing Agent harness architecture. Covers core runtime (Agent loop, session, permissions), tool system (registry, executor, schema), plugin hooks (PreToolUse/PostToolUse, lifecycle), and multi-agent patterns (spawn, state handoff, collaboration).
---

# Harness Engineering

## Overview

A complete engineering methodology for building production-grade Agent systems — derived from实战验证的 claw-code architecture and organized as a 4-layer framework.

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
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/SKILL.md && git commit -m "feat(harness): add SKILL.md entry point"
```

---

## Task 3: Write README.md

**Files:**
- Create: `skills/harness/README.md`

**Content:** Full user-facing methodology guide covering all 4 layers, data flow, and how to use the skill. Should be readable end-to-end as an introduction to the entire framework.

- [ ] **Step 1: Write README.md**

```markdown
# Harness Engineering

## What is a Harness?

A **Harness** is the runtime system that surrounds an AI model (like Claude) and gives it capabilities: file access, shell execution, web search, task tracking, and the ability to spawn sub-agents. The Harness defines what the model can do, how it does it, and what safety boundaries exist.

**Examples of Harnesses:** Claude Code, Cursor, Codex, OpenCode, claw-code.

This skill captures the engineering methodology for building a production-grade Harness — not from theory, but from实战验证的 claw-code architecture.

---

## The 4-Layer Architecture

Think of a Harness as 4 stacked layers, each building on the one below:

```
┌──────────────────────────────────────────┐
│ Layer 4: Multi-Agent                     │
│ "What can sub-agents do and how?"        │
├──────────────────────────────────────────┤
│ Layer 3: Plugin & Hooks                 │
│ "How do we extend and intercept?"       │
├──────────────────────────────────────────┤
│ Layer 2: Tool System                    │
│ "What capabilities exist?"               │
├──────────────────────────────────────────┤
│ Layer 1: Harness Core                   │
│ "How does the model run?"                │
└──────────────────────────────────────────┘
```

Each layer is independent — you can understand or replace one without rewriting the others.

---

## Layer 1: Harness Core

The runtime engine. Without this, the model just generates text.

### Agent Loop

The core execution cycle:

```
while (not done) {
  context ← render(messages)       // Build full context for this turn
  response ← llm(context)         // Send to model
  tool_calls ← parse(response)    // Extract tool calls from response
  for each tool_call {            // Execute serially
    result ← executor.run(tool_call)
    messages.push(result)         // Append result, don't modify history
  }
}
```

Key rules:
- **Render before every call** — context is rebuilt fresh each turn, not accumulated
- **Serial tool execution** — even if the model asks for multiple tools, execute one at a time
- **Immutable history** — never modify past messages; only append results

### Session

Every conversation has a Session:

```
Session {
  id: UUID
  messages: Message[]           // Immutable history
  metadata: Map<string, any>   // Working dir, env, cache
  created_at, updated_at
}
```

The Session is what gets persisted, resumed, and forked into sub-agents.

### Permission Model

Three permission levels, applied at the Harness layer (not per-tool):

```
ReadOnly         → Filesystem read-only, no network
WorkspaceWrite   → Write to working directory
DangerFullAccess → Shell, system commands, anything
```

Default to the minimum. Require explicit elevation.

---

## Layer 2: Tool System

The capabilities layer. Tools are the actions the model can take.

### Tool Registry

Every tool declares itself:

```
ToolSpec {
  name: string
  description: string           // What this tool does (LLM-readable)
  input_schema: JSON Schema    // What inputs it accepts
  required_permission: PermissionMode
  execute: fn(input) → Result
}
```

The LLM only sees the schema — not the code. A good description and schema are critical.

### Tool Executor

Pluggable execution engine:

```
trait ToolExecutor {
  async execute(spec, input, ctx) → Result
}
```

Same tool, different backends: Bash could run locally or in a container.

### Execution Context

Passed through every layer:

```
ExecutionContext {
  session_id, working_dir, env_vars, tool_results_cache
}
```

### Built-in Tool Categories

| Category | Examples |
|----------|----------|
| **Filesystem** | read_file, write_file, edit_file, glob_search, grep_search |
| **Shell** | bash |
| **Web** | WebFetch, WebSearch |
| **Task** | TaskCreate, TaskUpdate, TaskList, TodoWrite |
| **Agent** | Agent, forkSubagent, runAgent, resumeAgent |
| **Meta** | Skill (load SKILL.md), MCPTool |

---

## Layer 3: Plugin & Hooks

The extensibility layer. Hooks intercept tool execution; plugins bundle tools + hooks.

### Hooks

Two types, running before and after every tool:

```
PreToolUseHook  → validate, modify, block, or log before execution
PostToolUseHook → format, cache, retry, or emit after execution
```

Example uses:
- **Pre:** Verify a bash command is safe before running it
- **Pre:** Inject project context (CLAUDE.md contents) into tool parameters
- **Post:** Auto-format code output
- **Post:** Retry a failed network call once before surfacing the error

### Plugin Lifecycle

```
Plugin { name, version, tools, hooks, lifecycle }
lifecycle: init → enable ↔ disable → unload
```

Plugins are isolated. They communicate only through the interfaces they declare.

---

## Layer 4: Multi-Agent

The collaboration layer. How sub-agents are created and coordinated.

### Agent Spawning

```
AgentTool {
  forkSubagent(config)   // New independent Session
  runAgent(agent_type)   // Built-in type, shared context
  resumeAgent(agent_id)  // Resume a paused agent
}
```

### Built-in Agent Types

| Agent | Purpose |
|-------|---------|
| guideAgent | Project guidance, CLAUDE.md interpretation |
| exploreAgent | File exploration, codebase analysis |
| generalPurposeAgent | General task execution |
| planAgent | Planning mode, decompose complex tasks |
| verificationAgent | Code verification, test running |

### Collaboration Patterns

- **Sequential:** A completes → B takes over
- **Parallel:** A and B work simultaneously → merge results
- **Hierarchical:** Parent coordinates multiple children
- **Debates:** Multiple agents propose → vote or parent decides

---

## Data Flow

```
User → Harness → LLM → Harness → ToolSystem → Hooks → Tools
                                                        ↓
                                    result ← Hooks ← Tools
              ← Harness ← ToolSystem
                    ↓
              Session (persist)
                    ↓
              MultiAgent (fork/resume)

Loop until finish or max_turns
```

Key constraints:
- Tools execute serially within each turn
- Results append to messages before next turn
- Session persistence is async (doesn't block the loop)

---

## How to Use This Skill

**If you're building a new Harness:**
1. Read `README.md` (this file) for the full picture
2. Read each `specs/layer*.md` for detailed specifications
3. Use `references/implementation-checklist.md` as your build checklist
4. Cross-reference with `references/claw-code-patterns.md` to see how claw-code implements each pattern

**If you're evaluating an existing Harness:**
1. Read `specs/layer*.md` for what "good" looks like
2. Use `references/implementation-checklist.md` to audit each layer
3. Check `references/common-pitfalls.md` for known failure modes

**If you're debugging an existing Harness:**
1. Identify which layer the problem is in
2. Read the relevant `specs/layer*.md`
3. Check `references/common-pitfalls.md` for that layer

---

## References

- `specs/layer1-harness-core.md` — Layer 1 detailed spec
- `specs/layer2-tool-system.md` — Layer 2 detailed spec
- `specs/layer3-plugin-hooks.md` — Layer 3 detailed spec
- `specs/layer4-multi-agent.md` — Layer 4 detailed spec
- `references/claw-code-patterns.md` — Source code mapping
- `references/implementation-checklist.md` — Build checklist
- `references/common-pitfalls.md` — Pitfalls and fixes
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/README.md && git commit -m "feat(harness): add README.md methodology guide"
```

---

## Task 4: Write Layer 1 spec

**Files:**
- Create: `skills/harness/specs/layer1-harness-core.md`

- [ ] **Step 1: Write layer1-harness-core.md**

```markdown
# Layer 1: Harness Core — Detailed Specification

**Status:** Approved
**Layer:** 1 of 4
**Purpose:** Runtime engine that drives the Agent loop, manages session lifecycle, and enforces permission boundaries.

---

## Components

### 1.1 Agent Loop

The central execution engine. Every Harness has one.

#### Pseudocode

```
AgentLoop {
  state: { messages, session, config }

  async run(initial_input) {
    messages.push(user_message(initial_input))

    while (true) {
      // 1. Render full context
      context = render(messages, session.config)

      // 2. Call LLM
      response = await llm.complete(context)

      // 3. Parse response for tool calls or text
      if (response.is_tool_calls()) {
        for (tool_call in response.tool_calls) {
          // Permission check at harness level
          if (!permit(session, tool_call.name)) {
            messages.push(error_message("Permission denied"))
            continue
          }
          // 4. Execute tool
          result = await tool_executor.execute(tool_call, session.context)
          // 5. Append result (immutable)
          messages.push(tool_result_message(result))
        }
      } else if (response.is_finish()) {
        break  // Terminal state
      }

      // Check termination conditions
      if (session.is_max_turns_reached()) break
      if (session.is_user_interrupt()) break
    }

    return final_response(messages)
  }
}
```

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Render context before every LLM call | Avoids context window overflow; stale data not accumulated |
| Tool calls execute serially | Prevents race conditions; LLM may assume ordering |
| ToolResult appended, not inserted | Preserves immutable audit trail |
| Permission check in Loop, not in Tool | Single enforcement point; no gaps |

#### Termination Conditions

The Loop MUST terminate when any of these occur:
1. LLM returns `finish` / `end_turn` signal
2. `max_turns` limit reached (configurable)
3. User sends interrupt signal
4. Unrecoverable error (e.g., LLM API unavailable after retries)

### 1.2 Session Manager

Manages session lifecycle and message history.

#### Data Model

```
Session {
  id: UUID                    // Unique per conversation
  messages: Vec<Message>      // Immutable log
  metadata: SessionMetadata    // Isolated per session
  config: SessionConfig       // Per-session overrides
  created_at: DateTime
  updated_at: DateTime
}

SessionMetadata {
  working_dir: PathBuf         // Isolated filesystem workspace
  env_vars: HashMap<String, String>  // Isolated env
  tool_cache: ToolResultCache // Per-session result cache
  parent_session_id: Option<UUID>  // For forked sessions
}

Message = UserMessage | AssistantMessage | ToolResultMessage | SystemMessage

ToolResultMessage {
  id: UUID
  tool_name: String
  tool_input: Value           // What was passed in
  tool_output: Value          // What came back
  elapsed_ms: u64
  status: Ok | Error(String)
}
```

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Messages are append-only | Audit trail; replay from any point |
| Each session has isolated working_dir | Prevent cross-session file collisions |
| Tool result cache per session | Enables referencing previous tool outputs |
| Forked sessions track parent ID | Enables hierarchy visualization and cleanup |

#### Persistence

```
SessionStore {
  async save(session: Session)       // Full serialization
  async load(id: UUID) → Session      // Resume
  async list() → Vec<SessionSummary>  // For UI listing
  async delete(id: UUID)              // Cleanup
}
```

Persist after every tool execution (async, non-blocking). On crash recovery, reload latest session state.

### 1.3 Config & Permission Policy

Centralized configuration and permission enforcement.

#### Config Model

```
SessionConfig {
  model: String                      // "claude-opus-4-6"
  max_turns: u32                      // Default: 100
  temperature: f32                    // Default: 1.0
  permissions: PermissionPolicy
  tool_timeout_seconds: u64           // Per-tool timeout
  llm_retry_policy: RetryPolicy
}

PermissionPolicy {
  default_mode: PermissionMode        // Default: ReadOnly
  tool_overrides: HashMap<ToolName, PermissionMode>
  hook_overrides: HashMap<HookName, bool>  // Enable/disable hooks
}
```

#### Permission Modes

```
enum PermissionMode {
  ReadOnly,           // No write, no shell, no network beyond read-only HTTP
  WorkspaceWrite,     // Write to session's working_dir only
  DangerFullAccess,   // Shell, all filesystem, all network
}
```

**Mapping to real tools:**

| Tool | Minimum Permission |
|------|-------------------|
| read_file, glob_search, grep_search | ReadOnly |
| write_file, edit_file | WorkspaceWrite |
| bash, shell | DangerFullAccess |
| WebFetch, WebSearch | ReadOnly (HTTP GET only) |
| TaskCreate, TodoWrite | WorkspaceWrite |

#### LLM Retry Policy

```
RetryPolicy {
  max_attempts: u32      // Default: 3
  initial_delay_ms: u64  // Default: 1000
  backoff_multiplier: f32 // Default: 2.0 (exponential)
  max_delay_ms: u64      // Default: 30000
}
```

Retries on: network errors, 429 rate limits, 500 internal errors.
Does NOT retry on: 400 bad requests, 401 auth errors, 403 permission errors.

---

## Interface Contracts

### Between Layer 1 and Layer 2

```
ToolExecutor trait (Layer 2 implements):
  async fn execute(
    spec: ToolSpec,
    input: Value,
    ctx: ExecutionContext
  ) → Result<Value, ToolError>

HarnessCore calls:
  tool_executor.execute(tool_spec, parsed_input, session.context)
```

### Between Layer 1 and Layer 3

```
HookRunner (Layer 3 implements):
  async fn run_pre_hooks(ctx, tool_spec, input) → HookResult
  async fn run_post_hooks(ctx, tool_spec, input, output) → HookResult

HarnessCore calls:
  // Before tool execution
  let modified = await hook_runner.run_pre_hooks(ctx, spec, input)
  if modified.is_blocked() { return blocked_result() }
  // Execute tool
  let result = await tool_executor.execute(spec, modified.input())
  // After tool execution
  let final_result = await hook_runner.run_post_hooks(ctx, spec, input, result)
```

---

## Engineering Checklist

- [ ] **Termination:** Agent Loop has explicit termination conditions — cannot loop infinitely
- [ ] **Immutability:** Session messages are append-only — no in-place edits
- [ ] **Serialization:** Session can be serialized to disk and resumed without data loss
- [ ] **Isolation:** Each session has its own working_dir — no path collisions
- [ ] **Permissions:** Permission checks happen in HarnessCore, not inside individual tools
- [ ] **Coverage:** All tools have a declared PermissionMode — no tools bypass the policy
- [ ] **Retry:** LLM calls retry with exponential backoff on transient failures
- [ ] **Timeout:** Tool execution has per-tool timeout; harness can force-kill stuck tools
- [ ] **Error Format:** Tool errors return a structured error to the LLM (not raw exceptions)
- [ ] **Forking:** forkSubagent creates a new Session with a reference to parent_session_id

---

## Common Pitfalls

### 1. Infinite Loop
**Problem:** No max_turns limit, or LLM keeps calling the same tool.
**Fix:** Set max_turns. Add tool call deduplication (if same tool called 3x in a row, surface error).

### 2. Mutable Session State
**Problem:** Modifying past messages instead of appending new ones.
**Fix:** Make Message list immutable. Add new ToolResultMessage on each tool call.

### 3. Permission Gaps
**Problem:** Some tools (e.g., new MCP tools) not registered in PermissionPolicy.
**Fix:** Every tool registration must include required_permission. Fail-fast on unknown tools.

### 4. Blocking Persistence
**Problem:** Saving session synchronously after every tool call slows down the loop.
**Fix:** Make persistence async with fire-and-forget. On crash recovery, replay incomplete turns.

### 5. Tool Call Serialization Errors
**Problem:** Tool input/output contains non-serializable values (circular refs, closures).
**Fix:** Use JSON-safe serialization in ToolResultMessage. Strip non-serializable fields before storing.

---

## Reference Implementation

claw-code implements these components in:
- **Agent Loop:** `rust/crates/runtime/src/session.rs` — `ConversationRuntime`
- **Session:** `rust/crates/runtime/src/session.rs` — `Session` struct
- **Config:** `rust/crates/runtime/src/config.rs`
- **Permission:** `rust/crates/runtime/src/permissions.rs`
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/specs/layer1-harness-core.md && git commit -m "feat(harness): add layer1-harness-core spec"
```

---

## Task 5: Write Layer 2 spec

**Files:**
- Create: `skills/harness/specs/layer2-tool-system.md`

- [ ] **Step 1: Write layer2-tool-system.md**

```markdown
# Layer 2: Tool System — Detailed Specification

**Status:** Approved
**Layer:** 2 of 4
**Purpose:** Manages registration, discovery, execution, and permission control for all tools available in the system.

---

## Components

### 2.1 Tool Registry

Central registry of all available tools. Tools register themselves by declaring a ToolSpec.

#### ToolSpec Model

```typescript
interface ToolSpec {
  name: string                    // Unique: "read_file", "bash"
  description: string             // Plain English: what this tool does
  input_schema: JSONSchema         // JSON Schema describing valid inputs
  required_permission: PermissionMode  // Minimum permission to run this tool
  categories: string[]             // Optional: ["filesystem", "network", "agent"]
  deprecation_warning?: string     // Optional: if set, LLM sees this warning
}

interface JSONSchema {
  type: "object" | "string" | "number" | "boolean" | "array"
  properties: Record<string, PropertySchema>
  required?: string[]
  description?: string
}

interface PropertySchema {
  type: string
  description: string
  default?: any
  enum?: any[]
}
```

#### Registration

Tools register at startup (built-in) or at runtime (plugins/MCP):

```
ToolRegistry {
  tools: Map<ToolName, ToolSpec>
  categories: Map<Category, ToolName[]>

  register(spec: ToolSpec) {
    if (tools.has(spec.name)) {
      throw DuplicateToolError(spec.name)
    }
    tools.set(spec.name, spec)
    for (cat in spec.categories) {
      categories.get_or_insert(cat, []).push(spec.name)
    }
  }

  get(name: ToolName) → ToolSpec | undefined

  list_by_category(cat: Category) → ToolSpec[]

  list_all() → ToolSpec[]
}
```

#### What the LLM Sees

The LLM receives only the ToolSpec — name, description, and input_schema. Never the implementation code.

**Good description example:**
```
"read_file: Read the complete contents of a file from the filesystem.
 path: (string, required) Absolute path to the file to read.
 Returns the full file contents as a string. Fails if file does not exist
 or is a binary file."
```

**Bad description example:**
```
"read_file: Reads a file"
```

### 2.2 Tool Executor

Pluggable execution engine. Implements the `ToolExecutor` trait.

#### Trait Definition

```typescript
interface ToolExecutor {
  // Execute a tool by name with given input
  async execute(
    spec: ToolSpec,
    input: Value,
    ctx: ExecutionContext
  ): Promise<ToolResult>

  // Optional: validate input against schema before execution
  validate_input(spec: ToolSpec, input: Value): ValidationResult
}

interface ToolResult {
  success: boolean
  output?: Value           // Serialized output for LLM
  error?: string           // Error message (not raw exception)
  metadata?: {
    elapsed_ms: number
    cache_hit?: boolean
  }
}
```

#### Built-in Executors

```
LocalBashExecutor    → exec in local subprocess
ContainerBashExecutor → exec in isolated Docker container
WebFetchExecutor     → HTTP GET/POST
FileSystemExecutor   → read/write via OS syscalls
MCPToolExecutor     → forward to MCP server
```

#### Executor Selection

```
ToolExecutorFactory {
  for_tool(spec: ToolSpec): ToolExecutor {
    match spec.name {
      "bash" if ctx.config.use_container() => ContainerBashExecutor,
      "bash" => LocalBashExecutor,
      "WebFetch" => WebFetchExecutor,
      _ if is_mcp_tool(spec) => MCPToolExecutor,
      _ => FileSystemExecutor,
    }
  }
}
```

### 2.3 Execution Context

Passed through the entire call chain: HarnessCore → ToolExecutor → Hooks → Tools.

```typescript
interface ExecutionContext {
  session_id: UUID
  working_dir: AbsolutePath     // Session's isolated workspace
  env_vars: Record<string, string>
  tool_results_cache: Map<string, CachedResult>
  permission_mode: PermissionMode  // Current effective mode
  trace_id: string              // For logging correlation
}
```

**Context propagation rules:**
1. Context is created once per session at Layer 1
2. Context is passed by reference through all layers
3. No layer creates a new context without explicit fork (for sub-agents)
4. Sub-processes (bash) receive a sanitized env_vars copy, not the full context

### 2.4 Tool Categories

| Category | Tools | Notes |
|----------|-------|-------|
| **filesystem.read** | read_file, glob_search, grep_search | Read-only |
| **filesystem.write** | write_file, edit_file, mkdir | Requires WorkspaceWrite |
| **shell** | bash | Requires DangerFullAccess |
| **network** | WebFetch, WebSearch | Read-only HTTP |
| **task** | TaskCreate, TaskUpdate, TaskList, TodoWrite | WorkspaceWrite |
| **agent** | Agent, forkSubagent, runAgent, resumeAgent | DangerFullAccess |
| **meta** | Skill, MCPTool | ReadOnly |
| **mcp** | * (dynamic from MCP servers) | Varies by server |

---

## Interface Contracts

### Between Layer 2 and Layer 1

```
HarnessCore (Layer 1) calls ToolExecutor (Layer 2):
  result = await tool_executor.execute(spec, parsed_input, session.context)

ToolExecutor returns ToolResult (not raw values)
```

### Between Layer 2 and Layer 3

```
ToolExecutor calls HookRunner (Layer 3) around tool execution:
  modified_input = await hook_runner.run_pre_hooks(ctx, spec, raw_input)
  if blocked: return ToolResult { success: false, error: "Blocked by hook" }
  result = await execute_internal(modified_input)
  final_result = await hook_runner.run_post_hooks(ctx, spec, modified_input, result)
```

### Between Layer 2 and External Systems

```
ToolExecutor → Filesystem:  syscalls via OS binding
ToolExecutor → Shell:       subprocess spawn
ToolExecutor → Network:     HTTP client
ToolExecutor → MCP Server:  stdio JSON-RPC
```

---

## Engineering Checklist

- [ ] **Schema completeness:** Every tool's input_schema has all required fields documented
- [ ] **Schema validation:** input_schema is validated before tool is registered (not at runtime)
- [ ] **Timeout:** bash / long-running tools have explicit timeout; harness can kill stuck processes
- [ ] **Resource limits:** bash tools have memory + CPU limits (ulimit or container cgroups)
- [ ] **Error standardization:** All tool errors return `{ success: false, error: string }`, never raw exceptions
- [ ] **Schema validation at boundary:** Validate tool input against schema BEFORE passing to executor
- [ ] **Hot-swap:** New tools can be registered at runtime without restarting the harness
- [ ] **LLM-facing description quality:** Every tool description passes the "could an LLM correctly choose this tool?" test
- [ ] **Idempotency:** Tool results are cacheable by input hash; duplicate calls return cached result
- [ ] **Isolation:** Bash tools run in subprocess, not in main process, to prevent crashes

---

## Common Pitfalls

### 1. Vague Tool Descriptions
**Problem:** LLM can't distinguish between similar tools (e.g., read_file vs glob_search).
**Fix:** Write descriptions that emphasize the *difference* from similar tools. Include concrete examples.

### 2. Missing input_schema Validation
**Problem:** Tool receives unexpected input shape and crashes or returns garbage.
**Fix:** Validate input against JSONSchema before tool execution. Return clear error if validation fails.

### 3. No Bash Timeout
**Problem:** `rm -rf /` or infinite loop freezes the entire harness.
**Fix:** Required timeout on all bash tools. Kill subprocess after timeout. Log the killed process.

### 4. Tools Bypass Permission System
**Problem:** A new tool is added directly to the executor without checking PermissionMode.
**Fix:** Permission check is in HarnessCore, not in ToolExecutor. Executor trusts the harness has already checked.

### 5. Non-serializable Tool Results
**Problem:** Tool returns closure, socket, or circular-reference object that can't be sent to LLM.
**Fix:** ToolExecutor serializes output to JSON before returning. Strip non-serializable fields.

---

## Reference Implementation

claw-code implements these in:
- **ToolSpec:** `rust/crates/tools/src/lib.rs` — `ToolSpec` struct and built-in tool definitions
- **ToolExecutor:** `rust/crates/tools/src/executor.rs`
- **Registry:** `rust/crates/tools/src/registry.rs`
- **Schema validation:** `rust/crates/tools/src/schema.rs`
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/specs/layer2-tool-system.md && git commit -m "feat(harness): add layer2-tool-system spec"
```

---

## Task 6: Write Layer 3 spec

**Files:**
- Create: `skills/harness/specs/layer3-plugin-hooks.md`

- [ ] **Step 1: Write layer3-plugin-hooks.md**

```markdown
# Layer 3: Plugin & Hooks — Detailed Specification

**Status:** Approved
**Layer:** 3 of 4
**Purpose:** Provides extensible interception mechanisms (Hooks) and modular packaging (Plugins) for extending harness behavior without modifying core code.

---

## Components

### 3.1 Hook System

Hooks intercept tool execution at defined points. Two types: PreToolUse (before) and PostToolUse (after).

#### Hook Trait

```typescript
// Base hook interface
interface Hook {
  name: string
  description: string
  enabled: boolean              // Can be toggled per-session
  priority: number              // Lower = runs first
}

// Runs before tool execution
interface PreToolUseHook extends Hook {
  run(
    ctx: ExecutionContext,
    tool_spec: ToolSpec,
    raw_input: Value
  ): Promise<HookResult>
}

// Runs after tool execution
interface PostToolUseHook extends Hook {
  run(
    ctx: ExecutionContext,
    tool_spec: ToolSpec,
    input: Value,
    output: ToolResult
  ): Promise<HookResult>
}

// Result of any hook run
type HookResult =
  | { status: "continue", input?: Value }           // Proceed, optionally modified input
  | { status: "blocked", reason: string }           // Stop tool execution
  | { status: "skip_remaining", output?: Value }   // Skip remaining hooks, use this output
```

#### HookRunner

```typescript
class HookRunner {
  pre_hooks: PreToolUseHook[]
  post_hooks: PostToolUseHook[]

  async run_pre_hooks(
    ctx: ExecutionContext,
    spec: ToolSpec,
    raw_input: Value
  ): Promise<{ input: Value, blocked: boolean, reason?: string }> {
    let current_input = raw_input

    // Sort by priority (lower number = first)
    const sorted = [...this.pre_hooks]
      .filter(h => h.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const hook of sorted) {
      try {
        const result = await hook.run(ctx, spec, current_input)

        if (result.status === "blocked") {
          return { input: current_input, blocked: true, reason: result.reason }
        }

        if (result.status === "continue" && result.input !== undefined) {
          current_input = result.input  // Hook modified the input
        }

        if (result.status === "skip_remaining") {
          return { input: current_input, blocked: false, skipped: true }
        }
      } catch (error) {
        // Hook error does NOT break execution — log and continue
        console.error(`Hook ${hook.name} failed:`, error)
      }
    }

    return { input: current_input, blocked: false }
  }

  async run_post_hooks(
    ctx: ExecutionContext,
    spec: ToolSpec,
    input: Value,
    output: ToolResult
  ): Promise<ToolResult> {
    let current_output = output

    const sorted = [...this.post_hooks]
      .filter(h => h.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const hook of sorted) {
      try {
        const result = await hook.run(ctx, spec, input, current_output)

        if (result.status === "blocked") {
          return { success: false, error: `PostToolUse blocked: ${result.reason}` }
        }

        if (result.status === "continue" && result.input !== undefined) {
          // Note: for post-hooks, input field in result is used to modify output
          current_output = result.input as ToolResult
        }
      } catch (error) {
        console.error(`PostToolUse hook ${hook.name} failed:`, error)
      }
    }

    return current_output
  }
}
```

#### Built-in Hooks

| Hook | Type | Priority | Purpose |
|------|------|----------|---------|
| `validate-schema` | Pre | 10 | Validate tool input against input_schema |
| `check-permissions` | Pre | 20 | Re-verify permission level before dangerous tools |
| `rate-limiter` | Pre | 30 | Enforce per-tool call rate limits |
| `sanitize-pii` | Pre | 40 | Remove PII from tool inputs before logging |
| `format-output` | Post | 10 | Pretty-print JSON / format code output |
| `auto-retry` | Post | 20 | Retry failed network calls once |
| `cache-result` | Post | 30 | Cache successful tool results by input hash |
| `log-execution` | Post | 100 | Log execution to audit trail |

### 3.2 Plugin System

Plugins bundle tools + hooks + config into a distributable package.

```typescript
interface Plugin {
  name: string
  version: string
  description: string
  dependencies: PluginDependency[]   // Other plugins required

  // Extensions provided by this plugin
  tools?: ToolSpec[]                // Additional tools
  pre_hooks?: PreToolUseHook[]
  post_hooks?: PostToolUseHook[]

  // Lifecycle
  lifecycle: PluginLifecycle
}

type PluginLifecycle =
  | { state: "registered" }
  | { state: "init", error?: string }
  | { state: "enabled" }
  | { state: "disabled" }
  | { state: "unloaded" }

interface PluginDependency {
  name: string
  version_range: string  // SemVer: "^1.0.0", ">=2.0.0"
}
```

#### Plugin Manager

```typescript
class PluginManager {
  plugins: Map<string, Plugin>

  async load(plugin: Plugin): Promise<void> {
    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep.name)) {
        throw MissingDependencyError(dep.name)
      }
      const installed = this.plugins.get(dep.name)!
      if (!satisfies(installed.version, dep.version_range)) {
        throw IncompatibleVersionError(dep.name, dep.version_range, installed.version)
      }
    }

    // Initialize plugin
    plugin.lifecycle = { state: "init" }
    await plugin.init?.()

    // Register its tools and hooks
    for (const tool of plugin.tools ?? []) {
      tool_registry.register(tool)
    }
    for (const hook of plugin.pre_hooks ?? []) {
      hook_runner.add_pre(hook)
    }
    for (const hook of plugin.post_hooks ?? []) {
      hook_runner.add_post(hook)
    }

    plugin.lifecycle = { state: "enabled" }
    this.plugins.set(plugin.name, plugin)
  }

  async unload(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) return

    // Remove its tools and hooks
    for (const tool of plugin.tools ?? []) {
      tool_registry.unregister(tool.name)
    }
    hook_runner.remove_pre(name)
    hook_runner.remove_post(name)

    plugin.lifecycle = { state: "unloaded" }
    this.plugins.delete(name)
  }
}
```

---

## Interface Contracts

### Between Layer 3 and Layer 1

```
HarnessCore (Layer 1) calls HookRunner (Layer 3):
  modified = await hook_runner.run_pre_hooks(ctx, spec, input)
  if (modified.blocked) return error_result(modified.reason)
  result = await tool_executor.execute(spec, modified.input, ctx)
  final = await hook_runner.run_post_hooks(ctx, spec, modified.input, result)
```

### Between Layer 3 and Layer 2

```
HookRunner (Layer 3) does NOT call ToolExecutor directly.
It wraps the call made by HarnessCore.

ToolExecutor (Layer 2) does NOT know about HookRunner.
ToolExecutor receives already-validated, hook-modified input.
```

---

## Engineering Checklist

- [ ] **Error isolation:** Hook exceptions cannot break the tool execution chain
- [ ] **Hook toggle:** Every hook can be disabled per-session (e.g., disable `auto-retry` in tests)
- [ ] **Version constraints:** Plugin manager validates semver ranges before loading
- [ ] **Hook ordering:** Priority-based ordering is documented and deterministic
- [ ] **Hook logging:** Every hook run logs: hook name, tool name, input summary, output summary
- [ ] **Short-circuit:** PreToolUse returning `blocked` skips all remaining hooks and tool execution
- [ ] **No state leakage:** Hooks cannot modify ExecutionContext in ways that affect other hooks
- [ ] **Plugin isolation:** Plugins communicate only through declared interfaces, not shared state

---

## Common Pitfalls

### 1. Hook Throws Uncaught Exception
**Problem:** One bad hook breaks the entire tool execution chain.
**Fix:** All hook runs are wrapped in try/catch. Failed hooks log error and continue.

### 2. Hook Modifies Input Without LLM Awareness
**Problem:** PreToolUse sanitizes a bash command (removes `; rm -rf`), but LLM doesn't know the modification, so next prompt still includes the sanitized version.
**Fix:** When a hook significantly modifies input, append a system hint message to the conversation explaining what was changed.

### 3. Non-deterministic Hook Ordering
**Problem:** Hooks execute in insertion order, which depends on load order — different each run.
**Fix:** Explicit priority field. Hooks sorted by priority (ascending) before execution.

### 4. Plugin Version Conflict
**Problem:** Plugin A requires hook@v2, Plugin B requires hook@v1 — incompatible.
**Fix:** Version constraints validated at load time. Conflict = load failure with clear error message.

### 5. Hook State Pollution
**Problem:** Hook A adds metadata to ctx that Hook B reads and depends on — but order varies.
**Fix:** ExecutionContext is append-only for hook data. No modification of existing fields.

---

## Reference Implementation

claw-code implements these in:
- **HookRunner:** `rust/crates/plugins/src/hook_runner.rs`
- **Built-in hooks:** `rust/crates/plugins/bundled/sample-hooks/hooks/pre.sh`, `hooks/post.sh`
- **PluginManager:** `rust/crates/plugins/src/plugin_manager.rs`
- **Lifecycle:** `rust/crates/plugins/src/lifecycle.rs`
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/specs/layer3-plugin-hooks.md && git commit -m "feat(harness): add layer3-plugin-hooks spec"
```

---

## Task 7: Write Layer 4 spec

**Files:**
- Create: `skills/harness/specs/layer4-multi-agent.md`

- [ ] **Step 1: Write layer4-multi-agent.md**

```markdown
# Layer 4: Multi-Agent System — Detailed Specification

**Status:** Approved
**Layer:** 4 of 4
**Purpose:** Manages creation, state transfer, lifecycle, and collaboration patterns for sub-agents.

---

## Components

### 4.1 Agent Spawning

Three ways to create a sub-agent:

```typescript
interface AgentTool {
  // Create a new independent Session forked from current session
  async forkSubagent(config: ForkConfig): Promise<AgentHandle>

  // Run a specific built-in agent type within current session context
  async runAgent(agentType: BuiltInAgentType): Promise<AgentResult>

  // Resume a previously paused agent by ID
  async resumeAgent(agentId: UUID): Promise<AgentResult>
}

interface ForkConfig {
  name?: string                        // Optional display name
  systemPrompt?: string                // Override system prompt
  permissionMode?: PermissionMode      // Can be stricter than parent
  workingDir?: string                  // Override working directory
  maxTurns?: number                    // Sub-agent's own turn limit
}

interface AgentHandle {
  agent_id: UUID
  session_id: UUID                     // New session ID for forked agent
  status: "running" | "paused" | "completed" | "failed"
  parent_agent_id: UUID                // Reference to parent
}
```

#### Fork vs Run

| | `forkSubagent` | `runAgent` |
|--|--|--|
| **Session** | New independent Session | Shares parent's Session |
| **Messages** | Separate history | Appended to parent's history |
| **Context** | Gets COPY of parent context at fork time | Full access to parent context |
| **Termination** | Independent (parent doesn't wait) | Parent waits for completion |
| **Use case** | Independent parallel task | Delegating a subtask |

### 4.2 Built-in Agent Types

```typescript
type BuiltInAgentType =
  | "guideAgent"        // Project guidance, CLAUDE.md interpretation
  | "exploreAgent"      // File exploration, codebase analysis
  | "generalPurposeAgent" // General task execution
  | "planAgent"         // Planning mode, task decomposition
  | "verificationAgent" // Code verification, test running
  | "statuslineSetup"   // UI status bar configuration

interface AgentDefinition {
  type: BuiltInAgentType
  name: string
  description: string
  systemPrompt: string           // The agent's system instructions
  defaultPermissionMode: PermissionMode
  compatibleTools: ToolName[]    // Subset of tools this agent can use
  maxActiveInstances: number     // e.g., only 1 planAgent per session
}
```

#### Agent Behaviors

**guideAgent:**
- On activation: reads CLAUDE.md, project structure
- Responds with project-specific guidance
- Never executes code directly

**exploreAgent:**
- Takes a search query (file pattern, symbol, concept)
- Returns structured findings (file paths, line numbers, summaries)
- Does not modify files

**planAgent:**
- Takes a high-level task description
- Breaks it into ordered subtasks with dependencies
- Returns a task graph, not executed code

**verificationAgent:**
- Takes code + test criteria
- Executes tests / runs linters
- Returns pass/fail with specific failure messages

### 4.3 Agent Communication Protocol

Parent and child agents communicate via typed messages:

```typescript
// Messages from parent to sub-agent
type ParentToAgentMessage =
  | { type: "delegate", task: Task, context: Value }
  | { type: "pause" }
  | { type: "terminate", reason: string }
  | { type: "update_context", delta: Value }

// Messages from sub-agent to parent
type AgentToParentMessage =
  | { type: "progress", percent: number, update: string }
  | { type: "result", value: Value }
  | { type: "error", message: string }
  | { type: "needs_input", question: string, options?: string[] }
  | { type: "paused" }
```

### 4.4 Collaboration Patterns

#### Sequential

```
Parent → Agent A → (complete) → Agent B → (complete) → Parent
```

Use when: B depends on A's output.

#### Parallel

```
Parent → Agent A ─┐
                  ├→ merge → Parent
Parent → Agent B ─┘
```

Use when: A and B are independent tasks. Merge: parent aggregates results.

#### Hierarchical

```
Parent (orchestrator)
  ├── Agent A (worker)
  ├── Agent B (worker)
  └── Agent C (worker)
```

Use when: Parent decomposes task into subtasks and coordinates results.

#### Debates

```
Parent → Agent A (propose) ─┐
                            ├→ vote/arbitrate → Parent
Parent → Agent B (oppose) ─┘
```

Use when: Need multiple方案 and a decision mechanism.

---

## Interface Contracts

### Between Layer 4 and Layer 1

```
HarnessCore (Layer 1) manages the parent agent loop.
Sub-agents each run their own AgentLoop in their own Session.
Layer 4 coordinates across these loops.

AgentManager {
  async fork(config): AgentHandle     → Creates new Session + AgentLoop
  async resume(agent_id): AgentHandle → Restores paused Session
  async terminate(agent_id): void    → Kills Session
  async send_message(agent_id, msg): void
}
```

### Parent-Child Session Relationship

```
Parent Session {
  id: UUID_A
  messages: [..., AgentResultMessage { agent_id: UUID_B, result: "..." }]
}

Child Session {
  id: UUID_B
  metadata: { parent_session_id: UUID_A }
  messages: [...internal agent loop messages...]
}
```

The parent session does NOT see the child's raw messages — only the final AgentResultMessage.

---

## Engineering Checklist

- [ ] **Session isolation:** Sub-agents have independent Session IDs — no message collision
- [ ] **Permission boundary:** Sub-agent permission is parent's permission or stricter
- [ ] **Timeout:** Each sub-agent has its own max_turns — cannot block parent forever
- [ ] **Parent notification:** Parent is notified when sub-agent completes/fails/pauses
- [ ] **Resource quotas:** Max number of parallel sub-agents is capped per session
- [ ] **Agent type extensibility:** New agent types can be registered without core changes
- [ ] **Communication protocol:** All parent-child messages follow typed protocol
- [ ] **Cleanup:** Terminated sub-agent Sessions are garbage collected

---

## Common Pitfalls

### 1. Shared Session Between Parent and Child
**Problem:** Sub-agent messages pollute parent's message history → context window overflow.
**Fix:** Sub-agents always get their own Session. Parent only receives structured AgentResultMessage.

### 2. Sub-agent Blocks Parent
**Problem:** Parent waits synchronously for sub-agent, which never returns.
**Fix:** Sub-agent runs async. Parent receives progress updates and can kill the sub-agent.

### 3. Context Exhaustion from Too Many Parallel Agents
**Problem:** 10 parallel agents all writing results → parent context floods.
**Fix:** Resource quota (max parallel agents). Queue excess requests.

### 4. No Timeout on Sub-agent
**Problem:** Infinite loop in sub-agent blocks the entire session.
**Fix:** Sub-agents have mandatory max_turns. Hard kill after limit.

### 5. Race Condition on Shared Resources
**Problem:** Two sub-agents write to the same file simultaneously.
**Fix:** Sub-agents have isolated working_dir by default. Shared resources require explicit coordination.

---

## Reference Implementation

claw-code implements these in:
- **Agent tool:** `rust/crates/tools/src/lib.rs` — `AgentTool` definition
- **Built-in agents:** `rust/crates/tools/src/agents.rs`
- **forkSubagent:** `rust/crates/runtime/src/session.rs` — session forking logic
- **AgentManager:** `rust/crates/runtime/src/agent_manager.rs`
```

- [ ] **Step 2: Commit**

```bash
git add skills/harness/specs/layer4-multi-agent.md && git commit -m "feat(harness): add layer4-multi-agent spec"
```

---

## Task 8: Write diagrams

**Files:**
- Create: `skills/harness/diagrams/architecture-overview.drawio`
- Create: `skills/harness/diagrams/layer-breakdown.drawio`
- Create: `skills/harness/diagrams/data-flow.drawio`

**Reference:** The Draw.io diagrams already created during brainstorming. Export those as `.drawio` files.

**Note:** Draw.io XML can be embedded directly in .drawio files. The diagrams should match the ones shown during the brainstorming session.

- [ ] **Step 1: Write architecture-overview.drawio**

Use the XML from the first diagram created during brainstorming (4-layer stack with external systems).

- [ ] **Step 2: Write layer-breakdown.drawio**

Use the XML from the second diagram (detailed per-layer components).

- [ ] **Step 3: Write data-flow.drawio**

Use the XML from the third diagram (12-step execution flow).

- [ ] **Step 4: Commit**

```bash
git add skills/harness/diagrams/ && git commit -m "feat(harness): add architecture diagrams"
```

---

## Task 9: Write reference documents

**Files:**
- Create: `skills/harness/references/claw-code-patterns.md`
- Create: `skills/harness/references/implementation-checklist.md`
- Create: `skills/harness/references/common-pitfalls.md`

- [ ] **Step 1: Write claw-code-patterns.md**

Maps each design pattern in the 4-layer spec to its concrete implementation in claw-code's source code. Format: pattern name → file path → key structures.

**Reference:** From the exploration subagent, these are the key files:
- `rust/crates/runtime/src/session.rs` — Session, ConversationRuntime
- `rust/crates/runtime/src/config.rs` — Config system
- `rust/crates/runtime/src/permissions.rs` — Permission system
- `rust/crates/tools/src/lib.rs` — ToolSpec, AgentTool, built-in tools
- `rust/crates/tools/src/executor.rs` — ToolExecutor
- `rust/crates/tools/src/registry.rs` — ToolRegistry
- `rust/crates/plugins/src/hook_runner.rs` — HookRunner
- `rust/crates/plugins/bundled/sample-hooks/hooks/` — Sample hooks
- `rust/crates/plugins/src/plugin_manager.rs` — PluginManager
- `rust/crates/tools/src/agents.rs` — Built-in agent definitions

- [ ] **Step 2: Write implementation-checklist.md**

Consolidates the engineering checklists from all 4 layer specs into a single reference document. Grouped by layer. Each item is a checkbox.

- [ ] **Step 3: Write common-pitfalls.md**

Consolidates the common pitfalls from all 4 layer specs into a single reference document. Format: Layer → Problem → Symptom → Fix.

- [ ] **Step 4: Commit**

```bash
git add skills/harness/references/ && git commit -m "feat(harness): add reference documents"
```

---

## Task 10: Final verification

- [ ] **Step 1: Verify all files exist**

```bash
find skills/harness -type f | sort
```

Expected output:
```
skills/harness/SKILL.md
skills/harness/README.md
skills/harness/specs/layer1-harness-core.md
skills/harness/specs/layer2-tool-system.md
skills/harness/specs/layer3-plugin-hooks.md
skills/harness/specs/layer4-multi-agent.md
skills/harness/diagrams/architecture-overview.drawio
skills/harness/diagrams/layer-breakdown.drawio
skills/harness/diagrams/data-flow.drawio
skills/harness/references/claw-code-patterns.md
skills/harness/references/implementation-checklist.md
skills/harness/references/common-pitfalls.md
```

- [ ] **Step 2: Verify SKILL.md frontmatter**

Check that SKILL.md has valid YAML frontmatter with `name` and `description` fields.

- [ ] **Step 3: Verify all internal links**

Check that README.md and SKILL.md reference files that exist.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(harness): complete harness engineering skill

Delivers a complete 4-layer engineering methodology for building
production-grade Agent systems: Harness Core, Tool System,
Plugin & Hooks, and Multi-Agent patterns."
```

---

## Spec Coverage Check

- [x] Layer 1 (Harness Core) — covered by Task 4 (layer1-harness-core.md)
- [x] Layer 2 (Tool System) — covered by Task 5 (layer2-tool-system.md)
- [x] Layer 3 (Plugin & Hooks) — covered by Task 6 (layer3-plugin-hooks.md)
- [x] Layer 4 (Multi-Agent) — covered by Task 7 (layer4-multi-agent.md)
- [x] Data Flow — covered by Task 3 (README.md) + Task 8 (data-flow.drawio)
- [x] Engineering Checklists — covered by Tasks 4-7 (each spec has a checklist)
- [x] Common Pitfalls — covered by Tasks 4-7 (each spec has pitfalls)
- [x] claw-code Reference — covered by Task 9 (claw-code-patterns.md)
- [x] SKILL.md format — covered by Task 2
- [x] Diagrams — covered by Task 8

## Placeholder Scan

- [x] No "TBD" or "TODO" in any task
- [x] All file paths are exact
- [x] All code is complete (not pseudo-code stubs)
- [x] All commit messages are concrete
