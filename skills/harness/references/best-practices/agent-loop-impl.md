# Agent Loop 工程实践

## 源码来源

`claw-code-main/src/runtime.py::PortRuntime.run_turn_loop`

## 核心实现

```python
def run_turn_loop(self, prompt: str, limit: int = 5, max_turns: int = 3, structured_output: bool = False) -> list[TurnResult]:
    engine = QueryEnginePort.from_workspace()
    engine.config = QueryEngineConfig(max_turns=max_turns, structured_output=structured_output)
    matches = self.route_prompt(prompt, limit=limit)
    command_names = tuple(match.name for match in matches if match.kind == 'command')
    tool_names = tuple(match.name for match in matches if match.kind == 'tool')
    results: list[TurnResult] = []
    for turn in range(max_turns):
        turn_prompt = prompt if turn == 0 else f'{prompt} [turn {turn + 1}]'
        result = engine.submit_message(turn_prompt, command_names, tool_names, ())
        results.append(result)
        if result.stop_reason != 'completed':
            break
    return results
```

## 关键设计解读

### 1. Turn-based Loop with Explicit Termination

```python
for turn in range(max_turns):
    turn_prompt = prompt if turn == 0 else f'{prompt} [turn {turn + 1}]'
    result = engine.submit_message(turn_prompt, ...)
    if result.stop_reason != 'completed':
        break
```

- **每次迭代前构造 Turn Prompt**: 第一轮用原始 prompt，后续轮次添加 `[turn N]` 标记
- **显式 break 条件**: `stop_reason != 'completed'` 时提前终止
- **max_turns 作为硬上限**: 防止无限循环

### 2. Budget-aware Termination (query_engine.py)

```python
@dataclass(frozen=True)
class QueryEngineConfig:
    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12
    structured_output: bool = False
    structured_retry_limit: int = 2

def submit_message(self, prompt: str, ...) -> TurnResult:
    # ...
    projected_usage = self.total_usage.add_turn(prompt, output)
    stop_reason = 'completed'
    if projected_usage.input_tokens + projected_usage.output_tokens > self.config.max_budget_tokens:
        stop_reason = 'max_budget_reached'
    # ...
    return TurnResult(..., stop_reason=stop_reason)
```

**Termination Conditions 对应关系**:

| 规范定义 | claw-code 实现 |
|---------|---------------|
| LLM returns finish signal | `stop_reason = 'completed'` |
| max_turns limit reached | `stop_reason = 'max_turns_reached'` |
| Budget exhausted | `stop_reason = 'max_budget_reached'` |
| User interrupt | (external signal) |

### 3. Message Append-only Pattern

```python
class QueryEnginePort:
    mutable_messages: list[str] = field(default_factory=list)  # 内部可变

    def submit_message(self, prompt: str, ...) -> TurnResult:
        # ... compute result ...
        self.mutable_messages.append(prompt)  # 总是 append，不修改历史
        self.transcript_store.append(prompt)  # 独立 transcript
        return TurnResult(...)
```

## 适配建议

### Python 项目

```python
from dataclasses import dataclass, field
from typing import Protocol

class LLMProvider(Protocol):
    async def complete(self, messages: list[Message], config: LLMConfig) -> LLMResponse: ...

@dataclass(frozen=True)
class TurnResult:
    output: str
    stop_reason: str  # 'completed' | 'max_turns' | 'max_budget' | 'error'
    usage: UsageStats

async def run_agent_loop(
    provider: LLMProvider,
    initial_prompt: str,
    max_turns: int = 100,
    max_budget_tokens: int = 100000,
) -> TurnResult:
    messages = [user_message(initial_prompt)]
    total_usage = UsageStats(0, 0)

    for turn in range(max_turns):
        context = render(messages)
        response = await provider.complete(messages, config)

        if response.is_turn_end():
            return TurnResult(response.content, 'completed', response.usage)

        total_usage = total_usage.add(response.usage)
        if total_usage.input_tokens + total_usage.output_tokens > max_budget_tokens:
            return TurnResult('', 'max_budget', total_usage)

        messages.append(assistant_message(response))

        for tool_call in response.tool_calls:
            result = await execute_tool(tool_call)
            messages.append(tool_result_message(tool_call.id, result))

    return TurnResult('', 'max_turns', total_usage)
```

### TypeScript 项目

```typescript
interface TurnResult {
  output: string;
  stopReason: 'completed' | 'max_turns' | 'max_budget';
  usage: UsageStats;
}

async function runAgentLoop(
  provider: LLMProvider,
  initialPrompt: string,
  maxTurns = 100,
  maxBudgetTokens = 100000
): Promise<TurnResult> {
  const messages: Message[] = [userMessage(initialPrompt)];
  let totalUsage = { inputTokens: 0, outputTokens: 0 };

  for (let turn = 0; turn < maxTurns; turn++) {
    const context = render(messages);
    const response = await provider.complete(messages, context);

    if (response.isTurnEnd()) {
      return { output: response.content, stopReason: 'completed', usage: response.usage };
    }

    totalUsage = addUsage(totalUsage, response.usage);
    if (totalUsage.inputTokens + totalUsage.outputTokens > maxBudgetTokens) {
      return { output: '', stopReason: 'max_budget', usage: totalUsage };
    }

    messages.push(assistantMessage(response));

    for (const toolCall of response.toolCalls) {
      const result = await executeTool(toolCall);
      messages.push(toolResultMessage(toolCall.id, result));
    }
  }

  return { output: '', stopReason: 'max_turns', usage: totalUsage };
}
```

## 注意事项

1. **不要在循环内修改 messages 历史**: append only，保证 audit trail
2. **预算检查在调用前**: 防止超支后再检查已经太晚
3. **stop_reason 必须枚举所有情况**: 便于调试和监控
