# Layer 0: System Prompt Architecture — Detailed Specification

**Status:** Draft
**Layer:** 0 of 4 (Foundation)
**Purpose:** Define system prompt design principles that guide agent behavior — tool usage patterns, task execution workflow, fork/subagent patterns, context management, security monitoring, and hooks configuration.

---

## Overview

System Prompt Architecture is the foundational layer that defines HOW the agent should behave. While Layers 1-4 define the runtime engine (loop, tools, hooks, multi-agent), Layer 0 defines the instructions that drive that engine.

A well-designed system prompt ensures:
- Consistent tool usage patterns
- Safe and effective task execution
- Proper context management
- Security monitoring integration
- Hook-based extensibility

## 1. Tool Usage Patterns

### 1.1 Core Tool Categories

| Category | Tools | Permission Level | Usage Guidelines |
|----------|-------|------------------|-------------------|
| File Reading | `read_file`, `glob`, `grep` | ReadOnly | Prefer Read over cat/head/tail |
| File Writing | `write_file`, `edit_file` | WorkspaceWrite | Validate paths, preserve existing content when editing |
| Shell Execution | `bash`, `shell` | DangerFullAccess | Always set timeout, prefer specific commands over general |
| Task Management | `TaskCreate`, `TodoWrite`, `TaskGet` | WorkspaceWrite | Use for tracking multi-step work |

### 1.2 Tool Selection Principles

1. **Prefer specific over general** — Use `grep_search` over `bash` with grep pipeline
2. **Read before modifying** — Always read existing files before suggesting changes
3. **Tool timeout required** — All bash commands must have timeout consideration
4. **Permission boundaries** — File operations must respect permission model

### 1.3 Error Handling Patterns

```
Tool Error Response {
  is_error: true,
  message: "Descriptive error explaining what went wrong",
  // Never expose raw stack traces or system paths
}
```

When a tool fails:
1. Log the error with sufficient detail for debugging
2. Return structured error to LLM (not raw exception)
3. Suggest alternative approach if possible

## 2. Task Execution Workflow

### 2.1 Standard Workflow (simplify → test → e2e → commit → PR)

Every task implementation follows this sequence:

```
1. Simplify — Review and clean up changes before committing
2. Unit Tests — Run project's test suite (npm test, pytest, go test, etc.)
3. E2E Tests — Follow project-specific end-to-end test recipe
4. Commit — Clear, descriptive commit message
5. Push & PR — Push branch, create PR with gh pr create
```

### 2.2 Task Classification

| Task Type | Approach |
|-----------|----------|
| Bug Fix | Reproduce → Fix → Test → Verify |
| New Feature | Design → Implement → Test → Document |
| Refactor | Analyze → Plan → Execute → Verify |
| Research | Explore → Summarize → Validate |

### 2.3 Execution Principles

1. **Act without asking** — For routine decisions, make reasonable assumptions
2. **Prefer action over planning** — Start coding unless explicitly asked for plan
3. **Course corrections welcome** — User feedback is normal input

## 3. Fork & Subagent Patterns

### 3.1 When to Fork

**Fork (lightweight, context-sharing):**
- Research tasks with independent questions
- Implementation requiring multiple edits
- Parallel exploration of alternatives

**Subagent (heavyweight, isolated):**
- Complex tasks needing full isolation
- Different model requirements
- Long-running tasks that shouldn't pollute main context

### 3.2 Fork Rules

| Rule | Rationale |
|------|-----------|
| Don't peek | Trust completion notification; reading mid-flight pollutes context |
| Don't race | Never predict or fabricate fork results |
| Don't set model | Different model can't reuse parent's cache |
| Pass short name | Enable user steering via teams panel |

### 3.3 Subagent Prompt Guidelines

**Context-inheriting subagents:**
- Directive prompt: what to do, not what's the situation
- Be specific about scope: what's in, what's out
- Don't re-explain background already in context

**Fresh subagents:**
- Include full context needed
- State assumptions explicitly
- Provide all relevant files/paths

## 4. Context Compaction

### 4.1 When to Compact

Compact context at logical intervals:
- After completing a task phase
- Before starting a new significant task
- When context reaches 60-70% capacity

### 4.2 Structured Summary Format

```markdown
<summary>
## Task Overview
- User's core request and success criteria
- Any clarifications or constraints specified

## Current State
- What has been completed (files, modifications)
- Key outputs or artifacts produced

## Important Discoveries
- Technical constraints uncovered
- Decisions made and rationale
- Errors encountered and resolutions
- Approaches that didn't work (and why)

## Next Steps
- Specific actions needed to complete
- Blockers or open questions
- Priority order

## Context to Preserve
- User preferences or style requirements
- Domain-specific details
- Promises made to the user
</summary>
```

### 4.3 Compaction Principles

1. **Concise but complete** — Include info that prevents duplicate work
2. **Actionable** — Enable immediate resumption
3. **Preserve decisions** — Document rationale, not just outcomes

## 5. Security Monitoring

### 5.1 Pre-Tool-Use Checks

Before any tool execution, validate:

