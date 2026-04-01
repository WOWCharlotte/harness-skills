# Layer 1: Tools TDD — Detailed Specification

**Status:** Approved
**Layer:** 1 of 3
**Purpose:** Test-driven development for the Tool System layer — ensuring correct tool selection, schema validation, and permission enforcement.

## Core Challenge

Agent tool selection is determined by LLM prompt. Same input, different prompt = different tool choice.

**Test strategy:** Fix the prompt, verify correct tool is called.

```
User input: "show me foo.txt"
├── Prompt A (tool description vague) → wrong tool chosen
└── Prompt B (tool description precise) → read_file chosen
```

The core problem is **prompt stability**: the same natural language request must reliably map to the same tool across multiple LLM calls. Tests must lock the prompt (via seed or recorded version) so that tool selection is deterministic and verifiable.

## Test Structure

The RED → GREEN → REFACTOR pattern for tool selection:

```typescript
describe("Tool Selection TDD") {
  // RED: Write a test that fails — proves the tool is NOT being selected correctly
  test("read_file chosen for 'show me foo.txt'", () => {
    given_prompt(system_prompt)
    when_agent_receives("show me foo.txt")
    then_tool_called("read_file")
  })

  // GREEN: Adjust prompt until test passes
  // REFACTOR: Simplify prompt while keeping test green
}
```

### Test Anatomy

| Phase | Purpose | Action |
|-------|---------|--------|
| **RED** | Prove current behavior is wrong | Write failing test |
| **GREEN** | Make test pass with minimal change | Update prompt or tool description |
| **REFACTOR** | Simplify without changing behavior | Reduce prompt complexity, keep test green |

## Three Tool Test Scenarios

### 1. Schema Validation

Tool rejects invalid input that does not match its input_schema.

```typescript
describe("Schema Validation") {
  // RED: Tool should reject malformed input
  test("read_file rejects missing required 'file_path' field", () => {
    const invalidInput = { offset: 10 }  // missing file_path

    const result = read_file(invalidInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain("file_path")
  })

  // RED: Tool should reject wrong type
  test("read_file rejects non-string 'file_path'", () => {
    const invalidInput = { file_path: 12345 }

    const result = read_file(invalidInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain("string")
  })
}
```

**Implementation guidance:** Each tool's `input_schema` (JSON Schema or Zod) must have a corresponding RED test proving validation actually rejects invalid payloads.

### 2. Permission Selection

Tool blocked when session lacks required permission.

```typescript
describe("Permission Selection") {
  const noWritePermission = { session: { permissions: ["read"] } }

  // RED: Write operation must be blocked without write permission
  test("write_file blocked when session lacks write permission", () => {
    const session = createSession({ permissions: ["read"] })
    const input = { file_path: "/protected/test.txt", content: "secret" }

    const result = write_file(session, input)

    expect(result.success).toBe(false)
    expect(result.error).toContain("permission")
  })

  // RED: Read operation allowed with read permission
  test("read_file allowed when session has read permission", () => {
    const session = createSession({ permissions: ["read"] })
    const input = { file_path: "/allowed/test.txt" }

    const result = read_file(session, input)

    expect(result.success).toBe(true)
  })
}
```

**Implementation guidance:** Permission boundaries must be tested RED first — privileged operations must provably fail without the right permission in session context.

### 3. Tool Description Quality

Right tool selected / wrong tool rejected based on tool descriptions in prompt.

```typescript
describe("Tool Description Quality") {
  // RED: Precise description leads to correct tool
  test("read_file selected over write_file for 'show me foo.txt'", () => {
    const prompt = buildPrompt({
      system: "You have these tools: read_file, write_file, bash...",
      tools: [
        { name: "read_file", description: "Read contents of a file from disk" },
        { name: "write_file", description: "Write content to a file on disk" }
      ]
    })

    when_agent_receives("show me foo.txt", prompt)

    then_tool_called("read_file")
  })

  // RED: Ambiguous description causes wrong tool — test proves description gap
  test("write_file rejected for 'make a file' when description is vague", () => {
    const prompt = buildPrompt({
      system: "You have these tools: read_file, write_file...",
      tools: [
        { name: "read_file", description: "Read a file" },
        { name: "write_file", description: "Do something with a file" }  // vague
      ]
    })

    when_agent_receives("make a file called foo.txt", prompt)

    then_tool_not_called("write_file")  // expected to fail with vague description
  })
}
```

**Implementation guidance:** Tool description quality is verified behaviorally — a tool must be selected when its description is most accurate and rejected when a different tool's description is more accurate.

## RED → GREEN → REFACTOR Workflow

### Phase 1: RED (Write Failing Test)

1. Identify the tool behavior to specify
2. Write test that **proves current behavior is incorrect**
3. Run test — it must **fail**
4. Do not write implementation yet

