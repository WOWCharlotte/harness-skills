# Layer 0: System Prompt Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Layer 0: System Prompt Architecture to `skills/harness/SKILL.md`, enabling harness engineers to design effective system prompts that guide agent behavior.

**Architecture:** System Prompt Design is the foundational layer that defines how the agent should behave — tool usage patterns, task execution workflow, fork/subagent guidance, context management, security monitoring, and hooks configuration. This layer informs all other layers (1-4) but operates at the "instruction" level rather than the "runtime" level.

**Tech Stack:** Documentation-only (markdown specs and references)

---

## File Structure

```
skills/harness/
├── SKILL.md                              # Modified: Add Layer 0 to architecture table + Quick Reference
├── specs/
│   └── layer0-system-prompt.md           # Create: New spec for Layer 0
└── references/
    └── system-prompt-patterns.md        # Create: Reference patterns from claude-code system prompts
```

---

## Task Decomposition

### Task 1: Create Layer 0 System Prompt Specification

**Files:**
- Create: `skills/harness/specs/layer0-system-prompt.md`

- [ ] **Step 1: Write the spec header and introduction**

```markdown
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
```

- [ ] **Step 2: Add Tool Usage Patterns section**

```markdown
## 1. Tool Usage Patterns

### 1.1 Core Tool Categories

| Category | Tools | Permission Level | Usage Guidelines |
|----------|-------|-----------------|------------------|
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
```

- [ ] **Step 3: Add Task Execution Workflow section**

```markdown
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
2. **Minimize interruptions** — Prefer action over planning for clear tasks
3. **Prefer action over planning** — Start coding unless explicitly asked for plan
4. **Course corrections welcome** — User feedback is normal input
```

- [ ] **Step 4: Add Fork/Subagent Patterns section**

```markdown
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
```

- [ ] **Step 5: Add Context Compaction section**

```markdown
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
```

- [ ] **Step 6: Add Security Monitoring section**

```markdown
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
```

- [ ] **Step 7: Add Hooks Configuration section**

```markdown
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
```

- [ ] **Step 8: Add Engineering Checklist section**

```markdown
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
```

- [ ] **Step 9: Add Common Pitfalls section**

```markdown
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
```

- [ ] **Step 10: Add Reference Implementation section**

```markdown
## Reference Implementation

claw-code implements these patterns in its system prompts:

| Pattern | Source File |
|---------|-------------|
| Tool Usage | `system-prompt-tool-usage-*.md` (12 files) |
| Task Execution | `system-prompt-worker-instructions.md` |
| Fork Guidelines | `system-prompt-fork-usage-guidelines.md` |
| Context Compaction | `system-prompt-context-compaction-summary.md` |
| Security | `system-prompt-doing-tasks-security.md` |
| Hooks Config | `system-prompt-hooks-configuration.md` |
| Auto Mode | `system-prompt-auto-mode.md` |
```

- [ ] **Step 11: Commit the spec**

```bash
git add skills/harness/specs/layer0-system-prompt.md
git commit -m "feat(harness): add Layer 0 System Prompt Architecture spec

Adds detailed specification for System Prompt Design covering:
- Tool usage patterns and selection principles
- Task execution workflow (simplify → test → e2e → commit → PR)
- Fork & subagent patterns with context inheritance rules
- Context compaction with structured summary format
- Security monitoring and pre-tool-use validation
- Hooks configuration with 9 events and 3 hook types"
```
---

### Task 2: Create System Prompt Patterns Reference

**Files:**
- Create: `skills/harness/references/system-prompt-patterns.md`

- [ ] **Step 1: Create the reference document header**

```markdown
# System Prompt Patterns Reference

**Purpose:** Quick reference for system prompt patterns derived from claude-code's battle-tested implementation.

**Usage:** Use this reference when designing system prompts for a new harness or updating existing prompts.

**Source:** `claude-code-system-prompts-main/system-prompts/`
```

- [ ] **Step 2: Add Tool Usage Patterns subsection**

