# Mock Strategies — Mocking LLM and Sub-Agents

## Overview

Mocking is central to Agent TDD because it enables deterministic, fast, and reliable tests at scale. Different layers require different mocking strategies depending on what is being tested and the nature of the component under test.

| Layer | What to Mock | Strategy |
|-------|-------------|----------|
| Tools TDD | Nothing (deterministic) | Use real tools |
| Loop TDD | LLM | Record & replay fixtures |
| Multi-Agent TDD | Sub-agent | Mock function + contract tests |

- **Tools TDD** requires no mocking because tool implementations are deterministic — given the same input, they always produce the same output.
- **Loop TDD** mocks the LLM to simulate AI responses without calling the real API, enabling fast and deterministic tests.
- **Multi-Agent TDD** mocks sub-agents to simulate multi-agent collaboration without spawning real agent processes.

---

## Layer 2: Mocking the LLM

The LLM is the most critical dependency to mock in Loop TDD. The primary strategy is **Record & Replay**.

### Record & Replay Strategy

Record & Replay captures real LLM responses during a "recording" phase and replays them during test execution.

#### Recording Phase

```
FOR each test case in test_suite:
  prompt = test_case.input
  response = real_llm.call(prompt)  // Call actual LLM API
  save_fixture(test_case.name, prompt, response)
```

#### Replaying Phase

```
FOR each test case in test_suite:
  prompt = test_case.input
  fixture = load_fixture(test_case.name)

  // Before calling mock:
  validate_contract(prompt, fixture.expected_prompt_template)
  response = mock_llm.call(prompt)  // Returns fixture.response

  assert response == fixture.expected_response
```

### Mock API Design

```typescript
interface MockLLMOptions {
  fixtures: LLMFixture[]
  errorFixtures?: LLMErrorFixture[]
  onMissingFixture?: 'throw' | 'fallback' | 'record'
}

interface LLMFixture {
  name: string
  promptPattern: RegExp | string
  response: LLMResponse
  metadata?: {
    latencyMs?: number
    tokenUsage?: { prompt: number; completion: number }
  }
}

interface LLMErrorFixture {
  name: string
  promptPattern: RegExp | string
  error: Error | { code: string; message: string }
  probability?: number  // For probabilistic error injection
}

class MockLLM implements LLMInterface {
  private fixtures: Map<string, LLMFixture>
  private callHistory: LLMCall[]

  constructor(private options: MockLLMOptions) {
    this.fixtures = new Map(
      options.fixtures.map(f => [f.name, f])
    )
    this.callHistory = []
  }

  async call(prompt: string, context?: CallContext): Promise<LLMResponse> {
    this.callHistory.push({ prompt, context, timestamp: Date.now() })

    const fixture = this.findMatchingFixture(prompt)

    if (!fixture && this.options.onMissingFixture === 'throw') {
      throw new Error(`No fixture found for prompt: ${prompt.slice(0, 100)}...`)
    }

    if (!fixture && this.options.onMissingFixture === 'record') {
      // Record the real call result
      const response = await this.options.realLLM?.call(prompt, context)
      this.saveFixture(prompt, response)
      return response
    }

    if (!fixture) {
      return this.options.fallback?.(prompt) ?? this.defaultResponse()
    }

    // Apply simulated latency if specified
    if (fixture.metadata?.latencyMs) {
      await this.simulateLatency(fixture.metadata.latencyMs)
    }

    return fixture.response
  }

  private findMatchingFixture(prompt: string): LLMFixture | undefined {
    return this.fixtures.values().find(f => {
      if (typeof f.promptPattern === 'string') {
        return prompt.includes(f.promptPattern)
      }
      return f.promptPattern.test(prompt)
    })
  }

  getCallHistory(): LLMCall[] {
    return [...this.callHistory]
  }
}
```

### Example: Simulating Rate Limits

