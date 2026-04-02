# Permission Enforcement 工程实践

## 源码来源

`claw-code-main/src/permissions.py::ToolPermissionContext`

## 核心实现

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

## 关键设计解读

### 1. 两种拒绝模式

| 模式 | 用途 | 示例 |
|-----|------|-----|
| `deny_names` | 精确匹配 | `['bash', 'shell_exec']` |
| `deny_prefixes` | 前缀匹配 | `['dangerous_', 'admin_']` |

### 2. 大小写不敏感

```python
def blocks(self, tool_name: str) -> bool:
    lowered = tool_name.lower()  # 统一转小写比较
    return lowered in self.deny_names or any(lowered.startswith(prefix) for prefix in self.deny_prefixes)
```

### 3. Permission Denial 跟踪

在 `query_engine.py` 中集成 permission denial 跟踪：

```python
class QueryEnginePort:
    permission_denials: list[PermissionDenial] = field(default_factory=list)

    def submit_message(self, prompt: str, ...) -> TurnResult:
        # ... 处理 ...
        self.permission_denials.extend(denied_tools)  # 记录所有拒绝
        return TurnResult(
            permission_denials=denied_tools,  # 返回给调用方
            ...
        )

# Denial 模型
@dataclass(frozen=True)
class PermissionDenial:
    tool_name: str
    reason: str  # 拒绝原因，便于调试
```

### 4. 在 Runtime 中使用

```python
def _infer_permission_denials(self, matches: list[RoutedMatch]) -> list[PermissionDenial]:
    denials: list[PermissionDenial] = []
    for match in matches:
        # 规则示例: 所有 bash 相关工具默认拒绝
        if match.kind == 'tool' and 'bash' in match.name.lower():
            denials.append(PermissionDenial(
                tool_name=match.name,
                reason='destructive shell execution remains gated'
            ))
    return denials
```

## 适配建议

### Python 项目

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

# 权限检查集成到 Agent Loop
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

### TypeScript 项目

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

### Permission Modes 实现

规范中定义的 PermissionMode 可通过 PermissionContext 实现：

```python
@dataclass(frozen=True)
class PermissionMode:
    ReadOnly = PermissionContext(deny_names=['write_file', 'bash', 'shell'])
    WorkspaceWrite = PermissionContext(deny_names=['bash', 'shell'])
    DangerFullAccess = PermissionContext(deny_names=[])
```

## 规范到实现的映射

| 规范定义 | claw-code 实现 |
|---------|---------------|
| PermissionMode enum | `ToolPermissionContext` |
| `permit(session, tool_name)` | `ctx.blocks(tool_name)` |
| tool_overrides | `deny_names` / `deny_prefixes` |
| Permission denial tracking | `permission_denials: list[PermissionDenial]` |

## 注意事项

1. **默认拒绝**: 未明确允许的工具应默认拒绝
2. **记录原因**: `PermissionDenial.reason` 必须填写，便于调试
3. **大小写处理**: 工具名比较应忽略大小写
4. **前缀匹配慎用**: `deny_prefixes` 可能误伤正常工具名