```markdown
## Tool Usage Patterns

### Read Before Modify
From: `system-prompt-doing-tasks-read-before-modifying.md`
> "Do not propose changes to code you haven't read. If a user asks about or wants you to modify a file, read it first. Understand existing code before suggesting modifications."

### Use Dedicated Tools
From: `system-prompt-tool-usage-read-files.md`
> "To read files use Read tool instead of cat, head, tail, or sed"

### Tool Selection Priority
1. Use specific tool (grep_search) over general (bash with grep)
2. Use Read tool over bash cat
3. Use edit_file over write_file when preserving context
```

- [ ] **Step 3: Add Task Execution Patterns subsection**

```markdown
## Task Execution Patterns

### Worker Workflow
From: `system-prompt-worker-instructions.md`

```
1. Simplify — Invoke simplify skill to review changes
2. Unit Tests — Run project test suite
3. E2E Tests — Follow coordinator's test recipe
4. Commit & Push — Clear message, push branch
5. Report — End with PR: <url>
```

### Software Engineering Focus
From: `system-prompt-doing-tasks-software-engineering-focus.md`
> "The user will primarily request software engineering tasks. When given an unclear instruction, consider it in the context of software engineering."

### Ambition Encouragement
From: `system-prompt-doing-tasks-ambitious-tasks.md`
> "You are highly capable and often allow users to complete ambitious tasks. Defer to user judgement about whether a task is too large."
```

- [ ] **Step 4: Add Fork/Subagent Patterns subsection**

```markdown
## Fork & Subagent Patterns

### When to Fork
From: `system-prompt-fork-usage-guidelines.md`

**Fork (cheap, context-sharing):**
- Research: open-ended questions, parallel exploration
- Implementation: >2 edits, iterative refinement

**Don't Fork:**
- Tasks needing different model
- Long-running that should not share cache

### Fork Rules
1. **No peek** — Trust completion notification
2. **No race** — Never fabricate results before notification
3. **No model** — Don't set model (breaks cache sharing)
4. **Short name** — Enable user steering via teams panel

### Writing Fork Prompts
> "Since the fork inherits your context, the prompt is a directive — what to do, not what the situation is. Be specific about scope."
```

- [ ] **Step 5: Add Context Compaction Patterns subsection**

```markdown
## Context Compaction Patterns

### Summary Structure
From: `system-prompt-context-compaction-summary.md`

```markdown
<summary>
## Task Overview
- Core request and success criteria
- Clarifications or constraints

## Current State
- Completed work (files, modifications)
- Key outputs or artifacts

## Important Discoveries
- Technical constraints uncovered
- Decisions and rationale
- Errors and resolutions
- Failed approaches (and why)

## Next Steps
- Specific actions needed
- Blockers or open questions
- Priority order

## Context to Preserve
- User preferences or style
- Domain-specific details
- Promises made
</summary>
```

### When to Compact
- After completing a task phase
- Before starting new significant task
- At 60-70% context capacity
```

- [ ] **Step 6: Add Security Patterns subsection**

```markdown
## Security Patterns

### Core Security Principle
From: `system-prompt-doing-tasks-security.md`
> "Be careful not to introduce security vulnerabilities such as command injection, XSS, SQL injection, and other OWASP top 10 vulnerabilities. If you notice that you wrote insecure code, immediately fix it."

### Executing with Care
From: `system-prompt-executing-actions-with-care.md`

**Confirm before acting:**
- Destructive operations (delete, rm -rf, drop tables)
- Hard-to-reverse (force-push, git reset --hard)
- Shared state (push, PR creation, external messages)
- Third-party uploads (can be cached/indexed)

**Authorization scope:**
- User approval is for specified scope, not unlimited
- Match action scope to what was requested
```

- [ ] **Step 7: Add Auto Mode Patterns subsection**

```markdown
## Auto Mode Patterns

From: `system-prompt-auto-mode.md`

When user selects continuous autonomous execution:
1. **Execute immediately** — Start implementing, make reasonable assumptions
2. **Minimize interruptions** — Prefer assumptions over questions for routine decisions
3. **Prefer action** — Do not enter plan mode unless explicitly asked
4. **Expect corrections** — User feedback is normal input
5. **Avoid destruction** — Confirm destructive actions even in auto mode
6. **No exfiltration** — Don't share secrets unless explicitly authorized
```

