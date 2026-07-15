import { query, run } from '../../db';
import { PlatformRepository as PR } from './platform.repository';
import { SubscriptionService } from './subscription.service';
import * as T from './platform.types';

// ── Lifecycle Validator ─────────────────────────────────────────────────────

function assertValidTransition(
  current: T.TenantLifecycleState,
  target: T.TenantLifecycleState,
): void {
  const allowed = T.TENANT_LIFECYCLE_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new Error(
      `Invalid lifecycle transition: ${current} → ${target}. Allowed: ${(allowed || []).join(', ') || 'none'}`,
    );
  }
}

// ── Default Quota Lookup ────────────────────────────────────────────────────

function getDefaultQuota(plan: T.TenantPlan): { maxRooms: number; maxUsers: number } {
  switch (plan) {
    case 'starter':
      return { maxRooms: 15, maxUsers: 5 };
    case 'professional':
      return { maxRooms: 50, maxUsers: 20 };
    case 'enterprise':
      return { maxRooms: 500, maxUsers: 100 };
    case 'custom':
      return { maxRooms: 10000, maxUsers: 1000 };
    case 'single':
      return { maxRooms: 10000, maxUsers: 1000 };
    case 'growth':
      return { maxRooms: 200, maxUsers: 50 };
    default:
      return { maxRooms: 15, maxUsers: 5 };
  }
}

// ── Schema Helpers ──────────────────────────────────────────────────────────

