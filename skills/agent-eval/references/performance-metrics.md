# Performance Metrics — Definitions and Thresholds

## Overview

Performance evaluation measures token usage, latency, memory behavior, and concurrency capacity.

---

## Token Usage Metrics

### Definition

```typescript
interface TokenUsage {
  prompt_tokens: number      // Tokens in system prompt + user input
  completion_tokens: number  // Tokens in model response
  total_tokens: number      // Sum of above
}

interface TokenMetrics {
  avg_tokens_per_session: number
  max_tokens_per_session: number
  min_tokens_per_session: number
  total_tokens_all_sessions: number
  cost_estimate_usd: number
}
```

### Calculation

```typescript
function calculate_token_metrics(sessions: Session[]): TokenMetrics {
  const token_counts = sessions.map(s => s.usage.total_tokens)

  return {
    avg_tokens_per_session: mean(token_counts),
    max_tokens_per_session: Math.max(...token_counts),
    min_tokens_per_session: Math.min(...token_counts),
    total_tokens_all_sessions: token_counts.reduce((a, b) => a + b, 0),
    cost_estimate_usd: calculate_cost(token_counts)
  }
}

function calculate_cost(total_tokens: number): number {
  // Claude Opus pricing (example)
  const PROMPT_COST_PER_1K = 0.015  // $15 per 1M input tokens
  const COMPLETION_COST_PER_1K = 0.075  // $75 per 1M output tokens

  return (total_tokens / 1000) * (PROMPT_COST_PER_1K + COMPLETION_COST_PER_1K)
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| avg_tokens_per_session | 5000 | token_budget_per_session |
| max_tokens_per_session | 50000 | token_budget_per_session |
| cost_estimate_usd | $1.00 | max_cost_per_session |

---

## Latency Metrics

### Definition

```typescript
interface LatencyMetrics {
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  p99_latency_ms: number
  max_latency_ms: number
}
```

### Measurement

```typescript
function measure_latency(harness: Harness, fixture: Fixture): LatencyMetrics {
  const tool_latencies: number[] = []

  session = harness.create_session(fixture.session_config)

  harness.on('tool_call', (tool) => {
    tool.start_time = Date.now()
  })

  harness.on('tool_result', (tool) => {
    tool.elapsed_ms = Date.now() - tool.start_time
    tool_latencies.push(tool.elapsed_ms)
  })

  harness.run(session, fixture.input)

  return calculate_percentiles(tool_latencies)
}

function calculate_percentiles(values: number[]): LatencyMetrics {
  sorted = values.sort((a, b) => a - b)

  return {
    avg_latency_ms: mean(sorted),
    p50_latency_ms: percentile(sorted, 50),
    p95_latency_ms: percentile(sorted, 95),
    p99_latency_ms: percentile(sorted, 99),
    max_latency_ms: Math.max(...sorted)
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| avg_latency_ms | 500 | max_avg_latency_ms |
| p95_latency_ms | 2000 | max_p95_latency_ms |
| max_latency_ms | 10000 | max_latency_ms |

---

## Memory Metrics

### Memory Leak Detection

```typescript
interface MemoryMetrics {
  initial_heap_bytes: number
  final_heap_bytes: number
  growth_bytes: number
  growth_ratio: number
  leak_detected: boolean
}

function detect_memory_leak(
  harness: Harness,
  iterations: number = 100
): MemoryMetrics {
  // Force GC if available
  if (global.gc) {
    global.gc()
  }

  initial = process.memoryUsage().heapUsed

  for (i = 0; i < iterations; i++) {
    session = harness.create_session()
    harness.run(session, 'read file')
    harness.close_session(session)
  }

  // Force GC again
  if (global.gc) {
    global.gc()
  }

  final = process.memoryUsage().heapUsed
  growth = final - initial
  ratio = growth / initial

  return {
    initial_heap_bytes: initial,
    final_heap_bytes: final,
    growth_bytes: growth,
    growth_ratio: ratio,
    leak_detected: ratio > 0.1  // 10% threshold
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| growth_ratio | 0.1 (10%) | max_memory_growth_ratio |
| growth_bytes | 100MB | max_memory_growth_bytes |

---

## Concurrency Metrics

### Capacity Testing

```typescript
interface ConcurrencyMetrics {
  max_concurrent_sessions: number
  avg_throughput_per_second: number
}

function measure_concurrency(harness: Harness): ConcurrencyMetrics {
  let max_concurrent = 0
  let active_count = 0

  harness.on('session_start', () => { active_count++ })
  harness.on('session_end', () => { active_count-- })

  start = Date.now()

  sessions = Array(20).fill().map(() => {
    s = harness.create_session()
    harness.run_async(s, 'do work')
    return s
  })

  await Promise.all(sessions.map(s => s.done))

  duration = Date.now() - start
  throughput = sessions.length / (duration / 1000)

  return {
    max_concurrent_sessions: max_concurrent,
    avg_throughput_per_second: throughput
  }
}
```

### Default Thresholds

| Metric | Default Threshold | Config Key |
|--------|-----------------|------------|
| max_concurrent_sessions | 4 | min_concurrent_capacity |
| avg_throughput_per_second | 10 | min_throughput |

---

## Complete Metrics Report

```typescript
interface PerformanceReport {
  tokens: TokenMetrics
  latency: LatencyMetrics
  memory: MemoryMetrics
  concurrency: ConcurrencyMetrics

  passed: boolean
  failed_metrics: string[]
}

function generate_performance_report(
  harness: Harness,
  fixtures: Fixture[],
  config: PerformanceConfig
): PerformanceReport {
  const report = {
    tokens: calculate_token_metrics(sessions),
    latency: measure_latency(harness, fixtures),
    memory: detect_memory_leak(harness),
    concurrency: measure_concurrency(harness),
    passed: true,
    failed_metrics: []
  }

  // Check thresholds
  if (report.tokens.avg_tokens_per_session > config.token_budget) {
    report.passed = false
    report.failed_metrics.push('token_budget_exceeded')
  }

  if (report.latency.p95_latency_ms > config.max_p95_latency_ms) {
    report.passed = false
    report.failed_metrics.push('p95_latency_exceeded')
  }

  if (report.memory.leak_detected) {
    report.passed = false
    report.failed_metrics.push('memory_leak_detected')
  }

  if (report.concurrency.max_concurrent_sessions < config.min_concurrent_capacity) {
    report.passed = false
    report.failed_metrics.push('insufficient_concurrency')
  }

  return report
}
```

---

## Summary Table

| Category | Metric | Default Threshold | Severity if Exceeded |
|----------|--------|-----------------|---------------------|
| Tokens | avg_tokens_per_session | 5000 | Warning |
| Tokens | max_tokens_per_session | 50000 | Error |
| Tokens | cost_estimate_usd | $1.00 | Warning |
| Latency | avg_latency_ms | 500 | Warning |
| Latency | p95_latency_ms | 2000 | Error |
| Latency | max_latency_ms | 10000 | Error |
| Memory | growth_ratio | 0.1 | Error |
| Memory | growth_bytes | 100MB | Error |
| Concurrency | max_concurrent_sessions | 4 | Warning |
| Concurrency | throughput | 10/sec | Warning |
