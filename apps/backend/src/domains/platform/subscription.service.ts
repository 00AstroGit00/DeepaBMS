import { TenantService } from './tenant.service';
import { query, run } from '../../db';
import crypto from 'crypto';

// ── Plan Entitlements ──────────────────────────────────────────────────────

export interface PlanEntitlement {
  maxRooms: number;
  maxUsers: number;
  features: string[];
}

export const PLANS: Record<string, PlanEntitlement> = {
  starter: {
    maxRooms: 15,
    maxUsers: 5,
    features: ['rooms', 'inventory', 'pos_restaurant'],
  },
  professional: {
    maxRooms: 50,
    maxUsers: 20,
    features: ['rooms', 'inventory', 'pos_restaurant', 'pos_bar', 'accounting', 'sync_offline'],
  },
  enterprise: {
    maxRooms: 500,
    maxUsers: 100,
    features: [
      'rooms',
      'inventory',
      'pos_restaurant',
      'pos_bar',
      'accounting',
      'sync_offline',
      'analytics_graphql',
      'ai_integration',
      'multi_branch',
    ],
  },
  custom: {
    maxRooms: 10000,
    maxUsers: 1000,
    features: [
      'rooms',
      'inventory',
      'pos_restaurant',
      'pos_bar',
      'accounting',
      'sync_offline',
      'analytics_graphql',
      'ai_integration',
      'multi_branch',
    ],
  },
};

// ── Billing Plan Pricing ───────────────────────────────────────────────────

export const BILLING_PLANS: Record<string, { monthly: number; yearly: number; currency: string }> = {
  starter: { monthly: 29, yearly: 290, currency: 'USD' },
  professional: { monthly: 99, yearly: 990, currency: 'USD' },
  enterprise: { monthly: 299, yearly: 2990, currency: 'USD' },
  custom: { monthly: 0, yearly: 0, currency: 'USD' },
};

// ── Feature Quota Limits per Plan ──────────────────────────────────────────

const FEATURE_QUOTAS: Record<string, Record<string, number>> = {
  starter: {
    api_calls_per_day: 1000,
    storage_gb: 1,
    branches: 1,
    devices: 3,
  },
  professional: {
    api_calls_per_day: 5000,
    storage_gb: 5,
    branches: 3,
    devices: 10,
  },
  enterprise: {
    api_calls_per_day: 50000,
    storage_gb: 50,
    branches: 10,
    devices: 50,
  },
  custom: {
    api_calls_per_day: 500000,
    storage_gb: 500,
    branches: 100,
    devices: 500,
  },
};

// ── Custom Plan Overrides ──────────────────────────────────────────────────

const customPlanLimits: Map<string, Record<string, number>> = new Map();

export function setCustomPlanLimits(tenantId: string, limits: Record<string, number>): void {
  customPlanLimits.set(tenantId, limits);
}

export function getCustomPlanLimits(tenantId: string): Record<string, number> | undefined {
  return customPlanLimits.get(tenantId);
}

// ── Usage Tracking Types ───────────────────────────────────────────────────

export interface UsageRecord {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  period: string;
  recordedAt: string;
}

