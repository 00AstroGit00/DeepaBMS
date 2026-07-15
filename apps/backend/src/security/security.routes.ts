import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { SecurityService } from './security.service';
import { SecurityRepository } from './security.repository';

const router = Router();

SecurityService.ensureTables().catch((err) =>
  console.error('[security] Failed to ensure security tables:', err),
);

// ── Full Security Audit ─────────────────────────────────────────────

router.post(
  '/audit',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const report = await SecurityService.performSecurityAudit();
      res.status(201).json({
        data: report,
        summary: report.summary,
        score: report.overallScore,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Security Audit Log ──────────────────────────────────────────────

router.get(
  '/audit/log',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const severity = req.query.severity as string | undefined;
      const result = await SecurityService.getSecurityAuditLog(limit, offset, severity);
      res.json({ data: result.events, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Security Findings ───────────────────────────────────────────────

router.get(
  '/findings',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const severity = req.query.severity as string | undefined;
      const status = req.query.status as string | undefined;
      const findings = await SecurityService.getSecurityFindings({ severity, status });
      res.json({ data: findings, total: findings.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/findings/:id/remediate',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      const finding = await SecurityService.remediateFinding(
        id,
        req.user!.name,
        resolution || undefined,
      );
      if (!finding) {
        res.status(404).json({ message: 'Finding not found' });
        return;
      }
      res.json({ data: finding, message: 'Finding marked as remediated' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Tenant Isolation Tests ──────────────────────────────────────────

router.get(
  '/isolation/test',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const results = await SecurityService.verifyTenantIsolation();
      const rlsResults = await SecurityService.runRlsVerification();
      res.json({
        isolation: results,
        rls: rlsResults,
        total: results.length + rlsResults.length,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Secret Rotation ─────────────────────────────────────────────────

router.post(
  '/secrets/rotate',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { secretName, newValue } = req.body;
      if (!secretName || typeof secretName !== 'string') {
        res.status(400).json({ message: 'secretName is required' });
        return;
      }
      const record = await SecurityService.rotateSecret(secretName, req.user!.name, newValue);
      res.status(201).json({
        data: record,
        message: `Secret '${secretName}' rotated successfully`,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/secrets/status',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const secretName = req.query.secretName as string | undefined;
      let records;
      if (secretName) {
        records = await SecurityRepository.findRotationBySecretName(secretName);
      } else {
        records = await SecurityRepository.findAllSecretRotations();
      }
      res.json({ data: records, total: records.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Encryption Status ───────────────────────────────────────────────

router.get(
  '/encryption/status',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await SecurityService.getEncryptionStatus();
      res.json({ data: status });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Penetration Tests ───────────────────────────────────────────────

router.post(
  '/pentest',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const results = await SecurityService.runPenetrationTests();
      res.status(201).json({
        data: results,
        total: results.length,
        summary: {
          open: results.filter((r) => r.status !== 'resolved').length,
          resolved: results.filter((r) => r.status === 'resolved').length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/pentest/results',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const severity = req.query.severity as string | undefined;
      const category = req.query.category as string | undefined;
      let results;
      if (severity) {
        results = await SecurityRepository.findPenetrationTestsBySeverity(severity);
      } else if (category) {
        results = await SecurityRepository.findPenetrationTestsByCategory(category);
      } else {
        results = await SecurityRepository.findAllPenetrationTests();
      }
      res.json({ data: results, total: results.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── Comprehensive Security Report ───────────────────────────────────

router.get(
  '/report',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [audit, findings, encStatus, jwtConfig, apiSecurity] = await Promise.all([
        SecurityService.performSecurityAudit(),
        SecurityService.getSecurityFindings(),
        SecurityService.getEncryptionStatus(),
        SecurityService.verifyJwtConfiguration(),
        SecurityService.checkApiSecurity(),
      ]);

      res.json({
        report: audit,
        openFindings: findings.filter((f) => f.status === 'open' || f.status === 'in_progress').length,
        totalFindings: findings.length,
        encryption: encStatus,
        jwt: jwtConfig,
        apiSecurity,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── JWT Verification ────────────────────────────────────────────────

router.get(
  '/jwt/verify',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = await SecurityService.verifyJwtConfiguration();
      res.json({ data: config });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── API Security Checks ─────────────────────────────────────────────

router.get(
  '/api/check',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await SecurityService.checkApiSecurity();
      res.json({ data: status });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── RLS Verification ────────────────────────────────────────────────

router.get(
  '/rls/verify',
  authenticate,
  authorize('superadmin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const results = await SecurityService.runRlsVerification();
      res.json({ data: results, total: results.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
