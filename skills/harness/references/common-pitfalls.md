# Common Pitfalls

Consolidated common pitfalls from all 4 layer specs with symptoms and fixes.

## Layer 1: Harness Core

### 1. Infinite Loop
- **Problem:** No max_turns limit, or LLM keeps calling the same tool repeatedly
- **Symptom:** Agent runs forever, CPU at 100%, no output
- **Fix:** Set max_turns. Add tool call deduplication: if same tool called 3x in a row with similar inputs, surface error to LLM and halt

### 2. Mutable Session State
- **Problem:** Modifying past messages instead of appending new ones
- **Symptom:** Non-deterministic behavior, message history corrupted after replay
- **Fix:** Make Message list immutable. All modifications create new messages. History is append-only

### 3. Permission Gaps
- **Problem:** Some tools (e.g., new MCP tools) not registered in PermissionPolicy
- **Symptom:** Tools execute with DangerFullAccess by default, security bypass
- **Fix:** Every tool registration MUST include required_permission. Fail-fast on unknown tools. Add integration test to catch missing permissions

### 4. Blocking Persistence
- **Problem:** Saving session synchronously after every tool call slows down the loop
- **Symptom:** 500ms+ latency per tool call, agent feels sluggish
- **Fix:** Make persistence async with fire-and-forget. On crash recovery, replay incomplete turns

### 5. Tool Call Serialization Errors
- **Problem:** Tool input/output contains non-serializable values (closures, sockets, circular refs)
- **Symptom:** Session fails to persist, crash on resume
- **Fix:** Use JSON-safe serialization in ToolResultMessage. Strip non-serializable fields. Add unit test for each tool's serialization

---

## Layer 2: Tool System

### 1. Vague Tool Descriptions
- **Problem:** LLM can't distinguish between similar tools
- **Symptom:** LLM calls wrong tool, returns confusing error, user frustrated
- **Fix:** Write descriptions that emphasize DIFFERENCE from similar tools. Include concrete examples of when to use each

### 2. Missing input_schema Validation
- **Problem:** Tool receives unexpected input shape, crashes or returns garbage
- **Symptom:** Agent fails silently with internal error, no useful feedback
- **Fix:** Validate input against JSONSchema before tool execution. Return clear validation error if invalid

### 3. No Bash Timeout
- **Problem:** `rm -rf /` or infinite loop in bash tool freezes the harness
- **Symptom:** Entire agent hangs, must be killed manually
- **Fix:** Required timeout on all bash tools. Kill subprocess after timeout. Log the killed process with full command line

### 4. Tools Bypass Permission System
- **Problem:** A new tool is added directly to the executor without checking PermissionMode
- **Symptom:** Security bypass: tool with Dangerous permissions runs without check
- **Fix:** Permission check is in HarnessCore, not in ToolExecutor. Executor trusts harness has already checked. Add integration test: attempt dangerous operation without permission, verify it fails

### 5. Non-serializable Tool Results
- **Problem:** Tool returns closure, socket, or circular-reference object that can't be sent to LLM
- **Symptom:** "Error: circular reference" in agent output, or silent message drop
- **Fix:** ToolExecutor serializes output to JSON before returning. Strip non-serializable fields with a safe_serialize() wrapper

---

## Layer 3: Plugin & Hooks

### 1. Hook Throws Uncaught Exception
- **Problem:** One bad hook breaks the entire tool execution chain
- **Symptom:** Agent fails with obscure error when a specific tool runs
- **Fix:** All hook runs wrapped in try/catch. Failed hooks log error and continue. Add test: hook that throws — verifies execution continues

### 2. Hook Modifies Input Without LLM Awareness
- **Problem:** PreToolUse sanitizes/modifies input but LLM doesn't know, continues with wrong assumptions
- **Symptom:** LLM repeatedly tries same sanitized operation, keeps failing
- **Fix:** When hook significantly modifies input, append a system message explaining what changed. LLM can then adjust strategy

### 3. Non-deterministic Hook Ordering
- **Problem:** Hooks execute in insertion order, which depends on load order — different each run
- **Symptom:** Inconsistent behavior, race conditions in tests
- **Fix:** Explicit priority field (lower = first). Hooks sorted by priority before execution. Document default priorities

### 4. Plugin Version Conflict
- **Problem:** Plugin A requires hook@v2, Plugin B requires hook@v1 — incompatible versions
- **Symptom:** Plugins load in wrong order, hooks override each other unexpectedly
- **Fix:** Version constraints validated at load time. Conflict = load failure with clear error listing both requirements

### 5. Hook State Pollution
- **Problem:** Hook A adds metadata to ctx that Hook B reads — but execution order varies
- **Symptom:** One hook's behavior changes depending on what other hooks loaded
- **Fix:** ExecutionContext is append-only for hook data. No modification of existing fields. Document ctx as read-only for hooks

---

## Layer 4: Multi-Agent

### 1. Shared Session Between Parent and Child
- **Problem:** Sub-agent messages pollute parent's message history → context window overflow
- **Symptom:** Agent becomes unresponsive after many sub-agent calls, context window error
- **Fix:** Sub-agents always get their own Session. Parent only receives structured AgentResultMessage. Child messages stay in child Session

### 2. Sub-agent Blocks Parent
- **Problem:** Parent waits synchronously for sub-agent, which never returns
- **Symptom:** Entire agent hangs when sub-agent infinite-loops
- **Fix:** Sub-agent runs async. Parent receives progress updates. Parent can kill sub-agent at any time

### 3. Context Exhaustion from Too Many Parallel Agents
- **Problem:** 10 parallel agents all writing results → parent context floods
- **Symptom:** Agent slow after parallel dispatch, eventually hits context limit
- **Fix:** Resource quota: max parallel agents per session (e.g., 3). Queue excess requests. Return QueueFull error to LLM

### 4. No Timeout on Sub-agent
- **Problem:** Infinite loop in sub-agent blocks the entire session
- **Symptom:** Agent hangs after spawning sub-agent
- **Fix:** Sub-agents have mandatory max_turns. Hard kill after limit reached. Log termination reason

### 5. Race Condition on Shared Resources
- **Problem:** Two sub-agents write to the same file simultaneously
- **Symptom:** Corrupted file, nondeterministic output
- **Fix:** Sub-agents have isolated working_dir by default. Shared resources require explicit lock or coordination protocol
