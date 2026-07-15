import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || '';
}
const JWT_ISSUER = process.env.JWT_ISSUER || 'deepa-bms';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'deepa-bms-api';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  employeeId?: string;
  tenantId?: string;
  scopes?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 100,
  owner: 90,
  manager: 80,
  accountant: 70,
  cashier: 60,
  reception: 60,
  fnb: 60,
  barstaff: 60,
  kitchen: 60,
  inventory: 60,
  employee: 55,
  staff: 50,
  auditor: 40,
  readonly: 30,
  apiclient: 20,
};

export function roleAtLeast(required: string): (userRole: string) => boolean {
  const requiredLevel = ROLE_HIERARCHY[required] ?? 0;
  return (userRole: string) => (ROLE_HIERARCHY[userRole] ?? 0) >= requiredLevel;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header required' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res
      .status(401)
      .json({ message: 'Authorization header must be: Bearer <token>' });
    return;
  }

  const token = parts[1];
  if (!token) {
    res.status(401).json({ message: 'Authorization token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as any;

    const user: AuthUser = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      employeeId: decoded.employeeId,
      tenantId: decoded.tenantId,
    };

    if (!user.id || !user.role) {
      res
        .status(403)
        .json({ message: 'Invalid token: missing required claims' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      res.status(403).json({ message: 'Invalid token signature' });
      return;
    }
    res.status(403).json({ message: 'Invalid or expired session token' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    next();
    return;
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as any;

    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      employeeId: decoded.employeeId,
      tenantId: decoded.tenantId,
    };
  } catch {
    // Silently ignore — auth is optional
  }
  next();
}

export function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    authenticate(req, res, next);
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    authenticate(req, res, next);
    return;
  }

  const token = parts[1];

  if (token.startsWith('svc-')) {
    const { AuthRepository } = require('../domains/auth/auth.repository');
    AuthRepository.findServiceAccountByToken(token)
      .then((svc: any) => {
        if (!svc || svc.revokedAt) {
          res.status(401).json({ message: 'Invalid service account token' });
          return;
        }
        req.user = {
          id: svc.id,
          name: svc.name,
          role: 'apiclient',
          tenantId: svc.tenantId,
        };
        next();
      })
      .catch(() => {
        res.status(500).json({ message: 'Authentication error' });
      });
    return;
  }

  if (token.includes('.')) {
    const { AuthRepository } = require('../domains/auth/auth.repository');
    const bcrypt = require('bcryptjs');
    const prefix = token.split('.')[0];
    AuthRepository.findApiKeyByPrefix(prefix)
      .then((stored: any) => {
        if (!stored || stored.revokedAt) {
          res.status(401).json({ message: 'Invalid API key' });
          return;
        }
        if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
          res.status(401).json({ message: 'API key expired' });
          return;
        }
        return bcrypt.compare(token, stored.hashedKey).then((valid: boolean) => {
          if (!valid) {
            res.status(401).json({ message: 'Invalid API key' });
            return;
          }
          req.user = {
            id: stored.userId || stored.id,
            name: stored.name,
            role: 'apiclient',
            tenantId: stored.tenantId,
            scopes: stored.scopes || [],
          };
          next();
        });
      })
      .catch(() => {
        res.status(500).json({ message: 'Authentication error' });
      });
    return;
  }

  authenticate(req, res, next);
}

export function requireMfa(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const mfaVerified = (req as any).mfaVerified;
  if (!mfaVerified) {
    res.status(403).json({
      message: 'MFA verification required',
      code: 'MFA_REQUIRED',
    });
    return;
  }
  next();
}

export function authorize(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Insufficient permissions',
        required: allowedRoles,
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
}

export function requireScope(...requiredScopes: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (req.user.role === 'superadmin' || req.user.role === 'owner') {
      next();
      return;
    }

    if (!req.user.scopes || req.user.scopes.length === 0) {
      res.status(403).json({
        message: 'Insufficient permissions: no scopes assigned',
        required: requiredScopes,
      });
      return;
    }

    const hasScope = requiredScopes.some((s) => req.user!.scopes!.includes(s));
    if (!hasScope) {
      res.status(403).json({
        message: 'Insufficient permissions: missing required scope',
        required: requiredScopes,
        userScopes: req.user.scopes,
      });
      return;
    }

    next();
  };
}

let tokenCounter = 0;

export function signToken(user: {
  id: string;
  name: string;
  role: string;
  employeeId?: string;
  tenantId?: string;
}): string {
  const jti = `${Date.now().toString(36)}-${(tokenCounter++).toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const payload: Record<string, any> = {
    id: user.id,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    jti,
  };
  if (user.employeeId) payload.employeeId = user.employeeId;
  payload.tenantId =
    user.tenantId ||
    process.env.SINGLE_TENANT_ID ||
    '00000000-0000-0000-0000-000000000000';
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '8h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyRefreshToken(token: string): {
  jti: string;
  sessionId: string;
  userId: string;
  tenantId: string;
} | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as any;
    if (decoded.type !== 'refresh') return null;
    return {
      jti: decoded.jti,
      sessionId: decoded.sessionId,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
    };
  } catch {
    return null;
  }
}

export function signRefreshToken(payload: {
  sessionId: string;
  userId: string;
  tenantId: string;
}): string {
  const jti = `${Date.now().toString(36)}-${(tokenCounter++).toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  return jwt.sign(
    {
      jti,
      sessionId: payload.sessionId,
      userId: payload.userId,
      tenantId: payload.tenantId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    },
    getJwtSecret(),
    {
      expiresIn: '30d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}
