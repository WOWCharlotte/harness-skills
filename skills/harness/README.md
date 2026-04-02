# Harness Engineering

## What is a Harness?

A **Harness** is the runtime system that surrounds an AI model (like Claude) and gives it capabilities: file access, shell execution, web search, task tracking, and the ability to spawn sub-agents. The Harness defines what the model can do, how it does it, and what safety boundaries exist.

**Examples of Harnesses:** Claude Code, Cursor, Codex, OpenCode, claw-code.

This skill captures the engineering methodology for building a production-grade Harness — not from theory, but from battle-tested claw-code architecture.

---

## The 5-Layer Architecture

Think of a Harness as 5 stacked layers, each building on the one below:

```
┌──────────────────────────────────────────┐
│ Layer 4: Multi-Agent                     │
│ "What can sub-agents do and how?"        │
├──────────────────────────────────────────┤
│ Layer 3: Plugin & Hooks                  │
│ "How do we extend and intercept?"        │
├──────────────────────────────────────────┤
│ Layer 2: Tool System                     │
│ "What capabilities exist?"               │
├──────────────────────────────────────────┤
│ Layer 1: Harness Core                    │
│ "How does the model run?"                │
├──────────────────────────────────────────┤
│ Layer 0: System Prompt                   │
│ "What instructions guide the model?"     │
└──────────────────────────────────────────┘
```

**Layer 0 is the foundation** — it defines the agent's behavior patterns before any runtime exists. Layer 1 is the first engineering layer.

---

## Layer 0: System Prompt

The instruction layer. Defines how the model should behave: tool usage patterns, task workflow, fork/subagent guidelines, context compaction strategy, security rules, and hook configuration.

Key components:
- **Tool descriptions** — specific use cases and parameter descriptions (LLM-readable)
- **Task workflow** — simplify → test → e2e → commit → PR sequence
- **Fork rules** — no peeking mid-flight, no racing results
- **Context compaction** — structured summary format at 60-70% capacity
- **Security** — pre-tool-use checks, injection prevention, principle of least privilege
- **Hooks** — PreToolUse, PostToolUse, PermissionRequest, SessionStart events

> Layer 0 lives in `specs/layer0-system-prompt.md` with a complete mapping of all 140+ reference files organized by component.

---

## Layer 1: Harness Core

The runtime engine. Without this, the model just generates text.

### Agent Loop

The core execution cycle:

```
while (not done) {
  context ← render(messages)       // Build full context for this turn
  response ← llm(context)          // Send to model
  tool_calls ← parse(response)      // Extract tool calls from response
  for each tool_call {              // Execute serially
    result ← executor.run(tool_call)
    messages.push(result)           // Append result, don't modify history
  }
}
```

Key rules:
- **Render before every call** — context is rebuilt fresh each turn, not accumulated
- **Serial tool execution** — even if the model asks for multiple tools, execute one at a time
- **Immutable history** — never modify past messages; only append results
- **LLM retry** — exponential backoff on transient errors (network, 429, 500)
- **Explicit termination** — max_turns or explicit done signal (no infinite loops)

> **Which LLM to use?** Layer 1 is agnostic to the model. Use Anthropic's API (recommended for tool-use natively) or any OpenAI-compatible API. See `specs/layer1-harness-core.md` for the LLMProvider interface and API integration guide.

### Session

Every conversation has a Session:

```
Session {
  id: UUID
  messages: Message[]              // Immutable history
  metadata: Map<string, any>      // Working dir, env, cache
  created_at, updated_at
}
```

The Session is what gets persisted, resumed, and forked into sub-agents.

### Session Compaction

Prevents context overflow in long sessions:

```
should_compact(session) → boolean   // 60-70% capacity
compact_session(session) → Session   // Structured summary, truncate history
```

### Permission Model

Five permission levels, applied at the Harness layer (not per-tool):

