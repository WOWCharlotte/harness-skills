# Layer 0: System Prompt Architecture — Detailed Specification

**Status:** Draft
**Layer:** 0 of 5 (Foundation)
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

Source files in `../system-prompts/`. Organized by Layer 0 component.

### Tool Usage Patterns (Section 1)

| File | Description |
|------|-------------|
| `system-prompt-tool-usage-create-files.md` | Prefer Write over cat heredoc |
| `system-prompt-tool-usage-edit-files.md` | Prefer Edit over sed/awk |
| `system-prompt-tool-usage-read-files.md` | Prefer Read over cat/head/tail |
| `system-prompt-tool-usage-search-files.md` | Prefer Glob over find/ls |
| `system-prompt-tool-usage-search-content.md` | Prefer Grep over grep/rg |
| `system-prompt-tool-usage-reserve-bash.md` | Reserve Bash for system commands |
| `system-prompt-tool-usage-delegate-exploration.md` | Use Task tool for exploration |
| `system-prompt-tool-usage-skill-invocation.md` | Skill tool for slash commands |
| `system-prompt-tool-usage-task-management.md` | Use TodoWrite for tracking |
| `system-prompt-tool-usage-subagent-guidance.md` | When to use subagents |
| `system-prompt-parallel-tool-call-note-part-of-tool-usage-policy.md` | Parallel tool calls for independence |
| `system-prompt-advisor-tool-instructions.md` | Advisor tool usage |
| `system-prompt-tool-execution-denied.md` | Handling denied execution |
| `system-prompt-chrome-browser-mcp-tools.md` | Chrome MCP tool loading |
| `system-prompt-claude-in-chrome-browser-automation.md` | Browser automation guidelines |
| `system-prompt-option-previewer.md` | Preview field for UI options |
| `system-prompt-one-of-six-rules-for-using-sleep-command.md` | Sleep retry rules |
| `tool-description-bash-alternative-*.md` (7 files) | Bash alternatives for read/write/search |
| `tool-description-bash-*.md` (35+ files) | Bash tool description fragments |

### Task Execution Workflow (Section 2)

| File | Description |
|------|-------------|
| `system-prompt-worker-instructions.md` | Worker instructions for implementing changes |
| `system-prompt-auto-mode.md` | Continuous autonomous execution mode |
| `system-prompt-doing-tasks-ambitious-tasks.md` | Allow ambitious tasks |
| `system-prompt-doing-tasks-help-and-feedback.md` | Help and feedback channels |
| `system-prompt-doing-tasks-minimize-file-creation.md` | Prefer editing over creation |
| `system-prompt-doing-tasks-no-compatibility-hacks.md` | Delete unused code entirely |
| `system-prompt-doing-tasks-no-premature-abstractions.md` | No YAGNI abstractions |
| `system-prompt-doing-tasks-no-time-estimates.md` | Avoid time predictions |
| `system-prompt-doing-tasks-no-unnecessary-additions.md` | Scope discipline |
| `system-prompt-doing-tasks-no-unnecessary-error-handling.md` | Validate at boundaries only |
| `system-prompt-doing-tasks-read-before-modifying.md` | Read before modify |
| `system-prompt-doing-tasks-security.md` | Security in implementation |
| `system-prompt-doing-tasks-software-engineering-focus.md` | Software engineering context |
| `system-prompt-executing-actions-with-care.md` | Reversibility and blast radius |
| `system-prompt-git-status.md` | Git status display |
| `system-prompt-minimal-mode.md` | Skip hooks/LSP for lightweight |
| `system-prompt-output-efficiency.md` | Concise output |
| `system-prompt-scratchpad-directory.md` | Temporary file handling |
| `system-prompt-tone-and-style-concise-output-short.md` | Short responses |
| `system-prompt-tone-and-style-code-references.md` | Include file_path:line_number |
| `system-prompt-learning-mode.md` | Interactive learning mode |
| `system-prompt-learning-mode-insights.md` | Learning insights |
| `system-prompt-phase-four-of-plan-mode.md` | Plan writing phase (40 line limit) |
| `system-prompt-remote-plan-mode-ultraplan.md` | Remote diagram-rich planning |
| `system-prompt-remote-planning-session.md` | Remote planning workflow |
| `agent-prompt-batch-slash-command.md` | Large parallelizable changes |
| `agent-prompt-quick-git-commit.md` | Streamlined git commit |
| `agent-prompt-quick-pr-creation.md` | Git commit + PR creation |
| `agent-prompt-pr-comments-slash-command.md` | GitHub PR comments display |
| `agent-prompt-review-pr-slash-command.md` | PR review |
| `agent-prompt-schedule-slash-command.md` | Cron-based remote agents |
| `agent-prompt-plan-mode-enhanced.md` | Software architect planning |
| `agent-prompt-update-magic-docs.md` | Magic Doc updates |
| `tool-description-bash-git-commit-and-pr-creation-instructions.md` | Git commit/PR instructions |

### Fork & Subagent Patterns (Section 3)

| File | Description |
|------|-------------|
| `system-prompt-fork-usage-guidelines.md` | Fork rules (no peek, no race) |
| `system-prompt-writing-subagent-prompts.md` | Writing effective subagent prompts |
| `system-prompt-subagent-delegation-examples.md` | Delegation examples |
| `system-prompt-teammate-communication.md` | Agent team messaging |
| `agent-prompt-worker-fork-execution.md` | Forked worker pattern |
| `tool-description-agent-when-to-launch-subagents.md` | When to launch subagents |

### Context Compaction (Section 4)

