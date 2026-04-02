# Agent-TDD Fixtures

Test fixtures for evaluating claw-code harness implementation.

## Structure

```
fixtures/agent-tdd/
├── layer1-harness/     # Harness Core tests
├── layer2-tools/       # Tool System tests
├── layer3-hooks/       # Plugin & Hooks tests
└── layer4-multiagent/  # Multi-Agent tests
```

## Fixture Format

```json
{
  "description": "Human-readable description",
  "layer": "layer1 | layer2 | layer3 | layer4",
  "input": "User input string",
  "expected_tools": ["tool_name_1", "tool_name_2"],
  "session_config": {
    "permission": "ReadOnly | WorkspaceWrite | DangerFullAccess"
  }
}
```

## Layer Coverage

| Layer | Tests |
|-------|-------|
| layer1 | Session persistence, permission enforcement, loop termination |
| layer2 | Tool selection, schema validation, permission boundaries |
| layer3 | PreToolUse hooks, PostToolUse hooks, hook error handling |
| layer4 | Sub-agent spawning, parent-child permission inheritance, agent timeout |

## Tools in claw-code

- `bash` - Shell execution (DangerFullAccess)
- `read_file` - File reading (ReadOnly)
- `write_file` - File writing (WorkspaceWrite)
- `edit_file` - File editing (WorkspaceWrite)
- `glob` / `glob_search` - File pattern matching (ReadOnly)
- `grep` / `grep_search` - Content search (ReadOnly)