function isPostgres(): boolean {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function sanitizeSchemaName(id: string): string {
  return `tenant_${id.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
}

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

// ═════════════════════════════════════════════════════════════════════════════
// TENANT SERVICE — Full Lifecycle Control Plane
// ═════════════════════════════════════════════════════════════════════════════

export const TenantService = {
  // ── Provisioning ─────────────────────────────────────────────────────────

  /**
   * Create and fully provision a new tenant.
   *
   * 1. Validate the DTO
   * 2. Ensure the slug is unique
   * 3. Create the tenant record (status = 'trial')
   * 4. Provision the PostgreSQL schema (PG only)
   * 5. Issue an initial license key
   * 6. Return the fully hydrated Tenant object
   */
  async createTenant(dto: T.CreateTenantDto): Promise<T.Tenant> {
    const { LicenseService } = require('./license.service');

    if (!dto.name || !dto.name.trim()) {
      throw new Error('Tenant name is required');
    }
    if (!dto.slug || !dto.slug.trim()) {
      throw new Error('Tenant slug is required');
    }
    if (!T.VALID_TENANT_PLANS.includes(dto.plan)) {
      throw new Error(
        `Invalid plan "${dto.plan}". Must be one of: ${T.VALID_TENANT_PLANS.join(', ')}`,
      );
    }

    // Ensure table columns exist before querying (idempotent)
    await PR.ensureTenantTableColumns();

    const existing = await PR.findTenantBySlug(dto.slug);
    if (existing) {
      throw new Error(`Tenant slug "${dto.slug}" is already taken`);
    }

    const tenant = await PR.createTenant(dto);

    try {
      await this.provisionTenantSchema(tenant.id);
    } catch {
      /* PostgreSQL schemas are optional */
    }

    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await LicenseService.issueLicense(
        tenant.id,
        dto.plan,
        365,
        'system',
        `Auto-issued license for tenant ${dto.name}`,
      );
    } catch {
      /* license issuance is non-critical for first provisioning */
    }

    return this.getTenant(tenant.id) as Promise<T.Tenant>;
  },

  /**
   * Retrieve a single tenant by ID.
   */
  async getTenant(id: string): Promise<T.Tenant | null> {
    return PR.findTenantById(id);
  },

  /**
   * Retrieve a tenant by slug (for subdomain resolution).
   */
  async getTenantBySlug(slug: string): Promise<T.Tenant | null> {
    return PR.findTenantBySlug(slug);
  },

  /**
   * List tenants with optional filtering and pagination.
   */
  async listTenants(filter?: T.TenantListFilter): Promise<T.PaginatedResult<T.Tenant>> {
    return PR.findAllTenants(filter);
  },

  // ── Updates ──────────────────────────────────────────────────────────────

  /**
   * Update a tenant's mutable fields.
   */
  async updateTenant(
    id: string,
    updates: T.UpdateTenantDto,
  ): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant ${id} not found`);
    }
    if (tenant.status === 'deleted') {
      throw new Error('Cannot update a deleted tenant');
    }

    if (updates.slug && updates.slug !== tenant.slug) {
      const existing = await PR.findTenantBySlug(updates.slug);
      if (existing) {
        throw new Error(`Tenant slug "${updates.slug}" is already taken`);
      }
    }

    await PR.updateTenant(id, updates as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  /**
   * Replace the branding configuration for a tenant.
   */
  async updateTenantBranding(
    id: string,
    branding: T.TenantBranding,
  ): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant ${id} not found`);
    }
    if (tenant.status === 'deleted') {
      throw new Error('Cannot update branding on a deleted tenant');
    }
    await PR.updateTenant(id, { branding } as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  /**
   * Upgrade (or downgrade) a tenant's plan.
   *
   * Automatically adjusts maxRooms / maxUsers to match the new plan's
   * entitlements, and issues a fresh license key.
   */
  async updateTenantPlan(
    id: string,
    plan: T.TenantPlan,
  ): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant ${id} not found`);
    }
    if (tenant.status === 'deleted') {
      throw new Error('Cannot change plan on a deleted tenant');
    }
    if (!T.VALID_TENANT_PLANS.includes(plan)) {
      throw new Error(
        `Invalid plan "${plan}". Must be one of: ${T.VALID_TENANT_PLANS.join(', ')}`,
      );
    }

    const { maxRooms, maxUsers } = getDefaultQuota(plan);
    await PR.updateTenant(id, { plan, maxRooms, maxUsers } as any);

    const { LicenseService } = require('./license.service');
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await LicenseService.issueLicense(
        id,
        plan,
        365,
        'system',
        `Auto-issued license for plan upgrade to ${plan}`,
      );
    } catch {
      /* non-critical */
    }

    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  // ── Lifecycle State Machine ──────────────────────────────────────────────

  /**
   * Suspend a tenant — prevents access to the platform.
   *
   * Allowed from: trial, active, past_due
   */
  async suspendTenant(id: string): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    assertValidTransition(tenant.status, 'suspended');
    await PR.updateTenant(id, { status: 'suspended' } as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  /**
   * Activate a tenant — restores full platform access.
   *
   * Allowed from: trial, past_due, suspended
   */
  async activateTenant(id: string): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    assertValidTransition(tenant.status, 'active');
    await PR.updateTenant(id, { status: 'active' } as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  /**
   * Archive a tenant — marks as read-only / historical.
   *
   * Allowed from: trial, active, past_due, suspended
   */
  async archiveTenant(id: string): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    assertValidTransition(tenant.status, 'archived');
    await PR.updateTenant(id, { status: 'archived' } as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  /**
   * Delete a tenant — permanent removal.
   *
   * Allowed from: archived, suspended
   *
   * Also deprovisions the PostgreSQL schema and removes all license records.
   */
  async deleteTenant(id: string): Promise<void> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    assertValidTransition(tenant.status, 'deleted');

    try {
      await this.deprovisionTenantSchema(id);
    } catch {
      /* best-effort */
    }

    try {
      const { LicenseService } = require('./license.service');
      const licenses = await LicenseService.getLicensesByTenant(id);
      for (const lic of licenses) {
        await LicenseService.revokeLicense(lic.licenseKey, 'system');
      }
    } catch {
      /* best-effort */
    }

    await PR.deleteTenant(id);
  },

  /**
   * Mark a tenant as past_due (subscription expired).
   *
   * Allowed from: active
   */
  async markPastDue(id: string): Promise<T.Tenant> {
    const tenant = await PR.findTenantById(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    assertValidTransition(tenant.status, 'past_due');
    await PR.updateTenant(id, { status: 'past_due' } as any);
    return PR.findTenantById(id) as Promise<T.Tenant>;
  },

  // ── Quota / Limits ───────────────────────────────────────────────────────

  /**
   * Check whether a tenant is allowed to create additional rooms or users.
   *
   * Returns an object with:
   *  - allowed: boolean
   *  - limit: the maximum allowable count
   *  - current: the current / provided count
   *  - remaining: how many more can be created
   */
  async checkQuota(
    tenantId: string,
    metric: 'rooms' | 'users',
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number; current: number; remaining: number }> {
    const tenant = await PR.findTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return { allowed: false, limit: 0, current: currentCount, remaining: 0 };
    }
    const limit = metric === 'rooms' ? tenant.maxRooms : tenant.maxUsers;
    const remaining = Math.max(0, limit - currentCount);
    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount,
      remaining,
    };
  },

  /**
   * Return the full quota summary for a tenant.
   */
  async getQuotaSummary(tenantId: string): Promise<T.TenantQuota> {
    const tenant = await PR.findTenantById(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    let maxBranches = 1;
    if (tenant.plan === 'enterprise' || tenant.plan === 'custom' || tenant.plan === 'single') {
      maxBranches = 10;
    } else if (tenant.plan === 'growth') {
      maxBranches = 3;
    }

    let storageGB = 1;
    if (tenant.plan === 'professional') storageGB = 5;
    else if (tenant.plan === 'enterprise') storageGB = 50;
    else if (tenant.plan === 'custom' || tenant.plan === 'single') storageGB = 500;
    else if (tenant.plan === 'growth') storageGB = 20;

    return {
      maxRooms: tenant.maxRooms,
      maxUsers: tenant.maxUsers,
      maxBranches,
      storageGB,
      apiCallsPerDay: 1000,
    };
  },

  // ── Schema Provisioning (PostgreSQL) ──────────────────────────────────────

  /**
   * Provision a dedicated PostgreSQL schema for a tenant.
   *
   * In PostgreSQL deployments each tenant gets an isolated schema (namespace)
   * within the same database.  The schema name is derived from the tenant ID:
   *   tenant_<sanitized_id>
   *
   * In SQLite mode this operation is a no-op (schemas are not supported by SQLite).
   */
  async provisionTenantSchema(tenantId: string): Promise<void> {
    if (!isPostgres()) return;
    const schemaName = sanitizeSchemaName(tenantId);
    await run(`CREATE SCHEMA IF NOT EXISTS ${sanitizeIdentifier(schemaName)}`);
  },

  /**
   * Drop a tenant's dedicated PostgreSQL schema.
   *
   * CASCADE ensures all tenant-owned objects are removed.
   * In SQLite mode this operation is a no-op.
   */
  async deprovisionTenantSchema(tenantId: string): Promise<void> {
    if (!isPostgres()) return;
    const schemaName = sanitizeSchemaName(tenantId);
    await run(`DROP SCHEMA IF EXISTS ${sanitizeIdentifier(schemaName)} CASCADE`);
  },

  /**
   * Return the PostgreSQL schema name for a tenant (for use in search_path).
   */
  getSchemaName(tenantId: string): string {
    return sanitizeSchemaName(tenantId);
  },

  // ── Aggregation ──────────────────────────────────────────────────────────

  /**
   * Return aggregate tenant counts grouped by status.
   */
  async getTenantSummary(): Promise<{
    total: number;
    byStatus: Record<T.TenantLifecycleState, number>;
    byPlan: Record<string, number>;
  }> {
    const allTenants = await PR.findAllTenants({ limit: 10000 });
    const byStatus: Record<string, number> = {};
    const byPlan: Record<string, number> = {};

    for (const t of allTenants.data) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPlan[t.plan] = (byPlan[t.plan] || 0) + 1;
    }

    return {
      total: allTenants.total,
      byStatus: byStatus as Record<T.TenantLifecycleState, number>,
      byPlan,
    };
  },
};
