# Tool Registry Engineering Practice

## Source

- `claw-code-main/src/tools.py`
- `claw-code-main/src/tool_pool.py`
- `claw-code-main/src/execution_registry.py`
- `claw-code-main/src/models.py`

## Core Implementation

### PortingModule Data Model

```python
@dataclass(frozen=True)
class PortingModule:
    name: str
    responsibility: str
    source_hint: str
    status: str = 'planned'
```

This is claw-code's equivalent of `ToolSpec`. Key difference: `responsibility` replaces `input_schema` for simplicity.

### Tool Registry Pattern

```python
# tools.py
PORTED_TOOLS = load_tool_snapshot()

def get_tool(name: str) -> PortingModule | None:
    needle = name.lower()
    for module in PORTED_TOOLS:
        if module.name.lower() == needle:
            return module
    return None

def filter_tools_by_permission_context(
    tools: tuple[PortingModule, ...],
    permission_context: ToolPermissionContext | None = None,
) -> tuple[PortingModule, ...]:
    if permission_context is None:
        return tools
    return tuple(module for module in tools if not permission_context.blocks(module.name))
```

### ToolPool Assembler

```python
# tool_pool.py
@dataclass(frozen=True)
class ToolPool:
    tools: tuple[PortingModule, ...]
    simple_mode: bool
    include_mcp: bool

def assemble_tool_pool(
    simple_mode: bool = False,
    include_mcp: bool = True,
    permission_context: ToolPermissionContext | None = None,
) -> ToolPool:
    return ToolPool(
        tools=get_tools(
            simple_mode=simple_mode,
            include_mcp=include_mcp,
            permission_context=permission_context,
        ),
        simple_mode=simple_mode,
        include_mcp=include_mcp,
    )
```

### ExecutionRegistry (Mirrored Executor)

```python
# execution_registry.py
@dataclass(frozen=True)
class MirroredTool:
    name: str
    source_hint: str

    def execute(self, payload: str) -> str:
        return execute_tool(self.name, payload).message


@dataclass(frozen=True)
class ExecutionRegistry:
    commands: tuple[MirroredCommand, ...]
    tools: tuple[MirroredTool, ...]

    def tool(self, name: str) -> MirroredTool | None:
        lowered = name.lower()
        for tool in self.tools:
            if tool.name.lower() == lowered:
                return tool
        return None
```

## Key Design Insights

### 1. Immutable Tool Registry

```python
PORTED_TOOLS = load_tool_snapshot()  # loaded once at module import
```

Tools are loaded from a snapshot file at startup, not dynamically registered. This matches the spec's "hot-swap" requirement but uses snapshot for simplicity.

### 2. Permission Filtering at Query Time

```python
def get_tools(..., permission_context: ToolPermissionContext | None = None):
    tools = list(PORTED_TOOLS)
    # ... filtering ...
    return filter_tools_by_permission_context(tuple(tools), permission_context)
```

Permission filtering happens at retrieval time, not at registration. This allows the same tool registry to serve sessions with different permission levels.

### 3. Case-insensitive Tool Lookup

```python
def tool(self, name: str) -> MirroredTool | None:
    lowered = name.lower()  # normalize before comparison
    for tool in self.tools:
        if tool.name.lower() == lowered:
            return tool
    return None
```

Tool names are compared case-insensitively.

### 4. Tool Definition Simplicity

In claw-code, `ToolDefinition` is minimal:

```python
@dataclass(frozen=True)
class ToolDefinition:
    name: str
    purpose: str  # replaces full input_schema for simplicity
```

The full spec's `input_schema` is not implemented in the Python port — it's inferred from `source_hint`.

## Adaptation Guide

### Python Project (Full ToolSpec)

```python
from dataclasses import dataclass, field
from typing import Any
import json

@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]  # JSON Schema
    required_permission: PermissionMode
    categories: tuple[str, ...] = ()
    deprecation_warning: str | None = None

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        if spec.name in self._tools:
            raise DuplicateToolError(spec.name)
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def list_by_category(self, category: str) -> list[ToolSpec]:
        return [t for t in self._tools.values() if category in t.categories]

    def list_all(self) -> list[ToolSpec]:
        return list(self._tools.values())

    def validate_input(self, spec: ToolSpec, input_data: dict) -> ValidationResult:
        try:
            jsonschema.validate(input_data, spec.input_schema)
            return ValidationResult(valid=True)
        except jsonschema.ValidationError as e:
            return ValidationResult(valid=False, error=str(e))
```

### ToolExecutor Trait

```python
from dataclasses import dataclass
from typing import Any, Protocol

class ToolExecutor(Protocol):
    async def execute(
        self,
        spec: ToolSpec,
        input_data: dict[str, Any],
        ctx: ExecutionContext,
    ) -> ToolResult: ...

@dataclass(frozen=True)
class ToolResult:
    success: bool
    output: Any = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=lambda: {})

@dataclass
class ExecutionContext:
    session_id: str
    working_dir: str
    env_vars: dict[str, str]
    permission_mode: PermissionMode
```

### TypeScript Project

```typescript
interface ToolSpec {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  requiredPermission: PermissionMode;
  categories?: string[];
  deprecationWarning?: string;
}

class ToolRegistry {
  private tools: Map<string, ToolSpec> = new Map();

  register(spec: ToolSpec): void {
    if (this.tools.has(spec.name)) {
      throw new DuplicateToolError(spec.name);
    }
    this.tools.set(spec.name, spec);
  }

  get(name: string): ToolSpec | undefined {
    return this.tools.get(name.toLowerCase());
  }

  listAll(): ToolSpec[] {
    return Array.from(this.tools.values());
  }
}

interface ToolExecutor {
  execute(
    spec: ToolSpec,
    input: Record<string, unknown>,
    ctx: ExecutionContext
  ): Promise<ToolResult>;
}
```

## Spec to Implementation Mapping

| Spec Definition | claw-code Implementation |
|----------------|-------------------------|
| `ToolSpec` | `PortingModule` |
| `ToolRegistry` | `get_tool()`, `PORTED_TOOLS` |
| `ToolExecutor` | `MirroredTool.execute()` |
| `ToolPermissionContext` | `filter_tools_by_permission_context()` |
| Permission check at registry | Permission check at query time |

## Key Takeaways

1. **Immutable snapshots**: Tool registry loaded once at startup
2. **Permission filtering at retrieval**: Same registry serves different permission levels
3. **Case-insensitive lookup**: Always normalize tool names
4. **Structured error returns**: `ToolExecution` with `handled` flag indicates success/failure