```typescript
class RateLimitMockLLM extends MockLLM {
  private requestCounts: Map<string, number> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(options: MockLLMOptions & {
    windowMs: number
    maxRequests: number
  }) {
    super(options)
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
  }

  async call(prompt: string, context?: CallContext): Promise<LLMResponse> {
    const key = context?.userId ?? 'default'

    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean old entries
    this.pruneOldRequests(key, windowStart)

    const count = this.requestCounts.get(key) ?? 0

    if (count >= this.maxRequests) {
      throw new RateLimitError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded: ${this.maxRequests} requests per ${this.windowMs}ms`,
        retryAfterMs: this.windowMs
      })
    }

    this.requestCounts.set(key, count + 1)
    return super.call(prompt, context)
  }

  private pruneOldRequests(key: string, windowStart: number): void {
    // Implementation to clean expired rate limit counters
  }
}

// Usage in tests
const mockLLM = new RateLimitMockLLM({
  fixtures: [],
  windowMs: 60_000,
  maxRequests: 3,
  onMissingFixture: 'throw'
})

// Test
await expect(
  async () => {
    await mockLLM.call('prompt 1')
    await mockLLM.call('prompt 2')
    await mockLLM.call('prompt 3')
    await mockLLM.call('prompt 4')  // Should throw
  }
).rejects.toThrow(RateLimitError)
```

### Example: Simulating Tool Errors

```typescript
class ToolErrorInjectionMockLLM extends MockLLM {
  private errorInjections: ToolErrorInjection[]

  constructor(options: MockLLMOptions & {
    errorInjections: ToolErrorInjection[]
  }) {
    super(options)
    this.errorInjections = options.errorInjections
  }

  async call(prompt: string, context?: CallContext): Promise<LLMResponse> {
    const toolCall = this.extractToolCall(prompt)

    if (toolCall) {
      const injection = this.findMatchingInjection(toolCall)

      if (injection && this.shouldInject(injection)) {
        // Inject the error into the response
        return this.createErrorResponse(injection, toolCall)
      }
    }

    return super.call(prompt, context)
  }

  private createErrorResponse(
    injection: ToolErrorInjection,
    toolCall: ToolCall
  ): LLMResponse {
    return {
      type: 'tool_result',
      content: [{
        type: 'error',
        toolCallId: toolCall.id,
        error: injection.error
      }]
    }
  }
}

// Usage
const mockLLM = new ToolErrorInjectionMockLLM({
  fixtures: [validResponseFixture],
  errorInjections: [{
    toolName: 'file_read',
    error: { code: 'FILE_NOT_FOUND', message: 'No such file' },
    probability: 1.0  // Always inject for this test
  }]
})
```

---

## Layer 3: Mocking Sub-Agents

In Multi-Agent TDD, sub-agents are mocked to test coordination logic without spawning real agent processes. The primary strategy is **Contract Testing**.

### Contract Testing Strategy

Contract Testing verifies that the calling agent correctly formats requests and handles responses according to the agreed interface.

```
Mock Sub-Agent Contract:
  - Receives: properly formatted task description
  - Returns: structured completion response
  - Handles: timeout, error, cancellation

Contract Test:
  1. Spawn mock sub-agent with known behavior
  2. Call it from the parent agent
  3. Verify request format matches contract
  4. Verify response handling is correct
```

### Mock Sub-Agent API Design

```typescript
interface MockSubAgentOptions<TInput, TOutput> {
  name: string
  behavior: 'resolve' | 'reject' | 'timeout' | 'hang'
  response?: TOutput
  error?: Error | { code: string; message: string }
  latencyMs?: number
  contractValidation?: ContractValidationFn<TInput>
}

interface AgentContract {
  requestFormat: {
    task: string
    context?: Record<string, unknown>
    constraints?: string[]
  }
  responseFormat: {
    status: 'success' | 'failure' | 'timeout'
    result?: unknown
    error?: { code: string; message: string }
    metadata?: {
      durationMs: number
      tokensUsed?: number
    }
  }
}

class MockSubAgent<TInput, TOutput> implements SubAgentInterface {
  private callLog: AgentCall[] = []

