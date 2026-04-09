# Layer 1: Harness Core — Detailed Specification

**Status:** Approved
**Layer:** 1 of 4
**Purpose:** Runtime engine that drives the Agent loop, manages session lifecycle, and enforces permission boundaries.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md) with code examples from claw-code.

---

## Components

### 1.1 Agent Loop

The central execution engine. Every Harness has one.

#### Two-Layer Loop Model

Claude Code's Agent Loop is not a simple `while` loop — it is an implicit state machine with **7 recovery paths** and **10 termination conditions**, organized as two layers:

```
┌─────────────────────────────────────────────────────────────┐
│  QueryEngine (Session Management Layer)                     │
│  - Multi-turn state management                              │
│  - Transcript persistence                                   │
│  - SDK protocol adaptation                                  │
│  - Usage accumulation                                       │
│  - AsyncGenerator consumer                                  │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ AsyncGenerator (messages stream)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  queryLoop (Single-turn Execution Layer)                    │
│  - API calls                                                │
│  - Tool execution                                           │
│  - Error recovery                                           │
│  - AsyncGenerator producer                                  │
└─────────────────────────────────────────────────────────────┘
```

**Why Two Layers?**
- **QueryEngine**: Handles "session management" — multi-turn state, transcript persistence, SDK protocol adaptation, usage tracking
- **queryLoop**: Handles "single-turn execution" — API calls, tool execution, error recovery
- **AsyncGenerator connection**: Enables backpressure (consumer pulls at its own pace), natural cancellation semantics (`.return()` cascades through nested generators), and streaming composition (sub-agents can be nested directly in parent's query stream)

#### queryLoop State Machine

`queryLoop` is a `while(true)` loop where each iteration represents one "API call + tool execution". Exit is determined by two types:

- **`Terminal`**: Loop ends, returns termination reason
- **`Continue`**: Loop continues via `state = next; continue`

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  turnCount: number
  transition: Continue | undefined  // Why did we continue last iteration?
}
```

**Design rationale**: Using a complete `State` struct assignment instead of multiple independent variable assignments ensures every `continue` site explicitly declares all state — preventing omissions.

#### Message Preprocessing Pipeline

Before each API call, messages pass through a multi-stage pipeline following the **"light to heavy"** principle — cheap local operations first, expensive API calls last:

```
┌──────────────────────────────────────────────────────────────┐
│  Messages                                                   │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Context Collapse (Light)                                │
│     - Progressive message folding based on importance        │
│     - Preserves fine-grained context                         │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. AutoCompact (Heavy - requires API call)                 │
│     - Full summary generation when threshold reached         │
│     - Threshold: effective_window - 13000 tokens             │
│     - Circuit breaker: stops retrying after 3 consecutive    │
│       failures (analytics show ~1,279 sessions had 50+       │
│       consecutive failures, wasting ~250K API calls/day)     │
└──────────────────────────────────────────────────────────────┘
```

**Why this order?** AutoCompact needs a full API call to generate summary. If light operations already freed enough space, AutoCompact is avoided. Context Collapse runs before AutoCompact to preserve as much original context as possible.

#### Token Budget & Nudge Mechanism

When model stops naturally (`end_turn`) but token budget is not exhausted, system injects a **nudge message** to continue working. This solves the problem where complex tasks (e.g., large refactors) may need output exceeding default `max_output_tokens`.

**Decreasing returns detection**: If 3 consecutive checks each show <500 tokens incremental work, model has no substantial work left — stop continuation. Sub-agents do NOT participate in token budget (prevents infinite sub-agent running); only main thread agent uses this mechanism.

#### Message Withholding Mechanism

Not all messages from API are immediately passed to the caller. Three types are **withheld**:

1. **`prompt-too-long` errors**: Held by reactiveCompact, attempts compression then retry
2. **`media-size` errors**: Attempts to strip oversized images then retry
3. **`max_output_tokens` errors**: Waits for recovery loop to decide if continuation is possible

**Rationale**: SDK consumers (desktop app, coworker) interpret presence of `error` field as session termination. But queryLoop internal may still have recovery paths running — if intermediate errors are exposed too early, recovery loop continues but no one is listening.

#### Streaming Tool Executor

When model returns multiple tool calls (e.g., reading 3 files simultaneously), two execution modes exist:

| Mode | Behavior | Trade-off |
|------|----------|-----------|
| **Batch Execution** | Wait for all tool_use blocks to arrive, then execute sequentially | Simple, reliable — but higher latency (first Read waits for last tool_use block) |
| **Streaming Execution** (default) | Execute immediately as each tool_use block arrives | Lower latency, but requires concurrency control |

**Concurrency control model**: Each tool declares via `isConcurrencySafe(input)` whether it can execute in parallel. Consecutive concurrency-safe tools form a "parallel partition"; execution starts a new partition when a non-concurrency-safe tool is encountered. Partitions execute serially; within a partition, tools execute in parallel.

**Example**: FileRead is concurrency-safe (read-only, no conflicts); FileEdit is NOT (parallel edits to same file cause line offset conflicts).

**Defensive design**: If `isConcurrencySafe` throws exception (e.g., input parse failure), default to unsafe. This is **fail-closed** — better to serialize and reduce performance than risk concurrency conflicts.

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Two-layer separation | Separation of concerns; QueryEngine handles session, queryLoop handles execution |
| AsyncGenerator as core abstraction | Backpressure control, natural cancellation, streaming composition |
| Context preprocessing "light to heavy" | Minimize expensive operations when possible |
| Tool concurrency partitioning | Parallel execution without conflicts |
| Message withholding | Protect SDK consumers from intermediate errors during recovery |
| Token budget nudge | Enable completion of complex tasks requiring >default max_output_tokens |
| Circuit breaker on AutoCompact | Prevent resource waste from repeated failures |

#### Pseudocode

```
AgentLoop {
  state: { messages, session, config }

  async run(initial_input) {
    messages.push(user_message(initial_input))

    while (true) {
      // 1. Preprocess messages (light to heavy)
      messages = preprocess_pipeline(messages)

      // 2. Render full context
      context = render(messages, session.config)

      // 3. Call LLM
      response_stream = await llm.complete_streaming(context)

      // 4. Parse response for tool calls or text (streaming)
      for (chunk in response_stream) {
        if (chunk.is_tool_call()) {
          // Streaming execution with concurrency control
          result = await streaming_tool_executor.execute(chunk.tool_call)
          messages.push(tool_result_message(result))
        } else if (chunk.is_text()) {
          outputStream.send(chunk.text())
        }
      }

      // 5. Check termination conditions (10 conditions)
      if (is_terminal(response.stop_reason)) break
      if (session.is_max_turns_reached()) break
      if (session.is_user_interrupt()) break
      if (is_max_budget_exceeded()) break
      if (is_decreasing_returns()) break  // Token budget nudge check
    }

    return final_response(messages)
  }
}
```

#### Termination Conditions (10 total)

The Loop MUST terminate when any of these occur:

| # | Condition | Source |
|---|-----------|--------|
| 1 | LLM returns `end_turn` / `finish` signal | Normal completion |
| 2 | `max_turns` limit reached | Configuration |
| 3 | User sends interrupt signal | External |
| 4 | Unrecoverable error (API unavailable after retries) | Error handling |
| 5 | `max_budget_tokens` exceeded | Token budget |
| 6 | 3 consecutive decreasing returns (<500 tokens each) | Token budget |
| 7 | 3 consecutive AutoCompact failures (circuit breaker) | Error recovery |
| 8 | `prompt-too-long` after all recovery attempts | Context management |
| 9 | `media-size` error after stripping attempts | Context management |
| 10 | `max_output_tokens` with no recovery path | Context management |

#### Recovery Paths (7 total)

| # | Recovery Path | Trigger | Action |
|---|---------------|---------|--------|
| 1 | Reactive Compact | `prompt-too-long` | Attempt compression, retry |
| 2 | Media Stripping | `media-size` error | Remove oversized images, retry |
| 3 | Output Recovery | `max_output_tokens` | Check if nudge can continue |
| 4 | Token Budget Nudge | Early `end_turn`, budget remaining | Inject nudge message |
| 5 | Decreasing Returns Detection | 3 consecutive small outputs | Stop, model exhausted |
| 6 | AutoCompact Retry | Compact failure | Retry up to 3 times |
| 7 | Circuit Breaker Reset | After 3 failures | Stop AutoCompact attempts |

> **Engineering Practice:** See [agent-loop-impl.md](../references/best-practices/agent-loop-impl.md) for turn-based loop implementation with budget-aware termination from claw-code.

> **Engineering Practice:** See [agent-loop-impl.md](../references/best-practices/agent-loop-impl.md) for turn-based loop implementation with budget-aware termination from claw-code.

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
  transcript_id: UUID          // For transcript persistence
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

#### ToolUseContext: Runtime Environment for Tools

Each tool's `call()` method receives a `ToolUseContext` object with 40+ fields. Tools are not pure functions — they need runtime context:

| Context Field | Purpose | Why Required |
|--------------|---------|--------------|
| `readFileState` | File read state cache | FileEditTool needs to verify "cannot edit unread files" |
| `abortController` | Cancellation signal | BashTool long-running commands need user interrupt support |
| `setToolJSX` | UI render callback | BashTool needs to render real-time progress bar |
| `agentId` | Sub-agent identifier | Distinguish main thread vs sub-agent, affects permissions and CWD |
| `contentReplacementState` | Token budget control | Prevent tool results from consuming too much context |
| `updateFileHistoryState` | File history | Support `/rewind` command to undo file modifications |

**`contextModifier` field**: Some tools need to modify subsequent tool context after execution (e.g., working directory change), but cannot directly mutate global state. `contextModifier` provides a controlled way to do this, and only applies to non-concurrency-safe tools — concurrent tools cannot modify each other's context.

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Messages are append-only | Audit trail; replay from any point |
| Each session has isolated working_dir | Prevent cross-session file collisions |
| Tool result cache per session | Enables referencing previous tool outputs |
| Forked sessions track parent ID | Enables hierarchy visualization and cleanup |
| Transcript persistence | Separate from session state for independent lifecycle |

#### Persistence

```
SessionStore {
  async save(session: Session)       // Full serialization
  async load(id: UUID) → Session      // Resume
  async list() → Vec<SessionSummary>  // For UI listing
  async delete(id: UUID)              // Cleanup
}

