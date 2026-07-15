import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

const TRACE_HEADER = 'traceparent';
const TRACE_FLAG = '01';

let traceCounter = 0;

const asyncLocalStorage = new Map<string, TraceContext>();

function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateSpanId(): string {
  const counter = (traceCounter++).toString(16).padStart(2, '0');
  return crypto.randomBytes(7).toString('hex') + counter;
}

function parseW3CTraceparent(header: string): TraceContext | null {
  // Format: version-traceId-spanId-traceFlags
  const parts = header.split('-');
  if (parts.length !== 4) return null;

  const [_version, traceId, spanId, _flags] = parts;

  if (!/^[0-9a-f]{32}$/.test(traceId)) return null;
  if (!/^[0-9a-f]{16}$/.test(spanId)) return null;

  return {
    traceId,
    spanId: generateSpanId(),
    parentSpanId: spanId,
  };
}

export function traceMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    let ctx: TraceContext;

    const incomingTrace = req.headers[TRACE_HEADER];
    if (typeof incomingTrace === 'string') {
      const parsed = parseW3CTraceparent(incomingTrace);
      if (parsed) {
        ctx = parsed;
      } else {
        ctx = {
          traceId: generateTraceId(),
          spanId: generateSpanId(),
        };
      }
    } else {
      ctx = {
        traceId: generateTraceId(),
        spanId: generateSpanId(),
      };
    }

    (req as any).traceContext = ctx;
    asyncLocalStorage.set('current', ctx);

    next();
  };
}

export function getTraceContext(): TraceContext | null {
  return asyncLocalStorage.get('current') || null;
}

export function propagateTraceHeaders(req: Request): Record<string, string> {
  const ctx: TraceContext | undefined = (req as any).traceContext;
  if (!ctx) return {};

  return {
    [TRACE_HEADER]: `00-${ctx.traceId}-${ctx.spanId}-${TRACE_FLAG}`,
  };
}

export function traceLoggerMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ctx: TraceContext | undefined = (req as any).traceContext;
    if (ctx) {
      const logEntry = {
        traceId: ctx.traceId,
        spanId: ctx.spanId,
        method: req.method,
        path: req.path,
      };
      console.log(JSON.stringify({ event: 'trace', ...logEntry }));
    }
    next();
  };
}
