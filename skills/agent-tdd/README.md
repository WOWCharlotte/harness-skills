# Agent TDD — Test-Driven Development for Agent Systems

## Overview

Agent TDD is a methodology for applying test-driven development to agent systems built on Large Language Models (LLMs). Unlike traditional software where outputs are deterministic, agent systems exhibit non-determinism at multiple layers, requiring specialized testing strategies.

### User Journey

1. **Identify the layer** you are modifying (Tools, Harness Loop, or Multi-Agent)
2. **Apply the appropriate TDD strategy** for that layer
3. **Write failing tests first** to capture expected behavior
4. **Implement the feature** until tests pass
5. **Refactor** while maintaining test coverage

### 3-Layer TDD Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TDD Testing Layers                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Multi-Agent TDD                                       │
│  mock sub-agent → contract test message types                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Harness Loop TDD                                     │
│  mock LLM → record & replay fixed responses                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Tools TDD                                            │
│  fixed prompt → deterministic tool selection                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Principle

| Layer | Non-determinism Source | Test Strategy |
|-------|----------------------|---------------|
| **Layer 1: Tools** | Prompt changes → tool selection changes | Fixed prompt + deterministic assertion |
| **Layer 2: Harness Loop** | LLM output varies per call | Mock LLM (record & replay) |
| **Layer 3: Multi-Agent** | Sub-agent output varies | Mock sub-agent + contract tests |

---

## Layer 1: Tools TDD

### When to Use

Use this layer when you are **adding or modifying tools** that the agent can call.

### Core Challenge

Tool selection is determined by the prompt. The same tool may be selected or rejected based on how the prompt is worded, making selection non-deterministic across runs.

### Strategy

1. **Fix the prompt** to a known state
2. **Verify the correct tool is called** with expected parameters
3. **Assert deterministic behavior** for the same prompt

### Test Structure Pseudocode

```typescript
describe('Tool Selection', () => {
  it('should select readFile tool when user asks to view a file', () => {
    // Given: Fixed prompt
    const prompt = buildPrompt({
      instruction: 'View the contents of config.json',
      availableTools: [readFile, writeFile, listDirectory]
    })

    // When: Agent processes the prompt
    const result = agent.selectTool(prompt)

    // Then: Deterministic assertion
    expect(result.toolName).toBe('readFile')
    expect(result.params.filePath).toBe('config.json')
  })
})
```

### Test Scenarios

#### Scenario 1: Schema Validation

Verify that tool parameters conform to the expected schema.

```typescript
it('should validate tool parameters against schema', () => {
  const invalidParams = { filePath: 123 } // should be string
  expect(() => validateToolParams('readFile', invalidParams))
    .toThrow('filePath must be a string')
})
```

#### Scenario 2: Permission Selection

Verify that the agent selects tools based on granted permissions.

```typescript
it('should not suggest tools without required permissions', () => {
  const grantedPermissions = ['filesystem:read']
  const availableTools = [readFile, writeFile, deleteFile]

  const selectedTool = agent.selectTool(prompt, { permissions: grantedPermissions })

  expect(selectedTool.name).toBe('readFile')
  expect(['writeFile', 'deleteFile']).not.toContain(selectedTool.name)
})
```

#### Scenario 3: Tool Description Quality

Verify that tool descriptions are clear enough for correct selection.

```typescript
it('should select correct tool based on description clarity', () => {
  const tools = [
    { name: 'fetch', description: 'Retrieve data from a URL' },
    { name: 'post', description: 'Send data to a URL' }
  ]

  const prompt = 'Get the content from example.com'
  const selected = agent.selectTool(prompt, { tools })

  expect(selected.name).toBe('fetch')
})
```

### Reference

See [specs/layer1-tools-tdd.md](specs/layer1-tools-tdd.md) for detailed specification.

---

## Layer 2: Harness Loop TDD

### When to Use

Use this layer when you are **modifying the harness core loop** (Planner, Executor, Memory, or LLM interaction).

### Core Challenge

LLM output is non-deterministic. The same input can produce different outputs across calls due to temperature, sampling, and model behavior.

### Strategy

1. **Mock the LLM** to return fixed responses
2. **Record & replay** real LLM interactions for regression testing
3. **Assert on loop state transitions**, not LLM output

### Test Structure Pseudocode

