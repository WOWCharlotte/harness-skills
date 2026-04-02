# Layer 1: Harness Core Best Practices

工程实践案例，来源于 [claw-code](../../claw-code-main) 源码的 Python 移植版本。

## 目录

| 文件 | 对应规范章节 | 核心模式 |
|------|------------|---------|
| [agent-loop-impl.md](./agent-loop-impl.md) | 1.1 Agent Loop | Turn-based Loop, Budget-aware Termination |
| [session-management-impl.md](./session-management-impl.md) | 1.2 Session Manager | Immutable Messages, Session Persistence |
| [permission-enforcement-impl.md](./permission-enforcement-impl.md) | 1.3 Config & Permission | ToolPermissionContext, Denial Tracking |
| [config-examples.md](./config-examples.md) | 1.3 Config & Permission | QueryEngineConfig, RetryPolicy |

## 源码映射

| claw-code 源码 | 规范组件 |
|---------------|---------|
| `src/runtime.py::PortRuntime` | Agent Loop |
| `src/query_engine.py::QueryEnginePort` | Session + Loop |
| `src/session_store.py::StoredSession` | Session Persistence |
| `src/permissions.py::ToolPermissionContext` | Permission Enforcement |
| `src/history.py::HistoryLog` | Session Audit Trail |

## 使用方式

每个实践文件包含：
1. **源码片段** - 来自 claw-code 的实际实现
2. **关键设计解读** - 为什么这样设计
3. **适配建议** - 如何应用到你的项目
