import os from 'os';
import { query } from '../../db';
import { OperationsRepository as R } from './operations.repository';
import * as T from './operations.types';

function now(): string {
  return new Date().toISOString();
}

export const OperationsService = {
  // ═════════════════════════════════════════════════════════════════════
  // SYSTEM HEALTH
  // ═════════════════════════════════════════════════════════════════════

  async getSystemHealth(): Promise<T.SystemHealth> {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();

    let dbStatus = 'unknown';
    try {
      await query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const checks = [
      {
        name: 'database',
        status: dbStatus === 'connected' ? 'pass' : 'fail',
        message:
          dbStatus === 'connected'
            ? 'Database connection OK'
            : 'Database connection failed',
      },
      {
        name: 'memory',
        status: mem.heapUsed / mem.heapTotal < 0.9 ? 'pass' : 'warn',
        message: `Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      },
      {
        name: 'cpu',
        status: os.loadavg()[0] < 2 ? 'pass' : 'warn',
        message: `Load avg (1m): ${os.loadavg()[0].toFixed(2)}`,
      },
      {
        name: 'uptime',
        status: 'pass',
        message: `${(process.uptime() / 3600).toFixed(1)} hours`,
      },
    ];

    const overallStatus =
      checks.some((c) => c.status === 'fail')
        ? 'down'
        : checks.some((c) => c.status === 'warn')
          ? 'degraded'
          : 'healthy';

    return {
      status: overallStatus,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      database: dbStatus,
      memory: {
        used: usedMem,
        total: totalMem,
        percent: totalMem > 0 ? (usedMem / totalMem) * 100 : 0,
      },
      cpu: {
        loadAvg: os.loadavg(),
        cores: os.cpus().length,
      },
      storage: {
        dbSize: 0,
        backupSize: 0,
      },
      checks,
      lastChecked: now(),
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ═════════════════════════════════════════════════════════════════════

  async getAdminDashboard(): Promise<T.AdminDashboard> {
    const mem = process.memoryUsage();

    const tenantCounts = await R.getTenantCountByStatus();
    const usersByRole = await R.getUserCountByRole();
    const totalUsers = await R.getUserCount();
    const activeToday = await R.getActiveTodayUserCount();
    const flags = await R.findAllFeatureFlags();
    const releases = await R.findAllReleaseRollouts({ limit: 1 });
    const openIncidents = await R.getOpenIncidentCount();
    const criticalIncidents = await R.getCriticalIncidentCount();
    const recentIncidents = (
      await R.findAllIncidents({
        status: 'open',
        limit: 10,
      })
    ).data;
    const subCounts = await R.getSubscriptionCountByStatus();
    const revenueEstimate = await R.getRevenueEstimate();
    const auditCount = await R.getAuditLogCount();
    const recentActions = await R.getAuditActionSummary(
      new Date(Date.now() - 86400000).toISOString(),
    );

    const activeReleases = (
      await R.findAllReleaseRollouts({
        status: 'rolling',
        limit: 100,
      })
    ).total;

    const latestRelease =
      releases.data.length > 0 ? releases.data[0] : null;

    return {
      system: {
        uptime: process.uptime(),
        status: 'running',
        version: process.env.npm_package_version || '1.0.0',
        node: process.version,
        memoryMB: Math.round(mem.rss / 1024 / 1024),
      },
      tenants: {
        total: Object.values(tenantCounts).reduce(
          (a: number, b: number) => a + b,
          0,
        ),
        active: tenantCounts['active'] || 0,
        trial: tenantCounts['trial'] || 0,
        suspended: tenantCounts['suspended'] || 0,
        pastDue: tenantCounts['past_due'] || 0,
      },
      users: {
        total: totalUsers,
        activeToday,
        byRole: usersByRole,
      },
      featureFlags: {
        total: flags.length,
        enabled: flags.filter((f) => f.enabled).length,
      },
      releases: {
        total: (
          await R.findAllReleaseRollouts({ limit: 10000 })
        ).total,
        active: activeReleases,
        latestVersion: latestRelease?.version || null,
      },
      incidents: {
        open: openIncidents,
        critical: criticalIncidents,
        recent: recentIncidents,
      },
      subscriptions: {
        active: subCounts['active'] || 0,
        pastDue: subCounts['past_due'] || 0,
        revenueEstimate,
      },
      audit: {
        totalEntries: auditCount,
        recentActions,
      },
      timestamp: now(),
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═════════════════════════════════════════════════════════════════════

  async getFeatureFlags(): Promise<T.FeatureFlag[]> {
    return R.findAllFeatureFlags();
  },

  async getFeatureFlag(id: string): Promise<T.FeatureFlag | null> {
    return R.findFeatureFlagById(id);
  },

  async createFeatureFlag(
    dto: T.CreateFeatureFlagDto,
  ): Promise<T.FeatureFlag> {
    const existing = await R.findFeatureFlagByName(dto.name);
    if (existing) {
      throw new Error(`Feature flag "${dto.name}" already exists`);
    }
    return R.createFeatureFlag(dto);
  },

  async updateFeatureFlag(
    id: string,
    updates: T.UpdateFeatureFlagDto,
  ): Promise<T.FeatureFlag> {
    const flag = await R.findFeatureFlagById(id);
    if (!flag) throw new Error(`Feature flag ${id} not found`);
    await R.updateFeatureFlag(id, updates);
    return R.findFeatureFlagById(id) as Promise<T.FeatureFlag>;
  },

  async setTenantOverride(
    flagId: string,
    tenantId: string,
    enabled: boolean,
  ): Promise<T.FeatureFlag> {
    await R.setTenantOverride(flagId, tenantId, enabled);
    return R.findFeatureFlagById(flagId) as Promise<T.FeatureFlag>;
  },

  async deleteFeatureFlag(id: string): Promise<void> {
    const flag = await R.findFeatureFlagById(id);
    if (!flag) throw new Error(`Feature flag ${id} not found`);
    await R.deleteFeatureFlag(id);
  },

  // ═════════════════════════════════════════════════════════════════════
  // RELEASE ROLLOUTS
  // ═════════════════════════════════════════════════════════════════════

  async getReleases(filter?: {
    status?: T.ReleaseStatus;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.ReleaseRollout>> {
    return R.findAllReleaseRollouts(filter);
  },

  async getRelease(id: string): Promise<T.ReleaseRollout | null> {
    return R.findReleaseRolloutById(id);
  },

  async createRelease(dto: T.CreateReleaseDto): Promise<T.ReleaseRollout> {
    return R.createReleaseRollout(dto);
  },

  async updateReleaseRollout(
    id: string,
    rolloutPercentage: number,
  ): Promise<T.ReleaseRollout> {
    const release = await R.findReleaseRolloutById(id);
    if (!release) throw new Error(`Release ${id} not found`);

    let status: T.ReleaseStatus = release.status;
    const completedAt = rolloutPercentage >= 100 ? now() : undefined;
    if (completedAt) {
      status = 'completed';
    } else if (rolloutPercentage > 0 && release.status === 'draft') {
      status = 'rolling';
    }

    await R.updateReleaseRollout(id, {
      status,
      rolloutPercentage,
      completedAt,
    });
    return R.findReleaseRolloutById(id) as Promise<T.ReleaseRollout>;
  },

  // ═════════════════════════════════════════════════════════════════════
  // INCIDENTS
  // ═════════════════════════════════════════════════════════════════════

  async getIncidents(filter?: {
    severity?: T.IncidentSeverity;
    status?: T.IncidentStatus;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.Incident>> {
    return R.findAllIncidents(filter);
  },

  async getIncident(id: string): Promise<T.Incident | null> {
    return R.findIncidentById(id);
  },

  async recordIncident(dto: T.CreateIncidentDto): Promise<T.Incident> {
    return R.createIncident(dto);
  },

  async resolveIncident(
    id: string,
    resolvedBy: string,
  ): Promise<T.Incident> {
    const incident = await R.findIncidentById(id);
    if (!incident) throw new Error(`Incident ${id} not found`);
    await R.resolveIncident(id, resolvedBy);
    return R.findIncidentById(id) as Promise<T.Incident>;
  },

  // ═════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═════════════════════════════════════════════════════════════════════

  async getAuditLog(
    filter?: T.AuditFilter,
  ): Promise<T.PaginatedResult<T.AuditEntry>> {
    return R.queryAuditLog(filter);
  },

  // ═════════════════════════════════════════════════════════════════════
  // SYSTEM CONFIG
  // ═════════════════════════════════════════════════════════════════════

  async getSystemConfig(): Promise<T.SystemConfig> {
    const raw = await R.getSystemConfig();
    return {
      maintenanceMode: raw.maintenanceMode === true,
      allowNewRegistrations: raw.allowNewRegistrations !== false,
      maxLoginAttempts: raw.maxLoginAttempts || 5,
      sessionTimeoutMinutes: raw.sessionTimeoutMinutes || 480,
      backupEnabled: raw.backupEnabled !== false,
      backupIntervalHours: raw.backupIntervalHours || 24,
      auditRetentionDays: raw.auditRetentionDays || 90,
      logLevel: raw.logLevel || 'info',
      rateLimiting: raw.rateLimiting !== false,
      rateLimitMax: raw.rateLimitMax || 500,
      features: raw.features || {},
      settings: raw.settings || {},
    };
  },

  async updateSystemConfig(
    key: string,
    value: any,
  ): Promise<void> {
    await R.setSystemConfig(key, value);
  },

  // ═════════════════════════════════════════════════════════════════════
  // TENANT MANAGEMENT OVERVIEW
  // ═════════════════════════════════════════════════════════════════════

  async getTenantManagement(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPlan: Record<string, number>;
    recent: any[];
  }> {
    const tenants = await query(
      'SELECT id, name, slug, plan, status, created_at FROM tenants ORDER BY created_at DESC LIMIT 50',
    );
    const byStatus = await R.getTenantCountByStatus();
    const planRows = await query(
      'SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan',
    );
    const byPlan: Record<string, number> = {};
    for (const row of planRows) {
      byPlan[row.plan] = row.count;
    }
    return {
      total: Object.values(byStatus).reduce(
        (a: number, b: number) => a + b,
        0,
      ),
      byStatus,
      byPlan,
      recent: tenants,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════

  async getUserManagement(): Promise<{
    total: number;
    activeToday: number;
    byRole: Record<string, number>;
    users: T.AdminUser[];
  }> {
    const users = await R.getAdminUsers();
    const byRole = await R.getUserCountByRole();
    const total = await R.getUserCount();
    const activeToday = await R.getActiveTodayUserCount();
    return { total, activeToday, byRole, users };
  },

  // ═════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════

  async getSubscriptionManagement(): Promise<{
    byStatus: Record<string, number>;
    revenueEstimate: number;
    subscriptions: any[];
  }> {
    const byStatus = await R.getSubscriptionCountByStatus();
    const revenueEstimate = await R.getRevenueEstimate();
    let subscriptions: any[] = [];
    try {
      subscriptions = await query(
        `SELECT bs.id, bs.tenant_id, t.name as tenant_name, bs.plan, bs.status,
                bs.current_period_start, bs.current_period_end, bs.created_at
         FROM billing_subscriptions bs
         LEFT JOIN tenants t ON t.id = bs.tenant_id
         ORDER BY bs.created_at DESC LIMIT 100`,
      );
    } catch {
      subscriptions = [];
    }
    return { byStatus, revenueEstimate, subscriptions };
  },
};
