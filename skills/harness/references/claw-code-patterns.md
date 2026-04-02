# claw-code Pattern Mapping

Maps each design pattern in the 4-layer spec to its concrete implementation in claw-code's source code.

## Layer 1: Harness Core

| Pattern | File | Key Structures |
|---------|------|---------------|
| Agent Loop / ConversationRuntime | `rust/crates/runtime/src/conversation.rs` | `ConversationRuntime` struct, `ApiClient`, `ToolExecutor` traits |
| Session Management | `rust/crates/runtime/src/session.rs` | `Session` struct, `ConversationMessage`, `ContentBlock`, `MessageRole` |
| Session Compaction | `rust/crates/runtime/src/compact.rs` | `should_compact()`, `compact_session()`, `CompactionConfig` |
| Config System | `rust/crates/runtime/src/config.rs` | `RuntimeConfig`, `ConfigLoader`, `ConfigEntry` |
| Permission Policy | `rust/crates/runtime/src/permissions.rs` | `PermissionMode` (5 modes), `PermissionPolicy`, `PermissionRequest` |
| Token Usage Tracking | `rust/crates/runtime/src/usage.rs` | `TokenUsage`, `UsageTracker`, `pricing_for_model()` |
| Bootstrap | `rust/crates/runtime/src/bootstrap.rs` | `BootstrapPhase`, `BootstrapPlan` |
| Remote Sessions | `rust/crates/runtime/src/remote.rs` | `RemoteSessionContext`, upstream proxy handling |

## Layer 2: Tool System

| Pattern | File | Key Structures |
|---------|------|---------------|
| ToolSpec | `rust/crates/tools/src/lib.rs` | `ToolSpec` struct, built-in tool definitions |
| ToolExecutor | `rust/crates/tools/src/executor.rs` | `ToolExecutor` trait, executor implementations |
| Tool Registry | `rust/crates/tools/src/registry.rs` | `ToolRegistry`, `register()`, `get()` |
| Schema Validation | `rust/crates/tools/src/schema.rs` | JSON Schema validation logic |
| File Operations | `rust/crates/runtime/src/file_ops.rs` | `read_file`, `write_file`, `edit_file`, `glob_search`, `grep_search` |
| Bash Execution | `rust/crates/runtime/src/bash.rs` | `execute_bash`, `BashCommandInput`, `BashCommandOutput` |

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
| MCP Integration | `rust/crates/runtime/src/mcp.rs` | `mcp_server_signature`, tool name normalization |
| MCP Client | `rust/crates/runtime/src/mcp_client.rs` | `McpClientTransport`, stdio/websocket/proxy transports |
| MCP Stdio | `rust/crates/runtime/src/mcp_stdio.rs` | `McpServerManager`, tool calls via stdio |
| OAuth | `rust/crates/runtime/src/oauth.rs` | OAuth token exchange, PKCE support |
| Sandbox | `rust/crates/runtime/src/sandbox.rs` | Isolated execution environment |

## Source Directory Structure

```
claw-code-main/rust/crates/
├── runtime/src/      # Harness Core, Session, Config, Permissions, Tools, MCP, OAuth
│   ├── session.rs     # ConversationRuntime, Session, forking
│   ├── conversation.rs # API client interface, tool executor traits
│   ├── compact.rs    # Session compaction for context overflow
│   ├── permissions.rs # 5 permission modes
│   ├── config.rs     # Runtime configuration
│   ├── usage.rs      # Token usage tracking
│   ├── file_ops.rs   # File read/write/edit/glob/grep
│   ├── bash.rs       # Shell execution
│   ├── mcp.rs        # MCP tool normalization
│   ├── mcp_client.rs # MCP transport (stdio, websocket, proxy)
│   ├── mcp_stdio.rs  # MCP server management
│   ├── oauth.rs      # OAuth authentication
│   ├── hooks.rs      # PreToolUse/PostToolUse hooks
│   ├── sandbox.rs    # Isolated execution
│   ├── bootstrap.rs   # Startup phases
│   └── remote.rs     # Remote session handling
├── tools/            # ToolSpec, ToolExecutor, Registry, Schema, Agents
├── plugins/          # HookRunner, PluginManager, Lifecycle, Sample Hooks
├── api/              # HTTP client with SSE streaming to Anthropic
├── claw-cli/         # CLI binary
└── commands/         # Slash commands
```

## Key Files Summary

| File | Responsibility |
|------|---------------|
| `runtime/src/conversation.rs` | ConversationRuntime + ApiClient/ToolExecutor traits |
| `runtime/src/session.rs` | Session struct, MessageRole, ContentBlock, forking |
| `runtime/src/compact.rs` | Session compaction to prevent context overflow |
| `runtime/src/permissions.rs` | 5 permission modes: ReadOnly, WorkspaceWrite, DangerFullAccess, Prompt, Allow |
| `runtime/src/config.rs` | Configuration loading, merging, RuntimeConfig |
| `runtime/src/usage.rs` | Token usage tracking and cost estimation |
| `runtime/src/file_ops.rs` | File read/write/edit/glob/grep operations |
| `runtime/src/bash.rs` | Shell command execution with timeout |
| `runtime/src/mcp_stdio.rs` | MCP server management via stdio |
| `runtime/src/hooks.rs` | HookRunner for PreToolUse/PostToolUse |
| `tools/src/lib.rs` | ToolSpec + AgentTool + all built-in tools |
| `tools/src/executor.rs` | Tool execution engine |
| `tools/src/registry.rs` | Dynamic tool registration |
| `plugins/src/hook_runner.rs` | PreToolUse/PostToolUse execution |
| `plugins/src/plugin_manager.rs` | Plugin loading and lifecycle |
| `plugins/src/lifecycle.rs` | Plugin state management |
