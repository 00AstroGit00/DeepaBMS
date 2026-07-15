import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { ObservabilityService as O } from './observability.service';

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
        err.message?.includes('Validation')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

router.use(authenticate);

router.get(
  '/slo',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      const result = await O.getSloStatus(tenantId);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/slo/:tenantId',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await O.getTenantSloStatus(req.params.tenantId);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/error-budget/:tenantId',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const target = parseFloat(
        (req.query.target as string) || '0.995',
      );
      const result = await O.getErrorBudget(req.params.tenantId, target);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/:tenantId',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await O.getTenantDashboard(req.params.tenantId);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/audit/:tenantId',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const from =
        (req.query.from as string) ||
        new Date(Date.now() - 7 * 86400000).toISOString();
      const to =
        (req.query.to as string) || new Date().toISOString();
      const result = await O.getAuditTimeline(
        req.params.tenantId,
        from,
        to,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/traces',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(
        (req.query.limit as string) || '50',
        10,
      );
      const result = await O.getRecentTraces(limit);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/slo/report',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const from =
        (req.query.from as string) ||
        new Date(Date.now() - 30 * 86400000).toISOString();
      const to =
        (req.query.to as string) || new Date().toISOString();
      const result = await O.getSloReport(from, to);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/platform',
  authorize('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await O.getPlatformSlo();
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
