import { Request, Response, NextFunction } from 'express';
import { getEnabledFeatures } from './feature-flags';

// ── Tenant plan types ──────────────────────────────────────────────────
export type TenantPlan = 'single' | 'starter' | 'growth' | 'enterprise';

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'past_due';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  plan: TenantPlan;
  status: TenantStatus;
  features: Record<string, boolean>;
  /** ISO timestamp of current subscription period end (undefined for single-tenant). */
  subscriptionEndsAt?: string;
  /** True when request resolved via single-tenant fallback. */
  singleTenant: boolean;
}

// Augment Express Request so downstream handlers get type-safe tenant access.
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

// ── Tenant lookup provider ─────────────────────────────────────────────
// The default provider reads tenant records from the application database.
// In a real deployment this is wired to the Postgres `tenants` table. Until
// `setTenantProvider` is called the middleware operates in single-tenant mode.
export interface TenantRecord {
  id: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  subscription_ends_at?: string;
}

export type TenantProvider = (key: {
  id?: string;
  slug?: string;
}) => Promise<TenantRecord | null>;

let tenantProvider: TenantProvider | null = null;

export function setTenantProvider(provider: TenantProvider): void {
  tenantProvider = provider;
}

// ── Single-tenant fallback configuration ───────────────────────────────
function getSingleTenantContext(): TenantContext {
  const plan = (process.env.SINGLE_TENANT_PLAN as TenantPlan) || 'enterprise';
  const slug = process.env.SINGLE_TENANT_SLUG || 'default';
  const id =
    process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
  return {
    tenantId: id,
    tenantSlug: slug,
    plan,
    status: 'active',
    features: getEnabledFeatures(plan),
    singleTenant: true,
  };
}

// ── Header / subdomain resolution ──────────────────────────────────────
function extractTenantKey(req: Request): { id?: string; slug?: string } | null {
  // M1-2: For authenticated requests, bind the tenant strictly to the JWT
  // claim and ignore any spoofable X-Tenant-ID header or subdomain. A logged
  // in user can never cross into another tenant's data via headers.
  const authUser = (req as any).user as { tenantId?: string } | undefined;
  if (authUser && authUser.tenantId) {
    return { id: authUser.tenantId };
  }

  const headerId = req.headers['x-tenant-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return { id: headerId.trim() };
  }

  const host = (req.headers['host'] || '').split(':')[0] || '';
  const baseDomain = (process.env.TENANT_BASE_DOMAIN || 'deepabms.com')
    .replace(/^https?:\/\//, '')
    .split(':')[0];

  if (
    baseDomain &&
    host.endsWith(baseDomain) &&
    host.length > baseDomain.length
  ) {
    const sub = host.slice(0, host.length - baseDomain.length - 1);
    if (sub && sub !== 'www' && sub !== 'api') {
      return { slug: sub };
    }
  }

  return null;
}

function isSingleTenantMode(): boolean {
  return (
    process.env.SINGLE_TENANT_MODE === 'true' ||
    process.env.TENANT_MODE === 'single' ||
    tenantProvider === null
  );
}

// ── Status validation ──────────────────────────────────────────────────
function validateStatus(tenant: TenantContext, res: Response): boolean {
  if (tenant.status === 'active' || tenant.status === 'trial') {
    return true;
  }

  if (tenant.status === 'past_due') {
    // Allow read-only grace for 7 days past subscription end.
    if (tenant.subscriptionEndsAt) {
      const ends = new Date(tenant.subscriptionEndsAt).getTime();
      const grace = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - ends <= grace) {
        (tenant as any).inGrace = true;
        return true;
      }
    }
  }

  res.status(403).json({
    message: 'Tenant subscription is not active',
    status: tenant.status,
  });
  return false;
}

// ── Middleware ─────────────────────────────────────────────────────────
export function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Fast path: single-tenant deployments or no provider configured.
  const key = extractTenantKey(req);
  if (!key || isSingleTenantMode()) {
    req.tenant = getSingleTenantContext();
    return next();
  }

  // Resolved tenant requested: load and validate from provider.
  const provider = tenantProvider;
  if (!provider) {
    req.tenant = getSingleTenantContext();
    return next();
  }

  provider(key)
    .then((record) => {
      if (!record) {
        res.status(404).json({ message: 'Tenant not found' });
        return;
      }

      const ctx: TenantContext = {
        tenantId: record.id,
        tenantSlug: record.slug,
        plan: record.plan,
        status: record.status,
        subscriptionEndsAt: record.subscription_ends_at,
        features: getEnabledFeatures(record.plan),
        singleTenant: false,
      };

      // M1-2: Defense-in-depth — reject if an authenticated token's tenant
      // does not match the resolved tenant.
      const authUser = (req as any).user as { tenantId?: string } | undefined;
      if (authUser?.tenantId && authUser.tenantId !== ctx.tenantId) {
        res.status(403).json({ message: 'Tenant mismatch' });
        return;
      }

      if (!validateStatus(ctx, res)) {
        return;
      }

      req.tenant = ctx;
      next();
    })
    .catch((err) => {
      res.status(500).json({ message: 'Tenant resolution failed' });
      console.error('[tenant] resolution error', err);
    });
}

// Re-export so route handlers can gate on plan without a second import.
export { getEnabledFeatures, type FeatureName } from './feature-flags';
