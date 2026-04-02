# Layer 3: Plugin & Hooks — Detailed Specification

**Status:** Approved
**Layer:** 3 of 4
**Purpose:** Provides extensible interception mechanisms (Hooks) and modular packaging (Plugins) for extending harness behavior without modifying core code.

> **⚡ Engineering Practices Available:** This specification describes the design in abstract. For concrete implementations, see [best practices](../references/best-practices/README.md).

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

> **Engineering Practice:** See [hook-system-impl.md](../references/best-practices/hook-system-impl.md) for `HookRunner` implementation with error isolation, priority-based ordering, input modification chain, and built-in hooks pattern.

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