| Check | Tool Types | Validation |
|-------|------------|------------|
| Permission | All | Verify tool is allowed under current permission mode |
| Input Schema | All | Validate tool input against schema |
| Path Traversal | File ops | Ensure paths don't escape workspace |
| Shell Injection | bash | Sanitize command arguments |
| Secret Exposure | All | Never log or expose credentials |

### 5.2 Security Principles

1. **No injection vulnerabilities** — Sanitize all user-controlled input
2. **Principle of least privilege** — Request only needed permissions
3. **Audit trail** — Log all tool executions with inputs/outputs
4. **Fail securely** — Deny by default, allow by exception

### 5.3 Common Vulnerability Prevention

| Vulnerability | Prevention |
|--------------|------------|
| Command Injection | Never pass unsanitized input to shell |
| XSS | Sanitize HTML in web content |
| SQL Injection | Use parameterized queries |
| Path Traversal | Validate and normalize paths |

## 6. Hooks Configuration

### 6.1 Hook Events

| Event | Purpose | Available Hook Types |
|-------|---------|-------------------|
| PermissionRequest | Before permission prompt | command, prompt, agent |
| PreToolUse | Before tool execution, can block | command, prompt, agent |
| PostToolUse | After successful tool | command, prompt, agent |
| PostToolUseFailure | After tool failure | command |
| Notification | On notifications | command |
| Stop | When session ends | command |
| PreCompact | Before compaction | command |
| PostCompact | After compaction | command |
| UserPromptSubmit | When user submits | command |
| SessionStart | When session starts | command |

### 6.2 Hook Types

**Command Hook:**
```json
{ "type": "command", "command": "prettier --write $FILE", "timeout": 30 }
```

**Prompt Hook (PreToolUse, PostToolUse, PermissionRequest only):**
```json
{ "type": "prompt", "prompt": "Is this safe? $ARGUMENTS" }
```

**Agent Hook (PreToolUse, PostToolUse, PermissionRequest only):**
```json
{ "type": "agent", "prompt": "Verify tests pass: $ARGUMENTS" }
```

### 6.3 Hook Input Format

```json
{
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.txt", "content": "..." },
  "tool_response": { "success": true }  // PostToolUse only
}
```

### 6.4 Hook Output Control

```json
{
  "systemMessage": "Warning shown to user",      // Display message
  "continue": false,                              // Block/stop action
  "stopReason": "Why blocked",                   // Shown when blocked
  "suppressOutput": false,                       // Hide from transcript
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",      // PreToolUse only
    "updatedInput": { ... }                       // Modified tool input
  }
}
```

## Engineering Checklist

- [ ] **Tool Usage:** All tools have complete input_schema with descriptions
- [ ] **Permission Model:** Tool permissions align with capability requirements
- [ ] **Error Format:** Tool errors return structured response (not raw exceptions)
- [ ] **Timeout:** All shell commands have timeout consideration
- [ ] **Read Before Edit:** File modifications always read existing content first
- [ ] **Fork Rules:** No peeking, no racing, context-sharing for lightweight tasks
- [ ] **Subagent Clarity:** Fork prompts are directives, not situation reports
- [ ] **Context Compaction:** Structured summary enables immediate resumption
- [ ] **Security Validation:** Pre-tool-use checks prevent injection attacks
- [ ] **Hook Coverage:** Key events have appropriate hook handlers
- [ ] **Hook Error Isolation:** Hook failures cannot break tool execution chain

## Common Pitfalls

### 1. Vague Tool Descriptions
**Problem:** LLM selects wrong tool due to unclear description.
**Fix:** Include specific use case and parameter descriptions.

### 2. Missing Input Schema
**Problem:** Tool crashes on malformed input.
**Fix:** Always provide complete JSON Schema with required/optional properties.

### 3. Fork Peeking
**Problem:** Reading fork output mid-flight pollutes parent context.
**Fix:** Trust completion notification. If user asks, report status not results.

### 4. Fork Racing
**Problem:** Fabricating fork results before notification arrives.
**Fix:** Wait for notification. If asked before arrival, report "still running."

### 5. Hook-Breaking Execution
**Problem:** Uncaught hook exception breaks the tool execution chain.
**Fix:** Wrap hook execution in try/catch. Never let hooks terminate the loop.

### 6. No Context Compaction
**Problem:** Context window overflow loses important history.
**Fix:** Compact at logical phases using structured summary format.

### 7. Permission Gaps
**Problem:** New tools registered without permission declaration.
**Fix:** Every tool registration must include required permission level.

## Reference Implementation

Source files in `../system-prompts/`:

| Pattern | Source File |
|---------|-------------|
| Tool Usage | `system-prompt-tool-usage-*.md` (12 files) |
| Task Execution | `system-prompt-worker-instructions.md` |
| Fork Guidelines | `system-prompt-fork-usage-guidelines.md` |
| Context Compaction | `system-prompt-context-compaction-summary.md` |
| Security | `system-prompt-doing-tasks-security.md` |
| Hooks Config | `system-prompt-hooks-configuration.md` |
| Auto Mode | `system-prompt-auto-mode.md` |

---

**Instructions:**
1. Create the file at `D:\Github\harness-skills\skills\harness\specs\layer0-system-prompt.md` with the content above
2. Stage and commit with message: "feat(harness): add Layer 0 System Prompt Architecture spec"
3. Report DONE with commit SHA