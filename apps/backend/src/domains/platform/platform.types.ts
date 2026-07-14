// ── Health ────────────────────────────────────────────────────────────

export type HealthStatus = 'pass' | 'fail' | 'warn';

export interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  durationMs: number;
  message: string | null;
  details: Record<string, any>;
}

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  checks: HealthCheckResult[];
}

export interface HealthSummary {
  status: HealthStatus;
  totalChecks: number;
  passing: number;
  failing: number;
  warning: number;
  timestamp: string;
}

// ── Monitoring ────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export const VALID_ALERT_SEVERITIES: readonly AlertSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export interface MonitoringMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metricUnit: string | null;
  labels: Record<string, any>;
  recordedAt: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  message: string | null;
  source: string | null;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateAlertDto {
  severity: AlertSeverity;
  category: string;
  title: string;
  message?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface RequestMetric {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string | null;
  userId: string | null;
  userRole: string | null;
  recordedAt: string;
}

export interface SlowQueryEntry {
  id: string;
  queryText: string;
  durationMs: number;
  params: string | null;
  source: string | null;
  requestId: string | null;
  recordedAt: string;
}

// ── Backup & Restore ──────────────────────────────────────────────────

export type BackupType = 'full' | 'incremental' | 'snapshot' | 'wal';
export type BackupStatus = 'running' | 'completed' | 'failed' | 'verified';

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  filePath: string;
  fileSize: number;
  checksum: string | null;
  encrypted: boolean;
  retentionDays: number;
  startedAt: string;
  completedAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any>;
  createdBy: string | null;
}

export interface CreateBackupDto {
  type: BackupType;
  filePath: string;
  retentionDays?: number;
  encrypted?: boolean;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface BackupScheduleConfig {
  fullBackupCron: string;
  incrementalBackupCron: string;
  retentionDays: number;
  encrypted: boolean;
  backupDir: string;
  verifyAfterBackup: boolean;
}

export const DEFAULT_BACKUP_CONFIG: BackupScheduleConfig = {
  fullBackupCron: '0 2 * * 0',
  incrementalBackupCron: '0 2 * * 1-6',
  retentionDays: 30,
  encrypted: true,
  backupDir: './backups',
  verifyAfterBackup: true,
};

// ── Deployment ────────────────────────────────────────────────────────

export type DeploymentEnvironment = 'development' | 'staging' | 'production';
export type DeploymentStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';

export interface DeploymentRecord {
  id: string;
  version: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  commitHash: string | null;
  branch: string | null;
  artifacts: string[];
  deployedBy: string | null;
  rollbackVersion: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
}

// ── Operations Dashboard ─────────────────────────────────────────────

export interface OpsDashboardData {
  health: HealthSummary;
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpu: { loadAvg: number[] };
    node: string;
    platform: string;
  };
  database: {
    size: number;
    tableCount: number;
    status: HealthStatus;
  };
  api: {
    totalEndpoints: number;
    recentMetrics: RequestMetric[];
    slowQueries: SlowQueryEntry[];
  };
  workflow: {
    activeInstances: number;
    failedInstances: number;
  };
  sync: {
    activeDevices: number;
    pendingQueue: number;
    unresolvedConflicts: number;
  };
  backup: {
    lastBackup: BackupRecord | null;
    totalBackups: number;
    status: HealthStatus;
  };
  alerts: {
    open: number;
    critical: number;
    recent: Alert[];
  };
  scheduler: {
    activeJobs: number;
    pendingJobs: number;
  };
  storage: {
    dbSize: number;
    backupSize: number;
  };
}

// ── Pagination ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface FilterParams {
  status?: string;
  severity?: string;
  category?: string;
  environment?: string;
  metricName?: string;
  offset?: number;
  limit?: number;
  since?: string;
  until?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}
