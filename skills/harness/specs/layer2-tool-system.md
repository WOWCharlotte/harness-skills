# Layer 2: Tool System — Detailed Specification

**Status:** Approved
**Layer:** 2 of 4
**Purpose:** Manages registration, discovery, execution, and permission control for all tools available in the system.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md) with code examples from claw-code.

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