```typescript
describe('Harness Loop', () => {
  it('should persist session state across messages', () => {
    // Given: Mock LLM with fixed responses
    const mockLLM = createMockLLM({
      responses: [
        { content: 'I need to read the file first' },
        { content: 'The file contains: config data' }
      ]
    })

    const harness = createHarness({ llm: mockLLM })
    const session = harness.createSession()

    // When: Processing sequence of messages
    session.addMessage({ role: 'user', content: 'Read config.json' })
    const response1 = session.process()

    session.addMessage({ role: 'user', content: 'What did you find?' })
    const response2 = session.process()

    // Then: Verify state persistence
    expect(session.getHistory()).toHaveLength(4) // 2 user + 2 assistant
    expect(response2.content).toContain('config')
  })
})
```

### Test Scenarios

#### Scenario 1: Session Persistence

Verify that session state is maintained across multiple interactions.

```typescript
it('should persist memory across turns', () => {
  const session = harness.createSession()

  session.addMessage({ role: 'user', content: 'Remember: my name is Alice' })
  session.process()

  session.addMessage({ role: 'user', content: 'What is my name?' })
  const response = session.process()

  expect(response.content).toContain('Alice')
})
```

#### Scenario 2: Message Immutability

Verify that historical messages cannot be modified after being added.

```typescript
it('should not allow modification of past messages', () => {
  const session = harness.createSession()
  session.addMessage({ role: 'user', content: 'Original message' })

  expect(() => {
    session.modifyMessage(0, { content: 'Modified message' })
  }).toThrow('Messages are immutable')
})
```

#### Scenario 3: Permission Enforcement

Verify that tools respect permission boundaries.

```typescript
it('should enforce permission boundaries', () => {
  const harness = createHarness({
    permissions: ['filesystem:read']
  })

  const session = harness.createSession()
  session.addMessage({
    role: 'user',
    content: 'Delete all files in the current directory'
  })

  const response = session.process()
  expect(response.content).toContain('permission denied')
})
```

#### Scenario 4: Retry Backoff

Verify that failed operations trigger appropriate retry behavior.

```typescript
it('should apply exponential backoff on failures', () => {
  const mockLLM = createMockLLM({
    responses: [
      { error: 'rate_limit' },
      { error: 'rate_limit' },
      { content: 'success' }
    ],
    delays: [0, 0, 0]
  })

  const harness = createHarness({ llm: mockLLM })
  const session = harness.createSession()

  session.addMessage({ role: 'user', content: 'Process request' })
  const startTime = Date.now()
  session.process()
  const elapsed = Date.now() - startTime

  // Verify backoff occurred (minimum delay between retries)
  expect(elapsed).toBeGreaterThan(200) // 100ms * 2 retries minimum
})
```

### Reference

See [specs/layer2-loop-tdd.md](specs/layer2-loop-tdd.md) for detailed specification.

---

## Layer 3: Multi-Agent TDD

### When to Use

Use this layer when you are **adding sub-agent spawning or parent-child communication**.

### Core Challenge

Sub-agent output is non-deterministic. Each sub-agent may produce different responses, making integration testing difficult.

### Strategy

1. **Mock sub-agents** to return controlled responses
2. **Use contract testing** to verify message protocols
3. **Assert on communication patterns**, not on content

### Test Structure Pseudocode

```typescript
describe('Multi-Agent Communication', () => {
  it('should spawn sub-agent with correct context', () => {
    // Given: Mock sub-agent factory
    const mockSubAgent = createMockSubAgent({
      responses: [
        { content: 'Sub-agent analysis complete', state: 'completed' }
      ]
    })

    const parentAgent = createParentAgent({
      subAgentFactory: mockSubAgent
    })

    // When: Parent spawns sub-agent
    const task = { type: 'analysis', data: 'sample data' }
    const subAgentResult = parentAgent.spawnSubAgent(task)

    // Then: Verify contract
    expect(subAgentResult.messages).toContainEqual({
      type: 'forkSubagent',
      payload: expect.objectContaining({ type: 'analysis' })
    })
    expect(subAgentResult.state).toBe('completed')
  })
})
```

### Test Scenarios

#### Scenario 1: forkSubagent Message Protocol

Verify that sub-agents are spawned with correct message protocol.

