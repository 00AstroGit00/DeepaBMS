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

router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
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

// ── Replay ───────────────────────────────────────────────────────────────

router.post(
  '/replay',
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
