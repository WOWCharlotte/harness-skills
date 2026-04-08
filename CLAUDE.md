# Harness Engineering — Project Guidelines

## What is this project?

This is a **skills repository** for AI coding agents. It contains the `harness-engineering` skill — a complete engineering methodology for building production-grade Agent systems (Harnesses), derived from实战验证的 claw-code architecture.

The skill is organized as a 4-layer framework:
- Layer 1: Harness Core (Agent Loop, Session, Permissions)
- Layer 2: Tool System (Registry, Executor, Schema)
- Layer 3: Plugin & Hooks (PreToolUse, PostToolUse, Lifecycle)
- Layer 4: Multi-Agent (Spawn, State Handoff, Collaboration)

## Workflow

When someone asks you to build or work on an Agent system:

1. **Activate brainstorming** if they have a vague idea — use `superpowers:brainstorming`
2. **Activate harness-engineering** if they want to build/evaluate a Harness — use `skills/harness/SKILL.md`
3. **Follow the skill's guidance** — it will direct you to the right specs and references

## Important Conventions

- All skills live in `skills/[skill-name]/` with a `SKILL.md` entry point
- YAML frontmatter required: `name` (kebab-case) and `description` (starts with "Use when...")
- Architecture diagrams live in `skills/[skill-name]/diagrams/`
- Detailed specs live in `skills/[skill-name]/specs/`
- Reference docs live in `skills/[skill-name]/references/`
- This repo is documentation-only (no code to build or test)

## Before Contributing

- Read `skills/harness/SKILL.md` to understand the skill's purpose
- Read the 4 layer specs in `skills/harness/specs/`
- Check `skills/harness/references/claw-code-patterns.md` for source code mapping
- Make sure your change belongs in the skill docs, not in the claw-code source (which is a reference, not part of this repo)
