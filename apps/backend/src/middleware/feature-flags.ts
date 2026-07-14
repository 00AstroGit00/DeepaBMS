import { Request, Response, NextFunction } from 'express';
import type { TenantPlan } from './tenant';

// ── Feature catalogue ──────────────────────────────────────────────────
export type FeatureName =
  | 'core-bms'
  | 'multi-location'
  | 'advanced-analytics'
  | 'ai-insights'
  | 'automation-workflows'
  | 'white-label'
  | 'custom-domain'
  | 'sso-saml'
  | 'sso-oidc'
  | 'api-access'
  | 'audit-export'
  | 'priority-support'
  | 'data-residency'
  | 'custom-integrations';

// ── Plan → feature matrix ──────────────────────────────────────────────
// `single` represents the legacy single-tenant deployment: all features on.
export const FEATURE_FLAGS: Record<TenantPlan, Record<FeatureName, boolean>> = {
  single: {
    'core-bms': true,
    'multi-location': true,
    'advanced-analytics': true,
    'ai-insights': true,
    'automation-workflows': true,
    'white-label': true,
    'custom-domain': true,
    'sso-saml': true,
    'sso-oidc': true,
    'api-access': true,
    'audit-export': true,
    'priority-support': true,
    'data-residency': true,
    'custom-integrations': true,
  },
  starter: {
    'core-bms': true,
    'multi-location': false,
    'advanced-analytics': false,
    'ai-insights': false,
    'automation-workflows': false,
    'white-label': false,
    'custom-domain': false,
    'sso-saml': false,
    'sso-oidc': false,
    'api-access': false,
    'audit-export': false,
    'priority-support': false,
    'data-residency': false,
    'custom-integrations': false,
  },
  growth: {
    'core-bms': true,
    'multi-location': true,
    'advanced-analytics': true,
    'ai-insights': false,
    'automation-workflows': true,
    'white-label': true,
    'custom-domain': true,
    'sso-saml': false,
    'sso-oidc': true,
    'api-access': true,
    'audit-export': true,
    'priority-support': false,
    'data-residency': false,
    'custom-integrations': true,
  },
  enterprise: {
    'core-bms': true,
    'multi-location': true,
    'advanced-analytics': true,
    'ai-insights': true,
    'automation-workflows': true,
    'white-label': true,
    'custom-domain': true,
    'sso-saml': true,
    'sso-oidc': true,
    'api-access': true,
    'audit-export': true,
    'priority-support': true,
    'data-residency': true,
    'custom-integrations': true,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────
export function getEnabledFeatures(
  plan: TenantPlan,
): Record<FeatureName, boolean> {
  return { ...(FEATURE_FLAGS[plan] || FEATURE_FLAGS.starter) };
}

export function isFeatureEnabled(
  plan: TenantPlan,
  feature: FeatureName,
): boolean {
  return FEATURE_FLAGS[plan]?.[feature] ?? false;
}

// ── Middleware factory ─────────────────────────────────────────────────
// Returns Express middleware that returns 403 when the resolved tenant's
// plan does not include the requested feature. Requires tenantMiddleware to
// have run first so `req.tenant` is populated.
export function featureFlag(feature: FeatureName) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(400).json({ message: 'Tenant context missing' });
      return;
    }
    if (!tenant.features[feature]) {
      res.status(403).json({
        message: 'Feature not available on your plan',
        feature,
        plan: tenant.plan,
      });
      return;
    }
    next();
  };
}
