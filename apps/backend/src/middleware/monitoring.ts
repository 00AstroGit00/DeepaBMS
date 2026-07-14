import { Request, Response, NextFunction } from 'express';
import { run } from '../db';
import { renderPrometheus, dbGauges, trackHttpRequest } from './metrics';

interface MetricSample {
  count: number;
  totalDuration: number;
  statusCounts: Record<number, number>;
}

const metricsStore: Map<string, MetricSample> = new Map();
const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || '500',
  10,
);
const METRICS_FLUSH_INTERVAL = parseInt(
  process.env.METRICS_FLUSH_INTERVAL || '60000',
  10,
);

let lastFlush = Date.now();

function getKey(method: string, path: string): string {
  return `${method}:${path}`;
}

export function trackRequestMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const key = getKey(req.method, req.route?.path || req.path);
    const existing = metricsStore.get(key) || {
      count: 0,
      totalDuration: 0,
      statusCounts: {},
    };
    existing.count++;
    existing.totalDuration += duration;
    existing.statusCounts[res.statusCode] =
      (existing.statusCounts[res.statusCode] || 0) + 1;
    metricsStore.set(key, existing);
    // M2-1: feed the Prometheus registry for scrape-based alerting.
    trackHttpRequest(
      duration,
      res.statusCode,
      req.method,
      req.route?.path || req.path,
    );
  });
  next();
}

export async function flushMetrics(): Promise<void> {
  const now = Date.now();
  if (now - lastFlush < METRICS_FLUSH_INTERVAL) return;
  lastFlush = now;
  for (const [key, sample] of metricsStore.entries()) {
    const [method, ...pathParts] = key.split(':');
    const path = pathParts.join(':');
    try {
      await run(
        `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `mm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          `request.count.${method}.${path.replace(/\//g, '_')}`,
          sample.count,
          'count',
          JSON.stringify({ method, path, statusCounts: sample.statusCounts }),
          new Date().toISOString(),
        ],
      );
      await run(
        `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `mm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          `request.latency_ms.${method}.${path.replace(/\//g, '_')}`,
          sample.count > 0 ? sample.totalDuration / sample.count : 0,
          'ms',
          JSON.stringify({ method, path }),
          new Date().toISOString(),
        ],
      );
    } catch (err: any) {
      console.error('[monitoring] Failed to flush metrics:', err.message);
    }
  }
  metricsStore.clear();
}

export function recordApiMetric(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
  userRole?: string,
): void {
  run(
    `INSERT INTO request_metrics (id, method, path, status_code, duration_ms, request_id, user_id, user_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `rm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      method,
      path,
      statusCode,
      durationMs,
      '-',
      userId || null,
      userRole || null,
    ],
  ).catch(() => {});
}

export function recordSlowQuery(
  queryText: string,
  durationMs: number,
  params?: string,
  source?: string,
  requestId?: string,
): void {
  if (durationMs < SLOW_QUERY_THRESHOLD_MS) return;
  run(
    `INSERT INTO slow_query_log (id, query_text, duration_ms, params, source, request_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      queryText,
      durationMs,
      params || null,
      source || null,
      requestId || null,
    ],
  ).catch(() => {});
}

export function getMetricsSnapshot(): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, sample] of metricsStore.entries()) {
    result[key] = {
      count: sample.count,
      avgDuration:
        sample.count > 0 ? Math.round(sample.totalDuration / sample.count) : 0,
      statusCounts: sample.statusCounts,
    };
  }
  return result;
}

export async function getMetricsMiddleware(
  req: Request,
  res: Response,
): Promise<void> {
  // M2-1: refresh DB-derived gauges, then emit Prometheus exposition format.
  await dbGauges().catch(() => {});
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderPrometheus());
}
