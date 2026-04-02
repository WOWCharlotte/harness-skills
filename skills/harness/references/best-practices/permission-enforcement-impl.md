# Permission Enforcement Engineering Practice

## Source

`claw-code-main/src/permissions.py::ToolPermissionContext`

## Core Implementation

```python
@dataclass(frozen=True)
class ToolPermissionContext:
    deny_names: frozenset[str] = field(default_factory=frozenset)
    deny_prefixes: tuple[str, ...] = ()

    @classmethod
    def from_iterables(cls, deny_names: list[str] | None = None, deny_prefixes: list[str] | None = None) -> 'ToolPermissionContext':
        return cls(
            deny_names=frozenset(name.lower() for name in (deny_names or [])),
            deny_prefixes=tuple(prefix.lower() for prefix in (deny_prefixes or [])),
        )

    def blocks(self, tool_name: str) -> bool:
        lowered = tool_name.lower()
        return lowered in self.deny_names or any(lowered.startswith(prefix) for prefix in self.deny_prefixes)
```

## Key Design Insights

### 1. Two Denial Modes

| Mode | Use Case | Example |
|------|----------|---------|
| `deny_names` | Exact match | `['bash', 'shell_exec']` |
| `deny_prefixes` | Prefix match | `['dangerous_', 'admin_']` |

### 2. Case-insensitive Comparison

```python
def blocks(self, tool_name: str) -> bool:
    lowered = tool_name.lower()  # normalize to lowercase
    return lowered in self.deny_names or any(lowered.startswith(prefix) for prefix in self.deny_prefixes)
```

### 3. Permission Denial Tracking

Integration in `query_engine.py`:

```python
class QueryEnginePort:
    permission_denials: list[PermissionDenial] = field(default_factory=list)

    def submit_message(self, prompt: str, ...) -> TurnResult:
        # ... process ...
        self.permission_denials.extend(denied_tools)  # track all denials
        return TurnResult(
            permission_denials=denied_tools,  # return to caller
            ...
        )

# Denial model
@dataclass(frozen=True)
class PermissionDenial:
    tool_name: str
    reason: str  # reason for denial, aids debugging
```

### 4. Usage in Runtime

```python
def _infer_permission_denials(self, matches: list[RoutedMatch]) -> list[PermissionDenial]:
    denials: list[PermissionDenial] = []
    for match in matches:
        # Rule example: all bash-related tools denied by default
        if match.kind == 'tool' and 'bash' in match.name.lower():
            denials.append(PermissionDenial(
                tool_name=match.name,
                reason='destructive shell execution remains gated'
            ))
    return denials
```

## Adaptation Guide

### Python Project

```python
from dataclasses import dataclass, field
from typing import FrozenSet, Tuple

@dataclass(frozen=True)
class PermissionContext:
    deny_names: FrozenSet[str] = field(default_factory=frozenset)
    deny_prefixes: Tuple[str, ...] = ()

    @classmethod
    def create(cls, deny_names: list[str] | None = None,
               deny_prefixes: list[str] | None = None) -> 'PermissionContext':
        return cls(
            deny_names=frozenset(n.lower() for n in (deny_names or [])),
            deny_prefixes=tuple(p.lower() for p in (deny_prefixes or [])),
        )

    def is_blocked(self, tool_name: str) -> bool:
        lowered = tool_name.lower()
        return lowered in self.deny_names or any(lowered.startswith(p) for p in self.deny_prefixes)

# Permission check integrated into Agent Loop
async def execute_with_permission(
    tool_call: ToolCall,
    ctx: PermissionContext,
) -> ToolResult:
    if ctx.is_blocked(tool_call.name):
        return ToolResult.error(
            f"Permission denied for tool: {tool_call.name}",
            code="PERMISSION_DENIED"
        )

    return await tool_executor.execute(tool_call)
```

### TypeScript Project

```typescript
interface PermissionContext {
  readonly denyNames: ReadonlySet<string>;
  readonly denyPrefixes: readonly string[];
}

function createPermissionContext(
  denyNames?: string[],
  denyPrefixes?: string[]
): PermissionContext {
  return {
    denyNames: new Set((denyNames || []).map(n => n.toLowerCase())),
    denyPrefixes: denyPrefixes || [],
  };
}

function isBlocked(ctx: PermissionContext, toolName: string): boolean {
  const lowered = toolName.toLowerCase();
  if (ctx.denyNames.has(lowered)) return true;
  return ctx.denyPrefixes.some(p => lowered.startsWith(p));
}
```

### Permission Modes Implementation

PermissionMode defined in spec can be implemented via PermissionContext:

```python
@dataclass(frozen=True)
class PermissionMode:
    ReadOnly = PermissionContext(deny_names=['write_file', 'bash', 'shell'])
    WorkspaceWrite = PermissionContext(deny_names=['bash', 'shell'])
    DangerFullAccess = PermissionContext(deny_names=[])
```

## Spec to Implementation Mapping

| Spec Definition | claw-code Implementation |
|----------------|--------------------------|
| PermissionMode enum | `ToolPermissionContext` |
| `permit(session, tool_name)` | `ctx.blocks(tool_name)` |
| tool_overrides | `deny_names` / `deny_prefixes` |
| Permission denial tracking | `permission_denials: list[PermissionDenial]` |

## Key Takeaways

1. **Default to denial**: Tools not explicitly allowed should be denied by default
2. **Record reasons**: `PermissionDenial.reason` must be populated for debugging
3. **Case handling**: Tool name comparison should be case-insensitive
4. **Use prefix matching carefully**: `deny_prefixes` may accidentally block legitimate tools
