# claw-code Pattern Mapping

Maps each design pattern in the 4-layer spec to its concrete implementation in claw-code's source code.

## Layer 1: Harness Core

| Pattern | File | Key Structures |
|---------|------|---------------|
| Agent Loop / ConversationRuntime | `rust/crates/runtime/src/session.rs` | `ConversationRuntime` struct, `run()` method |
| Session Management | `rust/crates/runtime/src/session.rs` | `Session` struct, `SessionStore` |
| Config System | `rust/crates/runtime/src/config.rs` | `SessionConfig`, `ConfigLoader` |
| Permission Policy | `rust/crates/runtime/src/permissions.rs` | `PermissionMode`, `PermissionPolicy`, `check_permission()` |

## Layer 2: Tool System

| Pattern | File | Key Structures |
|---------|------|---------------|
| ToolSpec | `rust/crates/tools/src/lib.rs` | `ToolSpec` struct, built-in tool definitions |
| ToolExecutor | `rust/crates/tools/src/executor.rs` | `ToolExecutor` trait, executor implementations |
| Tool Registry | `rust/crates/tools/src/registry.rs` | `ToolRegistry`, `register()`, `get()` |
| Schema Validation | `rust/crates/tools/src/schema.rs` | JSON Schema validation logic |

## Layer 3: Plugin & Hooks

| Pattern | File | Key Structures |
|---------|------|---------------|
| HookRunner | `rust/crates/plugins/src/hook_runner.rs` | `HookRunner`, `run_pre_hooks()`, `run_post_hooks()` |
| Built-in Hooks | `rust/crates/plugins/bundled/sample-hooks/hooks/pre.sh`, `hooks/post.sh` | Sample PreToolUse/PostToolUse implementations |
| PluginManager | `rust/crates/plugins/src/plugin_manager.rs` | `PluginManager`, `load()`, `unload()` |
| Plugin Lifecycle | `rust/crates/plugins/src/lifecycle.rs` | Lifecycle state machine |

## Layer 4: Multi-Agent

| Pattern | File | Key Structures |
|---------|------|---------------|
| AgentTool | `rust/crates/tools/src/lib.rs` | `AgentTool` definition, `forkSubagent`, `runAgent`, `resumeAgent` |
| Built-in Agents | `rust/crates/tools/src/agents.rs` | `builtInAgents` registry, agent type definitions |
| Session Forking | `rust/crates/runtime/src/session.rs` | `fork_session()`, parent_session_id tracking |
| AgentManager | `rust/crates/runtime/src/agent_manager.rs` | `AgentManager`, sub-agent lifecycle |

## Source Directory Structure

```
claw-code-main/rust/crates/
├── runtime/           # Harness Core, Session, Config, Permissions, AgentManager
├── tools/            # ToolSpec, ToolExecutor, Registry, Schema, Agents
├── plugins/          # HookRunner, PluginManager, Lifecycle, Sample Hooks
├── api/              # HTTP client with SSE streaming to Anthropic
├── claw-cli/         # CLI binary
└── commands/         # Slash commands
```

## Key Files Summary

| File | Responsibility |
|------|---------------|
| `runtime/src/session.rs` | ConversationRuntime + Session + forking |
| `runtime/src/config.rs` | Configuration loading and merging |
| `runtime/src/permissions.rs` | Permission model and enforcement |
| `tools/src/lib.rs` | ToolSpec + AgentTool + all built-in tools |
| `tools/src/executor.rs` | Tool execution engine |
| `tools/src/registry.rs` | Dynamic tool registration |
| `plugins/src/hook_runner.rs` | PreToolUse/PostToolUse execution |
| `plugins/src/plugin_manager.rs` | Plugin loading and lifecycle |
| `plugins/src/lifecycle.rs` | Plugin state management |
