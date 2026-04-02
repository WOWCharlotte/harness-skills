# Hook System Engineering Practice

## Overview

The claw-code Python port does not include a full hook system implementation. This document provides implementation guidance based on the spec in [layer3-plugin-hooks.md](../../specs/layer3-plugin-hooks.md).

## Core Implementation

### Hook Result Types

```typescript
type HookResult =
  | { status: "continue", input?: Value }    // Proceed, optionally modified
  | { status: "blocked", reason: string }       // Stop execution
  | { status: "skip_remaining", output?: Value } // Use this output directly
```

### HookRunner Implementation

```python
from dataclasses import dataclass, field
from typing import Any, Callable
from enum import Enum

class HookStatus(Enum):
    CONTINUE = "continue"
    BLOCKED = "blocked"
    SKIP_REMAINING = "skip_remaining"

@dataclass(frozen=True)
class HookResult:
    status: HookStatus
    input: Any = None  # for continue status
    reason: str = ""    # for blocked status

@dataclass
class Hook:
    name: str
    description: str
    enabled: bool = True
    priority: int = 100  # lower = runs first
    run: Callable[..., HookResult] = field(default_factory=lambda: lambda *args: HookResult(HookStatus.CONTINUE))
    run_post: Callable[..., HookResult] = field(default_factory=lambda: lambda *args: HookResult(HookStatus.CONTINUE))

class HookRunner:
    def __init__(self):
        self._pre_hooks: list[Hook] = []
        self._post_hooks: list[Hook] = []

    def add_pre(self, hook: Hook) -> None:
        self._pre_hooks.append(hook)
        self._pre_hooks.sort(key=lambda h: h.priority)

    def add_post(self, hook: Hook) -> None:
        self._post_hooks.append(hook)
        self._post_hooks.sort(key=lambda h: h.priority)

    async def run_pre_hooks(
        self,
        ctx: ExecutionContext,
        spec: ToolSpec,
        raw_input: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, str | None]:
        current_input = raw_input

        for hook in self._pre_hooks:
            if not hook.enabled:
                continue

            try:
                result = await hook.run(ctx, spec, current_input)

                if result.status == HookStatus.BLOCKED:
                    return current_input, True, result.reason

                if result.status == HookStatus.CONTINUE and result.input is not None:
                    current_input = result.input

                if result.status == HookStatus.SKIP_REMAINING:
                    return current_input, False, None

            except Exception as e:
                # Hook failure does NOT break execution
                print(f"Hook {hook.name} failed: {e}")
                continue

        return current_input, False, None

    async def run_post_hooks(
        self,
        ctx: ExecutionContext,
        spec: ToolSpec,
        input_data: dict[str, Any],
        output: ToolResult,
    ) -> ToolResult:
        current_output = output

        for hook in self._post_hooks:
            if not hook.enabled:
                continue

            try:
                result = await hook.run_post(ctx, spec, input_data, current_output)

                if result.status == HookStatus.BLOCKED:
                    return ToolResult(
                        success=False,
                        error=f"PostToolUse blocked: {result.reason}",
                    )

                if result.status == HookStatus.CONTINUE and result.input is not None:
                    current_output = result.input

            except Exception as e:
                print(f"PostToolUse hook {hook.name} failed: {e}")
                continue

        return current_output
```

### Built-in Hooks

```python
# Schema validation hook
validate_schema_hook = Hook(
    name="validate-schema",
    description="Validate tool input against input_schema",
    priority=10,
    run=lambda ctx, spec, input_data: validate(spec.input_schema, input_data),
)

# Permission check hook
check_permissions_hook = Hook(
    name="check-permissions",
    description="Re-verify permission level before dangerous tools",
    priority=20,
    run=lambda ctx, spec, input_data: check_permission(ctx, spec),
)

# Rate limiting hook
rate_limiter_hook = Hook(
    name="rate-limiter",
    description="Enforce per-tool call rate limits",
    priority=30,
    run=lambda ctx, spec, input_data: check_rate_limit(ctx, spec),
)

# Cache result hook
cache_result_hook = Hook(
    name="cache-result",
    description="Cache successful tool results by input hash",
    priority=30,
    run_post=lambda ctx, spec, input_data, output: cache_if_success(ctx, spec, input_data, output),
)
```

## Key Design Insights

### 1. Error Isolation

