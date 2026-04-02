import type { Harness, Session, PerformanceMetrics, TokenMetrics, LatencyMetrics, MemoryMetrics, ConcurrencyMetrics } from './types'

export interface PerformanceConfig {
  token_budget_per_session: number
  max_cost_per_session: number
  max_avg_latency_ms: number
  max_p95_latency_ms: number
  max_latency_ms: number
  max_memory_growth_ratio: number
  max_memory_growth_bytes: number
  min_concurrent_capacity: number
  min_throughput: number
}

const DEFAULT_CONFIG: PerformanceConfig = {
  token_budget_per_session: 5000,
  max_cost_per_session: 1.0,
  max_avg_latency_ms: 500,
  max_p95_latency_ms: 2000,
  max_latency_ms: 10000,
  max_memory_growth_ratio: 0.1,
  max_memory_growth_bytes: 100 * 1024 * 1024,
  min_concurrent_capacity: 4,
  min_throughput: 10
}

export function calculateTokenMetrics(sessions: Session[]): TokenMetrics {
  const counts = sessions.map(s => {
    const toolCalls = s.tool_calls.length
    const messages = s.messages.length
    return (toolCalls + messages) * 50
  })

  return {
    avg_tokens_per_session: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0,
    max_tokens_per_session: counts.length ? Math.max(...counts) : 0,
    min_tokens_per_session: counts.length ? Math.min(...counts) : 0,
    total_tokens_all_sessions: counts.reduce((a, b) => a + b, 0),
    cost_estimate_usd: counts.reduce((a, b) => a + b, 0) * 0.00003
  }
}

export function calculateLatencyMetrics(toolLatencies: number[]): LatencyMetrics {
  if (!toolLatencies.length) {
    return { avg_latency_ms: 0, p50_latency_ms: 0, p95_latency_ms: 0, p99_latency_ms: 0, max_latency_ms: 0 }
  }
  const sorted = [...toolLatencies].sort((a, b) => a - b)
  return {
    avg_latency_ms: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p50_latency_ms: percentile(sorted, 50),
    p95_latency_ms: percentile(sorted, 95),
    p99_latency_ms: percentile(sorted, 99),
    max_latency_ms: sorted[sorted.length - 1]
  }
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

export function detectMemoryLeak(initialBytes: number, finalBytes: number): MemoryMetrics {
  const growth = finalBytes - initialBytes
  const ratio = growth / initialBytes
  return {
    initial_heap_bytes: initialBytes,
    final_heap_bytes: finalBytes,
    growth_bytes: growth,
    growth_ratio: ratio,
    leak_detected: ratio > DEFAULT_CONFIG.max_memory_growth_ratio
  }
}

export async function measureConcurrency(harness: Harness, testSessions: number): Promise<ConcurrencyMetrics> {
  let maxConcurrent = 0
  let activeCount = 0

  const sessions: Session[] = []
  const start = Date.now()

  for (let i = 0; i < testSessions; i++) {
    const session = harness.create_session({ permission: 'ReadOnly' })
    sessions.push(session)
    activeCount++
    maxConcurrent = Math.max(maxConcurrent, activeCount)
  }

  await Promise.all(sessions.map(s => harness.runAsync(s, 'noop')))

  const duration = (Date.now() - start) / 1000
  const throughput = sessions.length / duration

  return {
    max_concurrent_sessions: maxConcurrent,
    avg_throughput_per_second: throughput
  }
}

export async function collectPerformanceMetrics(
  harness: Harness,
  sessions: Session[],
  config: Partial<PerformanceConfig> = {}
): Promise<PerformanceMetrics> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const failed_metrics: string[] = []

  const tokens = calculateTokenMetrics(sessions)
  const allLatencies = sessions.flatMap(s => s.tool_calls.map(t => t.elapsed_ms ?? 0))
  const latency = calculateLatencyMetrics(allLatencies)

  const memBefore = process.memoryUsage().heapUsed
  for (const session of sessions) {
    harness.run(session, 'noop')
  }
  const memAfter = process.memoryUsage().heapUsed
  const memory = detectMemoryLeak(memBefore, memAfter)

  const concurrency = await measureConcurrency(harness, 4)

  const passed = !(
    tokens.avg_tokens_per_session > cfg.token_budget_per_session ||
    latency.p95_latency_ms > cfg.max_p95_latency_ms ||
    memory.leak_detected ||
    concurrency.max_concurrent_sessions < cfg.min_concurrent_capacity
  )

  return {
    tokens,
    latency,
    memory,
    concurrency,
    passed,
    failed_metrics: failed_metrics
  }
}