  constructor(private options: MockSubAgentOptions<TInput, TOutput>) {}

  async execute(input: TInput): Promise<TOutput> {
    const callRecord: AgentCall = {
      input,
      timestamp: Date.now(),
      status: 'pending'
    }
    this.callLog.push(callRecord)

    // Validate contract if validation function provided
    if (this.options.contractValidation) {
      const validationResult = this.options.contractValidation(input)
      if (!validationResult.valid) {
        throw new ContractViolationError(validationResult.errors)
      }
    }

    // Simulate behavior
    switch (this.options.behavior) {
      case 'resolve':
        if (this.options.latencyMs) {
          await this.simulateLatency(this.options.latencyMs)
        }
        callRecord.status = 'success'
        return this.options.response as TOutput

      case 'reject':
        callRecord.status = 'failure'
        throw this.options.error instanceof Error
          ? this.options.error
          : new Error(this.options.error.message)

      case 'timeout':
        callRecord.status = 'timeout'
        await this.simulateLatency(this.options.latencyMs ?? 30_000)
        throw new TimeoutError('Sub-agent timed out')

      case 'hang':
        return new Promise(() => {})  // Never resolves

      default:
        throw new Error(`Unknown behavior: ${this.options.behavior}`)
    }
  }

  getCallLog(): AgentCall[] {
    return [...this.callLog]
  }

  resetCallLog(): void {
    this.callLog = []
  }
}

// Factory for common mock patterns
function createMockSubAgent<TInput, TOutput>(
  name: string,
  response: TOutput
): MockSubAgent<TInput, TOutput> {
  return new MockSubAgent({
    name,
    behavior: 'resolve',
    response
  })
}

function createErrorMockSubAgent<TInput, TOutput>(
  name: string,
  error: Error
): MockSubAgent<TInput, TOutput> {
  return new MockSubAgent({
    name,
    behavior: 'reject',
    error
  })
}
```

### Example: Timeout Simulation

```typescript
// Test that parent agent handles sub-agent timeout correctly
const timeoutSubAgent = new MockSubAgent<Task, AgentResult>({
  name: 'file-analyzer',
  behavior: 'timeout',
  latencyMs: 100,  // Simulates a slow agent
})

const parentAgent = new ParentAgent({
  subAgents: {
    'file-analyzer': timeoutSubAgent
  },
  timeoutStrategy: 'fail-fast'
})

// Test
const result = await parentAgent.execute({
  task: 'Analyze all files in directory',
  subTasks: [{ agent: 'file-analyzer', task: 'analyze files' }]
})

expect(result.status).toBe('partial_failure')
expect(result.errors).toContainEqual(
  expect.objectContaining({
    agent: 'file-analyzer',
    error: expect.instanceOf(TimeoutError)
  })
)
```

### Example: Parallel Agent Mocking

```typescript
// Mock registry for parallel sub-agent execution
class MockAgentRegistry {
  private agents: Map<string, MockSubAgent<unknown, unknown>> = new Map()
  private executionLog: ParallelExecutionLog[] = []

  register(agent: MockSubAgent<unknown, unknown>): void {
    this.agents.set(agent.options.name, agent)
  }

  async executeParallel(
    requests: Array<{ agentName: string; input: unknown }>
  ): Promise<Array<{ agentName: string; result: unknown; durationMs: number }>> {
    const startTime = Date.now()

    const promises = requests.map(async (req) => {
      const agent = this.agents.get(req.agentName)
      if (!agent) {
        throw new Error(`Agent not found: ${req.agentName}`)
      }

      const agentStart = Date.now()
      const result = await agent.execute(req.input)
      const agentDuration = Date.now() - agentStart

      return {
        agentName: req.agentName,
        result,
        durationMs: agentDuration
      }
    })

    const results = await Promise.all(promises)

    this.executionLog.push({
      timestamp: startTime,
      requests,
      results,
      totalDurationMs: Date.now() - startTime
    })

    return results
  }

  getExecutionLog(): ParallelExecutionLog[] {
    return [...this.executionLog]
  }
}

