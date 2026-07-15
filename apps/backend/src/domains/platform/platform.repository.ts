import os from 'os';
import { query, run, db } from '../../db';
import * as T from './platform.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const PlatformRepository = {
  // ═════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═════════════════════════════════════════════════════════════════════

  async recordHealthCheck(result: T.HealthCheckResult): Promise<void> {
    const id = uid('hch');
    await run(
      `INSERT INTO health_check_history (id, check_type, status, component, duration_ms, message, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        result.component,
        result.status,
        result.component,
        result.durationMs,
        result.message || null,
        JSON.stringify(result.details || {}),
      ],
    );
  },

  async getRecentHealthChecks(component?: string, limit = 100): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (component) {
      conditions.push('component = ?');
      params.push(component);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(
      `SELECT * FROM health_check_history ${where} ORDER BY checked_at DESC LIMIT ?`,
      [...params, limit],
    );
  },

  async getLatestHealthStatus(): Promise<T.HealthSummary> {
    const rows = await query(
      `SELECT status, COUNT(*) as count FROM (
        SELECT DISTINCT ON (component) component, status FROM health_check_history ORDER BY component, checked_at DESC
      ) GROUP BY status`,
    );
    const summary: Record<string, number> = { pass: 0, fail: 0, warn: 0 };
    let total = 0;
    for (const row of rows) {
      summary[row.status] = (summary[row.status] || 0) + row.count;
      total += row.count;
    }
    const status: T.HealthStatus =
      summary.fail > 0 ? 'fail' : summary.warn > 0 ? 'warn' : 'pass';
    return {
      status,
      totalChecks: total,
      passing: summary.pass || 0,
      failing: summary.fail || 0,
      warning: summary.warn || 0,
      timestamp: now(),
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // ALERTS
  // ═════════════════════════════════════════════════════════════════════

  async createAlert(dto: T.CreateAlertDto): Promise<T.Alert> {
    const id = uid('alert');
    await run(
      `INSERT INTO alerts (id, severity, category, title, message, source, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.severity,
        dto.category,
        dto.title,
        dto.message || null,
        dto.source || null,
        JSON.stringify(dto.metadata || {}),
      ],
    );
    return this.findAlertById(id) as Promise<T.Alert>;
  },

  async findAlertById(id: string): Promise<T.Alert | null> {
    const rows = await query('SELECT * FROM alerts WHERE id = ?', [id]);
    return rows.length ? this.mapAlert(rows[0]) : null;
  },

  async findAllAlerts(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.Alert>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.severity) {
      conditions.push('severity = ?');
      params.push(filter.severity);
    }
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.since) {
      conditions.push('created_at >= ?');
      params.push(filter.since);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM alerts ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapAlert(r)),
      total,
      offset,
      limit,
    };
  },

  async updateAlertStatus(
    id: string,
    status: T.AlertStatus,
    userId?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (status === 'acknowledged' && userId) {
      sets.push('acknowledged_by = ?', 'acknowledged_at = ?');
      params.push(userId, now());
    }
    if (status === 'resolved' && userId) {
      sets.push('resolved_by = ?', 'resolved_at = ?');
      params.push(userId, now());
    }
    params.push(id);
    await run(`UPDATE alerts SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async getOpenAlertCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM alerts WHERE status = 'open'",
    );
    return rows[0].count;
  },

  async getCriticalAlertCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM alerts WHERE status = 'open' AND severity = 'critical'",
    );
    return rows[0].count;
  },

  mapAlert(row: any): T.Alert {
    return {
      id: row.id,
      severity: row.severity,
      category: row.category,
      title: row.title,
      message: row.message || null,
      source: row.source || null,
      status: row.status,
      acknowledgedBy: row.acknowledged_by || null,
      acknowledgedAt: row.acknowledged_at || null,
      resolvedBy: row.resolved_by || null,
      resolvedAt: row.resolved_at || null,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BACKUP
  // ═════════════════════════════════════════════════════════════════════

  async createBackupRecord(dto: T.CreateBackupDto): Promise<T.BackupRecord> {
    const id = uid('bkp');
    await run(
      `INSERT INTO backup_records (id, type, status, file_path, retention_days, encrypted, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.type,
        'running',
        dto.filePath,
        dto.retentionDays || 30,
        dto.encrypted ? 1 : 0,
        JSON.stringify(dto.metadata || {}),
        dto.createdBy || null,
      ],
    );
    return this.findBackupById(id) as Promise<T.BackupRecord>;
  },

  async findBackupById(id: string): Promise<T.BackupRecord | null> {
    const rows = await query('SELECT * FROM backup_records WHERE id = ?', [id]);
    return rows.length ? this.mapBackup(rows[0]) : null;
  },

  async findAllBackups(filter?: {
    type?: T.BackupType;
    status?: T.BackupStatus;
    limit?: number;
    offset?: number;
  }): Promise<T.PaginatedResult<T.BackupRecord>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.type) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM backup_records ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM backup_records ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapBackup(r)),
      total,
      offset,
      limit,
    };
  },

  async getLatestBackup(type?: T.BackupType): Promise<T.BackupRecord | null> {
    const sql = type
      ? "SELECT * FROM backup_records WHERE type = ? AND status IN ('completed','verified') ORDER BY started_at DESC LIMIT 1"
      : "SELECT * FROM backup_records WHERE status IN ('completed','verified') ORDER BY started_at DESC LIMIT 1";
    const params = type ? [type] : [];
    const rows = await query(sql, params);
    return rows.length ? this.mapBackup(rows[0]) : null;
  },

  async updateBackupStatus(
    id: string,
    status: T.BackupStatus,
    errorMessage?: string,
    fileSize?: number,
    checksum?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (status === 'completed' || status === 'failed') {
      sets.push('completed_at = ?');
      params.push(now());
    }
    if (status === 'verified') {
      sets.push('verified_at = ?');
      params.push(now());
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      params.push(errorMessage);
    }
    if (fileSize !== undefined) {
      sets.push('file_size = ?');
      params.push(fileSize);
    }
    if (checksum) {
      sets.push('checksum = ?');
      params.push(checksum);
    }
    params.push(id);
    await run(
      `UPDATE backup_records SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async getTotalBackupSize(): Promise<number> {
    const rows = await query(
      "SELECT COALESCE(SUM(file_size), 0) as total FROM backup_records WHERE status IN ('completed','verified')",
    );
    return rows[0].total;
  },

  async getBackupCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM backup_records WHERE status IN ('completed','verified')",
    );
    return rows[0].count;
  },

  mapBackup(row: any): T.BackupRecord {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      filePath: row.file_path,
      fileSize: row.file_size || 0,
      checksum: row.checksum || null,
      encrypted: !!row.encrypted,
      retentionDays: row.retention_days || 30,
      startedAt: row.started_at,
      completedAt: row.completed_at || null,
      verifiedAt: row.verified_at || null,
      errorMessage: row.error_message || null,
      metadata: JSON.parse(row.metadata || '{}'),
      createdBy: row.created_by || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // DEPLOYMENT
  // ═════════════════════════════════════════════════════════════════════

  async createDeployment(
    version: string,
    environment: T.DeploymentEnvironment,
    deployedBy?: string,
  ): Promise<T.DeploymentRecord> {
    const id = uid('dep');
    await run(
      `INSERT INTO deployment_records (id, version, environment, status, deployed_by) VALUES (?, ?, ?, ?, ?)`,
      [id, version, environment, 'pending', deployedBy || null],
    );
    return this.findDeploymentById(id) as Promise<T.DeploymentRecord>;
  },

  async findDeploymentById(id: string): Promise<T.DeploymentRecord | null> {
    const rows = await query('SELECT * FROM deployment_records WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapDeployment(rows[0]) : null;
  },

  async findAllDeployments(filter?: {
    environment?: T.DeploymentEnvironment;
    status?: T.DeploymentStatus;
    limit?: number;
  }): Promise<T.DeploymentRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.environment) {
      conditions.push('environment = ?');
      params.push(filter.environment);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit || 20;
    const rows = await query(
      `SELECT * FROM deployment_records ${where} ORDER BY started_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map((r: any) => this.mapDeployment(r));
  },

  async updateDeploymentStatus(
    id: string,
    status: T.DeploymentStatus,
    errorMessage?: string,
    rollbackVersion?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'rolled_back'
    ) {
      sets.push(
        'completed_at = ?',
        "duration_seconds = (strftime('%s', 'now') - strftime('%s', started_at))",
      );
      params.push(now());
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      params.push(errorMessage);
    }
    if (rollbackVersion) {
      sets.push('rollback_version = ?');
      params.push(rollbackVersion);
    }
    params.push(id);
    await run(
      `UPDATE deployment_records SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  mapDeployment(row: any): T.DeploymentRecord {
    return {
      id: row.id,
      version: row.version,
      environment: row.environment,
      status: row.status,
      commitHash: row.commit_hash || null,
      branch: row.branch || null,
      artifacts: JSON.parse(row.artifacts || '[]'),
      deployedBy: row.deployed_by || null,
      rollbackVersion: row.rollback_version || null,
      errorMessage: row.error_message || null,
      startedAt: row.started_at,
      completedAt: row.completed_at || null,
      durationSeconds: row.duration_seconds || 0,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // MONITORING METRICS
  // ═════════════════════════════════════════════════════════════════════

  async getMetrics(
    name?: string,
    since?: string,
    limit = 100,
  ): Promise<T.MonitoringMetric[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (name) {
      conditions.push('metric_name = ?');
      params.push(name);
    }
    if (since) {
      conditions.push('recorded_at >= ?');
      params.push(since);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM monitoring_metrics ${where} ORDER BY recorded_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map((r: any) => ({
      id: r.id,
      metricName: r.metric_name,
      metricValue: r.metric_value,
      metricUnit: r.metric_unit || null,
      labels: JSON.parse(r.labels || '{}'),
      recordedAt: r.recorded_at,
    }));
  },

  async getRecentRequestMetrics(limit = 100): Promise<T.RequestMetric[]> {
    const rows = await query(
      'SELECT * FROM request_metrics ORDER BY recorded_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((r: any) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.status_code,
      durationMs: r.duration_ms,
      requestId: r.request_id || null,
      userId: r.user_id || null,
      userRole: r.user_role || null,
      recordedAt: r.recorded_at,
    }));
  },

  async getSlowQueries(limit = 50): Promise<T.SlowQueryEntry[]> {
    const rows = await query(
      'SELECT * FROM slow_query_log ORDER BY duration_ms DESC LIMIT ?',
      [limit],
    );
    return rows.map((r: any) => ({
      id: r.id,
      queryText: r.query_text,
      durationMs: r.duration_ms,
      params: r.params || null,
      source: r.source || null,
      requestId: r.request_id || null,
      recordedAt: r.recorded_at,
    }));
  },

  // ═════════════════════════════════════════════════════════════════════
  // DATABASE
  // ═════════════════════════════════════════════════════════════════════

  async getDatabaseSize(): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('PRAGMA page_count', [], (err: any, row: any) => {
        if (err) return reject(err);
        const pageCount = row?.page_count || 0;
        db.get('PRAGMA page_size', [], (err2: any, row2: any) => {
          if (err2) return reject(err2);
          resolve(pageCount * (row2?.page_size || 4096));
        });
      });
    });
  },

  async getTableCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'",
    );
    return rows[0].count;
  },

  async testConnection(): Promise<boolean> {
    try {
      const rows = await query('SELECT 1 AS ok');
      return rows.length > 0 && rows[0].ok === 1;
    } catch {
      return false;
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // OPS DASHBOARD
  // ═════════════════════════════════════════════════════════════════════

  async getOpsDashboard(): Promise<T.OpsDashboardData> {
    const health = await this.getLatestHealthStatus();
    const dbSize = await this.getDatabaseSize();
    const tableCount = await this.getTableCount();
    const dbStatus = await this.testConnection();
    const recentMetrics = await this.getRecentRequestMetrics(10);
    const slowQueries = await this.getSlowQueries(5);
    const lastBackup = await this.getLatestBackup();
    const totalBackups = await this.getBackupCount();
    const backupSize = await this.getTotalBackupSize();
    const openAlerts = await this.getOpenAlertCount();
    const criticalAlerts = await this.getCriticalAlertCount();
    const recentAlerts = (
      await this.findAllAlerts({ status: 'open', limit: 10 })
    ).data;
    const mem = process.memoryUsage();

    return {
      health,
      system: {
        uptime: process.uptime(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external || 0,
        },
        cpu: { loadAvg: os.loadavg() },
        node: process.version,
        platform: process.platform,
      },
      database: {
        size: dbSize,
        tableCount,
        status: dbStatus ? 'pass' : 'fail',
      },
      api: { totalEndpoints: 0, recentMetrics, slowQueries },
      workflow: { activeInstances: 0, failedInstances: 0 },
      sync: { activeDevices: 0, pendingQueue: 0, unresolvedConflicts: 0 },
      backup: {
        lastBackup,
        totalBackups,
        status: lastBackup ? 'pass' : 'warn',
      },
      alerts: {
        open: openAlerts,
        critical: criticalAlerts,
        recent: recentAlerts,
      },
      scheduler: { activeJobs: 0, pendingJobs: 0 },
      storage: { dbSize, backupSize },
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // TENANT OPERATIONS (P13-1)
  // ═════════════════════════════════════════════════════════════════════

  async ensureTenantTableColumns(): Promise<void> {
    const migrations: string[] = [
      `ALTER TABLE tenants ADD COLUMN slug VARCHAR(200) DEFAULT ''`,
      `ALTER TABLE tenants ADD COLUMN contact_email VARCHAR(200) DEFAULT NULL`,
      `ALTER TABLE tenants ADD COLUMN contact_name VARCHAR(200) DEFAULT NULL`,
      `ALTER TABLE tenants ADD COLUMN domain VARCHAR(200) DEFAULT NULL`,
      `ALTER TABLE tenants ADD COLUMN locale VARCHAR(10) DEFAULT 'en'`,
      `ALTER TABLE tenants ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'`,
      `ALTER TABLE tenants ADD COLUMN features TEXT DEFAULT NULL`,
      `ALTER TABLE tenants ADD COLUMN metadata TEXT DEFAULT NULL`,
      `ALTER TABLE tenants ADD COLUMN subscription_ends_at TIMESTAMP DEFAULT NULL`,
    ];
    for (const sql of migrations) {
      try {
        await run(sql);
      } catch {
        /* column already exists — swallow */
      }
    }
  },

  async createTenant(dto: T.CreateTenantDto): Promise<T.Tenant> {
    const id = uid('tnt');
    await this.ensureTenantTableColumns();
    const branding = dto.branding ? JSON.stringify(dto.branding) : null;
    const features = dto.features ? JSON.stringify(dto.features) : null;
    const metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    const maxRooms = dto.maxRooms ?? 15;
    const maxUsers = dto.maxUsers ?? 5;
    await run(
      `INSERT INTO tenants (id, name, slug, plan, status, branding, max_rooms, max_users, contact_email, contact_name, domain, locale, timezone, features, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.slug,
        dto.plan,
        'trial',
        branding,
        maxRooms,
        maxUsers,
        dto.contactEmail || null,
        dto.contactName || null,
        dto.domain || null,
        dto.locale || 'en',
        dto.timezone || 'UTC',
        features,
        metadata,
        now(),
        now(),
      ],
    );
    return this.findTenantById(id) as Promise<T.Tenant>;
  },

  async findTenantById(id: string): Promise<T.Tenant | null> {
    const rows = await query('SELECT * FROM tenants WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this.mapTenant(rows[0]);
  },

  async findTenantBySlug(slug: string): Promise<T.Tenant | null> {
    const rows = await query('SELECT * FROM tenants WHERE slug = ?', [slug]);
    if (rows.length === 0) return null;
    return this.mapTenant(rows[0]);
  },

  async findAllTenants(
    filter?: T.TenantListFilter,
  ): Promise<T.PaginatedResult<T.Tenant>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.plan) {
      conditions.push('plan = ?');
      params.push(filter.plan);
    }
    if (filter?.search) {
      conditions.push('(name LIKE ? OR slug LIKE ? OR contact_email LIKE ?)');
      const pattern = `%${filter.search}%`;
      params.push(pattern, pattern, pattern);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const orderBy = filter?.orderBy || 'created_at';
    const orderDir = filter?.orderDir === 'asc' ? 'ASC' : 'DESC';
    const countResult = await query(
      `SELECT COUNT(*) as total FROM tenants ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM tenants ${where} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapTenant(r)),
      total,
      offset,
      limit,
    };
  },

  async updateTenant(
    id: string,
    updates: Partial<Omit<T.Tenant, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    const timestamp = now();
    const sets: string[] = [];
    const params: any[] = [];
    const fieldMap: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      plan: 'plan',
      status: 'status',
      maxRooms: 'max_rooms',
      maxUsers: 'max_users',
      contactEmail: 'contact_email',
      contactName: 'contact_name',
      domain: 'domain',
      locale: 'locale',
      timezone: 'timezone',
      subscriptionEndsAt: 'subscription_ends_at',
    };
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'branding' && val !== undefined) {
        sets.push('branding = ?');
        params.push(JSON.stringify(val));
        continue;
      }
      if (key === 'features' && val !== undefined) {
        sets.push('features = ?');
        params.push(JSON.stringify(val));
        continue;
      }
      if (key === 'metadata' && val !== undefined) {
        sets.push('metadata = ?');
        params.push(JSON.stringify(val));
        continue;
      }
      const dbKey = fieldMap[key];
      if (dbKey && val !== undefined) {
        sets.push(`${dbKey} = ?`);
        params.push(val === null ? null : val);
      }
    }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    params.push(timestamp);
    params.push(id);
    await run(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async deleteTenant(id: string): Promise<void> {
    await run('DELETE FROM tenants WHERE id = ?', [id]);
  },

  async getTenantCount(filter?: {
    status?: T.TenantLifecycleState;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT COUNT(*) as count FROM tenants ${where}`,
      params,
    );
    return rows[0]?.count || 0;
  },

  mapTenant(row: any): T.Tenant {
    let branding: T.TenantBranding | null = null;
    if (row.branding) {
      try {
        branding = JSON.parse(row.branding);
      } catch {
        branding = null;
      }
    }
    let features: string[] | null = null;
    if (row.features) {
      try {
        features = JSON.parse(row.features);
      } catch {
        features = null;
      }
    }
    let metadata: Record<string, any> | null = null;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = null;
      }
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug || '',
      plan: row.plan,
      status: row.status,
      branding,
      maxRooms: row.max_rooms,
      maxUsers: row.max_users,
      contactEmail: row.contact_email || null,
      contactName: row.contact_name || null,
      domain: row.domain || null,
      locale: row.locale || 'en',
      timezone: row.timezone || 'UTC',
      features,
      metadata,
      subscriptionEndsAt: row.subscription_ends_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
