# Agent TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete `agent-tdd` skill under `skills/agent-tdd/` — a methodology for Test-Driven Development of Agent systems, with 3 layer-specific TDD strategies and anti-patterns.

**Architecture:** Skill format follows the established harness skill structure: SKILL.md entry point, README.md full guide, specs/ for detailed layer documentation, and references/ for supplementary content. The 3 TDD layers (Tools, Loop, Multi-Agent) map to the 4-layer harness architecture.

**Tech Stack:** Markdown documentation, YAML frontmatter, TypeScript pseudocode examples.

---

## File Structure

```
skills/agent-tdd/
├── SKILL.md                           ← Entry point (name: agent-tdd)
├── README.md                          ← Full methodology guide
├── specs/
│   ├── layer1-tools-tdd.md         ← Tools TDD: fixed prompt → deterministic tool selection
│   ├── layer2-loop-tdd.md          ← Loop TDD: mock LLM record & replay
│   └── layer3-multiagent-tdd.md    ← Multi-Agent TDD: mock sub-agent + contract tests
└── references/
    ├── test-fixtures.md            ← Golden response fixture management
    ├── mock-strategies.md          ← Mock LLM / mock sub-agent strategies
    └── anti-patterns.md           ← Agent TDD anti-patterns
```

---

## Task 1: Create Directory Structure and SKILL.md

**Files:**
- Create: `skills/agent-tdd/SKILL.md`

- [ ] **Step 1: Create directory structure**

```
skills/agent-tdd/
skills/agent-tdd/specs/
skills/agent-tdd/references/
```

Run:
```bash
mkdir -p skills/agent-tdd/specs skills/agent-tdd/references
ls -R skills/agent-tdd/
```

Expected: Directory tree created with specs/ and references/ subdirectories.

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: agent-tdd
description: Use when implementing Test-Driven Development for an Agent system. Provides layer-specific TDD strategies: Tools TDD (fixed prompt), Loop TDD (mock LLM record & replay), and Multi-Agent TDD (mock sub-agent + contract tests).
---

# Agent TDD

A skill that provides a complete Test-Driven Development methodology for Agent systems.

## When to Use

**You should use this skill when:**
- Building a new Agent system and want to test each layer correctly
- Debugging flaky tests in an existing Agent system
- Adding new tools to an Agent and verifying tool selection works
- Refactoring the Agent loop and wanting regression tests
- Setting up multi-agent collaboration and needing contract tests

**Prerequisite:** Complete harness skill first — this skill assumes you understand the 4-layer architecture (Harness Core, Tool System, Plugin & Hooks, Multi-Agent).

## Core Principle

**The non-determinism source is different per layer, so the testing strategy is different per layer.**

| Layer | Non-determinism Source | Test Strategy |
|-------|----------------------|---------------|
| Tools TDD | Prompt changes → tool selection changes | Fixed prompt + deterministic assertion |
| Loop TDD | LLM output varies per call | Mock LLM (record & replay) |
| Multi-Agent TDD | Sub-agent output varies | Mock sub-agent + contract tests |

## Quick Start

1. Read `README.md` for the full methodology
2. Choose your TDD layer based on what you're building/testing:
   - **Layer 1 (Tools TDD):** For adding or modifying tools
   - **Layer 2 (Loop TDD):** For harness loop changes
   - **Layer 3 (Multi-Agent TDD):** For sub-agent patterns
3. Follow RED → GREEN → REFACTOR for each test

## Skill Structure

```
specs/
  layer1-tools-tdd.md    ← Tools TDD methodology
  layer2-loop-tdd.md     ← Harness Loop TDD methodology
  layer3-multiagent-tdd.md ← Multi-Agent TDD methodology
references/
  test-fixtures.md       ← Golden fixture management
  mock-strategies.md     ← Mock strategies for LLM and sub-agents
  anti-patterns.md       ← Common mistakes and how to avoid them
```

## Relationship to harness Skill

- `harness` — What to build (architecture, 4-layer framework)
- `agent-tdd` — How to verify it's built correctly (3-layer TDD)
```

- [ ] **Step 3: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/SKILL.md
```

Expected: File exists with content.

- [ ] **Step 4: Commit**

```bash
git add skills/agent-tdd/
git commit -m "feat: create agent-tdd skill directory and SKILL.md entry point"
```

---

## Task 2: Write README.md

**Files:**
- Create: `skills/agent-tdd/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# Agent TDD — Test-Driven Development for Agent Systems

## Overview

A complete TDD methodology for Agent systems. Unlike traditional software TDD, Agent systems have multiple sources of non-determinism (LLM output, sub-agent responses), requiring different testing strategies per layer.

**User Journey:** Developer building an Agent system → uses harness skill for architecture → uses agent-tdd for testing methodology → implements and verifies each layer with appropriate tests.

## The Three TDD Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Multi-Agent TDD                                │
│ Mock sub-agent → contract test message types            │
│ (harness skill: Layer 4 Multi-Agent)                   │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Harness Loop TDD                              │
│ Mock LLM → record & replay fixed responses             │
│ (harness skill: Layer 1 Harness Core)                  │
├─────────────────────────────────────────────────────────┤
│ Layer 1: Tools TDD                                     │
│ Fixed prompt → deterministic tool selection             │
│ (harness skill: Layer 2 Tool System)                   │
└─────────────────────────────────────────────────────────┘
```

