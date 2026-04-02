# Harness Engineering

A skill for building production-grade Agent systems — derived from the claw-code architecture that has been verified in practical applications.

## What is this?

This repository contains the **harness-engineering** skill — a complete 5-layer engineering methodology for designing, implementing, and evaluating Agent harness systems.

The term **Harness** refers to the runtime system that surrounds an AI model (like Claude) and gives it capabilities: file access, shell execution, web search, task tracking, and the ability to spawn sub-agents.

**Examples of Harnesses:** Claude Code, Cursor, Codex, OpenCode, claw-code.

## The 5-Layer Architecture

```
┌──────────────────────────────────────────────────┐
│ Layer 4: Multi-Agent                            │
│ Agent Spawn / State Handoff / Collaboration     │
├──────────────────────────────────────────────────┤
│ Layer 3: Plugin & Hooks                         │
│ PreToolUse / PostToolUse / Lifecycle            │
├──────────────────────────────────────────────────┤
│ Layer 2: Tool System                            │
│ Tool Registry / Executor / Schema               │
├──────────────────────────────────────────────────┤
│ Layer 1: Harness Core                           │
│ Agent Loop / Session / Permissions              │
├──────────────────────────────────────────────────┤
│ Layer 0: System Prompt                          │
│ Tool Usage / Task Workflow / Fork Rules         │
└──────────────────────────────────────────────────┘
```

## Skills

| Skill | Description |
|-------|-------------|
| **harness-engineering** | Complete methodology for building Agent systems |

## Installation

### Claude Code

```
/plugin install harness@https://github.com/WOWCharlotte/harness-skills
```

Or install from a local clone:

```
git clone https://github.com/WOWCharlotte/harness-skills
/plugin install harness@./harness-skills
```

### Manual

Copy the `skills/harness/` directory to your agent's skills directory:
- Claude Code: `~/.claude/skills/`
- Codex: `~/.agents/skills/`

## Usage

Trigger the skill when:
- Starting a new Agent system project
- Evaluating an existing Agent framework
- Refactoring an overgrown agent implementation

```
/harness
```

Or simply describe what you're working on — the skill activates automatically when relevant.

## Repository Structure

```
skills/
└── harness/
    ├── SKILL.md                          ← Skill entry point
    ├── README.md                          ← This file
    ├── specs/                             ← Detailed layer specs
    │   ├── layer0-system-prompt.md        ← Layer 0: System Prompt
    │   ├── layer1-harness-core.md         ← Layer 1: Harness Core
    │   ├── layer2-tool-system.md          ← Layer 2: Tool System
    │   ├── layer3-plugin-hooks.md          ← Layer 3: Plugin & Hooks
    │   └── layer4-multi-agent.md          ← Layer 4: Multi-Agent
    ├── diagrams/                           ← Architecture diagrams
    │   ├── architecture-overview.drawio
    │   ├── layer-breakdown.drawio
    │   └── data-flow.drawio
    └── references/                         ← Reference docs
        ├── system-prompts/                 ← 140+ prompt fragments
        ├── claw-code-patterns.md
        ├── implementation-checklist.md
        ├── common-pitfalls.md
        └── superpowers-installation.md
```

## References

- [claw-code repository](https://github.com/instructkr/claw-code) — Source of the architecture patterns
- [Superpowers](https://github.com/obra/superpowers) — Workflow skills for coding agents

## License

MIT
