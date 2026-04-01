---
name: agent-tdd
description: Use when implementing Test-Driven Development for an Agent system. Provides layer-specific TDD strategies: Tools TDD (fixed prompt), Loop TDD (mock LLM record & replay), and Multi-Agent TDD (mock sub-agent + contract tests).
---

# Agent TDD Skill

Test-Driven Development for Agent systems requires different strategies at each layer due to the inherent non-determinism of LLM outputs.

## Core Principles

| Layer | Non-determinism Source | Test Strategy |
|-------|----------------------|---------------|
| Tools TDD | Prompt changes → tool selection changes | Fixed prompt + deterministic assertion |
| Loop TDD | LLM output varies per call | Mock LLM (record & replay) |
| Multi-Agent TDD | Sub-agent output varies | Mock sub-agent + contract tests |

## Relationship to Harness Skill

This skill complements the `harness` skill by providing testing strategies specifically for agent systems. While harness focuses on skill composition and orchestration, agent-tdd focuses on verifying agent behavior at each layer of abstraction.

## Quick Start

1. **Identify the layer** you are testing (Tools, Loop, or Multi-Agent)
2. **Choose the appropriate TDD strategy** from the table above
3. **Follow the layer-specific workflow** in the specs directory

## Skill Structure

```
agent-tdd/
├── SKILL.md          # This file - entry point and overview
├── specs/           # Layer-specific TDD specifications
│   ├── tools-tdd.md
│   ├── loop-tdd.md
│   └── multi-agent-tdd.md
└── references/      # Reference materials and examples
```
