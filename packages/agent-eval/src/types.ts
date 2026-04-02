// Configuration
export interface EvalConfig {
  harness_path: string
  fixtures_dir: string
  config: {
    timeout_per_test_ms: number
    max_concurrent_tests: number
    token_budget_per_session: number
    enable_performance_metrics: boolean
  }
  output: OutputConfig
}

export interface OutputConfig {
  log_level: 'quiet' | 'normal' | 'verbose'
  json_file?: string
}

// Fixture (from agent-tdd)
export interface Fixture {
  description: string
  layer: string
  input: string
  expected_tools: string[]
  session_config: SessionConfig
}

export interface SessionConfig {
  permission: PermissionMode
  agent_timeout_ms?: number
  hooks?: Record<string, string[]>
}

export type PermissionMode = 'ReadOnly' | 'WorkspaceWrite' | 'DangerFullAccess' | 'Prompt' | 'Allow'

// Results
export interface EvalResult {
  passed: boolean
  summary: Summary
  checks: Check[]
  failed_checks: FailedCheck[]
  performance_metrics: PerformanceMetrics
  detailed_log: string
}

export interface Summary {
  functionality: { passed: number; failed: number }
  security: { passed: number; failed: number }
  performance: { passed: number; failed: number }
  total: { passed: number; failed: number; total: number }
}

export interface Check {
  id: string
  name: string
  passed: boolean
  duration_ms: number
  error?: string
}

export interface FailedCheck extends Check {
  severity: 'warning' | 'error'
}

export interface PerformanceMetrics {
  tokens: TokenMetrics
  latency: LatencyMetrics
  memory: MemoryMetrics
  concurrency: ConcurrencyMetrics
  passed: boolean
  failed_metrics: string[]
}

export interface TokenMetrics {
  avg_tokens_per_session: number
  max_tokens_per_session: number
  min_tokens_per_session: number
  total_tokens_all_sessions: number
  cost_estimate_usd: number
}

export interface LatencyMetrics {
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  p99_latency_ms: number
  max_latency_ms: number
}

export interface MemoryMetrics {
  initial_heap_bytes: number
  final_heap_bytes: number
  growth_bytes: number
  growth_ratio: number
  leak_detected: boolean
}

export interface ConcurrencyMetrics {
  max_concurrent_sessions: number
  avg_throughput_per_second: number
}

// Harness interface (what we evaluate against)
export interface Harness {
  create_session(config: SessionConfig): Session
  run(session: Session, input: string): void
  fork_session(parent: Session): Session
  close_session(session: Session): void
}

export interface Session {
  id: string
  config: SessionConfig
  tool_calls: ToolCall[]
  blocked_tools: string[]
  messages: Message[]
}

export interface ToolCall {
  name: string
  input: unknown
  output?: unknown
  elapsed_ms?: number
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
}