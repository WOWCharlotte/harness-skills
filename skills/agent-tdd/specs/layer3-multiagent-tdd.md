# Layer 3: Multi-Agent TDD — Detailed Specification

**Status:** Approved
**Layer:** 3 of 3
**Purpose:** Test-driven development for multi-agent patterns — ensuring correct message protocol, permission boundaries, timeout handling, and parallel result merging.

---

## Core Challenge

Multi-agent interaction introduces non-determinism stemming from sub-agent outputs. The same task may produce different content depending on model temperature, timing, or intermediate states.

**Strategy:** Mock sub-agents and use **contract testing** to verify message **TYPE** correctness, not content correctness. Content varies; protocol structure is deterministic.

---

## Test Structure

### Contract Testing Pseudocode

Contract testing verifies that agents abide by message type contracts without asserting on specific content.

```python
class MockSubAgent:
    def when_receives(self, message_type: str) -> "MockSubAgent":
        self.expected_type = message_type
        return self

    def respond(self, message: AgentMessage) -> AgentMessage:
        # Verify TYPE, not content
        assert message.type == self.expected_type, \
            f"Expected {self.expected_type}, got {message.type}"
        return AgentMessage(
            type="AgentResultMessage",           # TYPE is enforced
            content="mock_result",                # Content is arbitrary
            metadata={"contract": "verified"}
        )

# Example: verify forkSubagent contract
def test_fork_subagent_message_contract():
    orchestrator = AgentOrchestrator()

    mock_child = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="..."))

    result = orchestrator.fork_subagent(
        task="any content",
        permission=Permission.scopes(["read"]),
        mock=mock_child
    )

    # Parent receives AgentResultMessage, not raw child messages
    assert result.type == "AgentResultMessage"
    assert result.metadata.get("source") == "child"
```

**Key insight:** `content` in the response is arbitrary; `type` must be correct.

---

## Four Multi-Agent Test Scenarios

### Scenario 1: forkSubagent Message Protocol

**Contract:** Parent agent must receive `AgentResultMessage` from child, not raw child messages.

```python
def test_fork_subagent_returns_agent_result_message():
    """
    RED: Write failing test first.
    Parent orchestrator.fork_subagent() should return AgentResultMessage,
    not forward raw child message types to parent context.
    """
    orchestrator = AgentOrchestrator()

    mock_child = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="done"))

    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=mock_child
    )

    # GREEN: Parent receives AgentResultMessage
    assert result.type == "AgentResultMessage"
    assert "source" in result.metadata
    assert result.metadata["source"] == "child"


def test_raw_child_message_not_forwarded():
    """
    Contract: Child's internal messages (ThoughtMessage, ToolCallMessage)
    must NOT appear in parent's message stream.
    """
    orchestrator = AgentOrchestrator()
    events = []

    mock_child = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(
            type="AgentResultMessage",
            content="final",
            internal_messages=[
                Message(type="ThoughtMessage", content="reasoning"),
                Message(type="ToolCallMessage", content="tool_use"),
            ]
        ))

    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=mock_child
    )

    # REFACTOR: Verify only AgentResultMessage reaches parent
    assert result.type == "AgentResultMessage"
    # Internal messages are stripped from parent's view
    assert not any(m.type in ["ThoughtMessage", "ToolCallMessage"]
                   for m in result.metadata.get("exposed_messages", []))
```

---

### Scenario 2: Parent-Child Permission Boundary

**Contract:** Child agent permission MUST be a subset of parent permission. Child cannot have more scopes than parent.

```python
def test_child_permission_limited_by_parent():
    """
    RED: Write failing test first.
    If parent has read-only permission, child cannot request write scope.
    """
    parent_permission = Permission.scopes(["read"])

    orchestrator = AgentOrchestrator()
    # Child requests write scope, but parent only has read
    mock_child = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="done"))

    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read", "write"]),  # Child wants write
        mock=mock_child
    )

    # GREEN: Permission is clamped to parent permission
    assert result.metadata["effective_permission"]["scopes"] == ["read"]
    assert "write" not in result.metadata["effective_permission"]["scopes"]


def test_child_permission_equal_to_parent_when_less_restrictive():
    """
    When child requests equal or lesser permission than parent,
    child gets exactly what it requested.
    """
    parent_permission = Permission.scopes(["read", "write", "execute"])

    orchestrator = AgentOrchestrator()

    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=MockSubAgent().when_receives("TaskMessage")
                          .respond(AgentMessage(type="AgentResultMessage", content="done"))
    )

    # REFACTOR: Child permission is subset of parent
    assert set(result.metadata["effective_permission"]["scopes"]).issubset(
        set(parent_permission.scopes)
    )
```

---

### Scenario 3: Timeout Termination — max_turns + timeout Dual Guarantee

**Contract:** Sub-agent termination is guaranteed by TWO mechanisms: `max_turns` (conversation turns) and `timeout` (wall-clock time). Either trigger cleans up child Session.

