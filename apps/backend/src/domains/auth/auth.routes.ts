import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  optionalAuth,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { validate, LOGIN_SCHEMA } from '../../middleware/validate';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

const router = Router();

AuthRepository.ensureIdentityTables().catch((err) =>
  console.error('[auth] Failed to ensure identity tables:', err),
);

router.post(
  '/login',
  validate(LOGIN_SCHEMA),
  async (req: AuthenticatedRequest, res: Response) => {
    const { pin } = req.body;
    const deviceInfo = req.body.deviceInfo || null;
    try {
      const result = await AuthService.loginWithPin(pin, deviceInfo);
      res.json({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  },
);

router.post(
  '/refresh',
  async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ message: 'refreshToken is required' });
      return;
    }
    try {
      const result = await AuthService.refreshAccessToken(refreshToken);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  },
);

router.post(
  '/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (sessionId) {
        await AuthService.revokeSession(sessionId);
      } else {
        const sessions = await AuthService.getActiveSessions(req.user!.id);
        for (const s of sessions) {
          await AuthService.revokeSession(s.id);
        }
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/logout/all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AuthService.revokeAllUserSessions(req.user!.id);
      res.json({ message: 'All sessions revoked' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/sessions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await AuthService.getActiveSessions(req.user!.id);
      res.json({ data: sessions, total: sessions.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete(
  '/sessions/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AuthService.revokeSession(req.params.id);
      res.json({ message: 'Session revoked' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/api-keys',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, scopes, expiresAt } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'name is required' });
      return;
    }
    try {
      const tenantId = req.user!.tenantId || process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
      const result = await AuthService.generateApiKey(
        name,
        req.user!.id,
        tenantId,
        scopes || ['read'],
        expiresAt || null,
      );
      res.status(201).json({
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        fullKey: result.fullKey,
        scopes: result.apiKey.scopes,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/api-keys',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId || process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
      const keys = await AuthService.getApiKeys(tenantId);
      res.json({ data: keys, total: keys.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete(
  '/api-keys/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AuthService.revokeApiKey(req.params.id);
      res.json({ message: 'API key revoked' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/mfa/register',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { method } = req.body;
    if (!method || !['totp', 'sms', 'email'].includes(method)) {
      res.status(400).json({ message: 'Valid method required (totp, sms, email)' });
      return;
    }
    try {
      const tenantId = req.user!.tenantId || process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
      const registration = await AuthService.registerMfaMethod(
        req.user!.id,
        tenantId,
        method,
      );
      res.status(201).json({
        id: registration.id,
        method: registration.method,
        secret: registration.secret,
        verified: registration.verified,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/mfa/verify',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code, method } = req.body;
    if (!code || !method) {
      res.status(400).json({ message: 'code and method are required' });
      return;
    }
    try {
      await AuthService.verifyMfaCode(req.user!.id, code, method);
      res.json({ message: 'MFA code verified' });
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  },
);

router.post(
  '/service-accounts',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, roles } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'name is required' });
      return;
    }
    try {
      const tenantId = req.user!.tenantId || process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
      const result = await AuthService.createServiceAccount(
        name,
        tenantId,
        roles || ['apiclient'],
      );
      res.status(201).json({
        id: result.serviceAccount.id,
        name: result.serviceAccount.name,
        roles: result.serviceAccount.roles,
        token: result.token,
        createdAt: result.serviceAccount.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/service-accounts',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId || process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000';
      const accounts = await AuthService.getServiceAccounts(tenantId);
      res.json({ data: accounts, total: accounts.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete(
  '/service-accounts/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AuthService.revokeServiceAccount(req.params.id);
      res.json({ message: 'Service account deleted' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
