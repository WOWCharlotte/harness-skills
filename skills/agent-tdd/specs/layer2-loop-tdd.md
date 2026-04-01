# Layer 2: Harness Loop TDD — Detailed Specification

**Status:** Approved
**Layer:** 2 of 3
**Purpose:** Test-driven development for the Harness Core loop — ensuring session persistence, message immutability, permission enforcement, and retry backoff.

---

## Core Challenge

LLM output is non-deterministic. The same input prompt can produce different `tool_calls` across runs due to temperature, sampling, and model internal randomness. This makes traditional TDD problematic:

- **Same input** → **Different outputs** each run
- A test written against today's LLM output will fail tomorrow
- Snapshot tests become flaky and erode trust in the test suite

### Strategy: Record & Replay

Mock the LLM at the harness boundary. Record a "golden response" once with a live LLM, then replay that exact fixture for all subsequent test runs.

```
Live LLM (Record) → Golden Fixture → Mock LLM (Replay) → Deterministic Tests
```

---

## Test Structure: Record & Replay Pattern

### Phase 1: Record Golden Response (One-Time Setup)

```typescript
// test/harness/record-golden.test.ts
describe('Harness Loop - Record Golden Response', () => {
  it('records golden response for session persistence scenario', async () => {
    // Arrange: Live LLM with controlled input
    const harness = await Harness.create({
      llm: new LiveLLM({ model: 'claude-3-5-sonnet', temperature: 0 }),
      tools: [ReadSessionTool, WriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });

    const input = {
      messages: [
        { role: 'user', content: 'Create a new session named test-session' }
      ],
      sessionId: null
    };

    // Act: Single live call to LLM
    const response = await harness.run(input);

    // Assert: Record the golden fixture
    const fixture = {
      input,
      output: response,
      timestamp: new Date().toISOString()
    };

    // Save to fixture file (manual once, then committed to repo)
    await saveFixture('session-persistence.json', fixture);

    // Verify structure matches expectations
    expect(response.tool_calls).toBeDefined();
    expect(response.messages).toHaveLength(2);
  });
});
```

### Phase 2: Replay with Mock LLM (Deterministic Tests)

```typescript
// test/harness/harness-loop.test.ts
describe('Harness Loop TDD', () => {
  let harness: Harness;
  let mockLlm: MockLLM;

  beforeEach(async () => {
    const fixture = await loadFixture('session-persistence.json');
    mockLlm = new MockLLM(fixture.output);
    harness = await Harness.create({
      llm: mockLlm,
      tools: [ReadSessionTool, WriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });
  });

  it('replays golden response without calling live LLM', async () => {
    const input = {
      messages: [{ role: 'user', content: 'Create a new session named test-session' }],
      sessionId: null
    };

    const response = await harness.run(input);

    expect(mockLlm.callCount).toBe(0); // No live calls
    expect(response.messages).toHaveLength(2);
  });
});
```

### Phase 3: Refactor Code (Preserve Fixture)

```typescript
// Same fixture file: session-persistence.json
// Refactored harness implementation
describe('Harness Loop TDD - Refactored', () => {
  let harness: Harness;
  let mockLlm: MockLLM;

  beforeEach(async () => {
    const fixture = await loadFixture('session-persistence.json');
    mockLlm = new MockLLM(fixture.output);
    harness = await Harness.create({
      llm: mockLlm,
      tools: [RefactoredReadSessionTool, RefactoredWriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });
  });

  it('refactored implementation produces equivalent output', async () => {
    const input = {
      messages: [{ role: 'user', content: 'Create a new session named test-session' }],
      sessionId: null
    };

    const response = await harness.run(input);

    expect(response.messages).toEqual(fixture.output.messages);
    expect(response.tool_calls).toEqual(fixture.output.tool_calls);
  });
});
```

---

## Four Harness Loop Test Scenarios

### Scenario 1: Session Persistence

**Behavior:** Session must survive create → save → load cycles and remain equivalent.

