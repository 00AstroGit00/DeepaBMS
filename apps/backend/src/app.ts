/**
 * app.ts — Pure Express application factory.
 *
 * This module configures and exports the Express app WITHOUT triggering any
 * server-startup side-effects (no app.listen, no process.exit, no
 * initializeDatabase). It is safe to import in test files.
 *
 * The actual server startup lives in index.ts and is guarded by
 *   if (require.main === module)
 * so that tests that import `app` do not accidentally start a real HTTP server
 * or crash due to missing environment variables.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import {
  securityHeaders,
  httpsRedirect,
  CORS_OPTIONS,
  TRUST_PROXY,
} from './middleware/security';
import { tenantMiddleware } from './middleware/tenant';
import { trackRequestMetrics } from './middleware/monitoring';

import gatewayRoutes from './gateway/gateway.routes';
import { gatewayMiddleware } from './gateway/middleware';
import { apiVersionRouter } from './gateway/versioning';
import { tenantRoutingMiddleware } from './gateway/tenant-router';
import { traceLoggerMiddleware } from './gateway/request-tracer';

import authRoutes from './domains/auth/auth.routes';
import salesRoutes from './domains/sales/sales.routes';
import roomsRoutes from './domains/rooms/rooms.routes';
import inventoryRoutes from './domains/inventory/inventory.routes';
import purchasingRoutes from './domains/purchasing/purchasing.routes';
import restaurantRoutes from './domains/restaurant/restaurant.routes';
import liquorRoutes from './domains/liquor/liquor.routes';
import accountingRoutes from './domains/accounting/accounting.routes';
import analyticsRoutes from './domains/analytics/analytics.routes';
import employeesRoutes from './domains/employees/employees.routes';
import syncRoutes from './domains/sync/sync.routes';
import auditRoutes from './domains/audit/audit.routes';
import hrRoutes from './domains/hr/hr.routes';
import workflowRoutes from './domains/workflow/workflow.routes';
import platformRoutes from './domains/platform/platform.routes';
import aiRoutes from './domains/ai/ai.routes';
import branchRoutes from './domains/branches/branches.routes';
import observabilityRoutes from './domains/observability/observability.routes';
import securityRoutes from './security/security.routes';
import operationsRoutes from './domains/operations/operations.routes';

export const app = express();

// ── Request ID tracking ────────────────────────────────────────────────
let reqIdCounter = 0;
function requestId(req: Request, _res: Response, next: NextFunction): void {
  (req as any).requestId =
    `${Date.now().toString(36)}-${(reqIdCounter++).toString(36)}`;
  next();
}

// ── Structured logger ─────────────────────────────────────────────────
function structuredLog(
  level: string,
  req: Request,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    requestId: (req as any).requestId || '-',
    method: req.method,
    path: req.path,
    message,
    ...extra,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const safeExtra: Record<string, unknown> = {
      status: res.statusCode,
      duration,
    };
    if ((req as any).user) {
      safeExtra.userId = (req as any).user!.id;
      safeExtra.role = (req as any).user!.role;
    }
    structuredLog(
      'info',
      req,
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
      safeExtra,
    );
  });
  next();
}

// ── Core middleware stack ─────────────────────────────────────────────
app.set('trust proxy', TRUST_PROXY);

app.use(requestId);
app.use(securityHeaders);
app.use(httpsRedirect);
app.use(cors(CORS_OPTIONS));
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);
app.use(trackRequestMetrics);
app.use(tenantMiddleware);

// ── Gateway middleware stack ───────────────────────────────────────────
app.use('/api', gatewayMiddleware({ rateLimiting: false }));
app.use('/api', apiVersionRouter());
app.use('/api', tenantRoutingMiddleware());
app.use('/api', traceLoggerMiddleware());

// ── Rate limiting ─────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again after 15 minutes.',
});
app.use('/api/auth/', authLimiter);

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many sync requests, please try again later.',
});
app.use('/api/sync', syncLimiter);

// ── Health check endpoints (kept for backward compatibility) ──────────
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (_req: Request, res: Response) => {
  db.get('SELECT 1 AS ok', [], (err: any) => {
    if (err) {
      res
        .status(503)
        .json({ status: 'error', message: 'Database unavailable' });
      return;
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node: process.version,
      memory: process.memoryUsage().rss,
    });
  });
});

// ── Gateway API routes (docs, versions, metrics) ──────────────────────
app.use('/api', gatewayRoutes);

// ── Versioned API routes ───────────────────────────────────────────────
app.use('/api/v1', apiVersionRouter());
app.use('/api/v2', apiVersionRouter());

// ── Domain routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchasing', purchasingRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/liquor', liquorRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/observability', observabilityRoutes);

// ── Security routes (superadmin only) ───────────────────────────────────────
app.use('/api/security', securityRoutes);
app.use('/api/operations', operationsRoutes);

// ── Global error handler ──────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  structuredLog('error', req, err.message || 'Internal server error', {
    stack: err.stack,
  });
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Internal server error' });
});