```typescript
// Example: File existence check before read
test("read_file fails gracefully when file does not exist", () => {
  const input = { file_path: "/nonexistent/file.txt" }

  const result = read_file(input)

  expect(result.success).toBe(false)
  expect(result.error).toContain("not found")
})
```

### Phase 2: GREEN (Make Test Pass)

1. Make **minimal** change to pass the test
2. Change prompt, tool description, or tool implementation
3. Run test — it must **pass**
4. Only one green at a time (serial, not parallel)

```typescript
// Minimal fix: add error handling to read_file tool
function read_file(input: { file_path: string }) {
  if (!fs.existsSync(input.file_path)) {
    return { success: false, error: "File not found" }
  }
  return { success: true, content: fs.readFileSync(input.file_path) }
}
```

### Phase 3: REFACTOR (Simplify)

1. Keep test green
2. Simplify: reduce prompt tokens, remove redundancy, improve clarity
3. Re-run tests to ensure behavior unchanged
4. Document simplification rationale

```typescript
// Before refactor (10 tools, verbose descriptions)
// After refactor (same 10 tools, concise descriptions, tests still green)
```

## Engineering Checklist

- [ ] Every tool's `input_schema` has a corresponding RED test
- [ ] Permission boundaries have RED tests (privileged operations must be blocked)
- [ ] Tool description quality has behavior tests (right tool selected / wrong tool rejected)
- [ ] Tests use fixed seed or recorded prompt version
- [ ] Schema validation tests cover: missing required fields, wrong types, out-of-range values
- [ ] Permission tests cover: granted, denied, and missing permission cases
- [ ] Tool selection tests cover: correct tool selected, incorrect tool rejected

## Example: Full Tool TDD Cycle

Complete cycle demonstrating RED → GREEN → REFACTOR:

```typescript
describe("Agent TDD: read_file Tool", () => {

  // ============== RED PHASE ==============
  describe("RED: Define expected behavior", () => {
    test("read_file succeeds when file exists", () => {
      const input = { file_path: "/test/existing.txt" }
      const result = read_file(input)
      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
    })

    test("read_file fails when file does not exist", () => {
      const input = { file_path: "/test/nonexistent.txt" }
      const result = read_file(input)
      expect(result.success).toBe(false)
      expect(result.error).toContain("not found")
    })

    test("read_file fails when file_path is missing", () => {
      const input = {}
      const result = read_file(input)
      expect(result.success).toBe(false)
      expect(result.error).toContain("file_path")
    })
  })

  // ============== GREEN PHASE ==============
  describe("GREEN: Minimal implementation", () => {
    // Implementation that passes all RED tests:
    function read_file(input: { file_path?: string; offset?: number; limit?: number }) {
      if (!input.file_path) {
        return { success: false, error: "file_path is required" }
      }
      if (!fs.existsSync(input.file_path)) {
        return { success: false, error: "File not found" }
      }
      const content = fs.readFileSync(input.file_path, "utf-8")
      const offset = input.offset ?? 0
      const limit = input.limit ?? content.length
      return { success: true, content: content.slice(offset, offset + limit) }
    }
  })

  // ============== REFACTOR PHASE ==============
  describe("REFACTOR: Simplify with confidence", () => {
    test("offset and limit are optional — test still passes", () => {
      const input = { file_path: "/test/existing.txt" }
      const result = read_file(input)
      expect(result.success).toBe(true)
    })

    test("reads full file when no limit specified — test still passes", () => {
      const input = { file_path: "/test/existing.txt", offset: 0 }
      const result = read_file(input)
      expect(result.content).toBeDefined()
    })
  })
})
```

**Cycle summary:**
1. **RED** writes 3 tests that define correct behavior
2. **GREEN** implements minimal code to pass all 3 tests
3. **REFACTOR** adds 2 additional tests for optional parameters without breaking existing tests
4. All 5 tests remain green — behavior verified

## Relationship to Other Layers

Layer 1 (Tools TDD) tests **Layer 2 of harness architecture** (the Tool System layer).

```
Layer 1: Tools TDD
├── Validates: input_schema enforcement
├── Validates: permission boundaries
├── Validates: tool description quality
└── Mocks: LLM prompt (fixed seed)

Layer 2: Tool System (harness architecture)
├── Tool registry
├── Schema validation engine
├── Permission guard
└── Prompt builder

Layer 3: Agent Integration TDD
├── Full prompt rendering
├── Multi-tool orchestration
└── Context accumulation
```

**Key distinction:** Layer 1 tests individual tool correctness in isolation. Layer 3 tests how tools work together within agent context.

Layer 1 tests use **mocked or fixed prompts** so tool selection is deterministic. Layer 3 uses **real prompt rendering** to verify end-to-end behavior.