```typescript
describe('Session Persistence', () => {
  let harness: Harness;
  let mockLlm: MockLLM;

  beforeEach(async () => {
    const fixture = await loadFixture('session-persistence.json');
    mockLlm = new MockLLM(fixture.output);
    harness = await Harness.create({
      llm: mockLlm,
      tools: [ReadSessionTool, WriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });
  });

  it('create session → save → load → equivalent state', async () => {
    // Step 1: Create session
    const session = await harness.createSession({ name: 'test-session' });
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeInstanceOf(Date);

    // Step 2: Save session (append message to session store)
    const savedSession = await harness.saveSession(session);
    expect(savedSession.messages).toHaveLength(1);

    // Step 3: Load session from store
    const loadedSession = await harness.loadSession(savedSession.id);

    // Step 4: Verify equivalence
    expect(loadedSession.id).toEqual(session.id);
    expect(loadedSession.name).toEqual(session.name);
    expect(loadedSession.messages).toEqual(session.messages);
    expect(loadedSession.createdAt).toEqual(session.createdAt);
  });

  it('multiple sessions remain isolated', async () => {
    const sessionA = await harness.createSession({ name: 'session-a' });
    const sessionB = await harness.createSession({ name: 'session-b' });

    await harness.saveSession(sessionA);
    await harness.saveSession(sessionB);

    const loadedA = await harness.loadSession(sessionA.id);
    const loadedB = await harness.loadSession(sessionB.id);

    expect(loadedA.name).toEqual('session-a');
    expect(loadedB.name).toEqual('session-b');
    expect(loadedA.id).not.toEqual(loadedB.id);
  });
});
```

**Golden Fixture Example: `fixtures/session-persistence.json`**

```json
{
  "scenario": "session-persistence",
  "description": "Create session, save, load yields equivalent state",
  "input": {
    "messages": [
      { "role": "user", "content": "Create a new session" }
    ],
    "sessionId": null
  },
  "output": {
    "messages": [
      { "role": "user", "content": "Create a new session" },
      { "role": "assistant", "content": "Session created successfully", "tool_calls": [
        {
          "name": "WriteSession",
          "arguments": { "sessionId": "sess_abc123", "name": "test-session" }
        }
      ]}
    ]
  },
  "timestamp": "2026-04-01T00:00:00.000Z"
}
```

---

### Scenario 2: Message Immutability

**Behavior:** Messages are append-only. Once added, never mutated in-place.

```typescript
describe('Message Immutability', () => {
  let harness: Harness;
  let mockLlm: MockLLM;

  beforeEach(async () => {
    const fixture = await loadFixture('message-immutability.json');
    mockLlm = new MockLLM(fixture.output);
    harness = await Harness.create({
      llm: mockLlm,
      tools: [ReadSessionTool, WriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });
  });

  it('messages are append-only, never mutated', async () => {
    const session = await harness.createSession({ name: 'immutability-test' });

    // Capture original message reference
    const originalMessageCount = session.messages.length;
    const originalMessages = [...session.messages]; // Clone for comparison

    // Run a turn that would normally mutate
    await harness.run({
      messages: [...session.messages, { role: 'user', content: 'Update my message' }],
      sessionId: session.id
    });

    // Reload session
    const reloaded = await harness.loadSession(session.id);

    // Original messages unchanged
    expect(reloaded.messages).toHaveLength(originalMessageCount + 1); // Append only
    expect(reloaded.messages[0]).toEqual(originalMessages[0]); // First message unchanged
  });

  it('rejects in-place message editing', async () => {
    const session = await harness.createSession({ name: 'immutability-test' });

    // Attempt to mutate existing message
    const mutatedMessages = session.messages.map((msg, i) =>
      i === 0 ? { ...msg, content: 'TAMPERED' } : msg
    );

    // Should throw or reject mutation attempt
    await expect(async () => {
      await harness.saveSession({
        ...session,
        messages: mutatedMessages
      });
    }).rejects.toThrow(/immutable|cannot modify|read-only/i);
  });

  it('session snapshot preserves point-in-time state', async () => {
    const session = await harness.createSession({ name: 'snapshot-test' });

    const snapshot1 = await harness.snapshotSession(session.id);

    await harness.run({
      messages: [...session.messages, { role: 'user', content: 'New message' }],
      sessionId: session.id
    });

    const snapshot2 = await harness.snapshotSession(session.id);

    // Snapshots differ at specific points
    expect(snapshot1.messages.length).toBeLessThan(snapshot2.messages.length);
    expect(snapshot1.timestamp).toBeBefore(snapshot2.timestamp);
  });
});
```

---

### Scenario 3: Permission Enforcement

**Behavior:** ReadOnly + DangerFullAccess tool → Error. Permissions checked before tool execution.

