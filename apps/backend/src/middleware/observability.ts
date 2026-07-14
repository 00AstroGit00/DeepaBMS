import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let reqIdCounter = 0;

export function requestId(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const existing =
    req.headers['x-request-id'] || req.headers['x-correlation-id'];
  (req as any).requestId =
    (existing as string) ||
    `${Date.now().toString(36)}-${(reqIdCounter++).toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  (req as any).traceId = req.headers['x-trace-id'] || (req as any).requestId;
  (req as any).spanId = crypto.randomBytes(4).toString('hex');
  next();
}

export interface LogEntry {
  timestamp: string;
  level: string;
  requestId: string;
  traceId: string;
  spanId: string;
  method: string;
  path: string;
  message: string;
  [key: string]: any;
}

export function structuredLog(
  level: string,
  req: Request,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: (req as any).requestId || '-',
    traceId: (req as any).traceId || '-',
    spanId: (req as any).spanId || '-',
    method: req.method,
    path: req.path,
    message,
    ...extra,
  };
  if (level === 'error' || level === 'warn') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function logAuditEvent(
  req: Request,
  action: string,
  details?: Record<string, unknown>,
): void {
  const user = (req as any).user;
  structuredLog('info', req, `audit.${action}`, {
    audit: true,
    userId: user?.id || 'anonymous',
    userRole: user?.role || 'none',
    action,
    ...details,
  });
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const extra: Record<string, unknown> = {
      status: res.statusCode,
      duration,
    };
    const user = (req as any).user;
    if (user) {
      extra.userId = user.id;
      extra.role = user.role;
    }
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    structuredLog(
      level,
      req,
      `${req.method} ${req.originalUrl || req.path} ${res.statusCode} ${duration}ms`,
      extra,
    );
  });
  next();
}
