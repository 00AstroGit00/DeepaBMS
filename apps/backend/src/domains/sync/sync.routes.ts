import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { SyncService as S } from './sync.service';
import * as T from './sync.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('Validation')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

function getTenantId(req: AuthenticatedRequest): string {
  return req.user?.tenantId || '';
}

// ── Device Registration & Management ─────────────────────────────────────

router.post(
  '/device/register',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.RegisterDeviceDto = {
        name: req.body.name,
        deviceType: req.body.deviceType,
        publicKey: req.body.publicKey,
        firmwareVer: req.body.firmwareVer,
        appVersion: req.body.appVersion,
        osVersion: req.body.osVersion,
        capabilities: req.body.capabilities,
        metadata: req.body.metadata,
      };
      if (!dto.name || !dto.deviceType || !dto.publicKey) {
        res
          .status(400)
          .json({ message: 'name, deviceType, publicKey are required' });
        return;
      }
      if (!T.VALID_DEVICE_TYPES.includes(dto.deviceType)) {
        res.status(400).json({
          message: `Invalid deviceType. Must be one of: ${T.VALID_DEVICE_TYPES.join(', ')}`,
        });
        return;
      }
      const result = await S.registerDevice(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/device/auth',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { deviceId, token } = req.body;
      if (!deviceId || !token) {
        res.status(400).json({ message: 'deviceId and token are required' });
        return;
      }
      const device = await S.authenticateDevice(deviceId, token);
      if (!device) {
        res
          .status(401)
          .json({ message: 'Invalid device credentials or device not active' });
        return;
      }
      res.json({ device, authenticated: true });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/device/heartbeat',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { deviceId, token, ...meta } = req.body;
      if (!deviceId || !token) {
        res.status(400).json({ message: 'deviceId and token are required' });
        return;
      }
      const device = await S.authenticateDevice(deviceId, token);
      if (!device) {
        res.status(401).json({ message: 'Invalid device credentials' });
        return;
      }
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      await S.heartbeat(deviceId, ip, meta);
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/device',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter: { status?: T.DeviceStatus; deviceType?: T.DeviceType } = {};
      if (req.query.status) filter.status = req.query.status as T.DeviceStatus;
      if (req.query.deviceType)
        filter.deviceType = req.query.deviceType as T.DeviceType;
      const devices = await S.listDevices(filter);
      res.json(devices);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/device/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const device = await S.getDevice(req.params.id);
      if (!device) {
        res.status(404).json({ message: 'Device not found' });
        return;
      }
      res.json(device);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/device/:id/approve',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.approveDevice(req.params.id, req.user?.name || 'unknown');
      res.json({ message: 'Device approved' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/device/:id/block',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.blockDevice(req.params.id);
      res.json({ message: 'Device blocked' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Event Store ──────────────────────────────────────────────────────────

router.post('/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { events, deviceId, token } = req.body;
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ message: 'events array is required' });
      return;
    }
    const result = await S.recordEventsBulk(
      events.map((e: any) => ({
        ...e,
        deviceId,
        userId: req.body.userId,
      })),
    );
    res.status(201).json(result);
  } catch (err: any) {
    handleError(res, err);
  }
});

router.get(
  '/events/:aggregateType/:aggregateId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await S.replayEvents(
        req.params.aggregateType,
        req.params.aggregateId,
      );
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Sync Engine ──────────────────────────────────────────────────────────

router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, token } = req.body;
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    res.json({
      status: 'ready',
      deviceId,
      serverTime: new Date().toISOString(),
      serverVersion: 1,
    });
  } catch (err: any) {
    handleError(res, err);
  }
});

router.post('/upload', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, token, events, checkpoint: lastCheckpoint } = req.body;
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    if (!events || !Array.isArray(events)) {
      res.status(400).json({ message: 'events array is required' });
      return;
    }
    const result = await S.pushEvents(deviceId, events, lastCheckpoint);
    res.json(result);
  } catch (err: any) {
    handleError(res, err);
  }
});

router.get('/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string;
    const token = req.query.token as string;
    const checkpoint = (req.query.checkpoint as string) || '';
    const limit = parseInt((req.query.limit as string) || '1000', 10);
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    const result = await S.pullEvents(
      deviceId,
      checkpoint,
      Math.min(limit, 10000),
    );
    res.json(result);
  } catch (err: any) {
    handleError(res, err);
  }
});

router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, token, events, checkpoint } = req.body;
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    const result = await S.fullSync(deviceId, events || [], checkpoint);
    res.json(result);
  } catch (err: any) {
    handleError(res, err);
  }
});

// ── Tenant-Isolated Sync ─────────────────────────────────────────────────