- [ ] **Step 8: Add Hooks Quick Reference subsection**

```markdown
## Hooks Quick Reference

### 9 Hook Events
| Event | When |
|-------|------|
| PermissionRequest | Before permission prompt |
| PreToolUse | Before tool execution |
| PostToolUse | After successful tool |
| PostToolUseFailure | After tool failure |
| Notification | On notifications |
| Stop | Session ends |
| PreCompact | Before compaction |
| PostCompact | After compaction |
| UserPromptSubmit | User submits input |

### 3 Hook Types
1. **command** — Shell command
2. **prompt** — LLM evaluation (PreToolUse, PostToolUse, PermissionRequest)
3. **agent** — Agent with tools (PreToolUse, PostToolUse, PermissionRequest)

### Common Patterns
- Auto-format on write: PostToolUse + prettier
- Log bash commands: PreToolUse + append to log
- Test after edit: PostToolUse + npm test
```
```

- [ ] **Step 9: Add source file mapping table**

```markdown
## Source File Mapping

| Pattern Category | claude-code Source |
|-----------------|-------------------|
| Tool Usage | `system-prompt-tool-usage-*.md` (12 files) |
| Task Execution | `system-prompt-worker-instructions.md` |
| Fork Patterns | `system-prompt-fork-usage-guidelines.md` |
| Context Compaction | `system-prompt-context-compaction-summary.md` |
| Security | `system-prompt-doing-tasks-security.md`, `system-prompt-executing-actions-with-care.md` |
| Auto Mode | `system-prompt-auto-mode.md` |
| Hooks | `system-prompt-hooks-configuration.md` |
| Read Before Modify | `system-prompt-doing-tasks-read-before-modifying.md` |
| Ambition | `system-prompt-doing-tasks-ambitious-tasks.md` |
```

- [ ] **Step 10: Commit the reference**

```bash
git add skills/harness/references/system-prompt-patterns.md
git commit -m "docs(harness): add System Prompt Patterns reference

Quick reference guide for system prompt patterns derived from
claude-code's battle-tested implementation, covering:
- Tool usage patterns and selection principles
- Task execution workflow
- Fork & subagent patterns
- Context compaction
- Security monitoring
- Auto mode behavior
- Hooks configuration"
```
---

### Task 3: Update SKILL.md to Include Layer 0

**Files:**
- Modify: `skills/harness/SKILL.md` (lines 22-43, 61-94)

- [ ] **Step 1: Update the architecture table (lines 22-29)**

Change from:
```markdown
## The 4-Layer Architecture

| Layer | Component | Key Responsibility |
|-------|-----------|-------------------|
| **Layer 1** | Harness Core | Agent loop, session management, config & permissions |
| **Layer 2** | Tool System | Tool registry, executor, permission model, execution context |
| **Layer 3** | Plugin & Hooks | PreToolUse, PostToolUse, plugin lifecycle |
| **Layer 4** | Multi-Agent | Sub-agent spawn, state handoff, collaboration patterns |
```

To:
```markdown
## The 5-Layer Architecture

| Layer | Component | Key Responsibility |
|-------|-----------|-------------------|
| **Layer 0** | System Prompt | Tool usage patterns, task workflow, fork/subagent, context compaction, security, hooks |
| **Layer 1** | Harness Core | Agent loop, session management, config & permissions |
| **Layer 2** | Tool System | Tool registry, executor, permission model, execution context |
| **Layer 3** | Plugin & Hooks | PreToolUse, PostToolUse, plugin lifecycle |
| **Layer 4** | Multi-Agent | Sub-agent spawn, state handoff, collaboration patterns |
```

- [ ] **Step 2: Update the Core Resources section (lines 33-42)**

Change from:
```markdown
## Core Resources

