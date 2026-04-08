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
| **agent-tdd** | Test-driven development for Agent systems |
| **agent-eval** | Evaluation of Agent systems |

## Installation

### Claude Code — Marketplace (Recommended)

Add the marketplace first, then install the plugin:

```bash
# Add marketplace
/plugin marketplace add WOWCharlotte/harness-skills

# Install plugin from marketplace
/plugin install harness-engineering@WOWCharlotte/harness-skills
```

### Claude Code — Direct URL

Install directly via GitHub URL:

```bash
/plugin install harness-engineering@https://github.com/WOWCharlotte/harness-skills
```

### Local Clone

```bash
git clone https://github.com/WOWCharlotte/harness-skills
/plugin install harness-engineering@./harness-skills
/plugin reload-plugins
```

### Manual Installation

Copy the `skills/` directory to your agent's skills directory:
- Claude Code: `~/.claude/skills/`
- Codex: `~/.agents/skills/`

## Usage

Trigger the skill when:
- Starting a new Agent system project
- Evaluating an existing Agent framework
- Refactoring an overgrown agent implementation

```
/harness
/agent-tdd
/agent-eval
```

Or simply describe what you're working on — the skill activates automatically when relevant.

## Repository Structure

```
harness-skills/
├── .claude-plugin/
│   ├── plugin.json                       ← Plugin manifest
│   └── marketplace.json                   ← Marketplace definition
├── skills/
│   ├── harness/                          ← Harness Engineering skill
│   │   ├── SKILL.md                      ← Skill entry point
│   │   ├── specs/                        ← Layer specifications
│   │   │   ├── layer0-system-prompt.md
│   │   │   ├── layer1-harness-core.md
│   │   │   ├── layer2-tool-system.md
│   │   │   ├── layer3-plugin-hooks.md
│   │   │   └── layer4-multi-agent.md
│   │   ├── diagrams/                     ← Architecture diagrams
│   │   └── references/                   ← Reference docs
│   ├── agent-tdd/                        ← Agent TDD skill
│   └── agent-eval/                       ← Agent Eval skill
├── commands/                             ← Slash commands
├── CLAUDE.md                             ← Claude Code instructions
└── GEMINI.md                             ← Gemini CLI entry point
```

## References

- [claw-code repository](https://github.com/instructkr/claw-code) — Source of the architecture patterns
- [Superpowers](https://github.com/obra/superpowers) — Workflow skills for coding agents

## License

MIT
