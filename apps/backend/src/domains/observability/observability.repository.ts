import { query, run } from '../../db';
import type {
  SloConfig,
  TraceSpan,
  DashboardData,
  SloReport,
  AuditTimelineEntry,
  PlatformSloSummary,
} from './observability.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const ObservabilityRepository = {
  async getSloConfigs(tenantId?: string): Promise<SloConfig[]> {
    const rows = tenantId
      ? await query('SELECT * FROM slo_configs WHERE tenant_id = ?', [tenantId])
      : await query('SELECT * FROM slo_configs');
    return (rows as any[]).map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      targetAvailability: r.target_availability,
      targetLatencyMs: r.target_latency_ms,
      windowDays: r.window_days,
      enabled: Boolean(r.enabled),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async getSloViolations(
    tenantId?: string,
    from?: string,
    to?: string,
    limit = 100,
  ): Promise<any[]> {
    const conditions: string[] = ["metric_name LIKE 'slo.violation.%'"];
    const params: any[] = [];
    if (tenantId) {
      conditions.push('labels LIKE ?');
      params.push(`%"tenantId":"${tenantId}"%`);
    }
    if (from) {
      conditions.push('recorded_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('recorded_at <= ?');
      params.push(to);
    }
    const where = conditions.join(' AND ');
    return query(
      `SELECT * FROM monitoring_metrics WHERE ${where} ORDER BY recorded_at DESC LIMIT ?`,
      [...params, limit],
    );
  },

  async getRecentTraces(limit = 50): Promise<TraceSpan[]> {
    const rows = await query(
      'SELECT * FROM monitoring_metrics WHERE metric_name LIKE ? ORDER BY recorded_at DESC LIMIT ?',
      ['trace.%', limit],
    );
    return (rows as any[]).map((r) => ({
      spanId: r.id,
      traceId: r.labels ? JSON.parse(r.labels).traceId || '' : '',
      name: r.metric_name.replace('trace.', ''),
      startTime: new Date(r.recorded_at).getTime(),
      attributes: r.labels ? JSON.parse(r.labels) : {},
      status: 'ok' as const,
      childSpans: [],
    }));
  },

  async saveTraceSpan(span: TraceSpan): Promise<void> {
    try {
      await run(
        `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uid('trace'),
          `trace.${span.name}`,
          span.durationMs || 0,
          'ms',
          JSON.stringify({
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            status: span.status,
            ...span.attributes,
          }),
          new Date(span.startTime).toISOString(),
        ],
      );
    } catch {
      /* non-fatal */
    }
  },

  async recordSloViolation(
    tenantId: string,
    sloName: string,
    violationType: string,
  ): Promise<void> {
    await run(
      `INSERT INTO monitoring_metrics (id, metric_name, metric_value, metric_unit, labels, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uid('slo-v'),
        `slo.violation.${sloName}`,
        1,
        'count',
        JSON.stringify({ tenantId, sloName, violationType }),
        new Date().toISOString(),
      ],
    );
  },

  async getRequestMetrics(
    tenantId?: string,
    from?: string,
    to?: string,
  ): Promise<{
    total: number;
    errors: number;
    avgDuration: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (tenantId) {
      conditions.push('request_id LIKE ?');
      params.push(`%tenant:${tenantId}%`);
    }
    if (from) {
      conditions.push('recorded_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('recorded_at <= ?');
      params.push(to);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT COUNT(*) as total,
              COALESCE(AVG(duration_ms), 0) as avg_dur,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errs
       FROM request_metrics ${where}`,
      params,
    );
    return {
      total: Number(rows[0]?.total || 0),
      errors: Number(rows[0]?.errs || 0),
      avgDuration: Number(rows[0]?.avg_dur || 0),
    };
  },
};