// Usage
const registry = new MockAgentRegistry()

registry.register(createMockSubAgent('researcher', { data: 'research results' }))
registry.register(createMockSubAgent('coder', { code: 'function example() {}' }))
registry.register(createMockSubAgent('reviewer', { approved: true }))

const results = await registry.executeParallel([
  { agentName: 'researcher', input: { query: 'latest practices' } },
  { agentName: 'coder', input: { task: 'implement feature' } },
  { agentName: 'reviewer', input: { code: 'function example() {}' } }
])

// Verify all executed in parallel (similar start times)
const executionLog = registry.getExecutionLog()
expect(executionLog).toHaveLength(1)
expect(results).toHaveLength(3)
```

---

## Anti-Patterns

### Heavy HTTP Mock Server

Starting a real HTTP server for mocking adds unnecessary overhead and fragility to tests.

```typescript
// ANTI-PATTERN: Heavy HTTP mock server
const server = await TestServer.start({ port: 3001 })
server.mock('/api/llm', { response: 'mocked' })

// Problems:
// - Server startup time (slows tests)
// - Port conflicts
// - Network fragility
// - Hard to simulate complex scenarios

// PREFERRED: In-process mock
const mockLLM = new MockLLM({ fixtures: [...] })
```

### Mocking Content in Multi-Agent Tests

Mocking LLM content in multi-agent tests creates brittle tests that break when prompts change.

```typescript
// ANTI-PATTERN: Mocking LLM content in multi-agent tests
const mockLLM = new MockLLM({
  fixtures: [{
    name: 'agent-response',
    promptPattern: 'You are a helpful assistant',
    response: 'I will analyze the code and provide feedback.'
  }]
})

// Problems:
// - Prompt changes break tests
// - Tests don't verify real behavior
// - Hard to maintain fixtures

// PREFERRED: Use real LLM or mock at the sub-agent interface level
```

### Using Live LLM in Regression

Using a live LLM API in regression tests introduces non-determinism and cost.

```typescript
// ANTI-PATTERN: Live LLM in regression suite
const response = await liveLLM.call('Analyze this code: ' + userCode)

// Problems:
// - Non-deterministic responses
// - API costs accumulate
// - Rate limits cause flaky tests
// - Network dependencies

// PREFERRED: Record & Replay with fixtures
```

---

## Mock vs Real Decision Matrix

Use this matrix to decide when to mock versus use real implementations.

| Component | Test Type | Recommendation | Rationale |
|-----------|-----------|----------------|-----------|
| **Tools** | Unit | Real | Deterministic, no side effects |
| **Tools** | Integration | Real | Verify actual behavior |
| **LLM** | Unit | Mock (Record & Replay) | Deterministic, fast |
| **LLM** | Integration | Real (with rate limiting) | Verify real AI behavior |
| **LLM** | E2E | Real | Full system validation |
| **Sub-Agent** | Unit | Mock | Test coordination only |
| **Sub-Agent** | Integration | Real (or containerized) | Verify agent contracts |
| **Memory** | Any | Mock | External dependency |
| **Persistence** | Unit | Mock | Test logic only |
| **Persistence** | Integration | Real | Verify data operations |

### Decision Criteria

**Use Mock when:**
- Speed is critical (CI pipeline < 10 min target)
- Determinism is required (no flaky tests)
- Cost is a concern (LLM API calls are expensive)
- The mocked component has a stable interface
- You are testing coordination logic, not AI behavior

**Use Real when:**
- You need to verify actual AI behavior
- The interface is unstable (prototyping)
- Integration with external systems must be tested
- Contract verification is required
- End-to-end validation is the goal

### Hybrid Approach

For maximum confidence, combine mock and real testing:

```
CI Pipeline:
  1. Fast unit tests (mocked) → < 5 min
  2. Integration tests (mocked LLM, real tools) → < 5 min
  3. Periodic full validation (real LLM) → Nightly
```

This approach provides rapid feedback during development while maintaining confidence through periodic real validation.