TranscriptStore {
  async append(message: Message)      // Append to transcript
  async get_messages(session_id: UUID) → Vec<Message>  // Retrieve
  async compact(session_id: UUID, summary: Message)  // Replace range with summary
}
```

Persist after every tool execution (async, non-blocking). On crash recovery, reload latest session state.

> **Engineering Practice:** See [session-management-impl.md](../references/best-practices/session-management-impl.md) for immutable session data model, persistence patterns, and transcript store implementation from claw-code.

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

#### Six Permission Modes (Trust Spectrum)

The permission mode is a user's global declaration of trust level in AI. A continuous spectrum from "完全不信任" to "完全信任":

| Mode | Behavior | Use Case |
|------|----------|----------|
| `plan` | AI can only plan, cannot execute any write operations | Exploratory analysis, code review |
| `default` | Each tool call requires user confirmation | Daily development (default) |
| `acceptEdits` | File edits in working directory auto-allowed, other operations still need confirmation | Trust AI's refactoring ability |
| `auto` | AI classifier automatically judges operation safety | High trust scenarios (internal users only) |
| `bypassPermissions` | Skip all permission checks (except hard-coded security checks) | Emergency fixes, controlled environments |
| `dontAsk` | Convert all 'ask' to 'deny', AI runs autonomously but skips operations needing confirmation | Fully automated CI/CD |

**Why not simple on/off?** Different scenarios need different trust levels. This spectrum allows users to precisely control their comfort zone.

**Remote Circuit Breaker**: Even when user selects `bypassPermissions`, system retains remote disable capability. `bypassPermissionsKillswitch` implements "emergency brake" via Statsig feature gate — when severe security vulnerabilities are found, Anthropic can remotely downgrade all users' bypass mode. `auto` mode has similar `autoModeCircuitBroken` circuit breaker.

**Sensitive Path Immunity**: Writes to `.git/`, `.claude/`, `.vscode/`, shell config files (`.bashrc`, `.zshrc`) require confirmation even in bypass mode. These are hard-coded security bottom lines — no mode can override. Reason: modifications to these files can affect entire development environment security.

#### Permission Evaluation Pipeline

Each tool call executes through a strict ordered evaluation pipeline:

```
┌──────────────────────────────────────────────────────────────┐
│  1. Tool Permission Check                                   │
│     - Has user explicitly configured ask rule for this tool? │
│     - Is this a sensitive path (.git/, .claude/, etc.)?     │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Classifier Check (auto mode only)                       │
│     - ML classifier judges operation safety                  │
│     - 3 consecutive denials → downgrade to prompt            │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Hook Check                                              │
│     - PermissionRequest hooks evaluate                      │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  4. User Prompt (if all above return 'ask')                 │
│     - Show user confirmation dialog                         │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Decision — User Explicit Ask > Bypass**: If user configured `ask: ["Bash(npm publish:*)"]`, even in `bypassPermissions` mode, confirmation will still pop up. Design philosophy: "user's explicit intent always takes priority" — bypass means "I trust AI's general judgment", but ask rules mean "this specific operation I want to confirm personally".