```typescript
describe('Permission Enforcement', () => {
  let harness: Harness;
  let mockLlm: MockLLM;

  beforeEach(async () => {
    const fixture = await loadFixture('permission-enforcement.json');
    mockLlm = new MockLLM(fixture.output);
    harness = await Harness.create({
      llm: mockLlm,
      tools: [ReadSessionTool, WriteSessionTool, BashTool, DangerFullAccessTool],
      permissions: new PermissionSet(['session:read']) // ReadOnly - no write, no bash, no danger
    });
  });

  it('ReadOnly + BashTool → PermissionError', async () => {
    const session = await harness.createSession({ name: 'permission-test' });

    // LLM requests bash tool (from golden fixture)
    const response = await harness.run({
      messages: [
        ...session.messages,
        { role: 'user', content: 'Run rm -rf /' }
      ],
      sessionId: session.id
    });

    // Permission error should be in response
    expect(response.error).toBeDefined();
    expect(response.error.code).toEqual('PERMISSION_DENIED');
    expect(response.error.required).toContain('bash:execute');
  });

  it('ReadOnly + DangerFullAccessTool → PermissionError', async () => {
    const session = await harness.createSession({ name: 'permission-test' });

    // Attempt to use DangerFullAccess tool
    await expect(async () => {
      await harness.executeTool({
        name: 'DangerFullAccess',
        arguments: { dangerousAction: true },
        sessionId: session.id
      });
    }).rejects.toThrow('PERMISSION_DENIED: requires danger:full-access');
  });

  it('sufficient permissions allows tool execution', async () => {
    const fixture = await loadFixture('permission-enforcement.json');
    const mockLlm = new MockLLM(fixture.output);

    const privilegedHarness = await Harness.create({
      llm: mockLlm,
      tools: [ReadSessionTool, WriteSessionTool, BashTool],
      permissions: new PermissionSet(['session:read', 'session:write', 'bash:execute'])
    });

    const session = await privilegedHarness.createSession({ name: 'privileged-test' });

    // Should not throw
    const response = await privilegedHarness.run({
      messages: [
        ...session.messages,
        { role: 'user', content: 'List files' }
      ],
      sessionId: session.id
    });

    expect(response.error).toBeUndefined();
  });
});
```

---

### Scenario 4: Retry Backoff

**Behavior:** HTTP 429 triggers exponential backoff retry. Max 5 retries with jitter.

```typescript
describe('Retry Backoff', () => {
  let harness: Harness;
  let mockLlm: MockLLM;
  let mockHttpClient: MockHttpClient;

  beforeEach(async () => {
    const fixture = await loadFixture('retry-backoff.json');
    mockLlm = new MockLLM(fixture.output);
    mockHttpClient = new MockHttpClient();
    harness = await Harness.create({
      llm: mockLlm,
      httpClient: mockHttpClient,
      tools: [ReadSessionTool, WriteSessionTool],
      permissions: new PermissionSet(['session:read', 'session:write'])
    });
  });

  it('429 triggers exponential backoff retry', async () => {
    let attempt = 0;
    const delays: number[] = [];

    mockHttpClient.mock(async (request) => {
      attempt++;
      const start = Date.now();

      if (attempt < 4) {
        return {
          status: 429,
          headers: { 'retry-after': '1' },
          body: { error: 'Rate limited' }
        };
      }

      delays.push(Date.now() - start);
      return { status: 200, body: { success: true } };
    });

    const startTime = Date.now();
    const response = await harness.run({
      messages: [{ role: 'user', content: 'Test retry' }],
      sessionId: null
    });

    expect(attempt).toBeGreaterThanOrEqual(4); // Initial + 3 retries
    expect(response.success).toBe(true);

    // Verify exponential growth in delays
    const totalDelay = Date.now() - startTime;
    expect(totalDelay).toBeGreaterThan(1000); // At least 1 second total backoff
  });

  it('cumulative delay matches exponential backoff formula', async () => {
    const retryDelays: number[] = [];
    let attempt = 0;

    mockHttpClient.mock(async (request) => {
      attempt++;

      if (attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
        retryDelays.push(delay);
        return {
          status: 429,
          headers: { 'retry-after': String(delay / 1000) },
          body: { error: 'Rate limited' }
        };
      }

      return { status: 200, body: { success: true } };
    });

    await harness.run({
      messages: [{ role: 'user', content: 'Test exponential backoff' }],
      sessionId: null
    });

    // Verify exponential growth
    expect(retryDelays[1]).toBeGreaterThan(retryDelays[0]);
    expect(retryDelays.length).toBe(2);
  });

  it('max retries exceeded → throw MaxRetriesExceededError', async () => {
    // Always return 429
    mockHttpClient.mock(() => ({
      status: 429,
      headers: { 'retry-after': '1' },
      body: { error: 'Rate limited' }
    }));

    await expect(async () => {
      await harness.run({
        messages: [{ role: 'user', content: 'Test max retries' }],
        sessionId: null,
        maxRetries: 3
      });
    }).rejects.toThrow(/max retries|retries exceeded/i);
  });
});
```

