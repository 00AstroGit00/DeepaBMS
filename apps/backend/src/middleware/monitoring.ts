import { Request, Response, NextFunction } from 'express';
import { run, query } from '../db';
import { renderPrometheus, dbGauges, trackHttpRequest } from './metrics';
import { recordSloMetric } from './metrics';

interface MetricSample {
  count: number;
  totalDuration: number;
  statusCounts: Record<number, number>;
}

interface TenantMetricSample extends MetricSample {
  tenantId: string;
}

const metricsStore: Map<string, MetricSample> = new Map();
const tenantMetricsStore: Map<string, TenantMetricSample> = new Map();
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

function getTenantKey(tenantId: string, method: string, path: string): string {
  return `${tenantId}:${method}:${path}`;
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

    const tenantId = (req as any).tenantId || 'default';
    const tKey = getTenantKey(tenantId, req.method, req.route?.path || req.path);
    const tExisting = tenantMetricsStore.get(tKey) || {
      count: 0,
      totalDuration: 0,
      statusCounts: {} as Record<number, number>,
      tenantId,
    } as TenantMetricSample;
    tExisting.count++;
    tExisting.totalDuration += duration;
    tExisting.statusCounts[res.statusCode] =
      (tExisting.statusCounts[res.statusCode] || 0) + 1;
    tenantMetricsStore.set(tKey, tExisting);

    trackHttpRequest(
      duration,
      res.statusCode,
      req.method,
      req.route?.path || req.path,
      tenantId,
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

  for (const [key, sample] of tenantMetricsStore.entries()) {
    const [tenantId, method, ...pathParts] = key.split(':');
    const path = pathParts.join(':');
    try {
      await run(
        `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `mm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          `tenant.request.count.${tenantId}.${method}.${path.replace(/\//g, '_')}`,
          sample.count,
          'count',
          JSON.stringify({ tenantId, method, path, statusCounts: sample.statusCounts }),
          new Date().toISOString(),
        ],
      );
    } catch (err: any) {
      console.error('[monitoring] Failed to flush tenant metrics:', err.message);
    }
  }
  metricsStore.clear();
  tenantMetricsStore.clear();
}

export function recordApiMetric(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
  userRole?: string,
  tenantId?: string,
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
      tenantId ? `tenant:${tenantId}` : '-',
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
  tenantId?: string,
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
      source ? `${source}${tenantId ? ` tenant:${tenantId}` : ''}` : (tenantId ? `tenant:${tenantId}` : null),
      requestId || null,
    ],
  ).catch(() => {});
}

export async function recordSloCheck(
  tenantId: string,
  sloName: string,
  sloLatencyMs: number,
  sloErrorRate: number,
  sloAvailability: number,
): Promise<void> {
  try {
    await run(
      `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `slo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        `slo.latency.${sloName}`,
        sloLatencyMs,
        'ms',
        JSON.stringify({ tenantId, sloName }),
        new Date().toISOString(),
      ],
    );
    await run(
      `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `slo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        `slo.error_rate.${sloName}`,
        sloErrorRate,
        'rate',
        JSON.stringify({ tenantId, sloName }),
        new Date().toISOString(),
      ],
    );
    await run(
      `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `slo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        `slo.availability.${sloName}`,
        sloAvailability,
        'rate',
        JSON.stringify({ tenantId, sloName }),
        new Date().toISOString(),
      ],
    );
    recordSloMetric(tenantId, sloName, sloLatencyMs, sloErrorRate, sloAvailability);
  } catch (err: any) {
    console.error('[monitoring] Failed to record SLO:', err.message);
  }
}

export async function getSloData(
  tenantId: string,
  sloName: string,
): Promise<{
  avgLatencyMs: number;
  errorRate: number;
  availability: number;
  totalRequests: number;
  violations24h: number;
}> {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const requests = await query(
      `SELECT COUNT(*) as total,
              COALESCE(AVG(duration_ms), 0) as avg_duration,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errors,
              SUM(CASE WHEN status_code < 500 THEN 1 ELSE 0 END) as successes
       FROM request_metrics
       WHERE recorded_at >= ? AND request_id LIKE ?`,
      [windowStart, `%tenant:${tenantId}%`],
    );
    const total = Number(requests[0]?.total || 0);
    const errors = Number(requests[0]?.errors || 0);
    const avgLatencyMs = Number(requests[0]?.avg_duration || 0);
    const errorRate = total > 0 ? errors / total : 0;
    const availability = total > 0 ? (total - errors) / total : 1;

    const violationsRow = await query(
      `SELECT COUNT(*) as count FROM monitoring_metrics
       WHERE metric_name = ? AND recorded_at >= ? AND labels LIKE ?`,
      [`slo.latency.${sloName}`, windowStart, `%"tenantId":"${tenantId}"%`],
    );
    const violations24h = Number(violationsRow[0]?.count || 0);

    return { avgLatencyMs, errorRate, availability, totalRequests: total, violations24h };
  } catch {
    return { avgLatencyMs: 0, errorRate: 0, availability: 1, totalRequests: 0, violations24h: 0 };
  }
}

export async function getErrorBudget(
  tenantId: string,
  sloName: string,
  targetAvailability = 0.995,
): Promise<{
  targetAvailability: number;
  actualAvailability: number;
  budgetRemaining: number;
  totalAllowedErrors: number;
  totalErrors: number;
}> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const requests = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errors
       FROM request_metrics
       WHERE recorded_at >= ? AND request_id LIKE ?`,
      [windowStart, `%tenant:${tenantId}%`],
    );
    const total = Number(requests[0]?.total || 0);
    const totalErrors = Number(requests[0]?.errors || 0);
    const actualAvailability = total > 0 ? (total - totalErrors) / total : 1;
    const totalAllowedErrors = Math.floor(total * (1 - targetAvailability));
    const budgetRemaining = Math.max(0, totalAllowedErrors - totalErrors);

    return {
      targetAvailability,
      actualAvailability,
      budgetRemaining,
      totalAllowedErrors,
      totalErrors,
    };
  } catch {
    return {
      targetAvailability,
      actualAvailability: 1,
      budgetRemaining: 0,
      totalAllowedErrors: 0,
      totalErrors: 0,
    };
  }
}

export function getTenantMetricsSnapshot(tenantId?: string): Record<string, any> {
  const result: Record<string, any> = {};
  const store = tenantId ? tenantMetricsStore : metricsStore;
  for (const [key, sample] of store.entries()) {
    if (tenantId && !key.startsWith(`${tenantId}:`)) continue;
    result[key] = {
      count: sample.count,
      avgDuration:
        sample.count > 0 ? Math.round(sample.totalDuration / sample.count) : 0,
      statusCounts: sample.statusCounts,
    };
  }
  return result;
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
  await dbGauges().catch(() => {});
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderPrometheus());
}