```python
def test_max_turns_terminates_subagent():
    """
    RED: Write failing test first.
    When sub-agent exceeds max_turns, orchestrator terminates
    and returns TimeoutMessage.
    """
    orchestrator = AgentOrchestrator()

    # Mock child that never stops sending messages
    infinite_mock = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="not done yet"))

    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=infinite_mock,
        max_turns=2  # Force termination after 2 turns
    )

    # GREEN: Parent receives TimeoutMessage, not stuck waiting
    assert result.type in ["TimeoutMessage", "AgentResultMessage"]
    assert result.metadata.get("terminated") == "max_turns"


def test_wall_clock_timeout_terminates_subagent():
    """
    RED: Write failing test first.
    When wall-clock timeout expires, child session is cleaned up.
    """
    orchestrator = AgentOrchestrator()

    slow_mock = SlowMockSubAgent(delay_seconds=10) \
        .when_receives("TaskMessage")

    start = time.time()
    result = orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=slow_mock,
        timeout=1.0  # 1 second timeout
    )
    elapsed = time.time() - start

    # GREEN: Timeout triggered within reasonable margin
    assert result.type == "TimeoutMessage"
    assert elapsed < 3.0  # Should not wait for slow_mock to finish


def test_timeout_cleanup_of_child_session():
    """
    REFACTOR: After timeout, child Session is cleaned up (no zombie processes).
    """
    orchestrator = AgentOrchestrator()
    sessions_before = len(orchestrator.active_sessions())

    orchestrator.fork_subagent(
        task="do something",
        permission=Permission.scopes(["read"]),
        mock=InfiniteMockSubAgent(),
        timeout=0.5
    )

    # Give cleanup routine time to run
    time.sleep(0.2)

    sessions_after = len(orchestrator.active_sessions())
    # Child session cleaned up
    assert sessions_after == sessions_before
```

---

### Scenario 4: Parallel Agent Merge — Results Merge Without Conflict

**Contract:** When multiple sub-agents run in parallel, results are merged deterministically by message type, not by arrival order.

```python
def test_parallel_agents_merge_by_type():
    """
    RED: Write failing test first.
    Two parallel agents returning different message types
    should both appear in merged result.
    """
    orchestrator = AgentOrchestrator()

    mock_agent_a = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="result_a"))

    mock_agent_b = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(type="AgentResultMessage", content="result_b"))

    results = orchestrator.fork_parallel(
        tasks=["task_a", "task_b"],
        permission=Permission.scopes(["read"]),
        mocks=[mock_agent_a, mock_agent_b]
    )

    # GREEN: Both results present in merged output
    assert len(results) == 2
    assert all(r.type == "AgentResultMessage" for r in results)


def test_parallel_agents_same_type_merge():
    """
    RED: Write failing test first.
    Two agents returning same message type should merge their content
    without overwriting (no last-write-wins).
    """
    orchestrator = AgentOrchestrator()

    mock_agent_a = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(
            type="AgentResultMessage",
            content={"status": "a_done", "data": [1, 2]}
        ))

    mock_agent_b = MockSubAgent() \
        .when_receives("TaskMessage") \
        .respond(AgentMessage(
            type="AgentResultMessage",
            content={"status": "b_done", "data": [3, 4]}
        ))

    merged = orchestrator.fork_parallel(
        tasks=["task_a", "task_b"],
        permission=Permission.scopes(["read"]),
        mocks=[mock_agent_a, mock_agent_b]
    )

    # GREEN: Content is merged, not overwritten
    assert merged.type == "AgentResultMessage"
    assert "a_done" in str(merged.content)
    assert "b_done" in str(merged.content)
    assert set(merged.metadata["sources"]) == {"agent_a", "agent_b"}


def test_parallel_resource_quota_enforced():
    """
    REFACTOR: When parallel agents exceed resource quota,
    excess requests are rejected before launching.
    """
    orchestrator = AgentOrchestrator()

    # Orchestrator has quota of 3 parallel agents
    result = orchestrator.fork_parallel(
        tasks=["task_a", "task_b", "task_c", "task_d", "task_e"],
        permission=Permission.scopes(["read"]),
        mocks=[InfiniteMockSubAgent() for _ in range(5)],
        max_parallel=3
    )

    # Only 3 agents launched; 2 rejected
    assert result.metadata["rejected_count"] == 2
    assert result.metadata["launched_count"] == 3
```

---

## RED → GREEN → REFACTOR Workflow

### Phase 1: RED — Write Failing Tests

```
1. Identify the multi-agent interaction point (fork_subagent, fork_parallel, etc.)
2. Write contract test for message TYPE correctness
3. Mock sub-agents with when_receives / respond
4. Run test — expect FAIL because contract not yet enforced
```

### Phase 2: GREEN — Minimal Implementation

```
1. Implement message type enforcement in orchestrator
2. Implement permission boundary clamping
3. Implement timeout / max_turns termination
4. Implement parallel merge by type
5. Run test — expect PASS
```

