# Config Engineering Practice

## Source

`claw-code-main/src/query_engine.py::QueryEngineConfig`

## Core Implementation

```python
@dataclass(frozen=True)
class QueryEngineConfig:
    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12
    structured_output: bool = False
    structured_retry_limit: int = 2
```

## Key Design Insights

### 1. Frozen Dataclass

Using `frozen=True` ensures config immutability, preventing accidental modification during runtime:

```python
@dataclass(frozen=True)  # immutable
class QueryEngineConfig:
    max_turns: int = 8
    # ...

config = QueryEngineConfig(max_turns=10)
# config.max_turns = 5  # Error: cannot assign to field ...
```

### 2. Default Values

Sensible defaults reduce caller configuration burden:

| Config | Default | Rationale |
|--------|---------|-----------|
| max_turns | 8 | Balance depth and cost |
| max_budget_tokens | 2000 | Conservative budget control |
| compact_after_turns | 12 | Trigger compaction |
| structured_output | False | Requires explicit opt-in |
| structured_retry_limit | 2 | Prevents infinite retry |

### 3. Turn Budget Tracking

```python
@dataclass(frozen=True)
class UsageSummary:
    input_tokens: int
    output_tokens: int

    def add_turn(self, prompt: str, output: str) -> 'UsageSummary':
        # Simplified token estimation
        projected_input = self.input_tokens + len(prompt.split()) * 1.3
        projected_output = self.output_tokens + len(output.split()) * 1.3
        return UsageSummary(
            int(projected_input),
            int(projected_output),
        )

    def total(self) -> int:
        return self.input_tokens + self.output_tokens
```

## Adaptation Guide

### Python Project

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass(frozen=True)
class LLMConfig:
    model: str = "claude-opus-4-6"
    temperature: float = 1.0
    max_tokens: int = 4096

@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    initial_delay_ms: int = 1000
    backoff_multiplier: float = 2.0
    max_delay_ms: int = 30000

@dataclass(frozen=True)
class SessionConfig:
    model: str = "claude-opus-4-6"
    max_turns: int = 100
    max_budget_tokens: int = 100000
    temperature: float = 1.0
    permissions: PermissionContext = field(default_factory=PermissionContext.create)
    tool_timeout_seconds: int = 60
    llm_retry_policy: RetryPolicy = field(default_factory=RetryPolicy)

    def with_overrides(self, **kwargs) -> 'SessionConfig':
        """Return new config merged with overrides"""
        import dataclasses
        return dataclasses.replace(self, **kwargs)
```

### TypeScript Project

```typescript
interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

interface SessionConfig {
  model: string;
  maxTurns: number;
  maxBudgetTokens: number;
  temperature: number;
  permissions: PermissionContext;
  toolTimeoutSeconds: number;
  llmRetryPolicy: RetryPolicy;
}

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2.0,
  maxDelayMs: 30000,
};

const defaultSessionConfig: SessionConfig = {
  model: 'claude-opus-4-6',
  maxTurns: 100,
  maxBudgetTokens: 100000,
  temperature: 1.0,
  permissions: createPermissionContext(),
  toolTimeoutSeconds: 60,
  llmRetryPolicy: defaultRetryPolicy,
};

function withOverrides(base: SessionConfig, overrides: Partial<SessionConfig>): SessionConfig {
  return { ...base, ...overrides };
}
```

### Retry Policy Implementation

```python
import asyncio
from dataclasses import dataclass

@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    initial_delay_ms: int = 1000
    backoff_multiplier: float = 2.0
    max_delay_ms: int = 30000

async def with_retry(policy: RetryPolicy, operation, *args, **kwargs):
    """Exponential backoff retry"""
    delay_ms = policy.initial_delay_ms
    last_error = None

    for attempt in range(policy.max_attempts):
        try:
            return await operation(*args, **kwargs)
        except (NetworkError, RateLimitError) as e:  # retryable errors
            last_error = e
            if attempt < policy.max_attempts - 1:
                await asyncio.sleep(delay_ms / 1000)
                delay_ms = min(delay_ms * policy.backoff_multiplier, policy.max_delay_ms)
        except (AuthError, PermissionError) as e:  # non-retryable errors
            raise

    raise last_error
```

## LLM Config vs Session Config

| Field | LLMConfig | SessionConfig |
|-------|-----------|----------------|
| scope | Single LLM call | Entire Session |
| model | ✓ | ✓ |
| temperature | ✓ | ✓ |
| max_tokens | ✓ | ✗ |
| max_turns | ✗ | ✓ |
| permissions | ✗ | ✓ |
| retry_policy | ✗ | ✓ |

## Spec to Implementation Mapping

| Spec Definition | claw-code Implementation |
|----------------|--------------------------|
| SessionConfig | `QueryEngineConfig` (simplified) |
| PermissionPolicy | `ToolPermissionContext` |
| RetryPolicy | (needs separate implementation) |
| LLMConfig | (not independently modeled in claw-code) |

## Key Takeaways

1. **Frozen vs Mutable**: Use `frozen=True` for config, regular dataclass for runtime state
2. **Token estimation**: Production should use precise libraries like tiktoken
3. **Lazy initialization**: Some config items (e.g., working_dir) can be resolved at runtime
4. **Config inheritance**: Use `with_overrides` for config layering
