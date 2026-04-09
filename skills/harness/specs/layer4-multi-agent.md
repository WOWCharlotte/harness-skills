# Layer 4: Multi-Agent System — Detailed Specification

**Status:** Approved
**Layer:** 4 of 4
**Purpose:** Manages creation, state transfer, lifecycle, and collaboration patterns for sub-agents.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md).

---

## Components

### 4.1 Three-Layer Collaboration Architecture

When a task is too complex (e.g., "refactor this module and write tests"), a single agent may need to switch between reading code, modifying files, and running tests repeatedly — context window fills quickly. Multi-agent collaboration solves this through task decomposition and parallel execution.

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Subagent (Lightweight)                             │
│  - Parent synchronously/asynchronously spawns forked agent   │
│  - Best for: "search for me", simple independent questions  │
│  - Reuses parent's query() function                         │
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: Team/Swarm (Collaborative)                        │
│  - Members communicate with each other                      │
│  - Has leader/teammate role division                        │
│  - Best for: frontend + backend development simultaneously   │
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: Coordinator (Pure Orchestrator)                   │
│  - Does NOT directly manipulate files                       │
│  - Has only ~6 tools: TeamCreate, TeamDelete, SendMessage,  │
│    Agent, TaskStop, SyntheticOutput                          │
│  - Best for: large-scale parallel tasks                     │
└──────────────────────────────────────────────────────────────┘
```

**Design boundaries**:
- **Subagent**: Lightest, parent fork sub-agent for simple delegation
- **Team/Swarm**: Members can communicate, leader/teammate roles, for concurrent development
- **Coordinator**: Pure orchestration, all actual work done by workers

### 4.2 Agent Tool: Unified Entry Point

All multi-agent collaboration triggers through the same tool — `AgentTool`. This design reduces model's cognitive load: it only needs to learn one tool, triggering different collaboration modes through parameter combinations.

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

#### Agent Type Priority Override

Same-named agent priority: `built-in < plugin < userSettings < projectSettings < flagSettings < policySettings`. Enterprise admin can force override any agent behavior via `policySettings`.

#### Fork Subagent: Prompt Cache Optimization

Fork is an experimental feature representing a new sub-agent pattern: inherits parent's complete dialogue history and system prompt, needs only a brief directive.

**Core optimization target**: Maximize prompt cache hit rate. Message building strategy:
1. Keep parent's complete assistant messages (all tool_use blocks)
2. Generate same placeholder tool_result for each tool_use
3. Append per-child directive text block at the end

**Result**: Only the last text block differs per child; all preceding bytes are identical. Multiple forks starting in parallel share the same prompt cache prefix.

**Anti-recursion design**: Fork sub-agents retain Agent tool (for cache-identical tool definitions), but two-level checks block recursive fork at `call()` time — querySource check (compaction-resistant) and message scan `<fork-boilerplate>` tag (fallback).

### 4.3 Built-in Agent Types

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

#### Built-in Agent Design Decisions

| Agent | Model | Tool Restriction | Key Design Decision |
|-------|-------|------------------|---------------------|
| **general-purpose** | Default sub-agent model | All tools | Universal worker, no special restrictions |
| **Explore** | haiku (external) / inherit (internal) | Read-only, no Edit/Write/Agent | Use cheapest model for search; ~34M+ spawns/week |
| **Plan** | inherit | Read-only, no Edit/Write/Agent | Architecture design, no execution capability |
| **verification** | inherit | Read-only (project dir), /tmp writable | Independent verification, always async |

**Explore agent token optimization**: Omits CLAUDE.md (search agent doesn't need commit/PR/lint rules) and gitStatus (read-only agent doesn't need git status). Comment mentions these optimizations "save ~5-15 Gtok/week across 34M+ Explore spawns". In large-scale deployment, saving a few thousand tokens per invocation accumulates massively.

**Verification agent "anti-self-deception" design**: Its system prompt is one of the longest agent prompts (~120 lines), explicitly listing common LLM verification-evasion patterns — "code looks correct", "tests already pass" — and requiring each check to have actual executed commands and output. `background: true` means always async, non-blocking to main agent. This is an engineering countermeasure against LLM's known weaknesses.

### 4.4 Team/Swarm: Two Backend Comparison

| Dimension | Pane-based (Tmux/iTerm2) | In-process |
|-----------|---------------------------|------------|
| **Isolation** | Strong (independent process) | Weak (shared process) |
| **Resource overhead** | High (each teammate = Node.js process) | Low |
| **User visibility** | High (each agent has independent terminal panel) | Low |
| **Crash impact** | Isolated (one crash doesn't affect others) | Cascading (may affect all teammates) |
| **Use case** | Interactive development | SDK/headless mode |

**Backend selection logic**:
1. Already in tmux → TmuxBackend
2. In iTerm2 → ITermBackend
3. Neither + tmux available → TmuxBackend (external session)
4. Neither available → Error prompting tmux installation
5. SDK mode → Forces In-process backend

Communication mechanism unified as `TeammateExecutor` interface: `spawn()`, `sendMessage()`, `terminate()`, `kill()`, `isActive()`. Upper layer code doesn't care about underlying implementation (filesystem mailbox vs memory communication).

### 4.5 In-process Teammate Runner: Leader Permission Bridge

`src/utils/swarm/inProcessRunner.ts` (~1400 lines) is the execution engine for in-process teammates, also the most complex file in Swarm system.

**In-process teammate permission handling** implements a three-level degradation strategy:

```
┌──────────────────────────────────────────────────────────────┐
│  Level 1: Standard permission check                          │
│     - HasPermissionsToUseTool() returns allow/deny          │
│     - If allow or deny, return directly                     │
└──────────────────────────────────────────────────────────────┘
                          ▼ (if ask)
