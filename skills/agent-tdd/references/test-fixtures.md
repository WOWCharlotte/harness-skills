# Test Fixtures — Golden Response Management

## Overview

Golden response fixtures are recorded LLM interactions that serve as deterministic reference outputs for testing. They solve a fundamental problem: LLM outputs are non-deterministic by nature, making traditional assertion-based testing unreliable.

**Why fixtures are needed:**
- LLM outputs vary between runs (temperature, model updates, etc.)
- Recorded fixtures enable reproducible test behavior
- One-time recording, unlimited deterministic replay
- Facilitates regression testing and multi-agent coordination

## Recording a Fixture

### One-Time Recording Process

```
function recordFixture(interaction):
  // 1. Set up controlled, stable environment
  setDeterministicMode()

  // 2. Capture the complete interaction
  fixture = {
    description: captureDescription(),
    recorded_at: currentTimestamp(),
    model: getModelVersion(),
    system_prompt_hash: hash(getSystemPrompt()),
    tools: captureAvailableTools(),
    messages: []
  }

  // 3. Execute the interaction
  for each message in interaction:
    fixture.messages.push(captureMessage(message))
    if message.isComplete():
      break

  // 4. Verify the recording is in a known-good state
  validateRecording(fixture)

  // 5. Save alongside the code it tests
  saveFixture(fixture, getRelatedTestPath())
```

### Best Practices

1. **Controlled environment**: Use deterministic model settings (temperature=0, seed if available)
2. **Known-good state**: Record only passing, verified interactions
3. **Representative inputs**: Choose inputs that cover key behavioral scenarios
4. **Save alongside code**: Place fixtures in `fixtures/` directory near the test they support
5. **Document intent**: Include description explaining what behavior the fixture validates

## Fixture File Format

```json
{
  "description": "Loop TDD returns RED after failed test in JavaScript project",
  "recorded_at": "2024-03-15T14:30:00Z",
  "model": "claude-sonnet-4-20250305",
  "system_prompt_hash": "sha256:a1b2c3d4e5f6...",
  "tools": [
    "bash",
    "read",
    "write",
    "glob",
    "grep",
    "TaskOutput"
  ],
  "messages": [
    {
      "role": "user",
      "content": "Implement a factorial function in JavaScript that handles edge cases."
    },
    {
      "role": "assistant",
      "content": "I'll practice TDD. First, let me check the project structure."
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "bash",
            "arguments": "{\"command\": \"ls -la\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "tool_name": "bash",
      "content": "factorial.js\ntest/factorial.test.js\n..."
    },
    {
      "role": "assistant",
      "content": "Now I'll write the failing test first."
    },
    {
      "role": "assistant",
      "content": "RED: Test for factorial(0) should return 1"
    }
  ],
  "finish": {
    "status": "completed",
    "reason": "fixture_recorded"
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Human-readable description of the interaction |
| `recorded_at` | ISO8601 | Yes | Timestamp of recording |
| `model` | string | Yes | Model identifier used |
| `system_prompt_hash` | string | Yes | SHA256 hash of system prompt for change detection |
| `tools` | string[] | Yes | List of available tool names |
| `messages` | array | Yes | Array of message objects (see below) |
| `finish` | object | Yes | Final state of the interaction |

### Message Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | One of: "user", "assistant", "tool", "system" |
| `content` | string\|null | Text content (null if tool_calls present) |
| `tool_calls` | array | Assistant tool call requests (when content is null) |
| `tool_call_id` | string | ID linking tool response to call (for tool role) |
| `tool_name` | string | Name of the tool (for tool role) |

## Fixture Storage

### Directory Structure

```
project/
├── skills/
│   └── agent-tdd/
│       └── fixtures/
│           ├── loop/
│           │   ├── tdd-red-fail-javascript.json
│           │   ├── tdd-green-pass-python.json
│           │   └── tdd-refactor-complex-ts.json
│           └── multiagent/
│               ├── planner-architect-handoff.json
│               └── code-review-security-check.json
```

### Version Control Requirement

**MUST be committed to git.** Golden fixtures are only valuable when:
- They persist across machines and environments
- Changes to fixtures are reviewed via PR
- History tracks when and why fixtures change

```
# Required gitignore exceptions for fixture files
# DO NOT ignore fixtures/
!**/fixtures/**/*.json
```

### When to Re-Record

| Trigger | Action |
|---------|--------|
| Model version change | Re-record all affected fixtures |
| System prompt modification | Re-record if behavior changes |
| Tool schema changes | Re-record if tool usage affected |
| Test scenario legitimately changes | Re-record after verification |
| Fixture validation fails | Investigate before re-recording |

## Loading and Replaying

### Loop TDD Replay

```
function replayLoopFixture(fixturePath, context):
  // 1. Load and validate fixture
  fixture = loadFixture(fixturePath)
  if not validateFixtureSchema(fixture):
    throw new Error("Invalid fixture format")

  // 2. Set up test context
  mockLLM = createMockLLM(fixture.messages)
  mockTools = createMockTools(fixture.tools)

  // 3. Replay messages
  for message in fixture.messages:
    if message.role == "assistant":
      response = mockLLM.getNextResponse()
      assert response.content == message.content
      assert response.tool_calls == message.tool_calls
    else if message.role == "tool":
      mockLLM.receiveToolResult(message.tool_name, message.content)

  // 4. Verify final state
  assert mockLLM.isComplete()
  assert fixture.finish.status == "completed"