---

## Golden Response Fixtures

### Recording Process

1. **Identify Scenario**: Determine which harness behavior needs testing
2. **Create Record Test**: Write a test with `LiveLLM` that exercises the scenario
3. **Run Record Test**: Execute against actual LLM API (requires valid API key)
4. **Save Fixture**: Manually copy output to `fixtures/<scenario>.json`
5. **Commit Fixture**: Add fixture to version control
6. **Create Replay Test**: Write tests using `MockLLM` with the fixture

### Fixture File Format

```json
{
  "scenario": "string (unique identifier)",
  "description": "string (what this fixture tests)",
  "version": "string (semver for fixture format)",
  "input": {
    "messages": "Message[] (exact input to harness)",
    "sessionId": "string | null",
    "tools": "string[] (available tools)",
    "permissions": "string[] (granted permissions)"
  },
  "output": {
    "messages": "Message[] (expected output messages)",
    "tool_calls": "ToolCall[] (expected LLM tool calls)",
    "error": "Error | null (expected error if any)"
  },
  "metadata": {
    "model": "string (LLM model used)",
    "temperature": "number",
    "recordedAt": "ISO timestamp",
    "recordedBy": "string (git username)"
  }
}
```

### Fixture File Location

```
skills/agent-tdd/
├── specs/
│   └── layer2-loop-tdd.md
├── fixtures/
│   ├── session-persistence.json
│   ├── message-immutability.json
│   ├── permission-enforcement.json
│   └── retry-backoff.json
└── tests/
    └── harness/
        ├── harness-loop.test.ts
        └── fixtures/
```

---

## RED → GREEN → REFACTOR Workflow

### Phase 1: RED (Write Failing Test)

```typescript
// test/harness/harness-loop.test.ts
describe('Harness Loop TDD', () => {
  it('should retry on 429 with exponential backoff', async () => {
    // Arrange: Mock HTTP that returns 429
    const mockHttp = new MockHttpClient();
    mockHttp.mock(() => ({ status: 429, body: { error: 'Rate limited' } }));

    const harness = new Harness({
      llm: new MockLLM(/* fixture */),
      httpClient: mockHttp
    });

    // Act & Assert: Should retry and eventually succeed
    const response = await harness.run({ messages: [], sessionId: null });

    expect(response.success).toBe(true);
    expect(mockHttp.callCount).toBeGreaterThan(1);
  });
});

// Run: npm test → FAIL (no implementation)
```

### Phase 2: GREEN (Minimal Implementation)

```typescript
// src/harness/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; backoffMs: number }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isRateLimited(error) && attempt < options.maxRetries) {
        const delay = options.backoffMs * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Run: npm test → PASS
```

### Phase 3: REFACTOR (Improve Implementation)

```typescript
// Refactored with jitter, configurable backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isRateLimited(error) && attempt < options.maxRetries) {
        const baseDelay = options.backoffMs * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelay * 0.1;
        await sleep(baseDelay + jitter);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Same test, same fixture → still passes
// Run: npm test → PASS
```

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

```
┌─────────────────────────────────────────────────────────┐
│                   Layer 3: Agent TDD                    │
│         (Integration tests, E2E scenarios)              │
└─────────────────────┬───────────────────────────────────┘
                      │ depends on
┌─────────────────────┴───────────────────────────────────┐
│                   Layer 2: Loop TDD                      │
│     (This spec) - Harness core behavior tests           │
│                                                         │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │  Session    │ │   Message    │ │  Permission       │  │
│  │  Persistence│ │  Immutability│ │  Enforcement      │  │
│  └─────────────┘ └──────────────┘ └──────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Retry Backoff                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ depends on
┌─────────────────────┴───────────────────────────────────┐
│                   Layer 1: Tools TDD                     │
│        (Tool behavior, permission definitions)          │
└─────────────────────────────────────────────────────────┘
```

**Dependencies:**
- **Loop TDD** (this layer) requires **Tools TDD** (Layer 1) to define:
  - Tool schemas for `ReadSession`, `WriteSession`, `Bash`, `DangerFullAccess`
  - Permission constants like `session:read`, `session:write`, `bash:execute`
  - Error types for `PERMISSION_DENIED`, `TOOL_NOT_FOUND`

**Loop TDD provides** to **Agent TDD** (Layer 3):
- Verified harness core behavior
- Deterministic test infrastructure
- Reusable fixtures for integration scenarios
