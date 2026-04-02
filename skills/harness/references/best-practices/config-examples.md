# Config 工程实践

## 源码来源

`claw-code-main/src/query_engine.py::QueryEngineConfig`

## 核心实现

```python
@dataclass(frozen=True)
class QueryEngineConfig:
    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12
    structured_output: bool = False
    structured_retry_limit: int = 2
```

## 关键设计解读

### 1. Frozen Dataclass

使用 `frozen=True` 确保配置不可变，防止运行期意外修改：

```python
@dataclass(frozen=True)  # 不可变
class QueryEngineConfig:
    max_turns: int = 8
    # ...

config = QueryEngineConfig(max_turns=10)
# config.max_turns = 5  # Error: cannot assign to field ...
```

### 2. Default Values

合理的默认值减少调用方配置负担：

| 配置项 | 默认值 | 说明 |
|-------|--------|-----|
| max_turns | 8 | 平衡深度和成本 |
| max_budget_tokens | 2000 | 保守预算控制 |
| compact_after_turns | 12 | 触发 compaction |
| structured_output | False | 需显式开启 |
| structured_retry_limit | 2 | 防止无限重试 |

### 3. Turn Budget Tracking

```python
@dataclass(frozen=True)
class UsageSummary:
    input_tokens: int
    output_tokens: int

    def add_turn(self, prompt: str, output: str) -> 'UsageSummary':
        # 估算 token 数 (简化版)
        projected_input = self.input_tokens + len(prompt.split()) * 1.3
        projected_output = self.output_tokens + len(output.split()) * 1.3
        return UsageSummary(
            int(projected_input),
            int(projected_output),
        )

    def total(self) -> int:
        return self.input_tokens + self.output_tokens
```

## 适配建议

### Python 项目

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
        """返回新配置，合并 overrides"""
        import dataclasses
        return dataclasses.replace(self, **kwargs)
```

### TypeScript 项目

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

### Retry Policy 实现

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
    """指数退避重试"""
    delay_ms = policy.initial_delay_ms
    last_error = None

    for attempt in range(policy.max_attempts):
        try:
            return await operation(*args, **kwargs)
        except (NetworkError, RateLimitError) as e:  # 可重试错误
            last_error = e
            if attempt < policy.max_attempts - 1:
                await asyncio.sleep(delay_ms / 1000)
                delay_ms = min(delay_ms * policy.backoff_multiplier, policy.max_delay_ms)
        except (AuthError, PermissionError) as e:  # 不可重试错误
            raise

    raise last_error
```

## LLM Config 与 Session Config 区别

| 字段 | LLMConfig | SessionConfig |
|------|-----------|---------------|
| scope | 单次 LLM 调用 | 整个 Session |
| model | ✓ | ✓ |
| temperature | ✓ | ✓ |
| max_tokens | ✓ | ✗ |
| max_turns | ✗ | ✓ |
| permissions | ✗ | ✓ |
| retry_policy | ✗ | ✓ |

## 规范到实现的映射

| 规范定义 | claw-code 实现 |
|---------|---------------|
| SessionConfig | `QueryEngineConfig` (简化版) |
| PermissionPolicy | `ToolPermissionContext` |
| RetryPolicy | 需额外实现 |
| LLMConfig | (未在 claw-code 中独立建模) |

## 注意事项

1. **Frozen vs Mutable**: 配置用 `frozen=True`，运行时状态用普通 dataclass
2. **Token 估算**: 生产环境应使用 tiktoken 等精确库
3. **延迟初始化**: 某些配置项（如 working_dir）可在运行时解析
4. **配置继承**: 使用 `with_overrides` 实现配置分层
