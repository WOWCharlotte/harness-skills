# Layer 2: Tool System — Detailed Specification

**Status:** Approved
**Layer:** 2 of 4
**Purpose:** Manages registration, discovery, execution, and permission control for all tools available in the system.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md) with code examples from claw-code.

---

## Components

### 2.1 Tool Registry

Central registry of all available tools. Tools register themselves by declaring a ToolSpec.

#### Tool Interface: Six Functional Groups

The `Tool` interface is a generic interface with 30+ methods, divided into six functional groups:

| Group | Methods | Purpose |
|-------|---------|---------|
| **Metadata** | `name`, `description`, `input_schema` | Tool identification for LLM |
| **Capability** | `isConcurrencySafe`, `isReadOnly`, `isDestructive` | Execution properties |
| **Permission** | `requiredPermission`, `checkPermissions` | Security attributes |
| **Execution** | `execute`, `validate`, `getTimeout` | Tool invocation |
| **UI** | `render`, `getShortDescription` | User-facing presentation |
| **Lifecycle** | `onRegister`, `onUnregister` | Registration hooks |

**Key attribute default values** (via `buildTool` factory):

| Attribute | Default | Design Rationale |
|-----------|---------|------------------|
| `isConcurrencySafe` | `false` | Assume cannot parallelize, prevents concurrency bugs |
| `isReadOnly` | `false` | Assume will write, triggers stricter permission checks |
| `isDestructive` | `false` | Don't assume destructive, avoids excessive warnings |
| `checkPermissions` | `allow` | Default to allow, external permission system provides safety net |

**Design rationale for defaults**: Concurrency and read-only attributes are fail-closed (conservative); permission checking is fail-open (permissive). Reason: concurrency conflicts and accidental writes are internal tool issues the tool must handle; permission judgment has external multi-layer defense system as safety net.

#### ToolSpec Model

```typescript
interface ToolSpec {
  name: string                    // Unique: "read_file", "bash"
  description: string             // Plain English: what this tool does
  input_schema: JSONSchema         // JSON Schema describing valid inputs
  required_permission: PermissionMode  // Minimum permission to run this tool
  categories: string[]             // Optional: ["filesystem", "network", "agent"]
  deprecation_warning?: string     // Optional: if set, LLM sees this warning

  // Execution properties
  isConcurrencySafe: boolean      // Can this tool run in parallel with itself?
  isReadOnly: boolean              // Does this tool modify state?
  isDestructive: boolean           // Can this tool cause irreversible damage?
  getTimeout?: () => number        // Optional timeout override

  // Safety
  checkPermissions: 'allow' | 'deny' | 'ask'  // Default permission check behavior
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

#### Registration with Three Loading Strategies

Tool registry assembles available tools based on current environment using three loading strategies:

```
┌──────────────────────────────────────────────────────────────┐
│  1. Built-in Tools                                          │
│     - Compiled into binary                                   │
│     - Always available                                       │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Feature-Gated Tools (compile-time elimination)          │
│     - Bundled but conditionally loaded via feature() macro  │
│     - When feature flag is false, require() branch removed  │
│       at build time — not just skipped, but doesn't exist   │
│       in final bundle                                        │
│     - WHY require() instead of import(): dynamic require     │
│       can be conditionally wrapped, static import cannot    │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Plugin/MCP Tools (runtime discovery)                     │
│     - Discovered at runtime from plugins or MCP servers     │
│     - Dynamically registered without restart                │
└──────────────────────────────────────────────────────────────┘
```

**Tool pool assembly (`assembleToolPool`)**: Merges built-in and MCP tools using **partitioned sorting** — built-in tools sorted first by name, MCP tools sorted after by name, two groups do not interleave. Reason: server-side prompt cache strategy places cache breakpoints after the last built-in tool; if MCP tools insert among built-in tools, cache invalidates.

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

#### Streaming vs Batch Execution

When model returns multiple tool calls simultaneously (e.g., reading 3 files), two execution modes exist:

| Mode | Behavior | Latency | Complexity |
|------|----------|---------|------------|
| **Batch Execution** | Wait for all tool_use blocks to arrive, execute sequentially | Higher (first Read waits for last tool_use block) | Simple |
| **Streaming Execution** (default) | Execute immediately as each tool_use block arrives | Lower | Requires concurrency control |

**Concurrency Control Model**:

```
┌──────────────────────────────────────────────────────────────┐
│  Tool A (isConcurrencySafe=true) ──┐                        │
│  Tool B (isConcurrencySafe=true) ──┼── Parallel Partition 1  │
│  Tool C (isConcurrencySafe=true) ──┘                        │
└──────────────────────────────────────────────────────────────┘
                          ▼ (serial between partitions)
┌──────────────────────────────────────────────────────────────┐
│  Tool D (isConcurrencySafe=false) ──── Partition 2            │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Tool E (isConcurrencySafe=true) ──── Partition 3            │
└──────────────────────────────────────────────────────────────┘
```

**Rules**:
- Each tool declares via `isConcurrencySafe(input)` whether it can run in parallel
- Consecutive concurrency-safe tools form a "parallel partition"
- Partitions execute serially; within a partition, tools execute in parallel
- If `isConcurrencySafe` throws exception (input parse failure), default to unsafe (fail-closed)

**Why FileRead is concurrency-safe but FileEdit is NOT?** Two parallel FileEdits may edit different positions in the same file, causing line offset conflicts and race conditions. FileRead is read-only, naturally conflict-free.

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

  // Some tools need to modify subsequent tool context
  // (e.g., change working directory) but cannot mutate global state
  // Only applies to non-concurrency-safe tools
  contextModifier?: ContextModifier
}
```