```typescript
it('should send forkSubagent message with correct payload', () => {
  const parentAgent = createParentAgent()
  const subAgentResult = parentAgent.spawnSubAgent({
    type: 'code_review',
    context: { prNumber: 123 }
  })

  expect(subAgentResult.messages).toContainEqual(expect.objectContaining({
    type: 'forkSubagent',
    payload: expect.objectContaining({
      type: 'code_review',
      context: { prNumber: 123 }
    })
  }))
})
```

#### Scenario 2: Parent-Child Permission Boundary

Verify that permissions are correctly delegated to sub-agents.

```typescript
it('should inherit parent permissions for sub-agent', () => {
  const parentAgent = createParentAgent({
    permissions: ['github:read', 'github:write']
  })

  const subAgent = parentAgent.spawnSubAgent({ type: 'github_task' })

  expect(subAgent.permissions).toEqual(['github:read', 'github:write'])
  // Sub-agent should NOT inherit: ['admin:write', 'system:delete']
})
```

#### Scenario 3: Timeout Termination

Verify that sub-agents are terminated after timeout.

```typescript
it('should terminate sub-agent after timeout', () => {
  const slowSubAgent = createMockSubAgent({
    responses: [{ delay: 5000 }] // 5 second delay
  })

  const parentAgent = createParentAgent({
    subAgentFactory: slowSubAgent,
    subAgentTimeout: 100 // 100ms timeout
  })

  const result = parentAgent.spawnSubAgent({ type: 'slow_task' })

  expect(result.state).toBe('timeout')
  expect(result.error).toContain('Sub-agent timed out')
})
```

#### Scenario 4: Parallel Agent Merge

Verify that results from parallel sub-agents are correctly merged.

```typescript
it('should merge results from parallel sub-agents', () => {
  const parentAgent = createParentAgent({
    subAgentFactory: createMockSubAgent({ concurrent: true })
  })

  const tasks = [
    { type: 'analysis', id: 1 },
    { type: 'analysis', id: 2 },
    { type: 'analysis', id: 3 }
  ]

  const results = parentAgent.spawnParallelSubAgents(tasks)

  expect(results).toHaveLength(3)
  expect(results[0].mergedContent).toBeDefined()
})
```

### Reference

See [specs/layer3-multiagent-tdd.md](specs/layer3-multiagent-tdd.md) for detailed specification.

---

## Anti-Patterns

| Anti-Pattern | Description | Correct Approach |
|--------------|-------------|------------------|
| **Testing LLM output content** | Asserting on exact LLM response text | Mock LLM, test loop behavior |
| **No permission boundaries** | Tools accessible without grants | Always test with restricted permissions |
| **Tight coupling to prompts** | Tests break when prompt wording changes | Fix prompt version, test tool selection |
| **Ignoring non-determinism** | Assuming same input = same output | Use record/replay for LLM, mock for sub-agents |
| **Mutable message history** | Modifying past messages in tests | Immutability enforced, tests should verify |

---

## How to Use This Skill

### For Feature Development

1. **Identify the layer** of your change:
   - Adding a new tool? → Layer 1
   - Modifying the core loop? → Layer 2
   - Adding multi-agent coordination? → Layer 3

2. **Follow the TDD cycle**:
   - Write a failing test first (Red)
   - Implement minimal code to pass (Green)
   - Refactor while maintaining tests (Refactor)

3. **Apply layer-specific strategy**:
   - Layer 1: Fix prompt, verify tool selection
   - Layer 2: Mock LLM, use record/replay
   - Layer 3: Mock sub-agents, test contracts

---

## References

### Specifications

- [specs/layer1-tools-tdd.md](specs/layer1-tools-tdd.md) — Tools TDD specification
- [specs/layer2-loop-tdd.md](specs/layer2-loop-tdd.md) — Harness Loop TDD specification
- [specs/layer3-multiagent-tdd.md](specs/layer3-multiagent-tdd.md) — Multi-Agent TDD specification

### Reference Materials

- [references/test-fixtures.md](references/test-fixtures.md) — Test fixtures for agent systems
- [references/mock-strategies.md](references/mock-strategies.md) — Mocking strategies for LLM and sub-agents
- [references/anti-patterns.md](references/anti-patterns.md) — Anti-patterns in agent TDD

### Related Skills

- **harness** — Skill composition and orchestration
- **code-reviewer** — Code review agent for agent systems
- **tdd-guide** — General TDD methodology guide