| Mode | Capabilities |
|------|-------------|
| **ReadOnly** | Filesystem read-only, no network |
| **WorkspaceWrite** | Write to working directory |
| **DangerFullAccess** | Shell, system commands, anything |
| **Prompt** | Ask user for each sensitive action |
| **Allow** | Unrestricted (use with caution) |

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
  input_schema: JSON Schema     // What inputs it accepts
  required_permission: PermissionMode
  execute: fn(input) → Result
}
```

The LLM only sees the schema — not the code. A good description and schema are critical. Tools are **hot-swappable** — add or remove without touching harness core.

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
|----------|---------|
| **Filesystem** | read_file, write_file, edit_file, glob_search, grep_search |
| **Shell** | bash (with timeout) |
| **Web** | WebFetch, WebSearch |
| **Task** | TaskCreate, TaskUpdate, TaskList, TodoWrite |
| **Agent** | Agent, forkSubagent, runAgent, resumeAgent |
| **Meta** | Skill (load SKILL.md), MCPTool |

---

## Layer 3: Plugin & Hooks

The extensibility layer. Hooks intercept tool execution; plugins bundle tools + hooks.

### Hooks

Two primary hooks, running before and after every tool:

```
PreToolUseHook  → validate, modify, block, or log before execution
PostToolUseHook → format, cache, retry, or emit after execution
```

Other events: PermissionRequest, SessionStart, Stop, PreCompact, PostCompact.

Example uses:
- **Pre:** Verify a bash command is safe before running it
- **Pre:** Inject project context (CLAUDE.md contents) into tool parameters
- **Post:** Auto-format code output
- **Post:** Retry a failed network call once before surfacing the error

### Hook Error Isolation

**Critical:** Hook exceptions must never break the tool execution chain. Always wrap in try/catch.

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
  forkSubagent(config)   // New independent Session (recommended)
  runAgent(agent_type)   // Built-in type, shared context
  resumeAgent(agent_id)   // Resume a paused agent
}
```

### Permission Inheritance

When forking a session:
- Child starts with **same permission level** as parent
- Child's permissions can be **scoped down** but not up
- Never inherit admin-level permissions without explicit scoping

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

## Layer Dependencies

```
Layer 1 (Harness Core) depends on Layer 0 (System Prompt config)
Layer 2 (Tool System) depends on Layer 1 (session + permissions)
Layer 3 (Plugin & Hooks) depends on Layer 1 + Layer 2 (executor hooks)
Layer 4 (Multi-Agent) depends on Layer 1 (fork session)
                       optionally Layer 3 (agent hooks)
```

**Layer 1 is the foundation for all other layers.**

---

## Where to Start

**Building from scratch:**
1. Read `specs/layer0-system-prompt.md` first (instructions shape everything)
2. Then `specs/layer1-harness-core.md` (the Agent Loop is your first engineering decision)
3. Layer 2 (`specs/layer2-tool-system.md`) once you have the loop working
4. Layers 3 and 4 when you need extensibility and multi-agent features

**Evaluating an existing system:**
Jump to the layer that matches your concern. Each layer spec stands alone. Use the Red Flags table in `SKILL.md` to diagnose which layer has the problem.

**Recommended implementation language:** TypeScript or Python are the most common choices for reference implementations (see claw-code's Rust/TypeScript source for examples).

---

## How to Use This Skill

This skill is a complete engineering workflow. Follow the Checklist in `SKILL.md` in order:

1. **Assess scope** — greenfield, evaluating, or refactoring?
2. **Map to layers** — which of the 5 layers are in scope?
3. **Present architecture overview** — show the 5-layer table
4. **Identify gaps** — compare against `references/implementation-checklist.md`
5. **Propose implementation order** — Layer 1 first, then Layer 2, etc.
6. **Create plan** — use `superpowers:writing-plans`
7. **Execute** — use `superpowers:subagent-driven-development` or `superpowers:executing-plans`

---

## References

### Layer Specifications
- `specs/layer0-system-prompt.md` — System Prompt design
- `specs/layer1-harness-core.md` — Layer 1 detailed spec
- `specs/layer2-tool-system.md` — Layer 2 detailed spec
- `specs/layer3-plugin-hooks.md` — Layer 3 detailed spec
- `specs/layer4-multi-agent.md` — Layer 4 detailed spec

### Reference Materials
- `references/system-prompts/` — 140+ system prompt reference files (organized in `layer0-system-prompt.md` by component)
- `references/claw-code-patterns.md` — Source code mapping
- `references/implementation-checklist.md` — Build checklist
- `references/common-pitfalls.md` — Pitfalls and fixes
- `references/superpowers-installation.md` — Superpowers plugin setup
