# Superpowers Installation

This skill depends on the **superpowers** plugin for execution workflows. Installation varies by platform.

## Installation by Platform

### Claude Code (Official Marketplace)
```bash
/plugin install superpowers@claude-plugins-official
```

### Claude Code (via Community Marketplace)
```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### Cursor
```
/add-plugin superpowers
```
Or search for "superpowers" in the plugin marketplace.

### GitHub Copilot CLI
```bash
copilot plugin marketplace add obra/superpowers-marketplace
copilot plugin install superpowers@superpowers-marketplace
```

### Gemini CLI
```bash
gemini extensions install https://github.com/obra/superpowers
gemini extensions update superpowers  # to update
```

### Codex / OpenCode
Tell your agent to fetch from:
```
https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.codex/INSTALL.md
```

## Verify Installation

Start a new session and ask: **"help me plan this feature"**

The agent should automatically invoke `superpowers:brainstorming`. If it doesn't, the plugin is not installed correctly.

## Required Skills

These superpowers skills are invoked by the harness skill workflow:

| Skill | Purpose |
|-------|---------|
| `superpowers:brainstorming` | Major architectural decisions before planning |
| `superpowers:writing-plans` | Creating detailed implementation plans |
| `superpowers:subagent-driven-development` | Task-by-task execution with two-stage review |
| `superpowers:executing-plans` | Batch execution with checkpoints |
| `superpowers:requesting-code-review` | Reviewing completed work |
| `superpowers:systematic-debugging` | Diagnosing issues |

## Official Documentation

- **Plugin:** https://github.com/obra/superpowers
- **Marketplace:** https://github.com/obra/superpowers-marketplace
- **Discord:** https://discord.gg/Jd8Vphy9jq
