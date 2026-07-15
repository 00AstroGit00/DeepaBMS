import { query, run } from '../../db';
import * as T from './operations.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

async function ensureTable(name: string, schema: string): Promise<void> {
  try {
    await run(schema);
  } catch {
    /* table already exists */
  }
}

async function ensureTables(): Promise<void> {
  await ensureTable(
    'feature_flags',
    `CREATE TABLE IF NOT EXISTS feature_flags (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL UNIQUE,
      description TEXT,
      enabled BOOLEAN NOT NULL DEFAULT 1,
      tenant_overrides TEXT DEFAULT '{}',
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,
  );
  await ensureTable(
    'release_rollouts',
    `CREATE TABLE IF NOT EXISTS release_rollouts (
      id VARCHAR(50) PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      rollout_percentage REAL NOT NULL DEFAULT 0,
      changelog TEXT,
      created_by VARCHAR(100),
      created_at TIMESTAMP NOT NULL,
      completed_at TIMESTAMP
    )`,
  );
  await ensureTable(
    'incidents',
    `CREATE TABLE IF NOT EXISTS incidents (
      id VARCHAR(50) PRIMARY KEY,
      severity VARCHAR(20) NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      affected_components TEXT DEFAULT '[]',
      reported_by VARCHAR(100),
      created_at TIMESTAMP NOT NULL,
      resolved_at TIMESTAMP,
      resolved_by VARCHAR(100)
    )`,
  );
  await ensureTable(
    'operations_audit_log',
    `CREATE TABLE IF NOT EXISTS operations_audit_log (
      id VARCHAR(50) PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      actor_id VARCHAR(50) NOT NULL,
      actor_name VARCHAR(200) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      resource_id VARCHAR(50),
      details TEXT DEFAULT '{}',
      ip_address VARCHAR(50),
      timestamp TIMESTAMP NOT NULL
    )`,
  );
  await ensureTable(
    'system_config',
    `CREATE TABLE IF NOT EXISTS system_config (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,
  );
}

export const OperationsRepository = {
  async init(): Promise<void> {
    await ensureTables();
  },

  // ═════════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═════════════════════════════════════════════════════════════════════

  async createFeatureFlag(dto: T.CreateFeatureFlagDto): Promise<T.FeatureFlag> {
    await ensureTables();
    const id = uid('ff');
    const enabled = dto.enabled !== false ? 1 : 0;
    await run(
      `INSERT INTO feature_flags (id, name, description, enabled, tenant_overrides, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        enabled,
        JSON.stringify(dto.tenantOverrides || {}),
        now(),
        now(),
      ],
    );
    return this.findFeatureFlagById(id) as Promise<T.FeatureFlag>;
  },

  async findFeatureFlagById(id: string): Promise<T.FeatureFlag | null> {
    const rows = await query('SELECT * FROM feature_flags WHERE id = ?', [id]);
    return rows.length ? this.mapFeatureFlag(rows[0]) : null;
  },

  async findFeatureFlagByName(name: string): Promise<T.FeatureFlag | null> {
    const rows = await query(
      'SELECT * FROM feature_flags WHERE name = ?',
      [name],
    );
    return rows.length ? this.mapFeatureFlag(rows[0]) : null;
  },

  async findAllFeatureFlags(): Promise<T.FeatureFlag[]> {
    const rows = await query(
      'SELECT * FROM feature_flags ORDER BY name ASC',
    );
    return rows.map((r: any) => this.mapFeatureFlag(r));
  },

  async updateFeatureFlag(
    id: string,
    updates: Partial<T.UpdateFeatureFlagDto>,
  ): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description);
    }
    if (updates.enabled !== undefined) {
      sets.push('enabled = ?');
      params.push(updates.enabled ? 1 : 0);
    }
    if (updates.tenantOverrides !== undefined) {
      sets.push('tenant_overrides = ?');
      params.push(JSON.stringify(updates.tenantOverrides));
    }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    params.push(now());
    params.push(id);
    await run(
      `UPDATE feature_flags SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async setTenantOverride(
    flagId: string,
    tenantId: string,
    enabled: boolean,
  ): Promise<void> {
    const flag = await this.findFeatureFlagById(flagId);
    if (!flag) throw new Error(`Feature flag ${flagId} not found`);
    const overrides = { ...flag.tenantOverrides, [tenantId]: enabled };
    await this.updateFeatureFlag(flagId, { tenantOverrides: overrides });
  },

  async removeTenantOverride(
    flagId: string,
    tenantId: string,
  ): Promise<void> {
    const flag = await this.findFeatureFlagById(flagId);
    if (!flag) throw new Error(`Feature flag ${flagId} not found`);
    const overrides = { ...flag.tenantOverrides };
    delete overrides[tenantId];
    await this.updateFeatureFlag(flagId, { tenantOverrides: overrides });
  },

  async deleteFeatureFlag(id: string): Promise<void> {
    await run('DELETE FROM feature_flags WHERE id = ?', [id]);
  },

  mapFeatureFlag(row: any): T.FeatureFlag {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      enabled: !!row.enabled,
      tenantOverrides: JSON.parse(row.tenant_overrides || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // RELEASE ROLLOUTS
  // ═════════════════════════════════════════════════════════════════════

  async createReleaseRollout(
    dto: T.CreateReleaseDto,
  ): Promise<T.ReleaseRollout> {
    await ensureTables();
    const id = uid('rel');
    await run(
      `INSERT INTO release_rollouts (id, version, status, rollout_percentage, changelog, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.version,
        'draft',
        dto.rolloutPercentage || 0,
        dto.changelog || null,
        dto.createdBy || null,
        now(),
      ],
    );
    return this.findReleaseRolloutById(id) as Promise<T.ReleaseRollout>;
  },

  async findReleaseRolloutById(
    id: string,
  ): Promise<T.ReleaseRollout | null> {
    const rows = await query('SELECT * FROM release_rollouts WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapReleaseRollout(rows[0]) : null;
  },

  async findAllReleaseRollouts(filter?: {
    status?: T.ReleaseStatus;
    limit?: number;
    offset?: number;
  }): Promise<T.PaginatedResult<T.ReleaseRollout>> {
    await ensureTables();
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM release_rollouts ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM release_rollouts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapReleaseRollout(r)),
      total,
      offset,
      limit,
    };
  },

  async updateReleaseRollout(
    id: string,
    updates: {
      status?: T.ReleaseStatus;
      rolloutPercentage?: number;
      completedAt?: string;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.status) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.rolloutPercentage !== undefined) {
      sets.push('rollout_percentage = ?');
      params.push(updates.rolloutPercentage);
    }
    if (updates.completedAt) {
      sets.push('completed_at = ?');
      params.push(updates.completedAt);
    }
    if (sets.length === 0) return;
    params.push(id);
    await run(
      `UPDATE release_rollouts SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  mapReleaseRollout(row: any): T.ReleaseRollout {
    return {
      id: row.id,
      version: row.version,
      status: row.status,
      rolloutPercentage: row.rollout_percentage,
      changelog: row.changelog || null,
      createdBy: row.created_by || null,
      createdAt: row.created_at,
      completedAt: row.completed_at || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // INCIDENTS
  // ═════════════════════════════════════════════════════════════════════

  async createIncident(dto: T.CreateIncidentDto): Promise<T.Incident> {
    await ensureTables();
    const id = uid('inc');
    await run(
      `INSERT INTO incidents (id, severity, title, description, status, affected_components, reported_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.severity,
        dto.title,
        dto.description || null,
        'open',
        JSON.stringify(dto.affectedComponents || []),
        dto.reportedBy || null,
        now(),
      ],
    );
    return this.findIncidentById(id) as Promise<T.Incident>;
  },

  async findIncidentById(id: string): Promise<T.Incident | null> {
    const rows = await query('SELECT * FROM incidents WHERE id = ?', [id]);
    return rows.length ? this.mapIncident(rows[0]) : null;
  },

  async findAllIncidents(filter?: {
    severity?: T.IncidentSeverity;
    status?: T.IncidentStatus;
    limit?: number;
    offset?: number;
  }): Promise<T.PaginatedResult<T.Incident>> {
    await ensureTables();
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.severity) {
      conditions.push('severity = ?');
      params.push(filter.severity);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM incidents ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM incidents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapIncident(r)),
      total,
      offset,
      limit,
    };
  },

  async resolveIncident(
    id: string,
    resolvedBy: string,
  ): Promise<void> {
    await run(
      'UPDATE incidents SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?',
      ['resolved', now(), resolvedBy, id],
    );
  },

  async getOpenIncidentCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM incidents WHERE status IN ('open','investigating')",
    );
    return rows[0]?.count || 0;
  },

  async getCriticalIncidentCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM incidents WHERE severity = 'critical' AND status IN ('open','investigating')",
    );
    return rows[0]?.count || 0;
  },

  mapIncident(row: any): T.Incident {
    return {
      id: row.id,
      severity: row.severity,
      title: row.title,
      description: row.description || null,
      status: row.status,
      affectedComponents: JSON.parse(row.affected_components || '[]'),
      reportedBy: row.reported_by || null,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || null,
      resolvedBy: row.resolved_by || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═════════════════════════════════════════════════════════════════════

  async createAuditEntry(entry: {
    action: string;
    actorId: string;
    actorName: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<T.AuditEntry> {
    await ensureTables();
    const id = uid('aud');
    await run(
      `INSERT INTO operations_audit_log (id, action, actor_id, actor_name, resource, resource_id, details, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.action,
        entry.actorId,
        entry.actorName,
        entry.resource,
        entry.resourceId || null,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
        now(),
      ],
    );
    return this.findAuditEntryById(id) as Promise<T.AuditEntry>;
  },

  async findAuditEntryById(id: string): Promise<T.AuditEntry | null> {
    const rows = await query(
      'SELECT * FROM operations_audit_log WHERE id = ?',
      [id],
    );
    return rows.length ? this.mapAuditEntry(rows[0]) : null;
  },

  async queryAuditLog(
    filter?: T.AuditFilter,
  ): Promise<T.PaginatedResult<T.AuditEntry>> {
    await ensureTables();
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.action) {
      conditions.push('action = ?');
      params.push(filter.action);
    }
    if (filter?.actorId) {
      conditions.push('actor_id = ?');
      params.push(filter.actorId);
    }
    if (filter?.resource) {
      conditions.push('resource = ?');
      params.push(filter.resource);
    }
    if (filter?.resourceId) {
      conditions.push('resource_id = ?');
      params.push(filter.resourceId);
    }
    if (filter?.since) {
      conditions.push('timestamp >= ?');
      params.push(filter.since);
    }
    if (filter?.until) {
      conditions.push('timestamp <= ?');
      params.push(filter.until);
    }
    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM operations_audit_log ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM operations_audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapAuditEntry(r)),
      total,
      offset,
      limit,
    };
  },

  async getAuditActionSummary(
    since?: string,
  ): Promise<{ action: string; count: number }[]> {
    await ensureTables();
    const sql = since
      ? 'SELECT action, COUNT(*) as count FROM operations_audit_log WHERE timestamp >= ? GROUP BY action ORDER BY count DESC'
      : 'SELECT action, COUNT(*) as count FROM operations_audit_log GROUP BY action ORDER BY count DESC';
    const params = since ? [since] : [];
    const rows = await query(sql, params);
    return rows.map((r: any) => ({
      action: r.action,
      count: r.count,
    }));
  },

  async getAuditLogCount(): Promise<number> {
    await ensureTables();
    const rows = await query(
      'SELECT COUNT(*) as count FROM operations_audit_log',
    );
    return rows[0]?.count || 0;
  },

  mapAuditEntry(row: any): T.AuditEntry {
    return {
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      actorName: row.actor_name,
      resource: row.resource,
      resourceId: row.resource_id || null,
      details: JSON.parse(row.details || '{}'),
      ipAddress: row.ip_address || null,
      timestamp: row.timestamp,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // SYSTEM CONFIG
  // ═════════════════════════════════════════════════════════════════════

  async getSystemConfig(): Promise<Record<string, any>> {
    await ensureTables();
    const rows = await query('SELECT * FROM system_config ORDER BY key');
    const config: Record<string, any> = {};
    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }
    return config;
  },

  async setSystemConfig(
    key: string,
    value: any,
  ): Promise<void> {
    await ensureTables();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await run(
      `INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, serialized, now()],
    );
  },

  async deleteSystemConfig(key: string): Promise<void> {
    await run('DELETE FROM system_config WHERE key = ?', [key]);
  },

  // ═════════════════════════════════════════════════════════════════════
  // USER QUERIES
  // ═════════════════════════════════════════════════════════════════════

  async getAdminUsers(): Promise<T.AdminUser[]> {
    const rows = await query(
      `SELECT id, name, email, role, tenant_id, last_login_at, active, created_at
       FROM users ORDER BY name ASC`,
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email || '',
      role: r.role,
      tenantId: r.tenant_id || null,
      lastLoginAt: r.last_login_at || null,
      active: !!r.active,
      createdAt: r.created_at,
    }));
  },

  async getUserCountByRole(): Promise<Record<string, number>> {
    const rows = await query(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role',
    );
    const byRole: Record<string, number> = {};
    for (const row of rows) {
      byRole[row.role] = row.count;
    }
    return byRole;
  },

  async getUserCount(): Promise<number> {
    const rows = await query('SELECT COUNT(*) as count FROM users');
    return rows[0]?.count || 0;
  },

  async getActiveTodayUserCount(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      "SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?",
      [today],
    );
    return rows[0]?.count || 0;
  },

  // ═════════════════════════════════════════════════════════════════════
  // TENANT QUERIES
  // ═════════════════════════════════════════════════════════════════════

  async getTenantCountByStatus(): Promise<Record<string, number>> {
    const rows = await query(
      'SELECT status, COUNT(*) as count FROM tenants GROUP BY status',
    );
    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      byStatus[row.status] = row.count;
    }
    return byStatus;
  },

  async getSubscriptionCountByStatus(): Promise<Record<string, number>> {
    const rows = await query(
      'SELECT status, COUNT(*) as count FROM billing_subscriptions GROUP BY status',
    );
    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      byStatus[row.status] = row.count;
    }
    return byStatus;
  },

  async getRevenueEstimate(): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM billing_invoices
       WHERE status = 'paid' AND paid_at >= datetime('now', '-30 days')`,
    );
    return rows[0]?.total || 0;
  },
};
