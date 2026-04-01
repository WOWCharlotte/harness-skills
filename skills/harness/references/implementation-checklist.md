# Implementation Checklist

Consolidated engineering checklists from all 4 layer specs. Use this as your build checklist when implementing a new Harness.

## Layer 1 — Harness Core

- [ ] **Termination:** Agent Loop has explicit termination conditions — cannot loop infinitely
- [ ] **Immutability:** Session messages are append-only — no in-place edits
- [ ] **Serialization:** Session can be serialized to disk and resumed without data loss
- [ ] **Isolation:** Each session has its own working_dir — no path collisions
- [ ] **Permissions:** Permission checks happen in HarnessCore, not inside individual tools
- [ ] **Coverage:** All tools have a declared PermissionMode — no tools bypass the policy
- [ ] **Retry:** LLM calls retry with exponential backoff on transient failures
- [ ] **Timeout:** Tool execution has per-tool timeout; harness can force-kill stuck tools
- [ ] **Error Format:** Tool errors return a structured error to the LLM (not raw exceptions)
- [ ] **Forking:** forkSubagent creates a new Session with a reference to parent_session_id

## Layer 2 — Tool System

- [ ] **Schema completeness:** Every tool's input_schema has all required fields documented
- [ ] **Schema validation:** input_schema is validated before tool is registered (not at runtime)
- [ ] **Timeout:** bash / long-running tools have explicit timeout; harness can kill stuck processes
- [ ] **Resource limits:** bash tools have memory + CPU limits (ulimit or container cgroups)
- [ ] **Error standardization:** All tool errors return `{ success: false, error: string }`, never raw exceptions
- [ ] **Schema validation at boundary:** Validate tool input against schema BEFORE passing to executor
- [ ] **Hot-swap:** New tools can be registered at runtime without restarting the harness
- [ ] **LLM-facing description quality:** Every tool description passes the "could an LLM correctly choose this tool?" test
- [ ] **Idempotency:** Tool results are cacheable by input hash; duplicate calls return cached result
- [ ] **Isolation:** Bash tools run in subprocess, not in main process, to prevent crashes

## Layer 3 — Plugin & Hooks

- [ ] **Error isolation:** Hook exceptions cannot break the tool execution chain
- [ ] **Hook toggle:** Every hook can be disabled per-session (e.g., disable `auto-retry` in tests)
- [ ] **Version constraints:** Plugin manager validates semver ranges before loading
- [ ] **Hook ordering:** Priority-based ordering is documented and deterministic
- [ ] **Hook logging:** Every hook run logs: hook name, tool name, input summary, output summary
- [ ] **Short-circuit:** PreToolUse returning `blocked` skips all remaining hooks and tool execution
- [ ] **No state leakage:** Hooks cannot modify ExecutionContext in ways that affect other hooks
- [ ] **Plugin isolation:** Plugins communicate only through declared interfaces, not shared state

## Layer 4 — Multi-Agent

- [ ] **Session isolation:** Sub-agents have independent Session IDs — no message collision
- [ ] **Permission boundary:** Sub-agent permission is parent's permission or stricter
- [ ] **Timeout:** Each sub-agent has its own max_turns — cannot block parent forever
- [ ] **Parent notification:** Parent is notified when sub-agent completes/fails/pauses
- [ ] **Resource quotas:** Max number of parallel sub-agents is capped per session
- [ ] **Agent type extensibility:** New agent types can be registered without core changes
- [ ] **Communication protocol:** All parent-child messages follow typed protocol
- [ ] **Cleanup:** Terminated sub-agent Sessions are garbage collected

## Pre-Production Checklist

- [ ] All tools have passing integration tests
- [ ] Permission model has been penetration-tested (attempted privilege escalation fails)
- [ ] Crash recovery tested: simulate process kill, verify session resumes correctly
- [ ] Timeout tested: verified stuck bash command is killed after timeout
- [ ] Hook error tested: verified one failing hook doesn't break tool execution chain
- [ ] Sub-agent timeout tested: verified infinite-loop sub-agent is killed after max_turns
- [ ] Context isolation tested: verified sub-agent cannot read parent's files outside working_dir
