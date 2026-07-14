import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { getMetricsMiddleware } from '../../middleware/monitoring';
import { PlatformRepository as PR } from './platform.repository';
import {
  HealthService as H,
  MonitoringService as M,
  BackupService as B,
  DeploymentService as D,
  OpsDashboardService as O,
  DisasterRecoveryService as DR,
} from './platform.service';
import * as T from './platform.types';

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

// ═════════════════════════════════════════════════════════════════════════
// HEALTH ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════

router.get('/health', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await H.runAllChecks();
    const httpStatus =
      report.status === 'fail' ? 503 : report.status === 'warn' ? 200 : 200;
    res.status(httpStatus).json(report);
  } catch (err: any) {
    handleError(res, err);
  }
});

router.get(
  '/health/live',
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await H.checkDatabase();
      res.json({
        status: db.status === 'pass' ? 'alive' : 'dead',
        database: db.status,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res
        .status(503)
        .json({ status: 'dead', timestamp: new Date().toISOString() });
    }
  },
);

router.get(
  '/health/ready',
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const [db, storage, workflow] = await Promise.all([
        H.checkDatabase(),
        H.checkStorage(),
        H.checkWorkflow(),
      ]);
      const allPass =
        db.status === 'pass' &&
        storage.status !== 'fail' &&
        workflow.status !== 'fail';
      res.json({
        status: allPass ? 'ready' : 'not_ready',
        checks: {
          database: db.status,
          storage: storage.status,
          workflow: workflow.status,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      res
        .status(503)
        .json({ status: 'not_ready', timestamp: new Date().toISOString() });
    }
  },
);

router.get(
  '/health/startup',
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await H.checkDatabase();
      const uptime = process.uptime();
      res.json({
        status: db.status === 'pass' ? 'started' : 'starting',
        uptime,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res
        .status(503)
        .json({ status: 'starting', timestamp: new Date().toISOString() });
    }
  },
);

router.get(
  '/health/checks',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [db, storage, mem, cpu, uptime, workflow, sync] = await Promise.all(
        [
          H.checkDatabase(),
          H.checkStorage(),
          H.checkMemory(),
          H.checkCpu(),
          H.checkUptime(),
          H.checkWorkflow(),
          H.checkSync(),
        ],
      );
      res.json({
        status: 'ok',
        checks: {
          database: db,
          storage,
          memory: mem,
          cpu,
          uptime,
          workflow,
          sync,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// MONITORING — METRICS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/metrics',
  authenticate,
  authorize('owner', 'manager'),
  getMetricsMiddleware,
);

router.get(
  '/metrics/historical',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await M.getMetrics(
        req.query.name as string,
        req.query.since as string,
        parseInt((req.query.limit as string) || '100', 10),
      );
      res.json(metrics);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/metrics/requests',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await M.getRecentRequestMetrics(
        parseInt((req.query.limit as string) || '100', 10),
      );
      res.json(metrics);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/metrics/slow-queries',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queries = await M.getSlowQueries(
        parseInt((req.query.limit as string) || '50', 10),
      );
      res.json(queries);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// MONITORING — ALERTS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/alerts',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter: T.FilterParams = {
        status: req.query.status as string,
        severity: req.query.severity as string,
        category: req.query.category as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await M.getAlerts(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/alerts/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alert = await M.getAlert(req.params.id);
      if (!alert) {
        res.status(404).json({ message: 'Alert not found' });
        return;
      }
      res.json(alert);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/alerts',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateAlertDto = {
        severity: req.body.severity,
        category: req.body.category,
        title: req.body.title,
        message: req.body.message,
        source: req.body.source,
        metadata: req.body.metadata,
      };
      if (!dto.severity || !dto.category || !dto.title) {
        res
          .status(400)
          .json({ message: 'severity, category, and title are required' });
        return;
      }
      if (!T.VALID_ALERT_SEVERITIES.includes(dto.severity)) {
        res.status(400).json({
          message: `Invalid severity. Must be one of: ${T.VALID_ALERT_SEVERITIES.join(', ')}`,
        });
        return;
      }
      const result = await M.createAlert(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/alerts/:id/acknowledge',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await M.acknowledgeAlert(req.params.id, req.user?.id || 'system');
      res.json({ message: 'Alert acknowledged' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/alerts/:id/resolve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await M.resolveAlert(req.params.id, req.user?.id || 'system');
      res.json({ message: 'Alert resolved' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// BACKUP
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/backups',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        type: req.query.type as T.BackupType,
        status: req.query.status as T.BackupStatus,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await B.getBackups(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/backups/latest',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backup = await B.getLastBackup(req.query.type as T.BackupType);
      res.json(backup || { message: 'No backups found' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/backups/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backup = await B.getBackup(req.params.id);
      if (!backup) {
        res.status(404).json({ message: 'Backup not found' });
        return;
      }
      res.json(backup);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/backups',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateBackupDto = {
        type: req.body.type || 'full',
        filePath: req.body.filePath || `./backups/deepa-bms-${Date.now()}.db`,
        retentionDays: req.body.retentionDays,
        encrypted: req.body.encrypted !== false,
        metadata: req.body.metadata,
        createdBy: req.user?.name || 'system',
      };
      const result = await B.createBackup(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/backups/:id/verify',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const valid = await B.verifyBackup(req.params.id);
      res.json({ verified: valid, id: req.params.id });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/backups/config',
  authenticate,
  authorize('owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const config = await B.getBackupScheduleConfig();
      res.json(config);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/backups/cleanup',
  authenticate,
  authorize('owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const cleaned = await B.cleanupOldBackups();
      res.json({ message: `Cleaned up ${cleaned} expired backups` });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// DEPLOYMENT
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/deployments',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        environment: req.query.environment as T.DeploymentEnvironment,
        status: req.query.status as T.DeploymentStatus,
        limit: parseInt((req.query.limit as string) || '20', 10),
      };
      const result = await D.getDeployments(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/deployments/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dep = await D.getDeployment(req.params.id);
      if (!dep) {
        res.status(404).json({ message: 'Deployment not found' });
        return;
      }
      res.json(dep);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/deployments',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { version, environment } = req.body;
      if (!version || !environment) {
        res
          .status(400)
          .json({ message: 'version and environment are required' });
        return;
      }
      const result = await D.createDeployment(
        version,
        environment,
        req.user?.name,
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/deployments/:id/complete',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await D.completeDeployment(
        req.params.id,
        req.body.commitHash,
        req.body.branch,
      );
      res.json({ message: 'Deployment completed' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/deployments/:id/rollback',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rollbackVersion } = req.body;
      if (!rollbackVersion) {
        res.status(400).json({ message: 'rollbackVersion is required' });
        return;
      }
      await D.rollbackDeployment(req.params.id, rollbackVersion);
      res.json({ message: `Rolled back to ${rollbackVersion}` });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// DISASTER RECOVERY
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/dr/runbook',
  authenticate,
  authorize('owner'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const runbook = await DR.getRunbook();
      res.json(runbook);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dr/status',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await DR.getRecoveryStatus();
      res.json(status);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/dr/simulate',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { scenario } = req.body;
      if (!scenario) {
        res.status(400).json({ message: 'scenario is required' });
        return;
      }
      const result = await DR.simulateFailure(scenario);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/dr/recover',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { scenario } = req.body;
      if (!scenario) {
        res.status(400).json({ message: 'scenario is required' });
        return;
      }
      const result = await DR.recoverFromScenario(scenario);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// OPS DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dashboard = await O.getDashboard();
      res.json(dashboard);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// DATABASE
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/database',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const size = await PR.getDatabaseSize();
      const tableCount = await PR.getTableCount();
      const ok = await PR.testConnection();
      res.json({
        status: ok ? 'ok' : 'error',
        size,
        tableCount,
        sizeMB: (size / 1024 / 1024).toFixed(2),
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
