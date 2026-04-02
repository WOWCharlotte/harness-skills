# Layer 4: Multi-Agent System — Detailed Specification

**Status:** Approved
**Layer:** 4 of 4
**Purpose:** Manages creation, state transfer, lifecycle, and collaboration patterns for sub-agents.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md).

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

> **Engineering Practice:** See [multi-agent-impl.md](../references/best-practices/multi-agent-impl.md) for `AgentManager`, `AgentHandle`, session isolation, permission inheritance, async fork patterns, and collaboration pattern implementations.

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