router.post(
  '/push',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'cashier', 'fnb', 'barstaff', 'kitchen', 'inventory', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const { events, lastCheckpoint, deviceId } = req.body;
      if (!deviceId) {
        res.status(400).json({ message: 'deviceId is required' });
        return;
      }
      if (!events || !Array.isArray(events)) {
        res.status(400).json({ message: 'events array is required' });
        return;
      }
      const result = await S.pushWithTenantIsolation(
        tenantId,
        deviceId,
        events,
        lastCheckpoint,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/pull',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'cashier', 'fnb', 'barstaff', 'kitchen', 'inventory', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const { sinceVersion, deviceId, limit } = req.body;
      if (!deviceId) {
        res.status(400).json({ message: 'deviceId is required' });
        return;
      }
      const result = await S.pullWithTenantIsolation(
        tenantId,
        deviceId,
        sinceVersion ? parseInt(sinceVersion, 10) : undefined,
        limit ? Math.min(parseInt(limit, 10), 10000) : 1000,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Compression ──────────────────────────────────────────────────────────

router.post(
  '/compress',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { events, algorithm } = req.body;
      if (!events || !Array.isArray(events)) {
        res.status(400).json({ message: 'events array is required' });
        return;
      }
      const algo: T.CompressionAlgorithm =
        algorithm === 'brotli' ? 'brotli' : 'gzip';
      const compressed = await S.compressEvents(events, algo);
      res.json(compressed);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/decompress',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = req.body as T.CompressedSyncPayload;
      if (!payload || !payload.algorithm || !payload.compressed) {
        res.status(400).json({ message: 'Compressed payload is required' });
        return;
      }
      const events = await S.decompressEvents(payload);
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Snapshots ────────────────────────────────────────────────────────────

router.post(
  '/snapshot',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const dto: T.CreateSnapshotDto = {
        tenantId,
        label: req.body.label,
        tags: req.body.tags,
        ttlMs: req.body.ttlMs,
      };
      const snapshot = await S.createSnapshot(
        tenantId,
        dto,
        req.user?.name || 'unknown',
      );
      res.status(201).json(snapshot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/snapshot',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const snapshots = await S.listSnapshots(tenantId, limit);
      res.json(snapshots);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/snapshot/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const snapshot = await S.getSnapshot(req.params.id);
      if (!snapshot) {
        res.status(404).json({ message: 'Snapshot not found' });
        return;
      }
      res.json(snapshot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/snapshot/:id/restore',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const result = await S.restoreFromSnapshot(tenantId, req.params.id);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Incremental Sync ─────────────────────────────────────────────────────

router.post(
  '/incremental',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'cashier', 'fnb', 'barstaff', 'kitchen', 'inventory', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const { deviceId, lastSyncAt } = req.body;
      if (!deviceId) {
        res.status(400).json({ message: 'deviceId is required' });
        return;
      }
      const result = await S.incrementalSync(
        tenantId,
        deviceId,
        lastSyncAt || '0',
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Replay ───────────────────────────────────────────────────────────────

router.post(
  '/replay',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const dto: T.CreateReplayDto = {
        tenantId,
        aggregateId: req.body.aggregateId,
        aggregateType: req.body.aggregateType,
        fromVersion: req.body.fromVersion || 0,
        toVersion: req.body.toVersion || null,
      };
      const session = await S.createReplaySession(
        tenantId,
        dto,
        req.user?.name || 'unknown',
      );
      res.status(201).json(session);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/replay',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const sessions = await S.listReplaySessions(tenantId, limit);
      res.json(sessions);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/replay/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const result = await S.validateReplay(tenantId, req.params.id);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Sync Status ──────────────────────────────────────────────────────────

router.get(
  '/status',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const status = await S.getSyncStatus(tenantId);
      res.json(status);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// Legacy device-level status (kept for backward compatibility)
router.get('/device-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string;
    const token = req.query.token as string;
    if (!deviceId || !token) {
      res.status(400).json({ message: 'deviceId and token are required' });
      return;
    }
    const device = await S.authenticateDevice(deviceId, token);
    if (!device) {
      res.status(401).json({ message: 'Invalid device credentials' });
      return;
    }
    const pending = await S.getPendingQueue(deviceId);
    const history = await S.getSyncHistory(deviceId, 5);
    res.json({
      deviceId,
      deviceStatus: device.status,
      pendingQueue: pending.length,
      recentSyncs: history,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    handleError(res, err);
  }
});

// ── Background Sync ──────────────────────────────────────────────────────

router.post(
  '/schedule',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        res.status(400).json({ message: 'Tenant context required' });
        return;
      }
      const { deviceId, syncType, priority } = req.body;
      const task = await S.scheduleBackgroundSync(
        tenantId,
        deviceId,
        syncType || 'incremental',
        priority || 0,
      );
      res.status(201).json(task);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/background/process',
  authenticate,
  authorize('owner', 'superadmin'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await S.processBackgroundSync();
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/background/tasks',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req) || undefined;
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const tasks = await S.listBackgroundTasks(
        tenantId || undefined,
        limit,
      );
      res.json(tasks);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Conflict Management ─────────────────────────────────────────────────

router.get(
  '/conflicts',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const conflicts = await S.getUnresolvedConflicts();
      res.json(conflicts);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/conflicts/:id/resolve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { resolution, resolvedData } = req.body;
      if (!resolution) {
        res.status(400).json({ message: 'resolution is required' });
        return;
      }
      await S.resolveConflict(
        req.params.id,
        resolution,
        resolvedData || {},
        req.user?.name || 'unknown',
      );
      res.json({ message: 'Conflict resolved' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Replay (legacy) ──────────────────────────────────────────────────────

router.post(
  '/replay-legacy',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aggregateType, aggregateId } = req.body;
      if (!aggregateType || !aggregateId) {
        res
          .status(400)
          .json({ message: 'aggregateType and aggregateId are required' });
        return;
      }
      const events = await S.replayEvents(aggregateType, aggregateId);
      res.json({ aggregateType, aggregateId, events });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Health ───────────────────────────────────────────────────────────────

router.get('/health', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await S.getHealth();
    res.json({ status: 'ok', ...health });
  } catch (err: any) {
    handleError(res, err);
  }
});

export default router;
