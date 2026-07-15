import { query, run } from '../../db';
import { TenantService } from './tenant.service';
import { BILLING_PLANS, SubscriptionService } from './subscription.service';
import { LicenseService } from './license.service';
import type {
  TenantPlan,
  BillingProvider,
  BillingSubscription,
  BillingInvoice,
  BillingInvoiceLine,
} from './platform.types';

// ── Schema Init ────────────────────────────────────────────────────────────

async function initBillingTables(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS billing_subscriptions (
      id                     VARCHAR(50)  PRIMARY KEY,
      tenant_id              VARCHAR(50)  NOT NULL,
      plan                   VARCHAR(20)  NOT NULL,
      provider               VARCHAR(20)  NOT NULL DEFAULT 'manual',
      provider_subscription_id VARCHAR(200),
      status                 VARCHAR(20)  NOT NULL DEFAULT 'active',
      current_period_start   TIMESTAMP    NOT NULL,
      current_period_end     TIMESTAMP    NOT NULL,
      canceled_at            TIMESTAMP,
      trial_ends_at          TIMESTAMP,
      metadata               TEXT         DEFAULT '{}',
      created_at             TIMESTAMP    NOT NULL,
      updated_at             TIMESTAMP    NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id                  VARCHAR(50)  PRIMARY KEY,
      tenant_id           VARCHAR(50)  NOT NULL,
      subscription_id     VARCHAR(50),
      provider            VARCHAR(20)  NOT NULL DEFAULT 'manual',
      provider_invoice_id VARCHAR(200),
      number              VARCHAR(100),
      amount              REAL         NOT NULL,
      currency            VARCHAR(10)  NOT NULL DEFAULT 'USD',
      status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
      paid_at             TIMESTAMP,
      due_date            TIMESTAMP,
      lines               TEXT         DEFAULT '[]',
      metadata            TEXT         DEFAULT '{}',
      created_at          TIMESTAMP    NOT NULL
    )
  `);
}

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

function periodEnd(plan: TenantPlan): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function trialEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const BillingService = {
  // ── Subscription Management ────────────────────────────────────────

  async createSubscription(
    tenantId: string,
    plan: TenantPlan,
    provider: BillingProvider = 'manual',
  ): Promise<BillingSubscription> {
    await initBillingTables();

    const existing = await this.getSubscriptionStatus(tenantId);
    if (existing && existing.status === 'active') {
      throw new Error(`Tenant ${tenantId} already has an active subscription`);
    }

    const id = uid('sub');
    const start = now();
    const end = periodEnd(plan);
    const trial = trialEnd();

    const providerSubId = provider !== 'manual'
      ? `${provider}_${tenantId}_${Date.now()}`
      : null;

    await run(
      `INSERT INTO billing_subscriptions
         (id, tenant_id, plan, provider, provider_subscription_id, status,
          current_period_start, current_period_end, trial_ends_at, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, plan, provider, providerSubId, start, end, trial, '{}', start, start],
    );

    await TenantService.updateTenant(tenantId, {
      plan,
    } as any);

    return {
      id,
      tenantId,
      plan,
      provider,
      providerSubscriptionId: providerSubId,
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      canceledAt: null,
      trialEndsAt: trial,
      metadata: {},
      createdAt: start,
      updatedAt: start,
    };
  },

  async cancelSubscription(subscriptionId: string): Promise<BillingSubscription> {
    await initBillingTables();
    const rows = await query('SELECT * FROM billing_subscriptions WHERE id = ?', [subscriptionId]);
    if (rows.length === 0) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const canceled = now();
    await run(
      "UPDATE billing_subscriptions SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?",
      [canceled, canceled, subscriptionId],
    );

    const updated = await query('SELECT * FROM billing_subscriptions WHERE id = ?', [subscriptionId]);
    const r = updated[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      plan: r.plan,
      provider: r.provider,
      providerSubscriptionId: r.provider_subscription_id || null,
      status: r.status,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      canceledAt: r.canceled_at || null,
      trialEndsAt: r.trial_ends_at || null,
      metadata: JSON.parse(r.metadata || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
    };
  },

  async getSubscriptionStatus(tenantId: string): Promise<BillingSubscription | null> {
    await initBillingTables();
    const rows = await query(
      `SELECT * FROM billing_subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      plan: r.plan,
      provider: r.provider,
      providerSubscriptionId: r.provider_subscription_id || null,
      status: r.status,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      canceledAt: r.canceled_at || null,
      trialEndsAt: r.trial_ends_at || null,
      metadata: JSON.parse(r.metadata || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
    };
  },

  // ── Invoice Management ─────────────────────────────────────────────

  async createInvoice(
    tenantId: string,
    amount: number,
    lines: BillingInvoiceLine[],
    options?: {
      subscriptionId?: string;
      provider?: BillingProvider;
      number?: string;
      currency?: string;
      dueDate?: string;
    },
  ): Promise<BillingInvoice> {
    await initBillingTables();
    const id = uid('inv');
    const created = now();

    await run(
      `INSERT INTO billing_invoices
         (id, tenant_id, subscription_id, provider, provider_invoice_id, number,
          amount, currency, status, due_date, lines, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        options?.subscriptionId || null,
        options?.provider || 'manual',
        null,
        options?.number || null,
        amount,
        options?.currency || 'USD',
        options?.dueDate || null,
        JSON.stringify(lines),
        '{}',
        created,
      ],
    );

    return {
      id,
      tenantId,
      subscriptionId: options?.subscriptionId || null,
      provider: options?.provider || 'manual',
      providerInvoiceId: null,
      number: options?.number || null,
      amount,
      currency: options?.currency || 'USD',
      status: 'open',
      paidAt: null,
      dueDate: options?.dueDate || null,
      lines,
      metadata: {},
      createdAt: created,
    };
  },

  async getInvoice(invoiceId: string): Promise<BillingInvoice | null> {
    await initBillingTables();
    const rows = await query('SELECT * FROM billing_invoices WHERE id = ?', [invoiceId]);
    if (rows.length === 0) return null;
    return this.mapInvoice(rows[0]);
  },

  async getPaymentHistory(tenantId: string): Promise<BillingInvoice[]> {
    await initBillingTables();
    const rows = await query(
      `SELECT * FROM billing_invoices WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map((r: any) => this.mapInvoice(r));
  },

  async markInvoicePaid(invoiceId: string, providerInvoiceId?: string): Promise<BillingInvoice> {
    await initBillingTables();
    const paid = now();
    if (providerInvoiceId) {
      await run(
        "UPDATE billing_invoices SET status = 'paid', paid_at = ?, provider_invoice_id = ? WHERE id = ?",
        [paid, providerInvoiceId, invoiceId],
      );
    } else {
      await run(
        "UPDATE billing_invoices SET status = 'paid', paid_at = ? WHERE id = ?",
        [paid, invoiceId],
      );
    }
    const rows = await query('SELECT * FROM billing_invoices WHERE id = ?', [invoiceId]);
    return this.mapInvoice(rows[0]);
  },

  async voidInvoice(invoiceId: string): Promise<void> {
    await run("UPDATE billing_invoices SET status = 'void' WHERE id = ?", [invoiceId]);
  },

  // ── Webhook Processing ─────────────────────────────────────────────

  async handleBillingWebhook(provider: BillingProvider, event: Record<string, any>): Promise<{ handled: boolean; action?: string }> {
    const eventType = event.type || event.event_type || 'unknown';

    switch (provider) {
      case 'stripe':
        return this.handleStripeWebhook(eventType, event);
      case 'razorpay':
        return this.handleRazorpayWebhook(eventType, event);
      case 'manual':
        return { handled: true, action: 'manual_webhook_ignored' };
      default:
        return { handled: false, action: `unknown_provider_${provider}` };
    }
  },

  async handleStripeWebhook(eventType: string, event: Record<string, any>): Promise<{ handled: boolean; action?: string }> {
    switch (eventType) {
      case 'invoice.paid': {
        const invoiceObj = event.data?.object;
        if (invoiceObj?.id) {
          const existing = await query('SELECT * FROM billing_invoices WHERE provider_invoice_id = ?', [invoiceObj.id]);
          if (existing.length > 0) {
            await this.markInvoicePaid(existing[0].id, invoiceObj.id);
          }
        }
        return { handled: true, action: 'invoice_paid' };
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subObj = event.data?.object;
        if (subObj?.id) {
          const status = eventType === 'customer.subscription.deleted' ? 'canceled' : 'active';
          await run(
            "UPDATE billing_subscriptions SET status = ?, updated_at = ? WHERE provider_subscription_id = ?",
            [status, now(), subObj.id],
          );
        }
        return { handled: true, action: 'subscription_updated' };
      }
      default:
        return { handled: true, action: `stripe_${eventType}_acknowledged` };
    }
  },

  async handleRazorpayWebhook(eventType: string, event: Record<string, any>): Promise<{ handled: boolean; action?: string }> {
    switch (eventType) {
      case 'invoice.paid': {
        const invoiceObj = event.payload?.invoice?.entity;
        if (invoiceObj?.id) {
          const existing = await query('SELECT * FROM billing_invoices WHERE provider_invoice_id = ?', [invoiceObj.id]);
          if (existing.length > 0) {
            await this.markInvoicePaid(existing[0].id, invoiceObj.id);
          }
        }
        return { handled: true, action: 'razorpay_invoice_paid' };
      }
      case 'subscription.charged':
        return { handled: true, action: 'razorpay_subscription_charged' };
      default:
        return { handled: true, action: `razorpay_${eventType}_acknowledged` };
    }
  },

  // ── Invoice Generation (Scheduled) ─────────────────────────────────

  async generateMonthlyInvoices(): Promise<number> {
    await initBillingTables();
    const subs = await query(
      "SELECT * FROM billing_subscriptions WHERE status = 'active'",
    );
    let count = 0;
    for (const sub of subs) {
      const pricing = BILLING_PLANS[sub.plan];
      if (!pricing || pricing.monthly === 0) continue;

      const overage = await SubscriptionService.calculateOverage(sub.tenant_id);
      const totalAmount = pricing.monthly + overage.totalCharge;

      const lines: BillingInvoiceLine[] = [
        {
          description: `${sub.plan} plan - Monthly subscription`,
          amount: pricing.monthly,
          quantity: 1,
          period: { start: sub.current_period_start, end: sub.current_period_end },
        },
      ];

      for (const o of overage.overages) {
        lines.push({
          description: `Overage: ${o.metric}`,
          amount: o.charge,
          quantity: 1,
          period: null,
        });
      }

      await this.createInvoice(sub.tenant_id, totalAmount, lines, {
        subscriptionId: sub.id,
        provider: sub.provider,
      });
      count++;
    }
    return count;
  },

  // ── Mapper ─────────────────────────────────────────────────────────

  mapInvoice(row: any): BillingInvoice {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      subscriptionId: row.subscription_id || null,
      provider: row.provider,
      providerInvoiceId: row.provider_invoice_id || null,
      number: row.number || null,
      amount: row.amount,
      currency: row.currency || 'USD',
      status: row.status,
      paidAt: row.paid_at || null,
      dueDate: row.due_date || null,
      lines: JSON.parse(row.lines || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
    };
  },
};
