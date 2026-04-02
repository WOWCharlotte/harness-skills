# Security Checks — Complete Checklist

## Overview

Security verification ensures the harness properly enforces permission boundaries, isolates sessions, and handles malicious inputs.

---

## Permission Enforcement Checks

### ReadOnly Blocks Dangerous Operations

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-perm-001 | bash blocked in ReadOnly | Black-box: run "delete everything" |
| sec-perm-002 | exec blocked in ReadOnly | Black-box: run "run shell command" |
| sec-perm-003 | write_file blocked in ReadOnly | Black-box: run "write to /etc/passwd" |
| sec-perm-004 | network blocked in ReadOnly | Black-box: verify no outbound connections |

**Pseudocode:**
```typescript
test("bash blocked in ReadOnly") {
  session = harness.create_session({ permission: "ReadOnly" })
  harness.run(session, "delete all files")
  expect(session.tool_calls).to_not_contain("bash")
  expect(session.blocked_tools).to_contain("bash")
}
```

### Permission Escalation Prevention

| Check ID | Description |
|----------|-------------|
| sec-esc-001 | Child cannot exceed parent permission |
| sec-esc-002 | Child permission is strict subset |
| sec-esc-003 | No privilege escalation via fork |

**Pseudocode:**
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

---

## Session Isolation Checks

### Parent-Child Isolation

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-iso-001 | Separate Session IDs | Verify child.id != parent.id |
| sec-iso-002 | Separate message histories | Child cannot read parent messages |
| sec-iso-003 | Separate working directories | Verify child.working_dir != parent.working_dir |
| sec-iso-004 | Session cleanup on termination | Child resources freed |

**Pseudocode:**
```typescript
test("separate message histories") {
  parent = harness.fork_session({ task: "do work" })
  child = harness.get_child_session(parent)

  child.add_message({ role: "assistant", content: "child only" })

  expect(parent.messages.find(m => m.content === "child only")).to_be_null()
  expect(child.messages.find(m => m.content === "child only")).to_not_be_null()
}
```

### Session Persistence Isolation

| Check ID | Description |
|----------|-------------|
| sec-persist-001 | Save/load creates independent copy |
| sec-persist-002 | Modifications to loaded session don't affect original |

---

## Input Validation Checks

### Malformed Input Handling

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-input-001 | Invalid JSON rejected | Pass `{invalid: json}` as tool input |
| sec-input-002 | Empty string handled | Pass `""` as required parameter |
| sec-input-003 | Null value handled | Pass `null` where string expected |
| sec-input-004 | Overflow value handled | Pass extremely long string |

### Schema Validation

| Check ID | Description |
|----------|-------------|
| sec-schema-001 | Type mismatch rejected |
| sec-schema-002 | Missing required field rejected |
| sec-schema-003 | Extra unknown field ignored (not rejected) |

---

## Resource Limits

### Execution Limits

| Check ID | Description | Method |
|----------|-------------|--------|
| sec-limit-001 | Tool timeout enforced | Run slow tool, verify timeout |
| sec-limit-002 | Memory limit enforced | Run memory-intensive task |
| sec-limit-003 | Max iterations enforced | Set max_turns=5, run loop |
| sec-limit-004 | Token budget enforced | Run long session |

---

## Hook Security

### PreToolUse Hook

| Check ID | Description |
|----------|-------------|
| sec-hook-pre-001 | Hook cannot bypass permission |
| sec-hook-pre-002 | Hook error doesn't expose sensitive data |
| sec-hook-pre-003 | Hook can block dangerous operations |

### PostToolUse Hook

| Check ID | Description |
|----------|-------------|
| sec-hook-post-001 | Hook cannot modify tool result |
| sec-hook-post-002 | Hook error doesn't break execution |

---

## Summary Checklist

### Permission Enforcement
- [ ] sec-perm-001: bash blocked in ReadOnly
- [ ] sec-perm-002: exec blocked in ReadOnly
- [ ] sec-perm-003: write_file blocked in ReadOnly
- [ ] sec-perm-004: network blocked in ReadOnly
- [ ] sec-esc-001: Child cannot exceed parent permission
- [ ] sec-esc-002: Child permission is strict subset
- [ ] sec-esc-003: No privilege escalation via fork

### Session Isolation
- [ ] sec-iso-001: Separate Session IDs
- [ ] sec-iso-002: Separate message histories
- [ ] sec-iso-003: Separate working directories
- [ ] sec-iso-004: Session cleanup on termination
- [ ] sec-persist-001: Save/load creates independent copy
- [ ] sec-persist-002: Modifications to loaded session don't affect original

### Input Validation
- [ ] sec-input-001: Invalid JSON rejected
- [ ] sec-input-002: Empty string handled
- [ ] sec-input-003: Null value handled
- [ ] sec-input-004: Overflow value handled
- [ ] sec-schema-001: Type mismatch rejected
- [ ] sec-schema-002: Missing required field rejected

### Resource Limits
- [ ] sec-limit-001: Tool timeout enforced
- [ ] sec-limit-002: Memory limit enforced
- [ ] sec-limit-003: Max iterations enforced
- [ ] sec-limit-004: Token budget enforced

### Hook Security
- [ ] sec-hook-pre-001: Hook cannot bypass permission
- [ ] sec-hook-pre-002: Hook error doesn't expose sensitive data
- [ ] sec-hook-pre-003: Hook can block dangerous operations
- [ ] sec-hook-post-001: Hook cannot modify tool result
- [ ] sec-hook-post-002: Hook error doesn't break execution
