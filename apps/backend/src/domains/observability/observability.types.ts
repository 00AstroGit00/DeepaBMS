export interface SloConfig {
  id: string;
  tenantId: string;
  name: string;
  targetAvailability: number;
  targetLatencyMs: number;
  windowDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SloStatus {
  tenantId: string;
  availability: number;
  avgLatencyMs: number;
  errorRate: number;
  violations24h: number;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
}

export interface ErrorBudget {
  tenantId: string;
  targetAvailability: number;
  actualAvailability: number;
  budgetRemaining: number;
  totalAllowedErrors: number;
  totalErrors: number;
  budgetPercentage: number;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, string>;
  status: 'ok' | 'error';
  childSpans: TraceSpan[];
}

export interface TraceSummary {
  traceId: string;
  rootSpan: string;
  durationMs: number;
  spanCount: number;
  startTime: number;
  status: 'ok' | 'error';
  attributes: Record<string, string>;
}

export interface DashboardData {
  tenantId: string;
  slo: SloStatus;
  errorBudget: ErrorBudget;
  recentRequests: number;
  avgLatency: number;
  errorRate: number;
  activeAlerts: number;
  slowQueries24h: number;
}

export interface SloReport {
  from: string;
  to: string;
  totalRequests: number;
  totalErrors: number;
  overallAvailability: number;
  avgLatencyMs: number;
  violations: { sloName: string; count: number }[];
  tenantReports: {
    tenantId: string;
    availability: number;
    violations: number;
  }[];
}

export interface AuditTimelineEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
}

export interface PlatformSloSummary {
  overallAvailability: number;
  avgLatencyMs: number;
  totalTenants: number;
  healthyTenants: number;
  degradedTenants: number;
  criticalTenants: number;
  totalViolations24h: number;
}