```python
try:
    result = await hook.run(ctx, spec, current_input)
except Exception as e:
    print(f"Hook {hook.name} failed: {e}")
    continue  # NEVER let one hook break the chain
```

A failing hook never breaks the tool execution chain. It logs the error and continues.

### 2. Priority-based Ordering

```python
def add_pre(self, hook: Hook) -> None:
    self._pre_hooks.append(hook)
    self._pre_hooks.sort(key=lambda h: h.priority)  # lower = first
```

Lower priority numbers execute first. This makes hook ordering deterministic.

### 3. Input Modification Chain

```python
if result.status == HookStatus.CONTINUE and result.input is not None:
    current_input = result.input  # modified by hook
```

Each hook can modify input that subsequent hooks will see. The final `current_input` is passed to the tool.

### 4. Short-circuit on Blocked

```python
if result.status == HookStatus.BLOCKED:
    return current_input, True, result.reason
```

Returning `blocked` immediately stops all remaining hooks AND tool execution.

## Adaptation Guide

### Tool Execution with Hooks

```python
async def execute_with_hooks(
    tool_executor: ToolExecutor,
    spec: ToolSpec,
    input_data: dict[str, Any],
    ctx: ExecutionContext,
    hook_runner: HookRunner,
) -> ToolResult:
    # 1. Pre-hooks
    modified_input, blocked, reason = await hook_runner.run_pre_hooks(ctx, spec, input_data)
    if blocked:
        return ToolResult(success=False, error=f"Blocked: {reason}")

    # 2. Execute tool
    result = await tool_executor.execute(spec, modified_input, ctx)

    # 3. Post-hooks
    final_result = await hook_runner.run_post_hooks(ctx, spec, modified_input, result)

    return final_result
```

### TypeScript Project

```typescript
type HookStatus = 'continue' | 'blocked' | 'skip_remaining';

interface HookResult {
  status: HookStatus;
  input?: unknown;
  reason?: string;
}

interface PreToolUseHook {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  run(ctx: ExecutionContext, spec: ToolSpec, input: Record<string, unknown>): Promise<HookResult>;
}

interface PostToolUseHook {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  run(ctx: ExecutionContext, spec: ToolSpec, input: Record<string, unknown>, output: ToolResult): Promise<HookResult>;
}

class HookRunner {
  private preHooks: PreToolUseHook[] = [];
  private postHooks: PostToolUseHook[] = [];

  addPre(hook: PreToolUseHook): void {
    this.preHooks.push(hook);
    this.preHooks.sort((a, b) => a.priority - b.priority);
  }

  addPost(hook: PostToolUseHook): void {
    this.postHooks.push(hook);
    this.postHooks.sort((a, b) => a.priority - b.priority);
  }

  async runPreHooks(ctx: ExecutionContext, spec: ToolSpec, rawInput: Record<string, unknown>):
      Promise<{ input: Record<string, unknown>; blocked: boolean; reason?: string }> {
    let currentInput = rawInput;

    for (const hook of this.preHooks) {
      if (!hook.enabled) continue;

      try {
        const result = await hook.run(ctx, spec, currentInput);

        if (result.status === 'blocked') {
          return { input: currentInput, blocked: true, reason: result.reason };
        }

        if (result.status === 'continue' && result.input !== undefined) {
          currentInput = result.input as Record<string, unknown>;
        }

        if (result.status === 'skip_remaining') {
          return { input: currentInput, blocked: false };
        }
      } catch (error) {
        console.error(`Hook ${hook.name} failed:`, error);
        continue;
      }
    }

    return { input: currentInput, blocked: false };
  }
}
```

## Spec to Implementation Mapping

| Spec Definition | Implementation |
|----------------|-----------------|
| `HookResult` union type | `HookStatus` enum + result object |
| `PreToolUseHook.run()` | `Hook.run()` callable |
| `PostToolUseHook.run()` | `Hook.run_post()` callable |
| Priority sorting | `sort(key=lambda h: h.priority)` |
| Error isolation | try/catch with continue |

## Key Takeaways

1. **Never let hooks break the chain**: Catch all exceptions
2. **Priority determines order**: Lower number = earlier execution
3. **Block short-circuits**: Blocked status skips all remaining hooks AND tool
4. **Input flows through hooks**: Each hook sees the output of the previous hook
5. **Enable/disable per session**: Hook.enabled flag allows conditional execution
