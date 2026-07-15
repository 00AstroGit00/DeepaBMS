/**
 * index.ts — Server entry point.
 *
 * Imports the configured Express app from app.ts and starts the HTTP server
 * only when this file is executed directly (not when imported by Jest).
 * This is the standard Node.js idiom:
 *
 *   if (require.main === module) { ... app.listen() ... }
 *
 * All route/middleware configuration lives in app.ts.
 * All tests should import `app` from './app', not from './index'.
 */

import 'dotenv/config';
import { app } from './app';
import { initializeDatabase } from './db';
import { spawn } from 'child_process';
import { setupGraphQL } from './domains/analytics/graphql/server';
import { flushMetrics } from './middleware/monitoring';
import { flushCountersToDb } from './middleware/metrics';
import {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} from './domains/workflow/workflow.service';
import { bootstrap } from './bootstrap';

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

// ── Only start the server when this is the main module (not during tests) ──
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  validateConfig();

  const JWT_SECRET: string = process.env.JWT_SECRET!;
  if (JWT_SECRET.length < 32) {
    console.warn(
      'WARNING: JWT_SECRET is too short (< 32 chars). Generate a strong secret for production.',
    );
  }

  initializeDatabase()
    .then(() => bootstrap())
    .then(() => setupGraphQL(app))
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
}

// Re-export app for any code that currently imports from index.ts
export { app };