Each layer follows RED → GREEN → REFACTOR.

## Core Principle

**The non-determinism source is different per layer, so the testing strategy is different per layer.**

| Layer | Non-determinism Source | Test Strategy |
|-------|----------------------|---------------|
| Tools TDD | Prompt changes → tool selection changes | Fixed prompt + deterministic assertion |
| Loop TDD | LLM output varies per call | Mock LLM (record & replay) |
| Multi-Agent TDD | Sub-agent output varies | Mock sub-agent + contract tests |

## Layer 1: Tools TDD

**For:** Adding or modifying tools in the Tool System.

**Core Challenge:** Agent tool selection is determined by LLM prompt. Same input, different prompt = different tool choice.

**Strategy:** Fix the prompt, verify the correct tool is called.

```typescript
describe("Tool Selection TDD") {
  test("read_file chosen for 'show me foo.txt'") {
    given_prompt(system_prompt)
    when_agent_receives("show me foo.txt")
    then_tool_called("read_file")
  }
}
```

### Three Test Scenarios

1. **Schema Validation** — Tool rejects invalid input
2. **Permission Selection** — Tool blocked when session lacks required permission
3. **Tool Description Quality** — Right tool selected / wrong tool rejected

See `specs/layer1-tools-tdd.md` for full details.

## Layer 2: Harness Loop TDD

**For:** Changes to the Harness Core loop, session management, or permission enforcement.

**Core Challenge:** LLM output is non-deterministic. Same input can produce different tool_calls each run.

**Strategy:** Mock LLM. Record a "golden" response once, replay it for all subsequent test runs.

```typescript
describe("Harness Loop TDD") {
  test("record golden response") {
    with_live_llm()
    when_agent_run(session, "list all test files")
    then_save_recorded_response("fixtures/list-test-files.json")
  }

  test("replay produces same tools") {
    with_mock_llm(fixtures("list-test-files.json"))
    when_agent_run(session, "list all test files")
    then_tool_sequence_equals(["glob", "read_file", "read_file"])
  }
}
```

### Four Test Scenarios

1. **Session Persistence** — Create → save → load → equivalent
2. **Message Immutability** — Append-only, never mutated
3. **Permission Enforcement** — ReadOnly + DangerFullAccess tool → Error
4. **Retry Backoff** — 429 triggers exponential backoff retry

See `specs/layer2-loop-tdd.md` for full details.

## Layer 3: Multi-Agent TDD

**For:** Sub-agent spawning, parent-child communication, and collaboration patterns.

**Core Challenge:** Multi-agent interaction non-determinism comes from sub-agent outputs — same input, different sub-agent result.

**Strategy:** Mock sub-agents. Use contract testing to verify message TYPE correctness between parent and child, not content.

```typescript
describe("Multi-Agent TDD") {
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

### Four Test Scenarios

1. **forkSubagent Message Protocol** — Parent receives AgentResultMessage, not raw child messages
2. **Parent-Child Permission Boundary** — Child permission ≤ parent permission
3. **Timeout Termination** — max_turns + timeout dual guarantee
4. **Parallel Agent Merge** — Results merge without conflict

See `specs/layer3-multiagent-tdd.md` for full details.

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|---------------|-----------------|
| Live LLM in regression tests | Flaky — output varies | Only use live LLM to record fixtures; mock in regression |
| Testing LLM output content | Fragile — text changes | Test behavior (which tool called), not content |
| Integration tests per input combination | Combinatorial explosion | Test tool selection logic once per prompt variant |
| Fixture not in VCS | Where is the file? | Fixtures must be in git, versioned with code |
| Heavy HTTP mock server | Overkill | Mock function calls directly |

See `references/anti-patterns.md` for the complete list.

## How to Use This Skill

**Building a new Tool?**
1. Read `specs/layer1-tools-tdd.md`
2. Write RED tests for: schema validation, permission boundaries, description quality
3. GREEN: iterate on prompt/tool schema until tests pass
4. REFACTOR: simplify without breaking tests

**Refactoring the Harness Loop?**
1. Read `specs/layer2-loop-tdd.md`
2. Record golden fixtures for critical paths
3. Refactor loop code
4. Run replay tests — if tools sequence changes, refactor is unsafe

**Adding Multi-Agent Patterns?**
1. Read `specs/layer3-multiagent-tdd.md`
2. Write contract tests verifying message types (not content)
3. Mock sub-agents to control non-determinism

## References

- `specs/layer1-tools-tdd.md` — Tools TDD detailed spec
- `specs/layer2-loop-tdd.md` — Harness Loop TDD detailed spec
- `specs/layer3-multiagent-tdd.md` — Multi-Agent TDD detailed spec
- `references/test-fixtures.md` — Golden response fixture management
- `references/mock-strategies.md` — Mock LLM / mock sub-agent strategies
- `references/anti-patterns.md` — Common mistakes and how to avoid them
- `harness` skill — The 4-layer architecture this TDD methodology verifies
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
wc -l skills/agent-tdd/README.md
```

Expected: File exists with substantial content (150+ lines).

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/README.md
git commit -m "feat: add agent-tdd README.md with full methodology guide"
```

---

## Task 3: Write layer1-tools-tdd.md

**Files:**
- Create: `skills/agent-tdd/specs/layer1-tools-tdd.md`

- [ ] **Step 1: Write layer1-tools-tdd.md**

```markdown
# Layer 1: Tools TDD — Detailed Specification