```

### Multi-Agent Replay

```
function replayMultiagentFixture(fixturePath, agentRegistry):
  fixture = loadFixture(fixturePath)

  // Identify agent boundaries by message sequences
  sessions = splitByAgentHandoffs(fixture.messages)

  for session in sessions:
    agent = agentRegistry.get(session.agentId)
    sessionFixture = extractSessionFixture(session)

    // Replay each agent session
    mockLLM = createMockLLM(sessionFixture.messages)
    while not mockLLM.isComplete():
      response = mockLLM.getNextResponse()
      toolResults = agent.executeTools(response.tool_calls)
      for result in toolResults:
        mockLLM.receiveToolResult(result.name, result.content)

  return aggregateResults(sessions)
```

## Fixture Validation

### Schema Validation on Load

```
function validateFixtureSchema(fixture):
  requiredFields = [
    "description",
    "recorded_at",
    "model",
    "system_prompt_hash",
    "tools",
    "messages",
    "finish"
  ]

  for field in requiredFields:
    if field not in fixture:
      return false

  if not isValidMessagesArray(fixture.messages):
    return false

  return true

function isValidMessagesArray(messages):
  if not Array.isArray(messages):
    return false

  for msg of messages:
    if msg.role not in ["user", "assistant", "tool", "system"]:
      return false
    if msg.role == "assistant" and msg.content == null and !msg.tool_calls:
      return false

  return true
```

### Sanity Checks

```
function sanityCheckFixture(fixture):
  errors = []

  // Check message alternation (user -> assistant -> tool -> assistant...)
  for i in range(1, len(fixture.messages)):
    prev = fixture.messages[i-1]
    curr = fixture.messages[i]

    if prev.role == "assistant" and curr.role != "tool":
      if curr.tool_calls:  # assistant with tool_calls should be followed by tool
        errors.append(f"Message ${i}: assistant with tool_calls not followed by tool")

  // Check tool_call_id linkage
  for msg in fixture.messages:
    if msg.role == "tool":
      if not msg.tool_call_id:
        errors.append("Tool message missing tool_call_id")
      if not msg.tool_name:
        errors.append("Tool message missing tool_name")

  // Check all tool responses have matching calls
  toolResponses = filter(m => m.role == "tool", fixture.messages)
  toolCalls = extractToolCalls(fixture.messages)

  if len(toolResponses) != len(toolCalls):
    errors.append(f"Tool response count (${len(toolResponses)}) != tool call count (${len(toolCalls)})")

  return {
    valid: len(errors) == 0,
    errors: errors
  }
```

## Anti-Patterns

### Fixture Not in VCS

**Problem**: Fixture exists only locally, prone to drift or loss.

**Solution**: Always commit fixtures to git. Use the `!` pattern in gitignore to track fixture files.

```gitignore
# WRONG - fixtures would be ignored
fixtures/

# CORRECT - explicitly unignore fixture JSON files
fixtures/**/*.json
!fixtures/**/*.json
```

### Recording on Unstable System

**Problem**: Recording with non-deterministic settings produces inconsistent fixtures.

**Solution**:
- Set `temperature=0` during recording
- Lock model version
- Disable caching if possible
- Verify fixture replay produces identical results

### Over-Recording

**Problem**: Recording too many fixtures creates maintenance burden; fixtures become stale.

**Solution**:
- Record fixtures for key behavioral scenarios only
- Prefer fewer, comprehensive fixtures over many narrow ones
- Re-evaluate fixture necessity during code review
- Delete obsolete fixtures when their tested code is removed
