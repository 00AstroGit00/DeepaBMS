// ── Admin User ──────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  lastLoginAt: string | null;
  active: boolean;
  createdAt: string;
}

// ── System Health ───────────────────────────────────────────────────────

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  database: string;
  memory: { used: number; total: number; percent: number };
  cpu: { loadAvg: number[]; cores: number };
  storage: { dbSize: number; backupSize: number };
  checks: { name: string; status: string; message: string }[];
  lastChecked: string;
}

// ── Feature Flag ────────────────────────────────────────────────────────

export type FeatureFlagStatus = 'enabled' | 'disabled';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  tenantOverrides: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagDto {
  name: string;
  description?: string;
  enabled?: boolean;
  tenantOverrides?: Record<string, boolean>;
}

export interface UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  tenantOverrides?: Record<string, boolean>;
}

// ── Release Rollout ─────────────────────────────────────────────────────

export type ReleaseStatus =
  | 'draft'
  | 'rolling'
  | 'paused'
  | 'completed'
  | 'rolled_back'
  | 'failed';

export interface ReleaseRollout {
  id: string;
  version: string;
  status: ReleaseStatus;
  rolloutPercentage: number;
  changelog: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateReleaseDto {
  version: string;
  rolloutPercentage?: number;
  changelog?: string;
  createdBy?: string;
}

// ── Incident ────────────────────────────────────────────────────────────

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  title: string;
  description: string | null;
  status: IncidentStatus;
  affectedComponents: string[];
  reportedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface CreateIncidentDto {
  severity: IncidentSeverity;
  title: string;
  description?: string;
  affectedComponents?: string[];
  reportedBy?: string;
}

// ── Audit Entry ─────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  timestamp: string;
}

export interface AuditFilter {
  action?: string;
  actorId?: string;
  resource?: string;
  resourceId?: string;
  since?: string;
  until?: string;
  offset?: number;
  limit?: number;
}

// ── Admin Dashboard ─────────────────────────────────────────────────────

export interface AdminDashboard {
  system: {
    uptime: number;
    status: string;
    version: string;
    node: string;
    memoryMB: number;
  };
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    pastDue: number;
  };
  users: {
    total: number;
    activeToday: number;
    byRole: Record<string, number>;
  };
  featureFlags: {
    total: number;
    enabled: number;
  };
  releases: {
    total: number;
    active: number;
    latestVersion: string | null;
  };
  incidents: {
    open: number;
    critical: number;
    recent: Incident[];
  };
  subscriptions: {
    active: number;
    pastDue: number;
    revenueEstimate: number;
  };
  audit: {
    totalEntries: number;
    recentActions: { action: string; count: number }[];
  };
  timestamp: string;
}

// ── System Config ───────────────────────────────────────────────────────

export interface SystemConfig {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  backupEnabled: boolean;
  backupIntervalHours: number;
  auditRetentionDays: number;
  logLevel: string;
  rateLimiting: boolean;
  rateLimitMax: number;
  features: Record<string, boolean>;
  settings: Record<string, any>;
}

// ── Pagination ──────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
