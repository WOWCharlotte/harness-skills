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


## Roadmap

This project is organized into three phases:

#### Phase 1: Harness Skill Initialization ✅ (Completed)

Built the core Harness Engineering skill system:

- [✅️] 5-layer architecture specification (Layer 0-4)
- [✅️] Best practices reference implementations
- [✅️] Architecture diagrams
- [✅️] CLAUDE.md / GEMINI.md entry points

**Outcome**: Established a complete Agent system engineering methodology covering full-stack design from System Prompt to Multi-Agent.

#### Phase 2: Benchmark Validation

Use Harness Skill to improve open-source Agents and validate the methodology:

- [ ] **SWE-bench**: Software engineering task benchmark
- [ ] **Terminal Bench**: Terminal operation task benchmark
- [ ] **Other open-source Benchmark**

**Goal**: Validate the methodology through real projects and solve practical Agent system engineering challenges.

#### Phase 3: Ecosystem Expansion

Refine and expand the skill ecosystem based on practical feedback:

- [ ] Complete agent-tdd skill
- [ ] Complete agent-eval skill
- [ ] Expand hooks and plugins ecosystem
- [ ] Enrich best practices case library

## Ways to Contribute

**Issues**: Bug reports, feature suggestions, and architecture discussions are welcome.

**Pull Requests**:
- Improve existing specification documents
- Add best practices case studies
- Refine architecture diagrams and code examples
- Fix errors or omissions in documentation

**Major Changes**: For changes involving architecture adjustments, please open an Issue to discuss direction before implementing.

---

## References

- [claw-code repository](https://github.com/instructkr/claw-code) — Architecture patterns source code
- [Superpowers](https://github.com/obra/superpowers) — Workflow skills for coding agents
- [Claude Code Source Code Analysis](https://mp.weixin.qq.com/s/GjZ-tFBVwfJwK11F1lP5TQ) — 510K lines TypeScript deep dive (by yzddMr6)

## License

MIT