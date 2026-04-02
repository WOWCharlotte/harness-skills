# Multi-Agent Engineering Practice

## Overview

The claw-code Python port does not include a full multi-agent implementation. This document provides implementation guidance based on the spec in [layer4-multi-agent.md](../../specs/layer4-multi-agent.md).

## Core Implementation Patterns

### AgentHandle and AgentState

```python
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
from typing import Any

class AgentStatus(Enum):
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass(frozen=True)
class AgentHandle:
    agent_id: str
    session_id: str
    status: AgentStatus
    parent_agent_id: str | None = None

@dataclass
class ForkConfig:
    name: str | None = None
    system_prompt: str | None = None
    permission_mode: PermissionMode = PermissionMode.READ_ONLY
    working_dir: str | None = None
    max_turns: int = 50
```

### AgentManager (Spawning & Lifecycle)

```python
from dataclasses import dataclass, field
from typing import Callable

@dataclass
class AgentManager:
    _agents: dict[str, AgentHandle] = field(default_factory=dict)
    _sessions: dict[str, Any] = field(default_factory=dict)  # Session objects

    async def fork(self, config: ForkConfig, parent_session_id: str) -> AgentHandle:
        # 1. Create new session for forked agent
        new_session_id = uuid4().hex
        new_session = Session(
            id=new_session_id,
            parent_session_id=parent_session_id,  # track lineage
            config=SessionConfig(
                permission_mode=config.permission_mode,
                max_turns=config.max_turns,
            ),
        )
        self._sessions[new_session_id] = new_session

        # 2. Create agent handle
        agent_id = uuid4().hex
        handle = AgentHandle(
            agent_id=agent_id,
            session_id=new_session_id,
            status=AgentStatus.RUNNING,
            parent_agent_id=self._get_current_agent_id(),
        )
        self._agents[agent_id] = handle

        # 3. Start agent loop (async, non-blocking)
        asyncio.create_task(self._run_agent_loop(agent_id, config))

        return handle

    async def terminate(self, agent_id: str, reason: str) -> None:
        handle = self._agents.get(agent_id)
        if not handle:
            return

        handle.status = AgentStatus.FAILED
        # Cleanup session...

    async def send_message(self, agent_id: str, message: dict[str, Any]) -> None:
        # Queue message for agent's event loop
        pass
```

### Agent Communication Protocol

```python
# Parent -> Sub-agent messages
@dataclass(frozen=True)
class ParentToAgentMessage:
    type: str  # "delegate" | "pause" | "terminate" | "update_context"
    payload: dict[str, Any] = field(default_factory=dict)

# Sub-agent -> Parent messages
@dataclass(frozen=True)
class AgentToParentMessage:
    type: str  # "progress" | "result" | "error" | "needs_input" | "paused"
    payload: dict[str, Any] = field(default_factory=dict)

class AgentEventLoop:
    def __init__(self, session: Session, config: ForkConfig):
        self.session = session
        self.config = config
        self._message_queue: asyncio.Queue[ParentToAgentMessage] = asyncio.Queue()
        self._status = AgentStatus.RUNNING

    async def run(self) -> None:
        while self._status == AgentStatus.RUNNING:
            # Wait for messages from parent
            message = await self._message_queue.get()

            if message.type == "terminate":
                self._status = AgentStatus.FAILED
                await self._notify_parent("terminated", {"reason": message.payload.get("reason")})
                break

            if message.type == "pause":
                self._status = AgentStatus.PAUSED
                await self._notify_parent("paused", {})
                break

            # Process delegate message
            if message.type == "delegate":
                result = await self._execute_task(message.payload)
                await self._notify_parent("result", {"value": result})

    async def _notify_parent(self, msg_type: str, payload: dict[str, Any]) -> None:
        # Send message back to parent's message queue
        pass
```

### Collaboration Patterns

#### Parallel Execution

```python
async def run_parallel(
    agent_manager: AgentManager,
    tasks: list[ForkConfig],
    parent_session_id: str,
) -> list[Any]:
    # Fork all agents simultaneously
    handles = []
    for config in tasks:
        handle = await agent_manager.fork(config, parent_session_id)
        handles.append(handle)

    # Collect results as they complete
    results = []
    for handle in handles:
        result = await agent_manager.wait_for_completion(handle.agent_id)
        results.append(result)

    return results
```

#### Hierarchical (Orchestrator)

