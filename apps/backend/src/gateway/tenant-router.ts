import { Request, Response, NextFunction } from 'express';
import { tenantMiddleware, type TenantContext } from '../middleware/tenant';

declare global {
  namespace Express {
    interface Request {
      resolvedTenant?: TenantContext;
    }
  }
}

export function resolveSubdomainTenant(req: Request): string | null {
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
      return sub;
    }
  }

  return null;
}

export function tenantRoutingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Delegate to the existing tenant middleware for primary resolution
    tenantMiddleware(req, res, (err?: any) => {
      if (err) {
        next(err);
        return;
      }

      // Also resolve subdomain-based routing metadata
      const subdomain = resolveSubdomainTenant(req);
      if (subdomain && !req.headers['x-tenant-id']) {
        req.headers['x-tenant-id'] = req.tenant?.tenantId || subdomain;
      }

      req.resolvedTenant = req.tenant;
      next();
    });
  };
}

export function validateTenantAccess(allowedStatuses?: string[]) {
  const statuses = allowedStatuses || ['active', 'trial'];

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenant = req.resolvedTenant || req.tenant;

    if (!tenant) {
      res.status(400).json({ message: 'Tenant context not resolved' });
      return;
    }

    if (!statuses.includes(tenant.status)) {
      res.status(403).json({
        message: 'Tenant access denied',
        status: tenant.status,
        required: statuses,
      });
      return;
    }

    next();
  };
}
