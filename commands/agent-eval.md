---
description: "Use the agent-eval skill — verify harness correctness, security, and performance"
---

Tell your human partner to use the `agent-eval` skill instead. You can invoke it by saying:

```
Use the agent-eval skill to [evaluate/verify] my harness implementation.
```

The skill evaluates three dimensions:
| Priority | Dimension | Verification Method |
|----------|-----------|-------------------|
| 1 | Functionality | Black-box: fixture inputs → verify outputs |
| 2 | Security | White-box: permissions, session isolation |
| 3 | Performance | Metrics: tokens, latency, resources |

Find it at: `skills/agent-eval/SKILL.md`