#### Rule System

Permission rules are defined by three dimensions:

**Source (priority from low to high)**:
1. Built-in defaults
2. Plugin-provided rules
3. User settings
4. Project settings (CLAUDE.md)
5. Flag settings (CLI --allow-foo)
6. Policy settings (enterprise admin — highest priority)

When `allowManagedPermissionRulesOnly` is true, only `policySettings` rules are loaded — enterprise "lockdown" mode.

**Shell rule matching three modes**: Exact match (`npm install`), prefix match (`npm:*`, legacy syntax), wildcard match (`git commit *`). Wildcard matching converts pattern to regex — clever detail: when pattern ends with `*` (space + wildcard) and has only one wildcard, tail becomes optional, so `git *` matches both `git add` and bare `git`.

**Rule Shadowing Detection**: When user configures contradictory rules, some rules may never take effect. E.g., simultaneously having `deny: ["Bash"]` and `allow: ["Bash(ls:*)"]` — the latter never takes effect because deny is checked before allow in pipeline. System shows warning in UI to help user fix.

**Mapping to real tools:**

| Tool | Minimum Permission |
|------|-------------------|
| read_file, glob_search, grep_search | ReadOnly |
| write_file, edit_file | WorkspaceWrite |
| bash, shell | DangerFullAccess |
| WebFetch, WebSearch | ReadOnly (HTTP GET only) |
| TaskCreate, TodoWrite | WorkspaceWrite |

