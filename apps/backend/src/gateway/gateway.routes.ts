import { Router, Request, Response } from 'express';
import { openApiRouter } from './openapi';
import { getMetricsSnapshot } from '../middleware/monitoring';

const router = Router();

// ── Health check endpoints ─────────────────────────────────────────────
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    node: process.version,
    memory: process.memoryUsage().rss,
  });
});

// ── API versions listing ───────────────────────────────────────────────
router.get('/versions', (_req: Request, res: Response) => {
  res.json({
    versions: [
      {
        version: 'v1',
        status: 'active',
        basePath: '/api/v1',
        releaseDate: '2024-01-01',
        deprecated: false,
      },
      {
        version: 'v2',
        status: 'preview',
        basePath: '/api/v2',
        releaseDate: '2025-06-01',
        deprecated: false,
      },
    ],
    defaultVersion: 'v1',
  });
});

// ── Metrics snapshot ──────────────────────────────────────────────────
router.get('/metrics', (_req: Request, res: Response) => {
  res.json(getMetricsSnapshot());
});

// ── OpenAPI docs ───────────────────────────────────────────────────────
router.use('/docs', openApiRouter());

export default router;