┌──────────────────────────────────────────────────────────────┐
│  Level 2: Classifier auto-approval                          │
│     - For bash commands, try classifier auto-approval       │
└──────────────────────────────────────────────────────────────┘
                          ▼ (if still ask)
┌──────────────────────────────────────────────────────────────┐
│  Level 3a: Leader Permission Bridge (preferred)            │
│     - Use leader's UI popup dialog                         │
│     - With worker badge on permission request               │
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│  Level 3b: Mailbox fallback                                 │
│     - Send permission request via mailbox                  │
│     - Poll and wait for response                           │
└──────────────────────────────────────────────────────────────┘
```

**Leader Permission Bridge**: Module-level bridge — REPL registers its `setToolUseConfirmQueue` and `setToolPermissionContext` functions, in-process teammate directly uses leader's UI to show permission dialogs. When teammate's permission request is approved, permission update writes back to leader's shared context, but `preserveMode: true` prevents worker permission mode from leaking back to coordinator.

**Idle lifecycle**: Teammate doesn't exit after completing current task, enters idle state, sends idle notification to leader via Stop hook, waits for new task assignment. This avoids frequent process creation/destruction overhead. Idle notification includes recent peer DM summary, letting leader understand teammate collaboration status.

**Memory guard**: `TEAMMATE_MESSAGES_UI_CAP = 50` limits messages stored in AppState. Comment mentions a "whale session" that spawned 292 agents in 2 minutes, reaching 36.8GB memory. Message cap is defense against such extreme scenarios.

### 4.6 Agent Communication Protocol

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

#### Teammate Communication: Mailbox System

Teammates communicate via filesystem mailbox, path: `~/.claude/teams/<teamName>/mailbox/<agentName>/`.

`SendMessageTool` is unified communication entry point, supports multiple routing targets:

| Target | Syntax | Description |
|--------|--------|-------------|
| Specific teammate | `@teammate-name` | Direct message to named teammate |
| All teammates | `@*` | Broadcast to all |
| Leader | `@leader` | Message to coordinator |
| Team scope | `team:<team-name>@<teammate>` | Cross-team message |

Messages support two formats:
- Plain text (daily communication)
- Structured messages (`shutdown_request`, `shutdown_response`, `plan_approval_request` etc. protocol messages)

Structured messages used for lifecycle management between leader and teammate — leader sends `shutdown_request`, teammate replies `shutdown_response` to confirm before exiting.

### 4.7 Coordinator Mode: Pure Orchestrator

Coordinator mode is the highest-level abstraction of multi-agent collaboration. Unlike Subagent and Team, Coordinator **does NOT manipulate files directly** — it has only ~6 tools (TeamCreate, TeamDelete, SendMessage, Agent, TaskStop, SyntheticOutput), no Bash, Read, Write, Edit.

Coordinator's system prompt (~260 lines) defines a four-phase workflow: Research → Synthesis → Implementation → Verification.

**Core principle: "Never delegate understanding"**:

```
Anti-pattern (bad):
  Agent({ prompt: "Based on your findings, fix the auth bug" })

Good:
  Agent({ prompt: "Fix the null pointer in src/auth/validate.ts:42.
               The user field on Session is undefined when sessions expire..." })
```

**Deep reason**: Workers start from scratch, have no coordinator's conversation context. If coordinator doesn't synthesize research findings before forwarding, worker lacks critical information. Coordinator's core value is **synthesis** — fusing multiple workers' discoveries into precise execution instructions.

**Scratchpad shared storage**: Coordinator mode has a scratchpad directory shared across workers. Workers can freely read/write in this directory without permission approval. This solves the problem of needing to pass intermediate results between workers.

**Coordinator and Fork are mutually exclusive**: Coordinator is already a pure orchestrator, doesn't read files or write code. Fork's design is "inherit context's avatar", but Coordinator has no execution context to inherit — forking a Coordinator only gets another orchestrator, which is meaningless.

### 4.8 Collaboration Patterns

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

### 4.9 Permission Transfer Rules

Six rules implement "least privilege + no leakage" principle:

1. **Parent → Child**: `forkSubagent` permission is parent's permission or stricter (child cannot exceed parent)
2. **Child → Parent**: Child permission changes do NOT propagate to parent
3. **Async agent cannot prompt**: When `shouldAvoidPermissionPrompts: true`, if permission needed, try PermissionRequest hooks; if no hook decides, automatically deny
4. **Bubble mode exception**: `bubble` mode bubbles permission prompt to parent terminal, letting user confirm sub-agent operation in parent agent's interface
5. **PreserveMode**: When teammate's permission request approved via Leader Permission Bridge, `preserveMode: true` prevents worker permission mode from leaking back to coordinator
6. **Coordinator bypass**: Coordinator doesn't execute tools itself, so permission mode doesn't affect its worker delegation

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
- [ ] **Prompt cache optimization:** Fork sub-agents share prompt cache prefix
- [ ] **Memory guard:** Message cap prevents memory explosion from rapid agent spawning
- [ ] **Anti-recursion:** Fork sub-agents cannot recursively fork

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

### 6. Fork Recursion
**Problem:** Fork sub-agent spawns another fork sub-agent → infinite recursion.
**Fix:** Two-level check at `call()` time: querySource check + message scan `<fork-boilerplate>` tag.

### 7. Memory Explosion from Rapid Spawning
**Problem:** "Whale session" spawns hundreds of agents in minutes → memory exhausted.
**Fix:** `TEAMMATE_MESSAGES_UI_CAP` limits AppState message storage per agent.

---
