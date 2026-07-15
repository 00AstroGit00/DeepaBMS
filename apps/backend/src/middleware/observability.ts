import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let reqIdCounter = 0;
const activeSpans = new Map<string, TraceSpan>();

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

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, string>;
  status: 'ok' | 'error';
  childSpans: TraceSpan[];
}

const SEVERITY = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

function parseTraceparent(header: string): { traceId: string; parentSpanId: string } | null {
  const parts = header.split('-');
  if (parts.length >= 2) {
    return { traceId: parts[1], parentSpanId: parts[2] || '' };
  }
  return null;
}

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

  const traceparent = req.headers['traceparent'] as string;
  if (traceparent) {
    const parsed = parseTraceparent(traceparent);
    if (parsed) {
      (req as any).traceId = parsed.traceId;
      (req as any).parentSpanId = parsed.parentSpanId;
    }
  }
  (req as any).traceId = (req as any).traceId || (req as any).requestId;
  (req as any).spanId = crypto.randomBytes(8).toString('hex');

  const span: TraceSpan = {
    spanId: (req as any).spanId,
    traceId: (req as any).traceId,
    parentSpanId: (req as any).parentSpanId,
    name: `${req.method} ${req.path}`,
    startTime: Date.now(),
    attributes: {
      'http.method': req.method,
      'http.path': req.path,
      'http.host': req.hostname,
      'request_id': (req as any).requestId,
    },
    status: 'ok',
    childSpans: [],
  };
  if ((req as any).user) {
    span.attributes['user.id'] = (req as any).user.id;
    span.attributes['user.role'] = (req as any).user.role;
  }
  if ((req as any).tenantId) {
    span.attributes['tenant.id'] = (req as any).tenantId;
    span.attributes['tenant.slug'] = (req as any).tenantId;
  }
  (req as any)._span = span;
  (req as any)._spanStart = Date.now();
  activeSpans.set(span.spanId, span);

  next();
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
  if ((req as any).user) {
    entry.userId = (req as any).user.id;
    entry.userRole = (req as any).user.role;
  }
  if ((req as any).tenantId) {
    entry.tenantId = (req as any).tenantId;
  }
  const output = JSON.stringify(entry);
  if (level === 'error' || level === 'fatal') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
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
    const tenantId = (req as any).tenantId;
    if (tenantId) {
      extra.tenantId = tenantId;
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

export function finalizeSpan(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.on('finish', () => {
    const span: TraceSpan = (req as any)._span;
    if (!span) return;
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.attributes['http.status_code'] = String(res.statusCode);
    span.attributes['http.duration_ms'] = String(span.durationMs);
    if (res.statusCode >= 500) {
      span.status = 'error';
    }
    activeSpans.set(span.spanId, span);
  });
  next();
}

export function createChildSpan(
  req: Request,
  name: string,
  attributes?: Record<string, string>,
): TraceSpan {
  const parent: TraceSpan = (req as any)._span;
  const child: TraceSpan = {
    spanId: crypto.randomBytes(8).toString('hex'),
    traceId: parent?.traceId || (req as any).traceId || '-',
    parentSpanId: parent?.spanId || (req as any).spanId,
    name,
    startTime: Date.now(),
    attributes: { ...attributes },
    status: 'ok',
    childSpans: [],
  };
  if (parent) {
    parent.childSpans.push(child);
  }
  return child;
}

export function endChildSpan(span: TraceSpan): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
}

export function getActiveSpans(): TraceSpan[] {
  return Array.from(activeSpans.values());
}

export function getTraceById(traceId: string): TraceSpan[] {
  return Array.from(activeSpans.values()).filter(
    (s) => s.traceId === traceId,
  );
}

export function getRecentTraces(limit = 50): TraceSpan[] {
  return Array.from(activeSpans.values())
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    .slice(0, limit);
}
