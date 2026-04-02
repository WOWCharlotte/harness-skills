# Harness Core Best Practices

Engineering patterns derived from the [claw-code](../../claw-code-main) Python port implementation.

## Table of Contents

### Layer 1: Harness Core

| File | Spec Section | Core Pattern |
|------|-------------|--------------|
| [agent-loop-impl.md](./agent-loop-impl.md) | 1.1 Agent Loop | Turn-based Loop, Budget-aware Termination |
| [session-management-impl.md](./session-management-impl.md) | 1.2 Session Manager | Immutable Messages, Session Persistence |
| [permission-enforcement-impl.md](./permission-enforcement-impl.md) | 1.3 Config & Permission | ToolPermissionContext, Denial Tracking |
| [config-examples.md](./config-examples.md) | 1.3 Config & Permission | QueryEngineConfig, RetryPolicy |

### Layer 2: Tool System

| File | Spec Section | Core Pattern |
|------|-------------|--------------|
| [tool-registry-impl.md](./tool-registry-impl.md) | 2.1-2.2 Tool Registry/Executor | ToolRegistry, ToolExecutor, Permission Filtering |

### Layer 3: Plugin & Hooks

| File | Spec Section | Core Pattern |
|------|-------------|--------------|
| [hook-system-impl.md](./hook-system-impl.md) | 3.1 Hook System | HookRunner, Error Isolation, Priority Ordering |

### Layer 4: Multi-Agent

| File | Spec Section | Core Pattern |
|------|-------------|--------------|
| [multi-agent-impl.md](./multi-agent-impl.md) | 4.1-4.4 Agent Spawning/Communication | AgentManager, Fork, Session Isolation |

## Source Code Mapping

| claw-code Source | Layer | Spec Component |
|-----------------|-------|----------------|
| `src/runtime.py::PortRuntime` | L1 | Agent Loop |
| `src/query_engine.py::QueryEnginePort` | L1 | Session + Loop |
| `src/session_store.py::StoredSession` | L1 | Session Persistence |
| `src/permissions.py::ToolPermissionContext` | L1 | Permission Enforcement |
| `src/history.py::HistoryLog` | L1 | Session Audit Trail |
| `src/tools.py`, `src/tool_pool.py` | L2 | Tool Registry |
| `src/execution_registry.py` | L2 | Tool Executor |
| `src/models.py` | L2 | ToolSpec Model |

## How to Use

Each practice file contains:
1. **Source Code Snippets** — Actual implementation from claw-code where available
2. **Key Design Insights** — Why it was designed this way
3. **Adaptation Guide** — Python and TypeScript examples
4. **Spec to Implementation Mapping** — How spec concepts map to code
