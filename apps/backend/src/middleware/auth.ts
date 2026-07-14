import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET!;
const JWT_ISSUER = process.env.JWT_ISSUER || 'deepa-bms';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'deepa-bms-api';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  employeeId?: string;
  /** Tenant the user belongs to; bound to every tenant-scoped request (M1-2). */
  tenantId?: string;
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      // SEC-08: pin to a single algorithm to prevent alg=none / key confusion.
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

export function signToken(user: {
  id: string;
  name: string;
  role: string;
  employeeId?: string;
  tenantId?: string;
}): string {
  const payload: Record<string, any> = {
    id: user.id,
    name: user.name,
    role: user.role,
  };
  if (user.employeeId) payload.employeeId = user.employeeId;
  // M1-2: bind tenant to the token so it cannot be spoofed via headers.
  payload.tenantId =
    user.tenantId ||
    process.env.SINGLE_TENANT_ID ||
    '00000000-0000-0000-0000-000000000000';
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}