export interface BillingEvent {
  id: string;
  tenantId: string;
  eventType: string;
  amount: number;
  currency: string;
  description: string | null;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface BillingHook {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
}

// ── Schema Init ────────────────────────────────────────────────────────────

async function initUsageTables(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id          VARCHAR(50)  PRIMARY KEY,
      tenant_id   VARCHAR(50)  NOT NULL,
      metric      VARCHAR(100) NOT NULL,
      value       REAL         NOT NULL DEFAULT 0,
      period      VARCHAR(20)  NOT NULL DEFAULT 'monthly',
      recorded_at TIMESTAMP    NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS billing_events (
      id          VARCHAR(50)  PRIMARY KEY,
      tenant_id   VARCHAR(50)  NOT NULL,
      event_type  VARCHAR(100) NOT NULL,
      amount      REAL         NOT NULL DEFAULT 0,
      currency    VARCHAR(10)  NOT NULL DEFAULT 'USD',
      description TEXT,
      metadata    TEXT         DEFAULT '{}',
      timestamp   TIMESTAMP    NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS billing_hooks (
      id          VARCHAR(50)  PRIMARY KEY,
      tenant_id   VARCHAR(50)  NOT NULL,
      url         VARCHAR(500) NOT NULL,
      events      TEXT         NOT NULL DEFAULT '[]',
      secret      VARCHAR(200) NOT NULL,
      enabled     BOOLEAN      NOT NULL DEFAULT 1,
      created_at  TIMESTAMP    NOT NULL
    )
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const SubscriptionService = {
  // ── Existing API (backward compatible) ──────────────────────────────

  async getEntitlements(planName: string): Promise<PlanEntitlement> {
    const entitlement = PLANS[planName.toLowerCase()];
    if (!entitlement) {
      throw new Error(`Plan ${planName} does not exist`);
    }
    return entitlement;
  },

  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await TenantService.getTenant(tenantId);
    if (!tenant) return false;
    if (tenant.status !== 'active' && tenant.status !== 'trial') return false;

    const entitlements = await this.getEntitlements(tenant.plan);
    return entitlements.features.includes(feature);
  },

  async upgradePlan(tenantId: string, newPlan: 'starter' | 'professional' | 'enterprise' | 'custom'): Promise<void> {
    const entitlements = await this.getEntitlements(newPlan);
    await TenantService.updateTenant(tenantId, {
      plan: newPlan,
      maxRooms: entitlements.maxRooms,
      maxUsers: entitlements.maxUsers,
    });
  },

  // ── Usage Tracking ─────────────────────────────────────────────────

  async trackUsage(tenantId: string, metric: string, value: number): Promise<UsageRecord> {
    await initUsageTables();
    const id = `usage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const period = 'monthly';
    await run(
      `INSERT INTO usage_records (id, tenant_id, metric, value, period, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, metric, value, period, now],
    );
    return { id, tenantId, metric, value, period, recordedAt: now };
  },

  async getUsageSummary(tenantId: string, period: string = 'monthly'): Promise<UsageRecord[]> {
    await initUsageTables();
    const rows = await query(
      `SELECT * FROM usage_records WHERE tenant_id = ? AND period = ? ORDER BY recorded_at DESC`,
      [tenantId, period],
    );
    return rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      metric: r.metric,
      value: r.value,
      period: r.period,
      recordedAt: r.recorded_at,
    }));
  },

  async checkFeatureQuota(tenantId: string, feature: string): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    remaining: number;
  }> {
    const tenant = await TenantService.getTenant(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const planQuotas = FEATURE_QUOTAS[tenant.plan];
    if (!planQuotas) {
      return { allowed: false, limit: 0, current: 0, remaining: 0 };
    }

    let limit = planQuotas[feature];
    if (limit === undefined) return { allowed: true, limit: -1, current: 0, remaining: -1 };

    if (tenant.plan === 'custom') {
      const overrides = customPlanLimits.get(tenantId);
      if (overrides && overrides[feature] !== undefined) {
        limit = overrides[feature];
      }
    }

    await initUsageTables();
    const rows = await query(
      `SELECT COALESCE(SUM(value), 0) as total FROM usage_records
       WHERE tenant_id = ? AND metric = ? AND period = 'monthly'`,
      [tenantId, feature],
    );
    const current = rows[0]?.total || 0;
    const remaining = Math.max(0, limit - current);

    return {
      allowed: current < limit,
      limit,
      current,
      remaining,
    };
  },

  // ── Billing Hooks ───────────────────────────────────────────────────

  async registerBillingHook(tenantId: string, url: string, events: string[]): Promise<BillingHook> {
    await initUsageTables();
    const id = `hook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO billing_hooks (id, tenant_id, url, events, secret, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, tenantId, url, JSON.stringify(events), secret, now],
    );
    return { id, tenantId, url, events, secret, enabled: true, createdAt: now };
  },

  async getBillingHooks(tenantId?: string): Promise<BillingHook[]> {
    await initUsageTables();
    let rows: any[];
    if (tenantId) {
      rows = await query('SELECT * FROM billing_hooks WHERE tenant_id = ?', [tenantId]);
    } else {
      rows = await query('SELECT * FROM billing_hooks');
    }
    return rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      url: r.url,
      events: JSON.parse(r.events || '[]'),
      secret: r.secret,
      enabled: !!r.enabled,
      createdAt: r.created_at,
    }));
  },

  async deleteBillingHook(hookId: string): Promise<void> {
    await run('DELETE FROM billing_hooks WHERE id = ?', [hookId]);
  },

  // ── Billing Events ─────────────────────────────────────────────────

  async triggerBillingEvent(tenantId: string, event: Omit<BillingEvent, 'id' | 'tenantId' | 'timestamp'>): Promise<BillingEvent> {
    await initUsageTables();
    const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await run(
      `INSERT INTO billing_events (id, tenant_id, event_type, amount, currency, description, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, event.eventType, event.amount, event.currency || 'USD', event.description || null, JSON.stringify(event.metadata || {}), now],
    );

    const hooks = await this.getBillingHooks(tenantId);
    const eventTypes = event.eventType;
    for (const hook of hooks) {
      if (hook.enabled && hook.events.some((e) => e === '*' || e === eventTypes)) {
        this.deliverHook(hook, { id, tenantId, ...event, timestamp: now }).catch(() => {});
      }
    }

    return { id, tenantId, ...event, timestamp: now };
  },

  async getBillingEvents(tenantId: string): Promise<BillingEvent[]> {
    await initUsageTables();
    const rows = await query(
      'SELECT * FROM billing_events WHERE tenant_id = ? ORDER BY timestamp DESC',
      [tenantId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      eventType: r.event_type,
      amount: r.amount,
      currency: r.currency,
      description: r.description || null,
      timestamp: r.timestamp,
      metadata: JSON.parse(r.metadata || '{}'),
    }));
  },

  // ── Overage Calculation ────────────────────────────────────────────

  async calculateOverage(tenantId: string): Promise<{
    overages: { metric: string; usage: number; limit: number; overage: number; rate: number; charge: number }[];
    totalCharge: number;
  }> {
    const tenant = await TenantService.getTenant(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const OVERAGE_RATES: Record<string, number> = {
      api_calls_per_day: 0.001,
      storage_gb: 5,
      branches: 20,
      devices: 10,
    };

    const overages: any[] = [];
    let totalCharge = 0;

    const quotaKeys = Object.keys(FEATURE_QUOTAS[tenant.plan] || {});
    for (const metric of quotaKeys) {
      const result = await this.checkFeatureQuota(tenantId, metric);
      if (result.current > result.limit) {
        const overage = result.current - result.limit;
        const rate = OVERAGE_RATES[metric] || 0;
        const charge = overage * rate;
        overages.push({ metric, usage: result.current, limit: result.limit, overage, rate, charge });
        totalCharge += charge;
      }
    }

    return { overages, totalCharge };
  },

  // ── Usage Analytics ────────────────────────────────────────────────

  async getUsageAnalytics(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<{
    summary: { metric: string; total: number; average: number; min: number; max: number; count: number }[];
    dailyBreakdown: { date: string; metrics: Record<string, number> }[];
    totalUsage: number;
  }> {
    await initUsageTables();

    const rows = await query(
      `SELECT * FROM usage_records
       WHERE tenant_id = ? AND recorded_at >= ? AND recorded_at <= ?
       ORDER BY recorded_at ASC`,
      [tenantId, from, to],
    );

    const grouped: Record<string, number[]> = {};
    const daily: Record<string, Record<string, number>> = {};

    for (const r of rows) {
      if (!grouped[r.metric]) grouped[r.metric] = [];
      grouped[r.metric].push(r.value);

      const day = r.recorded_at.slice(0, 10);
      if (!daily[day]) daily[day] = {};
      daily[day][r.metric] = (daily[day][r.metric] || 0) + r.value;
    }

    const summary = Object.entries(grouped).map(([metric, values]) => {
      const total = values.reduce((a, b) => a + b, 0);
      return {
        metric,
        total,
        average: total / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    const dailyBreakdown = Object.entries(daily).map(([date, metrics]) => ({
      date,
      metrics,
    }));

    const totalUsage = rows.reduce((sum: number, r: any) => sum + r.value, 0);

    return { summary, dailyBreakdown, totalUsage };
  },

  // ── Private Helpers ────────────────────────────────────────────────

  async deliverHook(hook: BillingHook, event: BillingEvent): Promise<void> {
    const payload = JSON.stringify(event);
    const signature = crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');
    try {
      const response = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Billing-Signature': signature,
          'X-Billing-Event': event.eventType,
        },
        body: payload,
      });
      if (!response.ok) {
        console.warn(`[Billing] Hook ${hook.id} returned ${response.status}`);
      }
    } catch (err: any) {
      console.error(`[Billing] Hook delivery failed for ${hook.id}: ${err.message}`);
    }
  },
};
