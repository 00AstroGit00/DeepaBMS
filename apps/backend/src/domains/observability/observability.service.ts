import { query } from '../../db';
import { ObservabilityRepository as R } from './observability.repository';
import type {
  SloStatus,
  ErrorBudget,
  TraceSpan,
  DashboardData,
  SloReport,
  AuditTimelineEntry,
  PlatformSloSummary,
} from './observability.types';
import { getRecentTraces } from '../../middleware/observability';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const ObservabilityService = {
  async getSloStatus(tenantId?: string): Promise<SloStatus | PlatformSloSummary> {
    if (tenantId) {
      return this.getTenantSloStatus(tenantId);
    }
    return this.getPlatformSlo();
  },

  async getTenantSloStatus(tenantId: string): Promise<SloStatus> {
    const windowStart = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    try {
      const metrics = await R.getRequestMetrics(tenantId, windowStart);
      const availability =
        metrics.total > 0
          ? (metrics.total - metrics.errors) / metrics.total
          : 1;
      const errorRate =
        metrics.total > 0 ? metrics.errors / metrics.total : 0;

      const violations = await R.getSloViolations(tenantId, windowStart);
      const violations24h = violations.length;

      let status: SloStatus['status'] = 'healthy';
      if (violations24h > 0) status = 'degraded';
      if (availability < 0.99) status = 'critical';

      return {
        tenantId,
        availability,
        avgLatencyMs: metrics.avgDuration,
        errorRate,
        violations24h,
        status,
      };
    } catch {
      return {
        tenantId,
        availability: 1,
        avgLatencyMs: 0,
        errorRate: 0,
        violations24h: 0,
        status: 'unknown',
      };
    }
  },

  async getErrorBudget(
    tenantId: string,
    targetAvailability = 0.995,
  ): Promise<ErrorBudget> {
    const windowStart = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    try {
      const metrics = await R.getRequestMetrics(tenantId, windowStart);
      const actualAvailability =
        metrics.total > 0
          ? (metrics.total - metrics.errors) / metrics.total
          : 1;
      const totalAllowedErrors = Math.max(
        0,
        Math.floor(metrics.total * (1 - targetAvailability)),
      );
      const budgetRemaining = Math.max(
        0,
        totalAllowedErrors - metrics.errors,
      );
      const budgetPercentage =
        totalAllowedErrors > 0
          ? Math.round((budgetRemaining / totalAllowedErrors) * 100)
          : metrics.errors === 0
            ? 100
            : 0;

      return {
        tenantId,
        targetAvailability,
        actualAvailability,
        budgetRemaining,
        totalAllowedErrors,
        totalErrors: metrics.errors,
        budgetPercentage,
      };
    } catch {
      return {
        tenantId,
        targetAvailability,
        actualAvailability: 1,
        budgetRemaining: 0,
        totalAllowedErrors: 0,
        totalErrors: 0,
        budgetPercentage: 100,
      };
    }
  },

  async getSloReport(from: string, to: string): Promise<SloReport> {
    const metrics = await R.getRequestMetrics(undefined, from, to);
    const violations = await R.getSloViolations(undefined, from, to);
    const violationMap = new Map<string, number>();
    for (const v of violations) {
      const name = v.metric_name.replace('slo.violation.', '');
      violationMap.set(name, (violationMap.get(name) || 0) + 1);
    }

    const tenantBreakdown = await query(
      `SELECT
         SUBSTR(request_id, INSTR(request_id, 'tenant:') + 7) as tenant_id,
         COUNT(*) as total,
         SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errs
       FROM request_metrics
       WHERE recorded_at >= ? AND recorded_at <= ? AND request_id LIKE 'tenant:%'
       GROUP BY tenant_id`,
      [from, to],
    );

    return {
      from,
      to,
      totalRequests: metrics.total,
      totalErrors: metrics.errors,
      overallAvailability:
        metrics.total > 0
          ? (metrics.total - metrics.errors) / metrics.total
          : 1,
      avgLatencyMs: metrics.avgDuration,
      violations: Array.from(violationMap.entries()).map(([k, v]) => ({
        sloName: k,
        count: v,
      })),
      tenantReports: (tenantBreakdown as any[]).map((t) => ({
        tenantId: t.tenant_id,
        availability:
          Number(t.total) > 0
            ? (Number(t.total) - Number(t.errs)) / Number(t.total)
            : 1,
        violations: Number(t.errs),
      })),
    };
  },

  async getTenantDashboard(tenantId: string): Promise<DashboardData> {
    const [slo, errorBudget] = await Promise.all([
      this.getTenantSloStatus(tenantId),
      this.getErrorBudget(tenantId),
    ]);

    const windowStart = new Date(
      Date.now() - 3600000,
    ).toISOString();
    const recent = await R.getRequestMetrics(tenantId, windowStart);

    const alerts = await query(
      `SELECT COUNT(*) as cnt FROM alerts
       WHERE status = 'open' AND (metadata LIKE ? OR metadata LIKE ?)`,
      [`%"tenantId":"${tenantId}"%`, `%"tenant_id":"${tenantId}"%`],
    );

    const slow = await query(
      `SELECT COUNT(*) as cnt FROM slow_query_log
       WHERE recorded_at >= ? AND source LIKE ?`,
      [
        new Date(Date.now() - 86400000).toISOString(),
        `%tenant:${tenantId}%`,
      ],
    );

    return {
      tenantId,
      slo,
      errorBudget,
      recentRequests: recent.total,
      avgLatency: recent.avgDuration,
      errorRate: recent.total > 0 ? recent.errors / recent.total : 0,
      activeAlerts: Number(alerts[0]?.cnt || 0),
      slowQueries24h: Number(slow[0]?.cnt || 0),
    };
  },

  async getAuditTimeline(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<AuditTimelineEntry[]> {
    try {
      const rows = await query(
        `SELECT * FROM security_audit_log
         WHERE date >= ? AND date <= ?
         ORDER BY date DESC
         LIMIT 200`,
        [from, to],
      );
      return (rows as any[]).map((r) => ({
        id: r.id,
        timestamp: r.date,
        userId: r.user_id,
        action: r.action,
        details: r.ip_address || '',
      }));
    } catch {
      return [];
    }
  },

  async getRecentTraces(limit = 50): Promise<TraceSpan[]> {
    return getRecentTraces(limit);
  },

  async getPlatformSlo(): Promise<PlatformSloSummary> {
    const windowStart = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    try {
      const allTenants = await query(
        `SELECT
           SUBSTR(request_id, INSTR(request_id, 'tenant:') + 7) as tenant_id,
           COUNT(*) as total,
           SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errs
         FROM request_metrics
         WHERE recorded_at >= ? AND request_id LIKE 'tenant:%'
         GROUP BY tenant_id`,
        [windowStart],
      );

      const violations = await query(
        `SELECT COUNT(*) as cnt FROM monitoring_metrics
         WHERE metric_name LIKE 'slo.violation.%' AND recorded_at >= ?`,
        [windowStart],
      );

      const globalMetrics = await R.getRequestMetrics(undefined, windowStart);

      let healthyTenants = 0;
      let degradedTenants = 0;
      let criticalTenants = 0;
      for (const t of allTenants) {
        const total = Number(t.total);
        const errs = Number(t.errs);
        const avail = total > 0 ? (total - errs) / total : 1;
        if (avail >= 0.995) healthyTenants++;
        else if (avail >= 0.99) degradedTenants++;
        else criticalTenants++;
      }

      return {
        overallAvailability:
          globalMetrics.total > 0
            ? (globalMetrics.total - globalMetrics.errors) / globalMetrics.total
            : 1,
        avgLatencyMs: globalMetrics.avgDuration,
        totalTenants: allTenants.length,
        healthyTenants,
        degradedTenants,
        criticalTenants,
        totalViolations24h: Number(violations[0]?.cnt || 0),
      };
    } catch {
      return {
        overallAvailability: 1,
        avgLatencyMs: 0,
        totalTenants: 0,
        healthyTenants: 0,
        degradedTenants: 0,
        criticalTenants: 0,
        totalViolations24h: 0,
      };
    }
  },
};
