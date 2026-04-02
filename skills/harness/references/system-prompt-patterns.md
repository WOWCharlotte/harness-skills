# System Prompt Patterns Reference

**Purpose:** Quick reference for system prompt patterns derived from claude-code's battle-tested implementation.

**Usage:** Use this reference when designing system prompts for a new harness or updating existing prompts.

**Source:** `../system-prompts/`

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

## Auto Mode Patterns

From: `system-prompt-auto-mode.md`

When user selects continuous autonomous execution:
1. **Execute immediately** — Start implementing, make reasonable assumptions
2. **Minimize interruptions** — Prefer assumptions over questions for routine decisions
3. **Prefer action** — Do not enter plan mode unless explicitly asked
4. **Expect corrections** — User feedback is normal input
5. **Avoid destruction** — Confirm destructive actions even in auto mode
6. **No exfiltration** — Don't share secrets unless explicitly authorized

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

---