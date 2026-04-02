---
description: "Use the agent-tdd skill — TDD strategies for Agent systems at each layer"
---

Tell your human partner to use the `agent-tdd` skill instead. You can invoke it by saying:

```
Use the agent-tdd skill to [implement tests for] my Agent component.
```

The skill provides layer-specific TDD strategies:
- **Layer 1 (Tools TDD)**: Fixed prompt + deterministic assertion
- **Layer 2 (Loop TDD)**: Mock LLM with record & replay
- **Layer 3 (Multi-Agent TDD)**: Mock sub-agent + contract tests

Find it at: `skills/agent-tdd/SKILL.md`