**Status:** Approved
**Layer:** 1 of 3
**Purpose:** Test-driven development for the Tool System layer — ensuring correct tool selection, schema validation, and permission enforcement.

---

## Core Challenge

Agent tool selection is determined by LLM prompt. Same input, different prompt = different tool choice.

**Test Strategy:** Fix the prompt, verify the correct tool is called.

---

## Test Structure

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

---

## Three Tool Test Scenarios

### 1. Schema Validation

**What it tests:** Tool's `input_schema` correctly rejects invalid inputs.

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

**When to write this test:** When registering a new tool or modifying an existing tool's schema.

### 2. Permission Selection

**What it tests:** Tool is blocked when session lacks the required permission level.

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

**When to write this test:** When every new tool is registered with a permission level.

### 3. Tool Description Quality

**What it tests:** Tool descriptions are clear enough for the LLM to select the correct tool.

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

**When to write this test:** When tools have overlapping capabilities or when adding new tools to an existing set.

---

## RED → GREEN → REFACTOR Workflow

### RED Phase

1. Write the test for the tool behavior you want
2. Run — expect failure (tool doesn't exist, schema wrong, permission misconfigured)

### GREEN Phase

1. Implement or fix the tool to satisfy the test
2. Run — expect pass
3. Do NOT optimize or refactor — just make it work

### REFACTOR Phase

1. Simplify the tool implementation or schema
2. Run tests — must stay green
3. Remove duplication, improve naming

---

## Engineering Checklist

- [ ] Every tool's `input_schema` has a corresponding RED test
- [ ] Permission boundaries have RED tests (privileged operations must be blocked)
- [ ] Tool description quality has behavior tests (right tool selected / wrong tool rejected)
- [ ] Tests use fixed seed or recorded prompt version

---

## Example: Full Tool TDD Cycle

```typescript
// === RED ===
describe("bash tool TDD", () => {
  test("bash tool blocks dangerous commands in ReadOnly session", () => {
    // Setup
    register_tool(bash_tool({ required_permission: "DangerFullAccess" }))
    session = create_session({ permission: "ReadOnly" })

    // Execute
    when_agent_receives("run rm -rf /")

    // Assert
    then_tool_blocked("bash")
    then_error_contains("permission denied")
    then_session_messages_count(2) // user message + error
  })
})

// === GREEN ===
// Fix: Add permission check in ToolExecutor
// bash_tool has required_permission: "DangerFullAccess"
// Session has permission: "ReadOnly"
// → ToolExecutor.execute() returns Error("Permission denied")

// === REFACTOR ===
// Extract permission checking into a shared function
function check_permission(session, tool) {
  if (tool.required_permission > session.permission) {
    return Error("Permission denied")
  }
}
```

---

## Relationship to Other Layers

- **Layer 1 (Tools TDD)** tests Layer 2 of the harness architecture (Tool System)
- **Layer 2 (Loop TDD)** tests Layer 1 of the harness architecture (Harness Core)
- Tools TDD assumes the harness loop exists — it only tests tool selection and execution
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/specs/layer1-tools-tdd.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/specs/layer1-tools-tdd.md
git commit -m "feat: add layer1-tools-tdd.md specification"
```

---

## Task 4: Write layer2-loop-tdd.md

**Files:**
- Create: `skills/agent-tdd/specs/layer2-loop-tdd.md`

- [ ] **Step 1: Write layer2-loop-tdd.md**

```markdown
# Layer 2: Harness Loop TDD — Detailed Specification

**Status:** Approved
**Layer:** 2 of 3
**Purpose:** Test-driven development for the Harness Core loop — ensuring session persistence, message immutability, permission enforcement, and retry backoff.

---

## Core Challenge

LLM output is non-deterministic. Same input can produce different tool_calls each run.

**Test Strategy:** Mock LLM. Record a "golden" response once, replay it for all subsequent test runs.

---

## Test Structure

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

---

## Four Harness Loop Test Scenarios

### 1. Session Persistence

**What it tests:** Session state survives save → load cycle.

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

### 2. Message Immutability

**What it tests:** Messages are append-only — never mutated in-place.

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

### 3. Permission Enforcement

**What it tests:** DangerFullAccess tool is blocked when session is ReadOnly — and LLM sees the error.

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

### 4. Retry Backoff

**What it tests:** LLM 429 rate limit triggers exponential backoff retry.

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

---

## Golden Response Fixtures

### Recording a Fixture

```typescript
// Run ONCE with live LLM to record
test("record golden response for 'list test files'") {
  with_live_llm()
  session = create_session()

  when_agent_run(session, "list all test files")

  // Save for replay
  fixtures.save("list-test-files.json", session.messages)
}
```

### Replaying a Fixture

```typescript
test("regression: list test files produces glob → read_file sequence") {
  // Load recorded fixture
  mock_llm(fixtures("list-test-files.json"))

  session = create_session()
  when_agent_run(session, "list all test files")

  then_tool_sequence_equals(["glob", "read_file", "read_file"])
}
```

### Fixture File Format

```json
{
  "description": "Agent lists all test files in project",
  "recorded_at": "2026-04-01T00:00:00Z",
  "model": "claude-opus-4-6",
  "messages": [
    {
      "role": "user",
      "content": "list all test files"
    },
    {
      "role": "assistant",
      "tool_calls": [
        {
          "name": "glob",
          "input": { "pattern": "**/*test*.{js,ts,py}" }
        }
      ]
    },
    {
      "role": "tool",
      "tool_name": "glob",
      "tool_result": { "files": ["a_test.js", "b_test.ts"] }
    }
  ]
}
```

---

## RED → GREEN → REFACTOR Workflow

### RED Phase

1. Write the test for loop behavior you want
2. Run with mock LLM — expect failure (loop doesn't implement the behavior yet)

### GREEN Phase

1. Implement the loop behavior to satisfy the test
2. Run — expect pass
3. Do NOT optimize — just make it work

### REFACTOR Phase

1. Refactor loop code (e.g., extract functions, simplify)
2. Run fixture replay tests — if sequence changes, refactor is unsafe

---

## Engineering Checklist

- [ ] Golden response fixture recording workflow exists
- [ ] Every fixture has a corresponding regression test
- [ ] Session persistence has tests (create → save → load → equivalent)
- [ ] Message immutability has tests (no in-place edit)
- [ ] Permission enforcement has tests (ReadOnly + bash → Error)
- [ ] Retry backoff has tests (mock 429, observe cumulative delay)

---

## Relationship to Other Layers

- **Layer 1 (Tools TDD)** tests tool selection and schema validation
- **Layer 2 (Loop TDD)** tests Harness Core loop behavior with mocked LLM
- **Layer 3 (Multi-Agent TDD)** tests sub-agent coordination

- Loop TDD depends on Tools TDD — the loop calls tools, tools must work correctly
- Loop TDD does NOT depend on Layer 4 of harness — multi-agent is separate
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/specs/layer2-loop-tdd.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/specs/layer2-loop-tdd.md
git commit -m "feat: add layer2-loop-tdd.md specification"
```

---

## Task 5: Write layer3-multiagent-tdd.md

**Files:**
- Create: `skills/agent-tdd/specs/layer3-multiagent-tdd.md`

- [ ] **Step 1: Write layer3-multiagent-tdd.md**

```markdown
# Layer 3: Multi-Agent TDD — Detailed Specification

**Status:** Approved
**Layer:** 3 of 3
**Purpose:** Test-driven development for multi-agent patterns — ensuring correct message protocol, permission boundaries, timeout handling, and parallel result merging.

---

## Core Challenge

Multi-agent interaction non-determinism comes from sub-agent outputs — same input, different sub-agent result.

**Test Strategy:** Mock sub-agents. Use contract testing to verify message TYPE correctness between parent and child, not content.

---

## Test Structure

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

---

## Four Multi-Agent Test Scenarios

### 1. forkSubagent Message Protocol

**What it tests:** Parent session only sees final AgentResultMessage — progress updates stay in child.

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

### 2. Parent-Child Permission Boundary

**What it tests:** Child permission is a subset of parent permission — child cannot access parent's higher privileges.

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

### 3. Timeout Termination

**What it tests:** Sub-agent timeout kills child session and cleans up resources.

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

### 4. Parallel Agent Merge

**What it tests:** Parallel agents merge results without overwriting each other.

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

---

## RED → GREEN → REFACTOR Workflow

### RED Phase

1. Write contract test verifying message TYPE correctness
2. Run with mock sub-agents — expect failure (protocol not implemented)

### GREEN Phase

1. Implement the multi-agent protocol to satisfy the test
2. Run — expect pass
3. Do NOT handle all edge cases — just make the contract work

### REFACTOR Phase

1. Refactor parent-child communication code
2. Run contract tests — must stay green
3. Add more contract tests for edge cases

---

## Contract Testing vs Content Testing

| Aspect | Contract Test | Content Test |
|--------|--------------|--------------|
| What it verifies | Message TYPE structure | Message content/value |
| Example assertion | `m.type === "AgentResultMessage"` | `m.value.files.length === 3` |
| Why | Sub-agent output varies (non-deterministic) | Should be deterministic |
| When to use | All multi-agent tests | Only when content is controlled |

---

## Engineering Checklist

- [ ] forkSubagent has contract tests (verify message types, not content)
- [ ] Parent-child permission isolation has tests (child permission ≤ parent permission)
- [ ] Sub-agent timeout has tests (max_turns + timeout dual guarantee)
- [ ] Parallel agents have resource quota tests (excess requests rejected)
- [ ] Timeout cleanup of child Session has tests

---

## Relationship to Other Layers

- **Layer 1 (Tools TDD)** tests tool selection
- **Layer 2 (Loop TDD)** tests harness loop
- **Layer 3 (Multi-Agent TDD)** tests Layer 4 of harness architecture (Multi-Agent)
- Multi-Agent TDD depends on Loop TDD — parent is a harness session, child sessions are harnesses too
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/specs/layer3-multiagent-tdd.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/specs/layer3-multiagent-tdd.md
git commit -m "feat: add layer3-multiagent-tdd.md specification"
```

---

## Task 6: Write test-fixtures.md

**Files:**
- Create: `skills/agent-tdd/references/test-fixtures.md`

- [ ] **Step 1: Write test-fixtures.md**

```markdown
# Test Fixtures — Golden Response Management

## Overview

Golden response fixtures are recorded LLM outputs used for deterministic replay in Loop TDD (Layer 2) and Multi-Agent TDD (Layer 3).

**Why fixtures?** LLM output is non-deterministic. You record it once, then replay it deterministically for all regression tests.

---

## Recording a Fixture

### One-Time Recording Process

```typescript
test("record golden response for critical path") {
  // Only use live LLM during recording
  with_live_llm()

  session = create_session()
  when_agent_run(session, "list all test files")

  // Save to versioned file
  fixtures.save("list-test-files.json", session.messages)
}
```

### Recording Best Practices

1. **Record on a controlled environment** — Same model version, same tool versions
2. **Record on a known-good state** — System prompt finalized, tools stable
3. **Record representative inputs** — Cover the critical paths, not every edge case
4. **Save alongside code** — Fixture and its test should be in the same PR

---

## Fixture File Format

```json
{
  "description": "Agent lists all test files using glob → read_file",
  "recorded_at": "2026-04-01T00:00:00Z",
  "model": "claude-opus-4-6",
  "system_prompt_hash": "sha256:abc123...",
  "tools": ["glob", "read_file", "write_file"],
  "messages": [
    {
      "role": "user",
      "content": "list all test files"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_123",
          "name": "glob",
          "input": { "pattern": "**/*test*.{js,ts,py}" }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_123",
      "tool_name": "glob",
      "content": "{\"files\": [\"a_test.js\", \"b_test.ts\"]}"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_124",
          "name": "read_file",
          "input": { "path": "a_test.js" }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_124",
      "tool_name": "read_file",
      "content": "describe('test a') { ... }"
    }
  ],
  "finish": {
    "reason": "stop",
    "messages_count": 5
  }
}
```

---

## Fixture Storage

### Directory Structure

```
fixtures/
  loop/
    list-test-files.json
    read-project-structure.json
    bash-safe-command.json
  multiagent/
    parallel-explore.json
    sequential-handoff.json
```

### Version Control

**Fixtures MUST be in git.** They are part of the test suite.

```bash
# Good
git add fixtures/loop/list-test-files.json
git commit -m "test: record fixture for list test files path"

# Bad — fixture not in VCS
fixtures("list-test-files.json") // Where is this file?!
```

### When to Re-Record

| Scenario | Re-record? |
|----------|-----------|
| Tool schema changed | Yes — tool_calls format may differ |
| System prompt changed | Yes — LLM behavior may differ |
| New tool added | Maybe — existing fixtures still valid |
| Bug fix in harness loop | No — fixtures test the interface, not implementation |
| Tool behavior bug fix | Yes — old fixture has wrong expected output |

---

## Loading and Replaying

### Loop TDD Replay

```typescript
test("regression: list test files", () => {
  mock_llm(fixtures("loop/list-test-files.json"))
  session = create_session()
  run_loop(session, "list all test files")
  then_tool_sequence_equals(["glob", "read_file"])
})
```

### Multi-Agent Replay

```typescript
test("parent-child timeout cleanup", () => {
  mock_subagent({
    when_receives({ type: "delegate" })
      respond({ type: "timeout" })
  })
  parent = fork_subagent({ timeout_ms: 100 })
  run_until_timeout(parent)
  then_child_session_null()
})
```

---

## Fixture Validation

### Schema Validation

Validate fixture JSON on load:

```typescript
function load_fixture(path: string): RecordedSession {
  const raw = fs.readFileSync(path, "utf-8")
  const fixture = JSON.parse(raw)

  // Validate structure
  if (!fixture.messages || !Array.isArray(fixture.messages)) {
    throw new Error(`Invalid fixture ${path}: missing messages array`)
  }
  if (!fixture.description || !fixture.recorded_at) {
    throw new Error(`Invalid fixture ${path}: missing metadata`)
  }

  return fixture
}
```

### Sanity Checks

```typescript
test("fixture sanity checks") {
  const fixture = load_fixture("loop/list-test-files.json")

  // First message is always user
  expect(fixture.messages[0].role).to_equal("user")

  // Tool result follows tool call
  for (let i = 1; i < fixture.messages.length; i++) {
    const msg = fixture.messages[i]
    if (msg.tool_calls) {
      const next = fixture.messages[i + 1]
      expect(next.role).to_equal("tool")
      expect(next.tool_call_id).to_equal(msg.tool_calls[0].id)
    }
  }

  // Ends with assistant (finish)
  const last = fixture.messages[fixture.messages.length - 1]
  expect(last.role).to_equal("assistant")
}
```

---

## Anti-Patterns

### Fixture Not in VCS

```typescript
// WRONG
fixtures("list-test-files.json") // File missing from git

// RIGHT
fixtures("fixtures/loop/list-test-files.json") // Committed to git
```

### Recording on Unstable System

```typescript
// WRONG — live LLM in every test
test("agent works", () => {
  with_live_llm() // Flaky! Don't do this in regression tests
  when_agent_receives("list files")
  then_tool_called("glob")
})

// RIGHT — live LLM only for recording
test("record", () => {
  with_live_llm()
  then_save_recorded_response("fixtures/list-files.json")
})

test("regression", () => {
  with_mock_llm(fixtures("fixtures/loop/list-files.json")) // Deterministic
})
```

### Over-Recording

```typescript
// WRONG — too many fixtures, maintenance burden
fixtures("input-a.json")  // Not worth recording
fixtures("input-b.json")  // Too similar to a
fixtures("input-c.json")  // Edge case rarely hit

// RIGHT — record critical paths only
fixtures("list-files.json")      // Common user journey
fixtures("bash-safe.json")       // Security-critical path
```
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/references/test-fixtures.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/references/test-fixtures.md
git commit -m "feat: add test-fixtures.md reference documentation"
```

---

## Task 7: Write mock-strategies.md

**Files:**
- Create: `skills/agent-tdd/references/mock-strategies.md`

- [ ] **Step 1: Write mock-strategies.md**

```markdown
# Mock Strategies — Mocking LLM and Sub-Agents

## Overview

Mocking is central to Agent TDD. Because LLM output and sub-agent responses are non-deterministic, you MUST mock them for deterministic tests.

| Layer | What to Mock | Strategy |
|-------|-------------|----------|
| Tools TDD | Nothing (deterministic) | Use real tools |
| Loop TDD | LLM | Record & replay fixtures |
| Multi-Agent TDD | Sub-agent | Mock function + contract tests |

---

## Layer 2: Mocking the LLM

### Mock Strategy: Record & Replay

**The approach:**
1. Run with live LLM ONCE → record response to JSON file
2. All subsequent tests → load fixture, replay deterministically

```typescript
// === Recording (one time) ===
test("record golden response") {
  with_live_llm()
  session = create_session()
  when_agent_run(session, "list all test files")
  fixtures.save("list-test-files.json", session.messages)
}

// === Replaying (every regression run) ===
test("regression: list test files") {
  mock_llm(fixtures("fixtures/loop/list-test-files.json"))
  session = create_session()
  when_agent_run(session, "list all test files")
  then_tool_sequence_equals(["glob", "read_file", "read_file"])
}
```

### Mock API Design

```typescript
interface MockLLM {
  // Load a recorded fixture
  mock_llm(fixture: RecordedFixture): void

  // Respond with predefined sequence
  mock_llm(responses: LLMResponse[]): void

  // Simulate specific errors
  mock_llm_error(error: LLMError): void
}

type LLMResponse =
  | { type: "tool_call", name: string, input: Record<string, any> }
  | { type: "text", content: string }
  | { type: "finish" }
  | { type: "error", code: string }

type LLMError =
  | { type: "rate_limit", retry_after_ms: number }
  | { type: "network_error" }
  | { type: "auth_error" }
```

### Example: Simulating Rate Limits

```typescript
test("retry on 429 with backoff") {
  mock_llm(responses([
    { type: "error", code: "rate_limit", retry_after_ms: 1000 },
    { type: "error", code: "rate_limit", retry_after_ms: 2000 },
    { type: "finish" }
  ]))

  start = now()
  run_loop(session, "do something")
  elapsed = now() - start

  // Exponential backoff: ~1000 + ~2000 = ~3000ms
  expect(elapsed).to_be_gte(2900)
  expect(mock_llm.call_count).to_equal(3)
}
```

### Example: Simulating Tool Errors

```typescript
test("LLM handles tool error gracefully") {
  mock_llm(responses([
    { type: "tool_call", name: "read_file", input: { path: "missing.txt" } },
    { type: "finish" }
  ]))

  // Tool returns error
  mock_tool_result("read_file", Error("File not found"))

  session = create_session()
  run_loop(session, "read missing.txt")

  // LLM sees error and handles it (doesn't retry infinitely)
  expect(session.messages[messages.length - 1].content)
    .to_include("could not read file")
}
```

---

## Layer 3: Mocking Sub-Agents

### Mock Strategy: Contract Testing

**The approach:**
1. Mock sub-agent to return fixed response structure
2. Verify the MESSAGE TYPE between parent and child (not content)
3. Content varies — type contract is stable

```typescript
test("forkSubagent message protocol") {
  mock_subagent({
    when_receives({ type: "delegate", task: "explore" })
      respond({ type: "result", value: { files: ["a.js", "b.js"] } })
  })

  parent = fork_subagent({ task: "explore codebase" })

  // Verify TYPE, not content
  then_parent_received({ type: "result" })
  then_child_messages_count(0) // Progress stayed in child
}
```

### Mock Sub-Agent API Design

```typescript
interface MockSubAgent {
  // When parent sends this message, respond with this
  when_receives(message: Partial<Message>): MockSubAgent
  respond(response: AgentMessage): MockSubAgent

  // For timeout simulation
  respond_never(): MockSubAgent
}

// Agent message types
type AgentMessage =
  | { type: "delegate", task: string, params?: Record<string, any> }
  | { type: "progress", percent: number, update: string }
  | { type: "result", value: any }
  | { type: "error", message: string }
  | { type: "timeout" }
```

### Example: Timeout Simulation

```typescript
test("timeout kills child session") {
  mock_subagent({
    when_receives({ type: "delegate" })
      respond_never() // Never responds → triggers timeout
  })

  parent = fork_subagent({ timeout_ms: 1000, max_turns: 5 })
  run_until_timeout(parent)

  expect(get_child_status(parent)).to_equal("killed")
  expect(get_child_session(parent)).to_be_null()
}
```

### Example: Parallel Agent Mocking

```typescript
test("parallel agents merge results") {
  mock_agent("explorer", {
    when_receives({ type: "delegate", task: /explore.*files/ })
      respond({ type: "result", value: { files: ["a.js", "b.js"] } })
  })

  mock_agent("counter", {
    when_receives({ type: "delegate", task: /count.*tests/ })
      respond({ type: "result", value: { count: 5 } })
  })

  results = await Promise.all([
    fork_agent("explorer", { task: "explore and list files" }),
    fork_agent("counter", { task: "count all test files" })
  ])

  merged = merge_results(results)
  expect(merged.explorer.files).to_have_length(2)
  expect(merged.counter.count).to_equal(5)
}
```

---

## Anti-Patterns

### Heavy HTTP Mock Server

```typescript
// WRONG — starting an HTTP server for mocking is overkill
mock_llm_with_http_server({ delay_ms: 100, port: 9999 })

// RIGHT — mock function calls directly
mock_llm(fixtures("list-test-files.json"))
```

### Mocking Content in Multi-Agent Tests

```typescript
// WRONG — content varies, test will break
test("sub-agent returns correct files") {
  mock_subagent({
    respond({ type: "result", value: { files: ["a.js"] } })
  })
  then_parent_received_value({ files: ["a.js"] }) // Brittle!
}

// RIGHT — verify TYPE contract, not content
test("sub-agent sends result type") {
  mock_subagent({
    respond({ type: "result", value: { files: ["a.js"] } })
  })
  then_parent_received({ type: "result" }) // Stable!
}
```

### Using Live LLM in Regression

```typescript
// WRONG — live LLM makes tests flaky
test("agent works", () => {
  with_live_llm() // NEVER in regression tests
  when_agent_receives("list files")
  then_tool_called("glob")
})

// RIGHT — only use live LLM for one-time recording
test("record", () => {
  with_live_llm()
  then_save_recorded_response("fixtures/list-files.json")
})
```

---

## Mock vs Real

| When to Mock | When to Use Real |
|-------------|-----------------|
| Regression tests (Layer 2, 3) | Tool integration tests (Layer 1) |
| Permission boundary tests | Schema validation tests |
| Retry/backoff logic | Fixture recording |
| Session persistence | Tool description quality |
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/references/mock-strategies.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/references/mock-strategies.md
git commit -m "feat: add mock-strategies.md reference documentation"
```

---

## Task 8: Write anti-patterns.md

**Files:**
- Create: `skills/agent-tdd/references/anti-patterns.md`

- [ ] **Step 1: Write anti-patterns.md**

```markdown
# Anti-Patterns — Common Mistakes in Agent TDD

## Overview

These anti-patterns represent the most common mistakes when applying TDD to Agent systems. Each one includes what it looks like, why it's wrong, and the correct approach.

---

## Anti-Pattern 1: Live LLM in Regression Tests

**What it looks like:**
```typescript
test("agent works correctly") {
  with_live_llm()
  when_agent_receives("list files")
  then_tool_called("glob")
}
// FAILs randomly — LLM output varies per call
```

**Why it's wrong:** LLM output is non-deterministic. Running with live LLM means the same test can pass or fail randomly.

**Correct approach:** Only use live LLM to record a golden fixture once. All regression tests use mocked responses.

```typescript
// Recording (one time)
test("record fixture") {
  with_live_llm()
  when_agent_run(session, "list files")
  then_save_recorded_response("fixtures/list-files.json")
}

// Regression (deterministic)
test("regression: list files") {
  with_mock_llm(fixtures("fixtures/loop/list-files.json"))
  when_agent_run(session, "list files")
  then_tool_called("glob")
}
```

---

## Anti-Pattern 2: Testing LLM Output Content

**What it looks like:**
```typescript
test("LLM says hello") {
  with_live_llm()
  when_agent_receives("say hello")
  then_response_contains("hello world")
}
// FAILs when LLM changes phrasing
```

**Why it's wrong:** Testing what the LLM *says* (content) is fragile. The LLM can rephrase without changing meaning.

**Correct approach:** Test behavior (which tool was called), not content (what LLM said).

```typescript
test("agent selects glob for 'find all test files'") {
  with_mock_llm(fixtures("fixtures/find-tests.json"))
  when_agent_receives("find all test files")
  then_tool_called("glob")
  then_tool_not_called("read_file")
}
```

---

## Anti-Pattern 3: Integration Tests Per Input Combination

**What it looks like:**
```typescript
test("read_file with path X")
test("read_file with path Y")
test("read_file with path A, B, C...")
test("read_file with empty string")
test("read_file with very long path")
// Combinatorial explosion — 50 tests for one tool
```

**Why it's wrong:** Tool behavior is a property of the tool schema and prompt, not individual inputs.

**Correct approach:** Test tool selection logic once per prompt/tool combination. Cover edge cases with schema validation tests.

```typescript
// Test the decision, not every input
test("agent selects read_file for 'read foo.txt'") {
  when_agent_receives("read foo.txt")
  then_tool_called("read_file")
}

test("agent selects write_file for 'write to foo.txt'") {
  when_agent_receives("write to foo.txt")
  then_tool_called("write_file")
}
```

---

## Anti-Pattern 4: Fixture Not in Version Control

**What it looks like:**
```typescript
test("agent works") {
  mock_llm(fixtures("list-test-files.json"))
  // Where is this file?! Not in git!
}
```

**Why it's wrong:** Without VCS, fixtures drift from code. Nobody knows which fixture version goes with which code version.

**Correct approach:** Fixtures must be in git, versioned and reviewed alongside code.

```bash
# Good — fixture is in git
fixtures/loop/list-test-files.json  # Tracked in git

# Bad — fixture is an orphan file
/tmp/fixtures/list-test-files.json  # Lost on disk wipe
```

---

## Anti-Pattern 5: Heavy HTTP Mock Server

**What it looks like:**
```typescript
test("LLM retry on rate limit") {
  mock_llm_with_http_server({
    port: 9999,
    delay_ms: 100,
    responses: [429, 429, 200]
  })
  // Starting an HTTP server for a unit test?! Overkill.
}
```

**Why it's wrong:** Starting an HTTP mock server adds latency and complexity. For unit tests, you just need to mock function calls.

**Correct approach:** Mock function calls directly.

```typescript
test("retry on 429") {
  mock_llm(responses([
    { type: "error", code: "rate_limit" },
    { type: "finish" }
  ], delays: [1000]))

  run_loop(session, "do something")
  expect(mock_llm.call_count).to_equal(2)
}
```

---

## Anti-Pattern 6: Testing Sub-Agent Content

**What it looks like:**
```typescript
test("sub-agent returns correct file list") {
  mock_subagent({ respond({ type: "result", value: { files: ["a.js", "b.js"] } }) })
  parent = fork_subagent({ task: "find tests" })
  // Testing content — will break when sub-agent changes output
  expect(parent.messages[1].value.files).to_equal(["a.js", "b.js"])
}
```

**Why it's wrong:** Sub-agent output varies (non-deterministic). Testing content means the test fails when sub-agent returns different (but equally valid) output.

**Correct approach:** Test message TYPE contract, not content.

```typescript
test("sub-agent sends result type to parent") {
  mock_subagent({ respond({ type: "result", value: { files: ["a.js"] } }) })
  parent = fork_subagent({ task: "find tests" })
  // Testing TYPE — stable regardless of actual file list
  then_parent_received({ type: "result" })
}
```

---

## Anti-Pattern 7: No Permission Boundary Tests

**What it looks like:**
```typescript
test("bash tool executes commands") {
  register_tool(bash_tool())
  when_agent_receives("delete everything")
  then_tool_called("bash") // No permission check!
}
```

**Why it's wrong:** Dangerous tools like `bash` should be blocked based on session permission level. Without explicit tests, permission bugs go undetected.

**Correct approach:** Write tests for permission boundaries.

```typescript
test("bash blocked in ReadOnly session") {
  register_tool(bash_tool({ required_permission: "DangerFullAccess" }))
  session = create_session({ permission: "ReadOnly" })
  when_agent_receives("delete everything")
  then_tool_blocked("bash")
  then_error_contains("permission denied")
}
```

---

## Anti-Pattern 8: Refactoring Without Fixture Regression

**What it looks like:**
```typescript
// Refactored the loop — runs fine locally
test("after refactor, agent still works") {
  with_live_llm() // Different output now — test is meaningless
  when_agent_receives("list files")
  then_tool_called("glob") // Passes or fails randomly
}
```

**Why it's wrong:** Without fixture replay, there's no way to know if the refactor broke something.

**Correct approach:** Use recorded fixtures for all refactoring regression tests.

```typescript
test("after refactor, same tool sequence") {
  with_mock_llm(fixtures("fixtures/loop/list-files.json"))
  refactored_session = create_session({ loop_version: "refactored" })
  when_agent_run(refactored_session, "list files")
  then_tool_sequence_equals(["glob", "read_file"]) // Must be identical
}
```

---

## Summary Table

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| Live LLM in regression | Flaky tests | Record fixtures, mock in regression |
| Testing LLM content | Brittle tests | Test behavior (tool called), not content |
| Too many input combos | Test maintenance burden | Test decision logic, not per-input |
| Fixture not in VCS | Fixture drift | Commit fixtures alongside code |
| HTTP mock server | Slow tests, complexity | Mock function calls directly |
| Testing sub-agent content | Non-deterministic failures | Test message TYPE contract |
| No permission tests | Security gaps | Explicit permission boundary tests |
| Refactor without fixtures | Silent regressions | Fixture replay for all refactors |
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la skills/agent-tdd/references/anti-patterns.md
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-tdd/references/anti-patterns.md
git commit -m "feat: add anti-patterns.md reference documentation"
```

---

## Self-Review Checklist

After completing all tasks, run through this checklist:

- [ ] Spec coverage: Can you point to a task that implements each section of the design spec?
- [ ] Placeholder scan: No TBD, TODO, or vague requirements anywhere
- [ ] File structure: All 8 files created in correct locations
- [ ] Layer mapping: layer1 → Tools TDD, layer2 → Loop TDD, layer3 → Multi-Agent TDD
- [ ] Anti-patterns: 8 anti-patterns documented with correct/incorrect examples
- [ ] Cross-references: README.md links to specs/ and references/ correctly
- [ ] SKILL.md: name field is "agent-tdd", not "agent-tdd-engineering"

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
