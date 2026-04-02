# Agent Loop Engineering Practice

## Source

`claw-code-main/src/runtime.py::PortRuntime.run_turn_loop`

## Core Implementation

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

## Key Design Insights

### 1. Turn-based Loop with Explicit Termination

```python
for turn in range(max_turns):
    turn_prompt = prompt if turn == 0 else f'{prompt} [turn {turn + 1}]'
    result = engine.submit_message(turn_prompt, ...)
    if result.stop_reason != 'completed':
        break
```

- **Pre-iteration Turn Prompt Construction**: First round uses raw prompt, subsequent rounds append `[turn N]` marker
- **Explicit Break Condition**: Terminate early when `stop_reason != 'completed'`
- **max_turns as Hard Ceiling**: Prevents infinite loops

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

**Termination Conditions Mapping**:

| Spec Definition | claw-code Implementation |
|----------------|-------------------------|
| LLM returns finish signal | `stop_reason = 'completed'` |
| max_turns limit reached | `stop_reason = 'max_turns_reached'` |
| Budget exhausted | `stop_reason = 'max_budget_reached'` |
| User interrupt | (external signal) |

### 3. Message Append-only Pattern

```python
class QueryEnginePort:
    mutable_messages: list[str] = field(default_factory=list)  # mutable internally

    def submit_message(self, prompt: str, ...) -> TurnResult:
        # ... compute result ...
        self.mutable_messages.append(prompt)  # always append, never modify history
        self.transcript_store.append(prompt)  # separate transcript
        return TurnResult(...)
```

## Adaptation Guide

### Python Project

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

### TypeScript Project

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

## Key Takeaways

1. **Never modify message history inside the loop**: Append only to preserve audit trail
2. **Budget check before call**: Checking after overspend is too late
3. **stop_reason must enumerate all cases**: Enables debugging and monitoring