**`contextModifier`**: Provides controlled way to modify subsequent tool context. Only effective for non-concurrency-safe tools — concurrent tools cannot modify each other's context.

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

> **Engineering Practice:** See [tool-registry-impl.md](../references/best-practices/tool-registry-impl.md) for `ToolRegistry`, `ToolExecutor`, permission filtering, and `ExecutionRegistry` implementation patterns from claw-code.

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

  // Tool-specific context (40+ fields total)
  readFileState: Map<string, FileReadState>    // Track which files FileReadTool has read
  abortController: AbortController              // For cancelling long-running operations
  setToolJSX?: (component: JSX.Element) => void // UI render callback for progress
  agentId: string                              // Sub-agent identifier
  contentReplacementState: ContentBudget       // Token budget control
  updateFileHistoryState: FileHistory          // For /rewind support
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

### 2.5 BashTool: Security Fortress

BashTool is the most complex single tool (18 files). Complexity arises from fundamental contradiction: **shell command expressiveness is nearly unlimited, but security constraints must be strict**.

#### Eight-Layer Security Checks

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Permission Check                                   │
│  - Match against allowlist/denylist patterns               │
│  - Prefix matching: Bash(cd:*)                              │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: Tree-sitter AST Parsing                           │
│  - Parse compound commands into SimpleCommand AST           │
│  - Each sub-command checked independently                   │
│  - Any sub-command denied → entire command denied           │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: Sub-command Count Limit                            │
│  - Max 50 sub-commands per compound command                 │
│  - Prevents ReDoS and event loop starvation                 │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: Flag-level Validation                              │
│  - Not just command name, validate each flag's value type   │
│  - Example: xargs -I vs -i have different semantics         │
│    -i has optional parameter GNU implementation            │
│    can be exploited for arbitrary command execution          │
│  - Whitelist defines allowed value types per flag            │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: Command Injection Detection (bashSecurity.ts)     │
│  - 25+ checks covering:                                     │
│    - Command substitution: $(), backticks                   │
│    - Process substitution: <(), >()                         │
│    - Parameter substitution: ${}                            │
│    - Zsh-specific dangerous commands: zmodload, syswrite   │
│    - Control characters, Unicode whitespace                  │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 6: Sandbox Mechanism                                  │
│  - SandboxManager restricts:                                │
│    - Filesystem read/write paths                            │
│    - Network access hosts                                   │
│    - Unix socket access                                     │
│  - Commands without matching allow rule CAN execute         │
│    inside sandbox, but deny/ask rules still take priority  │
│  - Sandbox is "safety net", not "get out of jail free"     │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 7: Timeout & Resource Limits                          │
│  - Mandatory timeout on all bash commands                   │
│  - Memory and CPU limits (ulimit or container cgroups)     │
└──────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 8: Output Filtering                                   │
│  - Strip sensitive data from output before returning        │
│  - Trap command detection (Ctrl+C)                         │
└──────────────────────────────────────────────────────────────┘
```

### 2.6 FileEditTool: Search-Replace Safety

FileEditTool implements "search-replace" file editing pattern.

**Core invariant**: `old_string` must uniquely match in file. If multiple matches exist, edit fails and requires more context. This constraint seems strict but avoids "edited wrong location" catastrophic errors.

**Critical safety invariant**: **Cannot edit unread files**. `readFileState` cache tracks which files FileReadTool has read. If model attempts to edit unread file, system refuses with prompt to read first. This prevents model from "editing by memory" — it must see file's current state.

```
┌──────────────────────────────────────────────────────────────┐
│  FileEditTool.execute(input, ctx)                           │
│     │                                                        │
│     ▼                                                        │
│  1. Validate old_string uniquely matches in file            │
│     │ (fail if multiple matches)                            │
│     ▼                                                        │
│  2. Check readFileState: was file read by FileReadTool?     │
│     │ (fail if not read)                                    │
│     ▼                                                        │
│  3. Apply replacement                                        │
│     ▼                                                        │
│  4. Return result                                            │
└──────────────────────────────────────────────────────────────┘
```

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
- [ ] **Concurrency safety declaration:** Each tool explicitly declares isConcurrencySafe
- [ ] **Read-before-edit enforcement:** FileEditTool verifies readFileState before execution
- [ ] **contextModifier safety:** Context modifications only allowed for non-concurrent tools

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

### 6. Parallel Edit Conflicts
**Problem:** Two concurrent FileEditTools edit same file different positions → line offset conflicts.
**Fix:** FileEditTool is NOT concurrency-safe. StreamingToolExecutor serializes edits to same file.

### 7. Edit by Memory
**Problem:** Model edits file without reading current content → stale state editing.
**Fix:** FileEditTool enforces readFileState check. Model must read file before editing.

---
