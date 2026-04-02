import * as fs from 'fs/promises'
import type { EvalResult, Check, PerformanceMetrics } from './types'

const LOG_SYMBOLS = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
  info: 'ℹ'
}

export class OutputFormatter {
  private log_level: 'quiet' | 'normal' | 'verbose'

  constructor(log_level: 'quiet' | 'normal' | 'verbose' = 'normal') {
    this.log_level = log_level
  }

  formatHeader(harnessPath: string): string {
    return [
      '=== Agent Eval Report ===',
      `Timestamp: ${new Date().toISOString()}`,
      `Harness: ${harnessPath}`,
      ''
    ].join('\n')
  }

  formatCheck(check: Check): string {
    const symbol = check.passed ? LOG_SYMBOLS.pass : LOG_SYMBOLS.fail
    const name = check.name
    const duration = `(${check.duration_ms}ms)`
    const error = check.error ? ` - ${check.error}` : ''
    return `${symbol} ${name}: ${check.passed ? 'PASS' : 'FAIL'} ${duration}${error}`
  }

  formatSection(name: string, checks: Check[]): string {
    const lines = [`\n[${name}]`]
    for (const check of checks) {
      lines.push(this.formatCheck(check))
    }
    return lines.join('\n')
  }

  formatMetrics(metrics: PerformanceMetrics): string {
    const lines = ['\n[Performance Metrics]']
    lines.push(`  Tokens: avg=${metrics.tokens.avg_tokens_per_session}, max=${metrics.tokens.max_tokens_per_session}`)
    lines.push(`  Latency: avg=${metrics.latency.avg_latency_ms}ms, p95=${metrics.latency.p95_latency_ms}ms`)
    lines.push(`  Memory: growth=${(metrics.memory.growth_ratio * 100).toFixed(1)}%, leak=${metrics.memory.leak_detected ? 'yes' : 'no'}`)
    lines.push(`  Concurrency: max=${metrics.concurrency.max_concurrent_sessions}, throughput=${metrics.concurrency.avg_throughput_per_second}/s`)
    return lines.join('\n')
  }

  formatSummary(result: EvalResult): string {
    const { summary } = result
    const passIcon = result.passed ? LOG_SYMBOLS.pass : LOG_SYMBOLS.fail
    const status = result.passed ? 'PASSED' : 'FAILED'

    return [
      '',
      '=== Summary ===',
      `${passIcon} Overall: ${status}`,
      `  Functionality: ${summary.functionality.passed}/${summary.functionality.passed + summary.functionality.failed}`,
      `  Security: ${summary.security.passed}/${summary.security.passed + summary.security.failed}`,
      `  Performance: ${summary.performance.passed}/${summary.performance.passed + summary.performance.failed}`,
      `  Total: ${summary.total.passed}/${summary.total.total}`
    ].join('\n')
  }

  format(result: EvalResult, harnessPath: string): string {
    const parts: string[] = []

    if (this.log_level !== 'quiet') {
      parts.push(this.formatHeader(harnessPath))
      parts.push(this.formatSection('Functionality', result.checks.filter(c => c.id.startsWith('func-'))))
      parts.push(this.formatSection('Security', result.checks.filter(c => c.id.startsWith('sec-'))))
      if (result.performance_metrics) {
        parts.push(this.formatMetrics(result.performance_metrics))
      }
      parts.push(this.formatSummary(result))
    }

    return parts.join('\n')
  }

  async writeJson(result: EvalResult, filePath: string): Promise<void> {
    const { detailed_log, ...jsonResult } = result
    const output = JSON.stringify(jsonResult, null, 2)
    await fs.writeFile(filePath, output, 'utf-8')
  }
}