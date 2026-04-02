# Evaluation Dimensions — Detailed Specification

**Status:** Approved
**Layer:** Core methodology

---

## Dimension 1: Functionality (Priority 1)

**Method:** Black-box testing with agent-tdd fixtures.

### Overview

Functionality verification uses agent-tdd fixtures to verify that the harness behaves correctly. Each fixture defines an input, expected tool sequence, and session configuration.

### Process

1. Load fixture from `fixtures/agent-tdd/`
2. Initialize harness with session_config from fixture
3. Run harness with fixture input
4. Capture tool call sequence
5. Compare against `expected_tools` in fixture

### Pseudocode

```typescript
function evaluate_functionality(harness, fixture) {
  // Setup
  session = harness.create_session(fixture.session_config)

  // Execute
  harness.run(session, fixture.input)

  // Verify
  actual_tools = session.tool_calls.map(tc => tc.name)
  expected_tools = fixture.expected_tools

  if (actual_tools == expected_tools) {
    return { passed: true }
  } else {
    return {
      passed: false,
      reason: `Expected ${expected_tools}, got ${actual_tools}`
    }
  }
}
```

### Fixture Format

```json
{
  "description": "Human-readable description",
  "layer": "layer1 | layer2 | layer3 | layer4",
  "input": "User input string",
  "expected_tools": ["tool_name_1", "tool_name_2"],
  "session_config": {
    "permission": "ReadOnly | WorkspaceWrite | DangerFullAccess"
  }
}
```

### Checklist

- [ ] All agent-tdd fixtures pass
- [ ] Session persistence works (save → load → equivalent)
- [ ] Message immutability maintained
- [ ] Loop termination works (max_turns respected)
- [ ] Tool selection matches prompt expectation

### Layer Coverage

**Layer 1 (Harness Core):**
- Session creation and persistence
- Message history immutability
- Permission enforcement at harness level
- Loop termination

**Layer 2 (Tool System):**
- Tool selection based on prompt
- Schema validation
- Permission boundaries per tool
- Error handling

**Layer 3 (Plugin & Hooks):**
- PreToolUse hook execution
- PostToolUse hook execution
- Hook error handling

**Layer 4 (Multi-Agent):**
- Sub-agent spawning
- Parent-child communication
- Timeout termination
- Parallel agent merge

---

## Dimension 2: Security (Priority 2)

**Method:** White-box testing — inspect internal state and verify constraints.

### Overview

Security verification checks that the harness enforces permission boundaries, isolates sessions, and handles malicious inputs.

### Permission Model Verification

The harness must implement 5 permission modes:

| Mode | Read | Write | Execute | Network |
|------|------|-------|---------|---------|
| ReadOnly | ✓ | ✗ | ✗ | GET only |
| WorkspaceWrite | ✓ | ✓ | ✗ | ✗ |
| DangerFullAccess | ✓ | ✓ | ✓ | ✓ |
| Prompt | Requires user confirmation |
| Allow | All operations allowed |

### Security Checks

#### Permission Enforcement

```typescript
test("bash blocked in ReadOnly session") {
  session = harness.create_session({ permission: "ReadOnly" })
  harness.run(session, "delete everything")

  // Verify bash was blocked
  blocked = session.get_blocked_tools()
  expect(blocked).to_contain("bash")
}
```

#### Permission Escalation Prevention

```typescript
test("child cannot escalate permissions") {
  parent = harness.fork_session({
    permission: "DangerFullAccess",
    child_permission: "ReadOnly"
  })

  child = harness.get_child_session(parent)
  expect(child.config.permission).to_equal("ReadOnly")
  expect(child.config.permission).to_be_less_than(parent.config.permission)
}
```

#### Session Isolation

```typescript
test("parent and child have separate message histories") {
  parent = harness.fork_session({ task: "explore" })
  child = harness.get_child_session(parent)

  // Child adds messages
  child.add_message({ role: "assistant", content: "I am child" })

  // Parent history unchanged
  expect(parent.messages.length).to_equal(child.messages.length - 1)
}
```

### Checklist

- [ ] ReadOnly blocks bash/exec
- [ ] ReadOnly blocks write operations
- [ ] Permission escalation prevented
- [ ] Child inherits subset of parent permissions
- [ ] Malformed tool input rejected
- [ ] Schema validation errors caught
- [ ] Empty/null inputs handled gracefully
- [ ] Session cleanup after termination

---

## Dimension 3: Performance (Priority 3)

**Method:** Metrics collection during evaluation.

### Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| tokens_per_session | Average token usage per session | User-defined budget |
| avg_latency_ms | Average tool execution latency | < 500ms |
| p95_latency_ms | 95th percentile latency | < 2000ms |
| memory_leak_detected | Memory growth during extended sessions | false |
| concurrent_capacity | Max parallel tool executions | ≥ 4 |

### Token Usage Tracking

```typescript
interface TokenMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_estimate_usd: number
}

function track_token_usage(session) {
  usage = session.usage
  return {
    tokens_per_session: usage.total_tokens,
    cost_estimate_usd: calculate_cost(usage)
  }
}
```

### Latency Measurement

```typescript
function measure_latency(harness, fixture) {
  start = performance.now()
  harness.run(session, fixture.input)
  end = performance.now()

  return {
    total_latency_ms: end - start,
    tool_latencies: session.tool_calls.map(tc => tc.elapsed_ms)
  }
}
```

### Memory Leak Detection

```typescript
function detect_memory_leak(harness, iterations = 100) {
  initial_memory = process.memoryUsage().heapUsed

  for (i = 0; i < iterations; i++) {
    session = harness.create_session()
    harness.run(session, "read file")
    harness.close_session(session)
  }

  final_memory = process.memoryUsage().heapUsed
  growth = (final_memory - initial_memory) / initial_memory

  return {
    leak_detected: growth > 0.1,  // 10% growth threshold
    growth_ratio: growth
  }
}
```

### Performance Thresholds

Default thresholds (configurable):

```json
{
  "max_tokens_per_session": 50000,
  "max_avg_latency_ms": 500,
  "max_p95_latency_ms": 2000,
  "max_memory_growth_ratio": 0.1,
  "min_concurrent_capacity": 4
}
```

### Checklist

- [ ] Token usage tracked per session
- [ ] Average latency within threshold
- [ ] P95 latency within threshold
- [ ] No memory leak detected
- [ ] Concurrent capacity meets minimum
- [ ] Resource cleanup after session close

---

## Priority Summary

| Priority | Dimension | Method | Output |
|----------|-----------|--------|--------|
| 1 | Functionality | Black-box with fixtures | Pass/Fail per fixture |
| 2 | Security | White-box state inspection | Pass/Fail per check |
| 3 | Performance | Metrics collection | Metrics + threshold pass/fail |