| File | Description |
|------|-------------|
| `system-prompt-context-compaction-summary.md` | Continuation summary format |
| `system-prompt-partial-compaction-instructions.md` | Detailed summary for continuation |
| `system-prompt-mcp-tool-result-truncation.md` | Long MCP output handling |
| `system-reminder-compact-file-reference.md` | File read before summarization |

### Security Monitoring (Section 5)

| File | Description |
|------|-------------|
| `system-prompt-doing-tasks-security.md` | Security vulnerability prevention |
| `system-prompt-censoring-assistance-with-malicious-activities.md` | Authorized security testing |
| `agent-prompt-bash-command-prefix-detection.md` | Command injection detection |
| `agent-prompt-security-monitor-for-autonomous-agent-actions-first-part.md` | Security monitor (part 1) |
| `agent-prompt-security-monitor-for-autonomous-agent-actions-second-part.md` | Security monitor (part 2) |
| `agent-prompt-security-review-slash-command.md` | Security review |
| `system-reminder-malware-analysis-after-read-tool-call.md` | Malware analysis guidance |

### Hooks Configuration (Section 6)

| File | Description |
|------|-------------|
| `system-prompt-hooks-configuration.md` | Hooks structure and format |
| `agent-prompt-hook-condition-evaluator.md` | Hook condition evaluation |
| `agent-prompt-agent-hook.md` | Stop condition verification |
| `system-reminder-hook-*.md` (6 files) | Hook timing messages |

### Agent Types

| File | Description |
|------|-------------|
| `agent-prompt-general-purpose.md` | General-purpose subagent |
| `agent-prompt-explore.md` | Codebase exploration agent |
| `agent-prompt-plan-mode-enhanced.md` | Software architect agent |
| `agent-prompt-verification-specialist.md` | Adversarial testing agent |
| `agent-prompt-claude-guide-agent.md` | Claude Code guidance agent |
| `agent-prompt-claudemd-creation.md` | CLAUDE.md creation agent |
| `agent-prompt-agent-creation-architect.md` | Custom agent creation |
| `agent-prompt-coding-session-title-generator.md` | Session title generation |
| `agent-prompt-conversation-summarization.md` | Conversation summary |
| `agent-prompt-recent-message-summarization.md` | Recent message summary |
| `agent-prompt-session-search-assistant.md` | Session search |
| `agent-prompt-session-title-and-branch-generation.md` | Title + branch generation |
| `agent-prompt-prompt-suggestion-generator-v2.md` | Prompt suggestions |
| `agent-prompt-status-line-setup.md` | Status line configuration |
| `agent-prompt-webfetch-summarizer.md` | WebFetch summarizer |
| `agent-prompt-auto-mode-rule-reviewer.md` | Auto mode rule reviewer |
| `agent-prompt-dream-memory-consolidation.md` | Memory consolidation |
| `agent-prompt-determine-which-memory-files-to-attach.md` | Memory file selection |
| `system-prompt-agent-thread-notes.md` | Agent thread guidelines |
| `system-prompt-buddy-mode.md` | Coding companion creatures |

### Memory & Session Management

| File | Description |
|------|-------------|
| `system-prompt-agent-memory-instructions.md` | Memory update guidance |
| `system-prompt-agent-summary-generation.md` | Action summarization (3-5 words) |
| `system-prompt-description-part-of-memory-instructions.md` | Memory file content guidance |
| `system-prompt-team-memory-content-display.md` | Shared team memory display |
| `system-prompt-insights-at-a-glance-summary.md` | Usage insights summary |
| `system-prompt-insights-friction-analysis.md` | Friction pattern analysis |
| `system-prompt-insights-on-the-horizon.md` | Future opportunities |
| `system-prompt-insights-session-facets-extraction.md` | Session facets extraction |
| `system-prompt-insights-suggestions.md` | CLAUDE.md suggestions |
| `system-prompt-memory-description-of-user-feedback.md` | User feedback memory type |

### Tool Descriptions (LLM-Readable)

| File | Description |
|------|-------------|
| `tool-description-*.md` (40+ files) | Complete tool description library |
| `tool-parameter-computer-action.md` | Tool parameter descriptions |

### System Reminders (Timing-Based)

| File | Description |
|------|-------------|
| `system-reminder-*.md` (28 files) | Session-phase reminder fragments |

### Skill System

| File | Description |
|------|-------------|
| `system-prompt-skillify-current-session.md` | Convert session to skill |
| `system-reminder-invoked-skills.md` | Invoked skills list |

### API & Data References

| File | Description |
|------|-------------|
| `data-claude-api-reference-*.md` (8 files) | Claude API reference |
| `data-agent-sdk-reference-*.md` (2 files) | Agent SDK reference |
| `data-agent-sdk-patterns-*.md` (2 files) | SDK patterns |
| `data-files-api-reference-*.md` (2 files) | Files API reference |
| `data-message-batches-api-reference-*.md` | Message batches API |
| `data-streaming-reference-*.md` (2 files) | Streaming reference |
| `data-session-memory-template.md` | Session memory template |
| `data-prompt-caching-design-optimization.md` | Prompt caching |
| `data-http-error-codes-reference.md` | HTTP error codes |
| `data-github-actions-workflow-for-claude-mentions.md` | GitHub Actions |
| `data-github-app-installation-pr-description.md` | GitHub App installation |
| `data-live-documentation-sources.md` | Live documentation |
| `data-tool-use-concepts.md` | Tool use concepts |
| `data-tool-use-reference-*.md` (2 files) | Tool use reference |
| `data-model-catalog.md` | Model catalog |
| `skill-build-with-claude-api.md` | Skill building with API |
| `skill-*.md` (9 files) | Skill building references |

---