```python
async def run_hierarchical(
    agent_manager: AgentManager,
    root_task: dict[str, Any],
    parent_session_id: str,
) -> Any:
    # Root agent decomposes task
    root_config = ForkConfig(
        system_prompt="Decompose this task into subtasks...",
    )
    root_handle = await agent_manager.fork(root_config, parent_session_id)

    # Wait for root to return subtask list
    root_result = await agent_manager.wait_for_completion(root_handle.agent_id)
    subtasks = root_result["subtasks"]

    # Fork worker agents for each subtask
    worker_handles = []
    for subtask in subtasks:
        worker_config = ForkConfig(
            system_prompt=f"Execute this subtask: {subtask}",
        )
        handle = await agent_manager.fork(worker_config, parent_session_id)
        worker_handles.append(handle)

    # Collect all worker results
    worker_results = []
    for handle in worker_handles:
        result = await agent_manager.wait_for_completion(handle.agent_id)
        worker_results.append(result)

    # Merge results
    return {"task": root_task, "subtasks": worker_results}
```

## Key Design Insights

### 1. Session Isolation

```python
new_session = Session(
    id=new_session_id,
    parent_session_id=parent_session_id,  # Link, but don't share
)
```

Sub-agents get their own Session. Parent's message history is NOT polluted.

### 2. Async Non-blocking Fork

```python
asyncio.create_task(self._run_agent_loop(agent_id, config))
return handle  # Immediately, don't wait for completion
```

`forkSubagent` returns immediately with a handle. The agent runs asynchronously.

### 3. Permission Inheritance with Stricter Cap

```python
@dataclass
class ForkConfig:
    permission_mode: PermissionMode = PermissionMode.READ_ONLY
    # Cannot be elevated beyond parent's permission

def fork(self, config: ForkConfig, parent_session_id: str) -> AgentHandle:
    parent_perm = self._sessions[parent_session_id].config.permission_mode
    # Enforce: child cannot have more permissions than parent
    effective_perm = min(config.permission_mode, parent_perm)
```

Sub-agents cannot have more permissions than their parent.

### 4. Mandatory Timeout

```python
@dataclass
class ForkConfig:
    max_turns: int = 50  # Required, not optional
```

Every sub-agent has its own turn limit to prevent blocking forever.

## TypeScript Project

```typescript
enum AgentStatus {
  Running = "running",
  Paused = "paused",
  Completed = "completed",
  Failed = "failed",
}

interface AgentHandle {
  agentId: string;
  sessionId: string;
  status: AgentStatus;
  parentAgentId: string | null;
}

interface ForkConfig {
  name?: string;
  systemPrompt?: string;
  permissionMode?: PermissionMode;
  workingDir?: string;
  maxTurns: number;  // Required
}

type ParentToAgentMessage =
  | { type: "delegate"; task: Task; context: Value }
  | { type: "pause" }
  | { type: "terminate"; reason: string }
  | { type: "update_context"; delta: Value };

type AgentToParentMessage =
  | { type: "progress"; percent: number; update: string }
  | { type: "result"; value: Value }
  | { type: "error"; message: string }
  | { type: "needs_input"; question: string; options?: string[] }
  | { type: "paused" };

class AgentManager {
  private agents: Map<string, AgentHandle> = new Map();
  private sessions: Map<string, Session> = new Map();

  async fork(config: ForkConfig, parentSessionId: string): Promise<AgentHandle> {
    const parentPerm = this.sessions.get(parentSessionId)?.config.permissionMode ?? PermissionMode.ReadOnly;
    const effectivePerm = this.minPermission(config.permissionMode ?? PermissionMode.ReadOnly, parentPerm);

    const newSessionId = uuid();
    const newSession = new Session({
      id: newSessionId,
      parentSessionId,
      config: { ...config, permissionMode: effectivePerm },
    });
    this.sessions.set(newSessionId, newSession);

    const agentId = uuid();
    const handle: AgentHandle = {
      agentId,
      sessionId: newSessionId,
      status: AgentStatus.Running,
      parentAgentId: this.getCurrentAgentId(),
    };
    this.agents.set(agentId, handle);

    // Start async
    this.runAgentLoop(agentId, config);

    return handle;
  }
}
```

## Spec to Implementation Mapping

| Spec Definition | Implementation |
|----------------|-----------------|
| `forkSubagent` | `AgentManager.fork()` |
| `AgentHandle` | `AgentHandle` dataclass |
| `ForkConfig` | `ForkConfig` dataclass |
| `AgentStatus` | `AgentStatus` enum |
| Permission inheritance | `min(child_perm, parent_perm)` |
| Max turns | `ForkConfig.max_turns` (required) |
| Parent-child messaging | Queue-based `send_message` / `AgentToParentMessage` |

## Key Takeaways

1. **Independent sessions**: Sub-agents never share message history with parent
2. **Async fork**: Returns immediately with handle, runs in background
3. **Permission ceiling**: Sub-agents cannot exceed parent's permissions
4. **Mandatory timeout**: Every sub-agent must have `max_turns`
5. **Typed messaging**: All parent-child communication uses typed protocol
