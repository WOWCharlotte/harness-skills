# Agent TDD — Skill Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Parent Skill:** `harness-engineering` — complements the 4-layer architecture with testing methodology

---

## Overview

A skill that provides a complete Test-Driven Development methodology for Agent systems. Unlike traditional software TDD, Agent systems have multiple sources of non-determinism (LLM output, sub-agent responses), requiring different testing strategies per layer.

**User Journey:** Developer building an Agent system → uses harness skill for architecture → uses agent-tdd for testing methodology → implements and verifies each layer with appropriate tests.

**Output Form:** Methodology documentation with layer-specific test strategies, fixture management, and anti-patterns.

**Relationship to harness skill:**
- `harness` — What to build (architecture, 4-layer framework)
- `agent-tdd` — How to verify it's built correctly (3-layer TDD)

---

## Core Principle

**The non-determinism source is different per layer, so the testing strategy is different per layer.**

| Layer | Non-determinism Source | Test Strategy |
|-------|----------------------|---------------|
| Tools TDD | Prompt changes → tool selection changes | Fixed prompt + deterministic assertion |
| Loop TDD | LLM output varies per call | Mock LLM (record & replay) |
| Multi-Agent TDD | Sub-agent output varies | Mock sub-agent + contract tests |

---

## Architecture: Three TDD Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Multi-Agent TDD                                │
│ Mock sub-agent → contract test message types             │
│ (harness skill: Layer 4 Multi-Agent)                   │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Harness Loop TDD                              │
│ Mock LLM → record & replay fixed responses              │
│ (harness skill: Layer 1 Harness Core)                  │
├─────────────────────────────────────────────────────────┤
│ Layer 1: Tools TDD                                     │
│ Fixed prompt → deterministic tool selection              │
│ (harness skill: Layer 2 Tool System)                   │
└─────────────────────────────────────────────────────────┘
```

Each layer follows RED → GREEN → REFACTOR.

---

## Layer 1: Tools TDD

**Core Challenge:** Agent tool selection is determined by LLM prompt. Same input, different prompt = different tool choice.

**Test Strategy:** Fix the prompt, verify the correct tool is called.

### Test Structure

```typescript
describe("Tool Selection TDD") {
  // RED: Write a test that fails
  test("read_file chosen for 'show me foo.txt'") {
    given_prompt(system_prompt)
    when_agent_receives("show me foo.txt")
    then_tool_called("read_file")
  }

  // GREEN: Fix prompt until test passes
  // REFACTOR: Simplify prompt while keeping test green
}
```

### Three Tool Test Scenarios

**1. Schema Validation**
```typescript
// RED: tool input_schema error → test fails
test("tool rejects invalid input") {
  register_tool(bash_tool_with_schema({
    properties: {
      command: { type: "string" }
    }
  }))
  when_executed(bash_tool, { command: 123 }) // number instead of string
  then_result_error(/invalid type/)
}
```

**2. Permission Selection**
```typescript
// RED: should be ReadOnly but registered as DangerFullAccess
test("read_file requires ReadOnly permission") {
  register_tool(read_file_tool({ required_permission: "DangerFullAccess" }))
  with_session_permission("ReadOnly")
  when_agent_receives("read foo.txt")
  then_tool_blocked("read_file")
  then_error_contains("permission denied")
}
```

**3. Tool Description Quality**
```typescript
// RED: vague description → LLM picks wrong tool
test("tool description is not misleading") {
  register_tools([
    read_file_tool({ description: "Read a file" }),
    glob_tool({ description: "Find files" }),
  ])
  when_agent_receives("find all test files")
  then_tool_not_called("read_file")  // Should call glob, not read_file
  then_tool_called("glob")
}
```

### Engineering Checklist

- [ ] Every tool's `input_schema` has a corresponding RED test
- [ ] Permission boundaries have RED tests (privileged operations must be blocked)
- [ ] Tool description quality has behavior tests (right tool selected / wrong tool rejected)
- [ ] Tests use fixed seed or recorded prompt version

---

## Layer 2: Harness Loop TDD

**Core Challenge:** LLM output is non-deterministic. Same input can produce different tool_calls each run.

**Test Strategy:** Mock LLM. Record a "golden" response once, replay it for all subsequent test runs.

### Test Structure

```typescript
describe("Harness Loop TDD") {
  // 1. Record a "golden" LLM response (run once with live LLM)
  test("record golden response") {
    with_live_llm()
    when_agent_run(session, "list all test files")
    then_save_recorded_response("fixtures/list-test-files.json")
  }

  // 2. Replay the fixed response
  test("replay produces same tools (REPLAYS fixture)") {
    with_mock_llm(fixtures("list-test-files.json"))
    when_agent_run(session, "list all test files")
    then_tool_sequence_equals(["glob", "read_file", "read_file"])
  }

  // 3. Refactor loop, re-run — same tools = refactor safe
  test("after refactor, still same tools") {
    with_mock_llm(fixtures("list-test-files.json"))
    when_agent_run(refactored_session, "list all test files")
    then_tool_sequence_equals(["glob", "read_file", "read_file"])
  }
}
```

### Four Harness Loop Test Scenarios

**1. Session Persistence**
```typescript
test("session persists after tool execution") {
  mock_llm(responses([
    tool_call("read_file", { path: "foo.txt" }),
    finish()
  ]))
  session = create_session()
  run_loop(session, "read foo.txt")

  persisted = load_session(session.id)
  expect(persisted.messages).to_have_length(3) // user + tool_result + finish
  expect(persisted.messages[1].tool_name).to_equal("read_file")
}
```

**2. Message Immutability**
```typescript
test("messages are append-only, never mutated") {
  mock_llm(responses([
    tool_call("read_file", { path: "a.txt" }),
    tool_call("write_file", { path: "b.txt", content: "x" }),
    finish()
  ]))

  run_loop(session, "read a.txt and write b.txt")

  // Original messages never changed
  expect(session.messages[0].content).to_equal("read a.txt and write b.txt")
  // New messages appended
  expect(session.messages[1].tool_name).to_equal("read_file")
  expect(session.messages[2].tool_name).to_equal("write_file")
}
```

**3. Permission Enforcement**
```typescript
test("DangerFullAccess tool blocked when session is ReadOnly") {
  mock_llm(responses([
    tool_call("bash", { command: "rm -rf /" }),
    finish()
  ]))

  session = create_session({ permission: "ReadOnly" })
  run_loop(session, "delete everything")

  // bash was called but blocked
  expect(tools.blocked).to_contain("bash")
  expect(session.messages[1].status).to_equal("Error(Permission denied)")
  // LLM should see error and handle gracefully
  expect(session.messages[2].content).to_include("permission denied")
}
```

**4. Retry Backoff**
```typescript
test("LLM 429 triggers exponential backoff retry") {
  mock_llm(responses([
    rate_limit_429(),
    rate_limit_429(),
    success()
  ], delays: [1000, 2000]))

  start = now()
  run_loop(session, "do something")
  elapsed = now() - start

  expect(elapsed).to_be_gte(3000) // ~1000 + ~2000
  expect(mock_llm.call_count).to_equal(3)
}
```

### Engineering Checklist

- [ ] Golden response fixture recording workflow exists
- [ ] Every fixture has a corresponding regression test
- [ ] Session persistence has tests (create → save → load → equivalent)
- [ ] Message immutability has tests (no in-place edit)
- [ ] Permission enforcement has tests (ReadOnly + bash → Error)
- [ ] Retry backoff has tests (mock 429, observe cumulative delay)

---

## Layer 3: Multi-Agent TDD

**Core Challenge:** Multi-agent interaction non-determinism comes from sub-agent outputs — same input, different sub-agent result.

**Test Strategy:** Mock sub-agents. Use contract testing to verify message TYPE correctness between parent and child, not content.

### Test Structure

```typescript
describe("Multi-Agent TDD") {
  // Contract test: verify message TYPE, not content
  test("forkSubagent sends correct message type") {
    mock_subagent({
      when_receives({ type: "delegate", task: "explore" })
        respond({ type: "result", value: { files: [] } })
    })

    fork_subagent({ task: "explore codebase" })

    then_parent_received({ type: "result" }) // Type check, not content
  }
}
```

### Four Multi-Agent Test Scenarios

**1. forkSubagent Message Protocol**
```typescript
test("parent receives AgentResultMessage, not raw child messages") {
  mock_subagent({
    when_receives({ type: "delegate", task: "find tests" })
      respond({ type: "progress", percent: 50, update: "scanning..." })
      respond({ type: "result", value: { files: ["a_test.js"] } })
  })

  parent = fork_subagent({ task: "find tests" })

  // Parent only sees final AgentResultMessage, not progress or raw child messages
  expect(parent.session.messages.filter(m => m.type === "AgentResultMessage"))
    .to_have_length(1)
  expect(parent.session.messages.filter(m => m.type === "progress"))
    .to_have_length(0) // Progress stays in child session
}
```

**2. Parent-Child Permission Boundary**
```typescript
test("sub-agent permission is subset of parent permission") {
  mock_subagent()

  parent = fork_subagent({
    permission: "DangerFullAccess",
    child_permission: "ReadOnly" // Explicitly restrict child
  })

  child = get_child_session(parent)
  expect(child.config.permission).to_equal("ReadOnly")

  // Even if child is compromised, it can't access DangerFullAccess tools
  when_child_receives({ type: "delegate", task: "rm -rf /" })
  then_tool_blocked("bash")
}
```

**3. Timeout Termination**
```typescript
test("sub-agent timeout kills child session") {
  mock_subagent({
    respond({ type: "progress", percent: 50, update: "..." }) // Never completes
  })

  parent = fork_subagent({
    max_turns: 3, // Child's own limit
    timeout_ms: 1000
  })

  start = now()
  run_until_timeout(parent)
  elapsed = now() - start

  expect(elapsed).to_be_gte(1000)
  expect(get_child_status(parent)).to_equal("killed")
  expect(get_child_session(parent)).to_be_null() // Cleaned up
}
```

**4. Parallel Agent Merge**
```typescript
test("parallel agents merge results without conflict") {
  mock_agent("A", { respond({ type: "result", value: { count: 3 } }) })
  mock_agent("B", { respond({ type: "result", value: { count: 5 } }) })

  results = await Promise.all([
    fork_agent("A", { task: "count tests" }),
    fork_agent("B", { task: "count src files" })
  ])

  merged = merge_results(results)

  expect(merged).to_equal({ A: { count: 3 }, B: { count: 5 } })
  expect(merged.A).to_not_equal(merged.B) // No overwrite
}
```

### Engineering Checklist

- [ ] forkSubagent has contract tests (verify message types, not content)
- [ ] Parent-child permission isolation has tests (child permission ≤ parent permission)
- [ ] Sub-agent timeout has tests (max_turns + timeout dual guarantee)
- [ ] Parallel agents have resource quota tests (excess requests rejected)
- [ ] Timeout cleanup of child Session has tests

---

## Anti-Patterns

**1. Using live LLM for regression tests**
```
// WRONG: Flaky test
test("agent works correctly") {
  with_live_llm()
  when_agent_receives("list files")
  then_tool_called("glob")
} // FAILs randomly — LLM output varies
```
Correct: Only use live LLM to record a golden fixture once. All regression tests use mocked responses.

**2. Testing LLM output content, not behavior**
```
// WRONG: Testing LLM output text
test("LLM says hello") {
  with_live_llm()
  when_agent_receives("say hello")
  then_response_contains("hello world")
}
```
Correct: Test behavior (which tool was called), not content (what LLM said).

**3. Writing integration tests for every input combination**
```
// WRONG: Combinatorial explosion
test("read_file with path X, Y, Z...")
test("read_file with path A, B, C...")
```
Correct: Test tool selection logic (given prompt → call correct tool), not output for each input.

**4. No fixture version control**
```
// WRONG: Fixture not in VCS
fixtures("list-test-files.json") // Where is this file?
```
Correct: Fixtures must be in git, versioned and reviewed alongside code.

**5. Mock too heavy**
```
// WRONG: Full HTTP mock server
mock_llm_with_http_server({ delay_ms: 100, ... })
```
Correct: Mock function calls directly. Don't start an HTTP server.

---

## Skill Deliverable Structure

```
skills/agent-tdd/
├── SKILL.md                     ← Entry point
├── README.md                    ← Full methodology guide
├── specs/
│   ├── layer1-tools-tdd.md    ← Tools TDD
│   ├── layer2-loop-tdd.md     ← Harness Loop TDD
│   └── layer3-multiagent-tdd.md ← Multi-Agent TDD
└── references/
    ├── test-fixtures.md       ← Golden response fixture management
    ├── mock-strategies.md     ← Mock LLM / mock sub-agent strategies
    └── anti-patterns.md       ← Agent TDD anti-patterns
```

---

## Verification & Self-Review

- [x] All 3 TDD layers are internally consistent with harness skill architecture
- [x] No placeholder content (no TBD, TODO, or vague requirements)
- [x] Each layer has distinct non-determinism source and matching test strategy
- [x] Anti-patterns are specific and actionable
- [x] Design is approved by user before proceeding to implementation plan