### Phase 3: REFACTOR — Improve and Verify

```
1. Verify child session cleanup on timeout
2. Add resource quota enforcement tests
3. Add edge cases (empty results, partial failures)
4. Verify no zombie child processes / sessions
5. Run full test suite — expect 80%+ coverage
```

---

## Contract Testing vs Content Testing

| Dimension | Contract Testing | Content Testing |
|-----------|-----------------|-----------------|
| **What it verifies** | Message TYPE correctness | Message CONTENT correctness |
| **Stability** | Deterministic across runs | Non-deterministic (model temp) |
| **Example assertion** | `assert msg.type == "AgentResultMessage"` | `assert "specific text" in msg.content` |
| **Flakiness** | Stable | May fail due to model variation |
| **When to use** | Multi-agent protocols, permission boundaries | Single-agent output validation |
| **Coverage** | Verifies interaction contract | Verifies task completion |

**Rule:** Contract tests are MANDATORY for multi-agent interactions. Content tests are OPTIONAL for single-agent tasks.

---

## Engineering Checklist

- [ ] `forkSubagent` has contract tests (verify message types, not content)
- [ ] Parent-child permission isolation has tests (child permission ≤ parent permission)
- [ ] Sub-agent timeout has tests (max_turns + timeout dual guarantee)
- [ ] Parallel agents have resource quota tests (excess requests rejected)
- [ ] Timeout cleanup of child Session has tests (no zombie processes)
- [ ] Contract tests use `when_receives` / `respond` pattern with mock sub-agents
- [ ] RED phase fails with meaningful assertion error
- [ ] GREEN phase implements minimal enforcement of the contract
- [ ] REFACTOR phase adds session cleanup verification

---

## Relationship to Other Layers

### Layer 1 (Unit TDD)

Layer 1 establishes single-agent TDD fundamentals. Layer 3 extends Layer 1 by:
- Wrapping single-agent tests with mock sub-agents
- Verifying message TYPE instead of content (which Layer 1 may verify)
- Adding permission and timeout enforcement that Layer 1 does not cover

### Layer 2 (Integration TDD)

Layer 2 verifies component-to-component integration within a single agent runtime. Layer 3 extends Layer 2 by:
- Managing cross-agent (parent-child) message protocols
- Enforcing permission boundaries across agent boundaries
- Handling parallel sub-agent lifecycle (launch, timeout, merge, cleanup)

### Layer 3 is the cap stone

Layer 3 Multi-Agent TDD is the outermost layer. It depends on Layer 1 and Layer 2 being stable because:
- Multi-agent orchestration builds on single-agent (Layer 1) components
- Session management (spawn, terminate, cleanup) relies on integration primitives (Layer 2)
- Without Layer 1 + 2 stability, multi-agent contract tests cannot be reliably written

```
Layer 1: Single-Agent TDD
       ↓
Layer 2: Integration TDD
       ↓
Layer 3: Multi-Agent TDD ← You are here
```

---

## Appendix: Full Contract Test Template

```python
import pytest
from typing import List
from dataclasses import dataclass, field

@dataclass
class AgentMessage:
    type: str
    content: Any
    metadata: dict = field(default_factory=dict)

class MockSubAgent:
    def __init__(self):
        self.expected_type: str = None
        self.response: AgentMessage = None

    def when_receives(self, message_type: str) -> "MockSubAgent":
        self.expected_type = message_type
        return self

    def respond(self, message: AgentMessage) -> AgentMessage:
        # Contract enforcement: TYPE must match
        if self.expected_type:
            assert message.type == self.expected_type, \
                f"Contract violation: expected {self.expected_type}, got {message.type}"
        return message

    def __call__(self, message: AgentMessage) -> AgentMessage:
        return self.respond(message)

class SlowMockSubAgent(MockSubAgent):
    def __init__(self, delay_seconds: float = 1.0):
        super().__init__()
        self.delay_seconds = delay_seconds

    def respond(self, message: AgentMessage) -> AgentMessage:
        import time
        time.sleep(self.delay_seconds)
        return super().respond(message)

class InfiniteMockSubAgent(MockSubAgent):
    def __init__(self):
        super().__init__()

    def respond(self, message: AgentMessage) -> AgentMessage:
        # Never returns — simulates runaway agent
        import time
        while True:
            time.sleep(1)
```

---

## Appendix: Message Type Taxonomy

| Type | Direction | Description |
|------|-----------|--------------|
| `TaskMessage` | Parent → Child | Task assignment |
| `AgentResultMessage` | Child → Parent | Final result (only type parent receives) |
| `ThoughtMessage` | Internal | Reasoning trace (NOT forwarded to parent) |
| `ToolCallMessage` | Internal | Tool invocation (NOT forwarded to parent) |
| `TimeoutMessage` | System → Parent | Termination signal |
| `PermissionDeniedMessage` | System → Parent | Permission boundary violation |
| `SessionClosedMessage` | System → Parent | Cleanup confirmation |
