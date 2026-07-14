import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  incCounter,
  setGauge,
  trackHttpRequest,
  renderPrometheus,
  dbGauges,
} from '../src/middleware/metrics';

/**
 * OBS-01 regression: the /api/platform/metrics endpoint must emit valid
 * Prometheus exposition text (not JSON). This also exercises the histogram
 * rendering used by the latency SLO alerts (OBS-02).
 */
describe('metrics exposition format (OBS-01)', () => {
  beforeEach(() => {
    // Reset module state by re-importing is overkill; counters accumulate but
    // assertions below are presence-based.
  });

  test('counter renders as a typed series', () => {
    incCounter(
      'deepa_workflow_jobs_processed',
      {},
      3,
      'Workflow jobs processed by the scheduler',
    );
    const out = renderPrometheus();
    expect(out).toContain('# TYPE deepa_workflow_jobs_processed counter');
    expect(out).toMatch(/deepa_workflow_jobs_processed \d+/);
  });

  test('gauge renders with numeric value', () => {
    setGauge('deepa_ledger_post_failures', 0, {}, 'Unresolved ledger failures');
    const out = renderPrometheus();
    expect(out).toContain('# TYPE deepa_ledger_post_failures gauge');
    expect(out).toContain('deepa_ledger_post_failures 0');
  });

  test('http histogram renders bucket/count/sum series', () => {
    trackHttpRequest(120, 200, 'GET', '/api/health');
    trackHttpRequest(900, 500, 'POST', '/api/billing');
    const out = renderPrometheus();
    expect(out).toContain('# TYPE deepa_http_request_duration_seconds histogram');
    expect(out).toMatch(/deepa_http_request_duration_seconds_bucket\{[^}]*le="1"\}\s+\d+/);
    expect(out).toMatch(/deepa_http_request_duration_seconds_count\{[^}]*\}\s+2/);
    expect(out).toMatch(/deepa_http_request_duration_seconds_sum\{[^}]*\}\s+[\d.]+/);
  });

  test('output is line-delimited text, not JSON', () => {
    const out = renderPrometheus();
    expect(() => JSON.parse(out)).toThrow();
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  test('dbGauges does not throw when DB is unavailable', async () => {
    await expect(dbGauges()).resolves.toBeUndefined();
  });
});