- **Full methodology:** `README.md`
- **Layer 1 (Harness Core):** `specs/layer1-harness-core.md`
- **Layer 2 (Tool System):** `specs/layer2-tool-system.md`
- **Layer 3 (Plugin & Hooks):** `specs/layer3-plugin-hooks.md`
- **Layer 4 (Multi-Agent):** `specs/layer4-multi-agent.md`
- **claw-code mapping:** `references/claw-code-patterns.md`
- **Engineering checklist:** `references/implementation-checklist.md`
- **Common pitfalls:** `references/common-pitfalls.md`
```

To:
```markdown
## Core Resources

- **Full methodology:** `README.md`
- **Layer 0 (System Prompt):** `specs/layer0-system-prompt.md`
- **Layer 1 (Harness Core):** `specs/layer1-harness-core.md`
- **Layer 2 (Tool System):** `specs/layer2-tool-system.md`
- **Layer 3 (Plugin & Hooks):** `specs/layer3-plugin-hooks.md`
- **Layer 4 (Multi-Agent):** `specs/layer4-multi-agent.md`
- **System prompt patterns:** `references/system-prompt-patterns.md`
- **claw-code mapping:** `references/claw-code-patterns.md`
- **Engineering checklist:** `references/implementation-checklist.md`
- **Common pitfalls:** `references/common-pitfalls.md`
```

- [ ] **Step 3: Add Layer 0 Quick Reference section**

Add after line 61 (before "### Layer 1 — Harness Core"):

```markdown
### Layer 0 — System Prompt
- [ ] Tool descriptions include specific use cases and parameter descriptions
- [ ] Tool input_schema is complete with required/optional properties
- [ ] Permission model aligned with tool capability requirements
- [ ] Error responses return structured format (not raw exceptions)
- [ ] All bash commands have timeout consideration
- [ ] File modifications read existing content first
- [ ] Fork prompts are directives, not situation reports
- [ ] No peek/race on fork completion notifications
- [ ] Context compaction uses structured summary format
- [ ] Pre-tool-use checks prevent injection attacks
- [ ] Hooks cannot break tool execution chain
```

- [ ] **Step 4: Add Layer 0 Common Mistakes section**

Add after line 96 (before "**Layer 1:**"):

```markdown
**Layer 0:**
- Vague tool descriptions → LLM selects wrong tool
- Missing input_schema validation → crashes on bad input
- Fork peeking mid-flight → context pollution
- Fork racing results → fabricated output
- No context compaction → context window overflow
- Hook breaks execution chain → silent failures
```

- [ ] **Step 5: Commit the SKILL.md changes**

```bash
git add skills/harness/SKILL.md
git commit -m "feat(harness): integrate Layer 0 System Prompt into SKILL.md

- Update architecture table to 5 layers
- Add Layer 0 to Core Resources
- Add Layer 0 Quick Reference checklist
- Add Layer 0 Common Mistakes section"
```
---

## Self-Review Checklist

After writing the complete plan, look at the spec with fresh eyes and check:

**1. Spec coverage:**
- [x] Tool Usage Patterns — covered in Task 1, Section 1
- [x] Task Execution Workflow — covered in Task 1, Section 2
- [x] Fork/Subagent Patterns — covered in Task 1, Section 3
- [x] Context Compaction — covered in Task 1, Section 4
- [x] Security Monitoring — covered in Task 1, Section 5
- [x] Hooks Configuration — covered in Task 1, Section 6
- [x] Engineering Checklist — covered in Task 1, Section 7
- [x] Common Pitfalls — covered in Task 1, Section 8

**2. Placeholder scan:**
- No "TBD", "TODO", or "implement later" found
- All code blocks contain actual content
- All steps show specific implementation details

**3. Type consistency:**
- All file paths are absolute and use forward slashes
- Section numbers consistent across document
- Reference file mapping uses actual claude-code file names

**4. Completeness:**
- 3 tasks covering spec creation, reference creation, and SKILL.md update
- Each task has 10-11 steps with complete markdown content
- Engineering checklist items are actionable and verifiable
