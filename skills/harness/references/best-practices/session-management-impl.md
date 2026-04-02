# Session Management 工程实践

## 源码来源

- `claw-code-main/src/session_store.py::StoredSession`
- `claw-code-main/src/query_engine.py::QueryEnginePort`

## 核心实现

### Immutable Session Data Model

```python
@dataclass(frozen=True)
class StoredSession:
    session_id: str
    messages: tuple[str, ...]  # tuple = immutable list
    input_tokens: int
    output_tokens: int
```

**关键设计**: 使用 `frozen=True` dataclass + `tuple` 确保 Session 不可变。

### Session Persistence

```python
DEFAULT_SESSION_DIR = Path('.port_sessions')

def save_session(session: StoredSession, directory: Path | None = None) -> Path:
    target_dir = directory or DEFAULT_SESSION_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f'{session.session_id}.json'
    path.write_text(json.dumps(asdict(session), indent=2))
    return path

def load_session(session_id: str, directory: Path | None = None) -> StoredSession:
    target_dir = directory or DEFAULT_SESSION_DIR
    data = json.loads((target_dir / f'{session_id}.json').read_text())
    return StoredSession(
        session_id=data['session_id'],
        messages=tuple(data['messages']),  # 恢复时转回 tuple
        input_tokens=data['input_tokens'],
        output_tokens=data['output_tokens'],
    )
```

### QueryEnginePort 中的 Session 整合

```python
class QueryEnginePort:
    manifest: PortManifest
    config: QueryEngineConfig = field(default_factory=QueryEngineConfig)
    session_id: str = field(default_factory=lambda: uuid4().hex)
    mutable_messages: list[str] = field(default_factory=list)  # 运行时可变
    permission_denials: list[PermissionDenial] = field(default_factory=list)
    total_usage: UsageSummary = field(default_factory=UsageSummary)
    transcript_store: TranscriptStore = field(default_factory=TranscriptStore)

    @classmethod
    def from_saved_session(cls, session_id: str) -> 'QueryEnginePort':
        stored = load_session(session_id)
        transcript = TranscriptStore(entries=list(stored.messages), flushed=True)
        return cls(
            manifest=build_port_manifest(),
            session_id=stored.session_id,
            mutable_messages=list(stored.messages),  # 恢复为可变 list
            total_usage=UsageSummary(stored.input_tokens, stored.output_tokens),
            transcript_store=transcript,
        )

    def persist_session(self) -> str:
        self.flush_transcript()
        path = save_session(
            StoredSession(
                session_id=self.session_id,
                messages=tuple(self.mutable_messages),  # 持久化时转不可变
                input_tokens=self.total_usage.input_tokens,
                output_tokens=self.total_usage.output_tokens,
            )
        )
        return str(path)
```

## 关键设计解读

### 1. Runtime vs Persistence 状态分离

| 阶段 | messages 类型 | 原因 |
|-----|-------------|------|
| Runtime | `list[str]` (可变) | 高频 append，效率优先 |
| Persistence | `tuple[str, ...]` (不可变) | 序列化后不可变，保证 audit trail |

### 2. Session Resume 流程

```python
# 1. 创建新 Session
engine = QueryEnginePort.from_workspace()

# 2. 处理请求
result = engine.submit_message(prompt, ...)

# 3. 持久化
path = engine.persist_session()

# 4. 恢复时
restored = QueryEnginePort.from_saved_session(session_id)
```

### 3. Transcript Store 模式

```python
class TranscriptStore:
    entries: list[str] = field(default_factory=list)
    flushed: bool = False

    def append(self, entry: str) -> None:
        self.entries.append(entry)

    def flush(self) -> None:
        self.flushed = True

    def compact(self, keep_last: int) -> None:
        if len(self.entries) > keep_last:
            self.entries = self.entries[-keep_last:]
        self.flushed = False
```

## 适配建议

### Python 项目

```python
from dataclasses import dataclass, field
from uuid import uuid4
import json
from pathlib import Path
from typing import Iterator

@dataclass(frozen=True)
class Session:
    id: str
    messages: tuple[Message, ...]
    usage: UsageStats

class SessionManager:
    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save(self, session: Session) -> Path:
        path = self.storage_dir / f"{session.id}.json"
        path.write_text(json.dumps({
            'id': session.id,
            'messages': [asdict(m) for m in session.messages],
            'usage': asdict(session.usage),
        }, indent=2))
        return path

    def load(self, session_id: str) -> Session:
        path = self.storage_dir / f"{session_id}.json"
        data = json.loads(path.read_text())
        return Session(
            id=data['id'],
            messages=tuple(Message(**m) for m in data['messages']),
            usage=UsageStats(**data['usage']),
        )

    def create(self) -> Session:
        return Session(
            id=uuid4().hex,
            messages=(),
            usage=UsageStats(0, 0),
        )
```

### Message Compaction 策略

当 session 过长时需要 compaction（见 `compact_messages_if_needed`）：

```python
def compact_messages_if_needed(self) -> None:
    if len(self.mutable_messages) > self.config.compact_after_turns:
        # 保留最近 N 条，丢弃早期消息
        self.mutable_messages[:] = self.mutable_messages[-self.config.compact_after_turns:]
    self.transcript_store.compact(self.config.compact_after_turns)
```

**注意**: Compaction 会丢失历史信息，适用于 context window 受限的场景。

## History Log (Audit Trail)

```python
@dataclass(frozen=True)
class HistoryEvent:
    title: str
    detail: str

@dataclass
class HistoryLog:
    events: list[HistoryEvent] = field(default_factory=list)

    def add(self, title: str, detail: str) -> None:
        self.events.append(HistoryEvent(title=title, detail=detail))

    def as_markdown(self) -> str:
        lines = ['# Session History', '']
        lines.extend(f'- {event.title}: {event.detail}' for event in self.events)
        return '\n'.join(lines)
```

使用示例:

```python
history = HistoryLog()
history.add('routing', f'matches={len(matches)} for prompt={prompt!r}')
history.add('execution', f'command_execs={len(command_execs)} tool_execs={len(tool_execs)}')
history.add('turn', f'stop={turn_result.stop_reason}')
```

## 注意事项

1. **Session ID 使用 UUID**: 保证全局唯一性
2. **持久化格式选择**: JSON 便于调试，MessagePack 效率更高
3. **异步保存**: 生产环境应使用 async/background 写入，避免阻塞 loop
