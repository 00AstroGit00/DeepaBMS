import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { OperationsService as S } from './operations.service';
import { OperationsRepository as R } from './operations.repository';
import * as T from './operations.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('Validation') ||
        err.message?.includes('already exists')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

// ═════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  authenticate,
  authorize('superadmin', 'owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const dashboard = await S.getAdminDashboard();
      res.json(dashboard);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/health',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const health = await S.getSystemHealth();
      res.json(health);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/feature-flags',
  authenticate,
  authorize('superadmin', 'owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const flags = await S.getFeatureFlags();
      res.json(flags);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/feature-flags',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateFeatureFlagDto = {
        name: req.body.name,
        description: req.body.description,
        enabled: req.body.enabled,
        tenantOverrides: req.body.tenantOverrides,
      };
      if (!dto.name) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      const flag = await S.createFeatureFlag(dto);
      await R.createAuditEntry({
        action: 'feature_flag.created',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'feature_flag',
        resourceId: flag.id,
        details: { name: dto.name, enabled: dto.enabled },
        ipAddress: req.ip,
      });
      res.status(201).json(flag);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.patch(
  '/feature-flags/:id',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.UpdateFeatureFlagDto = {
        name: req.body.name,
        description: req.body.description,
        enabled: req.body.enabled,
        tenantOverrides: req.body.tenantOverrides,
      };
      const flag = await S.updateFeatureFlag(req.params.id, dto);
      await R.createAuditEntry({
        action: 'feature_flag.updated',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'feature_flag',
        resourceId: flag.id,
        details: dto,
        ipAddress: req.ip,
      });
      res.json(flag);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/feature-flags/:id/override/:tenantId',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const enabled = req.body.enabled !== false;
      const flag = await S.setTenantOverride(
        req.params.id,
        req.params.tenantId,
        enabled,
      );
      await R.createAuditEntry({
        action: 'feature_flag.override',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'feature_flag',
        resourceId: flag.id,
        details: { tenantId: req.params.tenantId, enabled },
        ipAddress: req.ip,
      });
      res.json(flag);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// RELEASE ROLLOUTS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/releases',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        status: req.query.status as T.ReleaseStatus,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.getReleases(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/releases',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateReleaseDto = {
        version: req.body.version,
        rolloutPercentage: req.body.rolloutPercentage,
        changelog: req.body.changelog,
        createdBy: req.user?.name,
      };
      if (!dto.version) {
        res.status(400).json({ message: 'version is required' });
        return;
      }
      const release = await S.createRelease(dto);
      await R.createAuditEntry({
        action: 'release.created',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'release',
        resourceId: release.id,
        details: { version: dto.version },
        ipAddress: req.ip,
      });
      res.status(201).json(release);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/releases/:id/rollout',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const percentage = parseInt(
        req.body.rolloutPercentage as string,
        10,
      );
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        res
          .status(400)
          .json({ message: 'rolloutPercentage must be between 0 and 100' });
        return;
      }
      const release = await S.updateReleaseRollout(
        req.params.id,
        percentage,
      );
      await R.createAuditEntry({
        action: 'release.rollout_updated',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'release',
        resourceId: release.id,
        details: { rolloutPercentage: percentage, status: release.status },
        ipAddress: req.ip,
      });
      res.json(release);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// INCIDENTS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/incidents',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        severity: req.query.severity as T.IncidentSeverity,
        status: req.query.status as T.IncidentStatus,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.getIncidents(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/incidents',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateIncidentDto = {
        severity: req.body.severity,
        title: req.body.title,
        description: req.body.description,
        affectedComponents: req.body.affectedComponents,
        reportedBy: req.user?.name,
      };
      if (!dto.severity || !dto.title) {
        res
          .status(400)
          .json({ message: 'severity and title are required' });
        return;
      }
      if (
        !['critical', 'high', 'medium', 'low'].includes(dto.severity)
      ) {
        res.status(400).json({
          message:
            'Invalid severity. Must be one of: critical, high, medium, low',
        });
        return;
      }
      const incident = await S.recordIncident(dto);
      await R.createAuditEntry({
        action: 'incident.created',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'incident',
        resourceId: incident.id,
        details: { severity: dto.severity, title: dto.title },
        ipAddress: req.ip,
      });
      res.status(201).json(incident);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/incidents/:id/resolve',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const incident = await S.resolveIncident(
        req.params.id,
        req.user?.name || 'system',
      );
      await R.createAuditEntry({
        action: 'incident.resolved',
        actorId: req.user!.id,
        actorName: req.user!.name,
        resource: 'incident',
        resourceId: incident.id,
        details: { status: incident.status },
        ipAddress: req.ip,
      });
      res.json(incident);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/audit',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter: T.AuditFilter = {
        action: req.query.action as string,
        actorId: req.query.actorId as string,
        resource: req.query.resource as string,
        resourceId: req.query.resourceId as string,
        since: req.query.since as string,
        until: req.query.until as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.getAuditLog(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// TENANT MANAGEMENT OVERVIEW
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/tenants',
  authenticate,
  authorize('superadmin', 'owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const overview = await S.getTenantManagement();
      res.json(overview);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/subscriptions',
  authenticate,
  authorize('superadmin', 'owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const overview = await S.getSubscriptionManagement();
      res.json(overview);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