> **Engineering Practice:** See [permission-enforcement-impl.md](../references/best-practices/permission-enforcement-impl.md) for `ToolPermissionContext` implementation with deny_names/deny_prefixes pattern and permission denial tracking.

#### LLM Integration

The Harness drives an LLM via a standard API. The key integration points:

```
LLMProvider {
  // Send messages and receive response
  async complete(messages: Message[], config: LLMConfig) → LLMResponse

  // SSE stream for real-time tool execution
  async complete_streaming(messages: Message[], config: LLMConfig) → Stream<LLMResponse>
}

LLMConfig {
  model: string              // e.g. "claude-opus-4-6" or "gpt-4o"
  temperature: f32            // Default: 1.0
  max_tokens: u32             // Response length limit
  tools: ToolSpec[]           // Available tools (passed to the model)
  system_prompt: string       // Harness-level system instructions
}

LLMResponse {
  content: Content[]          // Text and/or tool_use blocks
  usage: UsageStats
  stop_reason: string         // "end_turn", "max_tokens", "stop_sequence"
}
```

**API compatibility:**
- **Anthropic API** : Native tool-use / tool-result message types. SSE streaming required for real-time tool execution feedback.
- **OpenAI-compatible API**: Tools must be converted to OpenAI function-calling format. Requires polling or streaming via Server-Sent Events.

**Tool execution flow:**
1. LLM returns `content` with `tool_use` blocks
2. Harness parses each tool_use: `{ name, input }`
3. Harness calls `tool_executor.execute(name, input)`
4. Harness appends `ToolResultMessage` to messages
5. Loop returns to step 1 with updated messages

**Critical integration notes:**
- The LLM call is synchronous and blocking — it won't return until the model finishes
- For real-time UX, use SSE streaming: stream tool_use blocks as they appear, don't wait for full response
- Tool schemas must be valid JSON Schema — malformed schemas cause silent tool call failures
- System prompt should include: Harness identity, available tools, permission boundaries

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

> **Engineering Practice:** See [config-examples.md](../references/best-practices/config-examples.md) for `QueryEngineConfig` frozen dataclass pattern, `RetryPolicy` implementation with exponential backoff, and session configuration best practices.

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
