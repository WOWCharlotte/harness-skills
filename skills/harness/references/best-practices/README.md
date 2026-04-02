# Layer 1: Harness Core Best Practices

Engineering patterns derived from the [claw-code](../../claw-code-main) Python port implementation.

## Table of Contents

| File | Spec Section | Core Pattern |
|------|-------------|--------------|
| [agent-loop-impl.md](./agent-loop-impl.md) | 1.1 Agent Loop | Turn-based Loop, Budget-aware Termination |
| [session-management-impl.md](./session-management-impl.md) | 1.2 Session Manager | Immutable Messages, Session Persistence |
| [permission-enforcement-impl.md](./permission-enforcement-impl.md) | 1.3 Config & Permission | ToolPermissionContext, Denial Tracking |
| [config-examples.md](./config-examples.md) | 1.3 Config & Permission | QueryEngineConfig, RetryPolicy |

## Source Code Mapping

| claw-code Source | Spec Component |
|-----------------|----------------|
| `src/runtime.py::PortRuntime` | Agent Loop |
| `src/query_engine.py::QueryEnginePort` | Session + Loop |
| `src/session_store.py::StoredSession` | Session Persistence |
| `src/permissions.py::ToolPermissionContext` | Permission Enforcement |
| `src/history.py::HistoryLog` | Session Audit Trail |

## How to Use

Each practice file contains:
1. **Source Code Snippets** — Actual implementation from claw-code
2. **Key Design Insights** — Why it was designed this way
3. **Adaptation Guide** — How to apply to your project
