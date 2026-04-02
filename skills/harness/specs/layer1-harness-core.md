# Layer 1: Harness Core — Detailed Specification

**Status:** Approved
**Layer:** 1 of 4
**Purpose:** Runtime engine that drives the Agent loop, manages session lifecycle, and enforces permission boundaries.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md) with code examples from claw-code.

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
