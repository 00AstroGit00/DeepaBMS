import crypto from 'crypto';
import * as T from './sync.types';
import { SyncRepository as R } from './sync.repository';

function now(): string {
  return new Date().toISOString();
}

function generateDeviceToken(deviceSecret: string): string {
  return crypto
    .createHmac('sha256', deviceSecret)
    .update(now().slice(0, 10))
    .digest('hex');
}

function verifyDeviceToken(deviceSecret: string, token: string): boolean {
  const expected = generateDeviceToken(deviceSecret);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export const SyncService = {
  // ── Device Management ─────────────────────────────────────────────────────

  async registerDevice(dto: T.RegisterDeviceDto): Promise<{
    device: T.DeviceRegistration;
    token: string;
  }> {
    const device = await R.registerDevice(dto);
    const token = generateDeviceToken(device.deviceSecret);
    return { device, token };
  },

  async authenticateDevice(
    deviceId: string,
    token: string,
  ): Promise<T.DeviceRegistration | null> {
    const device = await R.findDeviceById(deviceId);
    if (!device) return null;
    if (device.status !== 'active') return null;
    if (!verifyDeviceToken(device.deviceSecret, token)) return null;
    return device;
  },

  async approveDevice(deviceId: string, approvedBy: string): Promise<void> {
    await R.updateDeviceStatus(deviceId, 'active', approvedBy);
  },

  async blockDevice(deviceId: string): Promise<void> {
    await R.updateDeviceStatus(deviceId, 'blocked');
  },

  async heartbeat(
    deviceId: string,
    ip: string,
    meta?: Record<string, any>,
  ): Promise<void> {
    await R.updateDeviceHeartbeat(deviceId, ip, meta);
  },

  async listDevices(filter?: {
    status?: T.DeviceStatus;
    deviceType?: T.DeviceType;
  }): Promise<T.DeviceRegistration[]> {
    return R.findAllDevices(filter);
  },

  async getDevice(id: string): Promise<T.DeviceRegistration | null> {
    return R.findDeviceById(id);
  },

  // ── Event Sourcing ────────────────────────────────────────────────────────

  async recordEvent(dto: T.CreateEventDto): Promise<T.SyncEvent> {
    return R.createEvent(dto);
  },

  async recordEventsBulk(events: T.CreateEventDto[]): Promise<{
    accepted: T.SyncEvent[];
    rejected: { eventType: string; message: string }[];
  }> {
    const accepted: T.SyncEvent[] = [];
    const rejected: { eventType: string; message: string }[] = [];
    for (const evt of events) {
      try {
        const saved = await R.createEvent(evt);
        accepted.push(saved);
      } catch (err: any) {
        rejected.push({ eventType: evt.eventType, message: err.message });
      }
    }
    return { accepted, rejected };
  },

  async replayEvents(
    aggregateType: string,
    aggregateId: string,
  ): Promise<T.SyncEvent[]> {
    return R.getEventsByAggregate(aggregateType, aggregateId);
  },

  // ── Sync Engine ───────────────────────────────────────────────────────────

  async pushEvents(
    deviceId: string,
    events: T.CreateEventDto[],
    lastCheckpoint?: string,
  ): Promise<{
    accepted: number;
    rejected: number;
    errors: { eventType: string; message: string }[];
    serverCheckpoint: string;
    conflicts: T.SyncConflict[];
  }> {
    const startTime = Date.now();
    const { accepted, rejected } = await this.recordEventsBulk(events);

    const conflicts: T.SyncConflict[] = [];
    for (const evt of accepted) {
      await R.enqueue({
        deviceId,
        eventId: evt.id,
        operation: 'push',
        payload: { eventType: evt.eventType },
      });
    }

    const lastEvent =
      accepted.length > 0 ? accepted[accepted.length - 1] : null;
    const serverCheckpoint = lastEvent?.id || lastCheckpoint || '';

    if (lastEvent) {
      await R.upsertCheckpoint(deviceId, lastEvent.id, lastEvent.version);
    }

    await R.logSyncAudit({
      deviceId,
      syncType: lastCheckpoint ? 'incremental' : 'full',
      direction: 'push',
      eventsCount: accepted.length,
      bytesTransferred: JSON.stringify(events).length,
      durationMs: Date.now() - startTime,
      status: 'completed',
    });

    return {
      accepted: accepted.length,
      rejected: rejected.length,
      errors: rejected,
      serverCheckpoint,
      conflicts,
    };
  },

  async pullEvents(
    deviceId: string,
    checkpoint: string,
    limit = 1000,
  ): Promise<{
    events: T.SyncEvent[];
    checkpoint: string;
    hasMore: boolean;
    serverVersion: number;
  }> {
    const startTime = Date.now();
    const checkpointId = checkpoint || null;
    const events = await R.getEventsSince(checkpointId, limit + 1);
    const hasMore = events.length > limit;
    const result = events.slice(0, limit);
    const newCheckpoint =
      result.length > 0 ? result[result.length - 1].id : checkpoint;

    if (result.length > 0) {
      const lastEvent = result[result.length - 1];
      await R.upsertCheckpoint(deviceId, lastEvent.id, lastEvent.version);
    }

    await R.logSyncAudit({
      deviceId,
      syncType: checkpoint ? 'incremental' : 'full',
      direction: 'pull',
      eventsCount: result.length,
      bytesTransferred: JSON.stringify(result).length,
      durationMs: Date.now() - startTime,
      status: 'completed',
    });

    const eventCount = await R.getEventCount();

    return {
      events: result,
      checkpoint: newCheckpoint,
      hasMore,
      serverVersion: eventCount,
    };
  },

  async fullSync(
    deviceId: string,
    events: T.CreateEventDto[],
    checkpoint?: string,
  ): Promise<{
    pushResult: {
      accepted: number;
      rejected: number;
      errors: { eventType: string; message: string }[];
      serverCheckpoint: string;
      conflicts: T.SyncConflict[];
    };
    pullResult: {
      events: T.SyncEvent[];
      checkpoint: string;
      hasMore: boolean;
      serverVersion: number;
    };
  }> {
    const pushResult = await this.pushEvents(deviceId, events, checkpoint);
    const pullResult = await this.pullEvents(
      deviceId,
      pushResult.serverCheckpoint,
    );
    return { pushResult, pullResult };
  },

  // ── Conflict Resolution ───────────────────────────────────────────────────

  async getUnresolvedConflicts(): Promise<T.SyncConflict[]> {
    return R.getUnresolvedConflicts();
  },

  async resolveConflict(
    id: string,
    resolution: T.ConflictResolution,
    resolvedData: Record<string, any>,
    resolvedBy: string,
  ): Promise<void> {
    await R.resolveConflict(id, resolution, resolvedData, resolvedBy);
  },

  // ── Queue Management ──────────────────────────────────────────────────────

  async getPendingQueue(deviceId: string): Promise<T.SyncQueueItem[]> {
    return R.getPendingQueue(deviceId);
  },

  async retryFailedQueue(deviceId: string): Promise<number> {
    const items = await R.getPendingQueue(deviceId);
    let retried = 0;
    for (const item of items) {
      if (item.status === 'failed' && item.retryCount < item.maxRetries) {
        await R.updateQueueStatus(item.id, 'pending');
        retried++;
      }
    }
    return retried;
  },

  // ── Health ────────────────────────────────────────────────────────────────

  async getHealth() {
    return R.getSyncHealth();
  },

  async getSyncHistory(
    deviceId: string,
    limit = 50,
  ): Promise<T.SyncAuditEntry[]> {
    return R.getSyncHistory(deviceId, limit);
  },
};
