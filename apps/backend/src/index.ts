import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, db } from './db';
import {
  securityHeaders,
  httpsRedirect,
  CORS_OPTIONS,
  TRUST_PROXY,
} from './middleware/security';
import { spawn } from 'child_process';
import { tenantMiddleware } from './middleware/tenant';

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

import { bootstrap } from './bootstrap';
import { trackRequestMetrics, flushMetrics } from './middleware/monitoring';
import { flushCountersToDb } from './middleware/metrics';
import {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} from './domains/workflow/workflow.service';

const app = express();

const REQUIRED_ENV_VARS = ['JWT_SECRET'] as const;
const validateConfig = (): void => {
  const missing: string[] = [];
  for (const v of REQUIRED_ENV_VARS) {
    if (!process.env[v]) missing.push(v);
  }
  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('\nCopy .env.example to .env and fill in the values:');
    console.error('  cp .env.example .env');
    process.exit(1);
  }
};

const PORT = process.env.PORT || 3000;
const JWT_SECRET: string = process.env.JWT_SECRET!;

if (JWT_SECRET.length < 32) {
  console.warn(
    'WARNING: JWT_SECRET is too short (< 32 chars). Generate a strong secret for production.',
  );
}

let reqIdCounter = 0;
function requestId(req: Request, _res: Response, next: NextFunction): void {
  (req as any).requestId =
    `${Date.now().toString(36)}-${(reqIdCounter++).toString(36)}`;
  next();
}

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

app.set('trust proxy', TRUST_PROXY);

app.use(requestId);
app.use(securityHeaders);
app.use(httpsRedirect);
app.use(cors(CORS_OPTIONS));
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);
app.use(trackRequestMetrics);
app.use(tenantMiddleware);

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

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (_req: Request, res: Response) => {
  db.get('SELECT 1 AS ok', [], (err) => {
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

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  structuredLog('error', req, err.message || 'Internal server error', {
    stack: err.stack,
  });
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Internal server error' });
});

const startQuickTunnel = (port: number) => {
  console.log('[Tunnel] Starting automated Cloudflare Quick Tunnel...');
  const child = spawn(
    'npx',
    [
      '--yes',
      '@cloudflare/cloudflared',
      'tunnel',
      '--no-autoupdate',
      '--url',
      `http://localhost:${port}`,
    ],
    {
      shell: true,
    },
  );

  child.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      console.log('\n==================================================');
      console.log('  ⚡ DEEPA BMS IS ACCESSIBLE GLOBALLY! ⚡');
      console.log(`  Public HTTPS URL: \x1b[36m${match[0]}\x1b[0m`);
      console.log(
        '  Enter this URL in Settings -> serverUrl on Android/Windows',
      );
      console.log('==================================================\n');
    }
  });

  child.on('error', (err) => {
    console.error('[Tunnel] Failed to start tunnel process:', err.message);
  });
};

validateConfig();
initializeDatabase()
  .then(() => bootstrap())
  .then(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Deepa BMS API Server listening on http://0.0.0.0:${PORT}`);
      console.log(`LAN devices: connect to http://<this-machine-IP>:${PORT}`);

      // M2-1 + M2-3: periodic maintenance loops.
      const metricsTimer = setInterval(
        () => {
          flushMetrics().catch(() => {});
          flushCountersToDb().catch(() => {});
        },
        Number(process.env.METRICS_FLUSH_INTERVAL || 60000),
      );

      // M2-3: start the workflow scheduler (executes due jobs).
      startWorkflowScheduler(Number(process.env.WORKFLOW_POLL_MS || 30000));

      const shutdown = (signal: string) => {
        console.log(`[shutdown] ${signal} received — draining...`);
        clearInterval(metricsTimer);
        stopWorkflowScheduler();
        process.exit(0);
      };
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

      if (
        process.env.START_TUNNEL === 'true' ||
        process.argv.includes('--tunnel')
      ) {
        startQuickTunnel(Number(PORT));
      }
    });
  })
  .catch((err) => {
    console.error('FATAL: Server startup failed:', err);
    process.exit(1);
  });

export { app };
