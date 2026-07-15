import crypto from 'crypto';
import zlib from 'zlib';
import * as T from './sync.types';
import { SyncRepository as R } from './sync.repository';
import { CRDTMergeEngine } from './crdt/mergeEngine';

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
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
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
    conflicts: T.SyncConflict[];
  }> {
    const accepted: T.SyncEvent[] = [];
    const rejected: { eventType: string; message: string }[] = [];
    const conflicts: T.SyncConflict[] = [];
    for (const evt of events) {
      try {
        const saved = await R.createEvent(evt);
        const mergeResult = await CRDTMergeEngine.processAndMergeEvent(saved);
        if (mergeResult.conflict) {
          conflicts.push(mergeResult.conflict);
        }
        accepted.push(saved);
      } catch (err: any) {
        rejected.push({ eventType: evt.eventType, message: err.message });
      }
    }
    return { accepted, rejected, conflicts };
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
    const { accepted, rejected, conflicts } =
      await this.recordEventsBulk(events);

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

  // ── Tenant-Isolated Sync ──────────────────────────────────────────────────

  async pushWithTenantIsolation(
    tenantId: string,
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
    const tagged = events.map((e) => ({
      ...e,
      metadata: { ...e.metadata, tenantId },
    }));
    const { accepted, rejected, conflicts } =
      await this.recordEventsBulk(tagged);

    const lastEvent =
      accepted.length > 0 ? accepted[accepted.length - 1] : null;
    const serverCheckpoint = lastEvent?.id || lastCheckpoint || '';

    if (lastEvent) {
      await R.updateSyncCheckpoint(deviceId, {
        lastEventId: lastEvent.id,
        lastEventSeq: lastEvent.version,
        lastSyncAt: now(),
        eventsPushed: accepted.length,
        status: 'idle',
      });
    }

    await R.logSyncAudit({
      deviceId,
      tenantId,
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

  async pullWithTenantIsolation(
    tenantId: string,
    deviceId: string,
    sinceVersion?: number,
    limit = 1000,
  ): Promise<{
    events: T.SyncEvent[];
    checkpoint: string;
    hasMore: boolean;
    serverVersion: number;
  }> {
    const startTime = Date.now();
    const events = await R.getEventsByTenant(
      tenantId,
      sinceVersion,
      limit + 1,
    );
    const hasMore = events.length > limit;
    const result = events.slice(0, limit);
    const maxVersion =
      result.length > 0
        ? result[result.length - 1].version
        : sinceVersion || 0;

    if (result.length > 0) {
      await R.updateSyncCheckpoint(deviceId, {
        lastEventId: result[result.length - 1].id,
        lastEventSeq: maxVersion,
        lastSyncAt: now(),
        eventsPulled: result.length,
        status: 'idle',
      });
    }

    await R.logSyncAudit({
      deviceId,
      tenantId,
      syncType: sinceVersion ? 'incremental' : 'full',
      direction: 'pull',
      eventsCount: result.length,
      bytesTransferred: JSON.stringify(result).length,
      durationMs: Date.now() - startTime,
      status: 'completed',
    });

    const totalVersion = await R.getMaxVersion(tenantId);

    return {
      events: result,
      checkpoint: String(maxVersion),
      hasMore,
      serverVersion: totalVersion,
    };
  },

  // ── Compression ───────────────────────────────────────────────────────────

  async compressEvents(
    events: T.SyncEvent[] | T.CreateEventDto[],
    algorithm: T.CompressionAlgorithm = 'gzip',
  ): Promise<T.CompressedSyncPayload> {
    const payload = JSON.stringify(events);
    const originalSize = Buffer.byteLength(payload, 'utf-8');
    let compressed: Buffer;
    if (algorithm === 'brotli') {
      compressed = zlib.brotliCompressSync(Buffer.from(payload, 'utf-8'));
    } else {
      compressed = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
    }
    return {
      algorithm,
      compressed: compressed.toString('base64'),
      originalSize,
      compressedSize: compressed.length,
      checksum: sha256(payload),
    };
  },

  async decompressEvents(
    payload: T.CompressedSyncPayload,
  ): Promise<T.SyncEvent[]> {
    const raw = Buffer.from(payload.compressed as string, 'base64');
    let decompressed: Buffer;
    if (payload.algorithm === 'brotli') {
      decompressed = zlib.brotliDecompressSync(raw);
    } else {
      decompressed = zlib.gunzipSync(raw);
    }
    const data = decompressed.toString('utf-8');
    const checksum = sha256(data);
    if (checksum !== payload.checksum) {
      throw new Error(
        `Checksum mismatch: expected ${payload.checksum}, got ${checksum}`,
      );
    }
    return JSON.parse(data);
  },

  // ── Snapshots ─────────────────────────────────────────────────────────────

  async createSnapshot(
    tenantId: string,
    dto: T.CreateSnapshotDto,
    createdBy: string,
  ): Promise<T.Snapshot> {
    const eventVersion = await R.getMaxVersion(tenantId);
    const eventCount = await R.getEventCount(tenantId);

    const events = await R.getEventsByTenant(tenantId, 0, 100000);
    const state: Record<string, any> = {};
    for (const evt of events) {
      const key = `${evt.aggregateType}:${evt.aggregateId}`;
      if (!state[key]) {
        state[key] = { aggregateType: evt.aggregateType, aggregateId: evt.aggregateId, data: {} };
      }
      state[key].data[evt.eventType] = evt.data;
    }

    const compressed = await this.compressEvents(events);
    const compressedSize = compressed.compressedSize;

    return R.createSnapshot({
      tenantId,
      label: dto.label || null,
      state,
      eventVersion,
      eventCount,
      compressedSize,
      checksum: compressed.checksum,
      tags: dto.tags || [],
      createdBy,
      ttlMs: dto.ttlMs,
    });
  },

  async restoreFromSnapshot(
    tenantId: string,
    snapshotId: string,
  ): Promise<{ restored: boolean; snapshot: T.Snapshot }> {
    const snapshot = await R.findSnapshotById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    if (snapshot.tenantId !== tenantId) {
      throw new Error('Snapshot does not belong to this tenant');
    }
    await R.markSnapshotRestored(snapshotId);
    return { restored: true, snapshot };
  },

  async listSnapshots(
    tenantId: string,
    limit = 20,
  ): Promise<T.Snapshot[]> {
    return R.listSnapshots(tenantId, limit);
  },

  async getSnapshot(
    snapshotId: string,
  ): Promise<T.Snapshot | null> {
    return R.findSnapshotById(snapshotId);
  },

  // ── Incremental Sync ──────────────────────────────────────────────────────

  async incrementalSync(
    tenantId: string,
    deviceId: string,
    lastSyncAt: string,
  ): Promise<{
    events: T.SyncEvent[];
    checkpoint: string;
    hasMore: boolean;
    newCheckpoint: string;
  }> {
    const sinceVersion = parseInt(lastSyncAt, 10) || 0;
    const events = await R.getEventsByTenant(tenantId, sinceVersion, 1001);
    const hasMore = events.length > 1000;
    const result = events.slice(0, 1000);

    const maxVersion =
      result.length > 0
        ? result[result.length - 1].version
        : sinceVersion;

    await R.updateSyncCheckpoint(deviceId, {
      lastEventId:
        result.length > 0 ? result[result.length - 1].id : undefined,
      lastEventSeq: maxVersion,
      lastSyncAt: now(),
      eventsPulled: result.length,
      status: 'idle',
    });

    return {
      events: result,
      checkpoint: String(maxVersion),
      hasMore,
      newCheckpoint: String(maxVersion),
    };
  },

  // ── Replay ────────────────────────────────────────────────────────────────

  async createReplaySession(
    tenantId: string,
    dto: T.CreateReplayDto,
    createdBy: string,
  ): Promise<T.ReplaySession> {
    const session = await R.createReplaySession({
      tenantId,
      aggregateId: dto.aggregateId || null,
      aggregateType: dto.aggregateType || null,
      fromVersion: dto.fromVersion,
      toVersion: dto.toVersion || null,
      createdBy,
    });

    setImmediate(() => {
      this.executeReplay(session.id).catch((err) => {
        console.error(`[Sync] Replay ${session.id} failed:`, err.message);
      });
    });

    return session;
  },

  async executeReplay(replayId: string): Promise<void> {
    await R.updateReplaySession(replayId, { status: 'processing' });
    try {
      const session = await R.findReplaySession(replayId);
      if (!session) {
        throw new Error('Replay session not found');
      }

      let events: T.SyncEvent[];
      if (session.aggregateId && session.aggregateType) {
        events = await R.getEventsByAggregate(
          session.aggregateType,
          session.aggregateId,
        );
      } else {
        events = await R.getEventsByTenant(
          session.tenantId,
          session.fromVersion,
          10000,
        );
      }

      if (session.toVersion !== null) {
        events = events.filter((e) => e.version <= session.toVersion!);
      }

      const payload = JSON.stringify(events.map((e) => e.id));
      const checksum = sha256(payload);

      let integrity = true;
      for (const evt of events) {
        const refetched = await R.findEventById(evt.id);
        if (!refetched) {
          integrity = false;
          break;
        }
      }

      await R.updateReplaySession(replayId, {
        status: 'completed',
        eventsCount: events.length,
        checksum,
        integrity,
        completedAt: now(),
      });
    } catch (err: any) {
      await R.updateReplaySession(replayId, {
        status: 'failed',
        errorMessage: err.message,
        completedAt: now(),
      });
    }
  },

  async validateReplay(
    tenantId: string,
    replayId: string,
  ): Promise<{ valid: boolean; session: T.ReplaySession }> {
    const session = await R.findReplaySession(replayId);
    if (!session) {
      throw new Error(`Replay session not found: ${replayId}`);
    }
    if (session.tenantId !== tenantId) {
      throw new Error('Replay session does not belong to this tenant');
    }
    return { valid: session.integrity === true, session };
  },

  async listReplaySessions(
    tenantId: string,
    limit = 20,
  ): Promise<T.ReplaySession[]> {
    return R.listReplaySessions(tenantId, limit);
  },

  // ── Sync Status ───────────────────────────────────────────────────────────

  async getSyncStatus(
    tenantId: string,
  ): Promise<T.SyncStatusDetails> {
    const [
      deviceCount,
      activeDeviceCount,
      totalEvents,
      pendingEvents,
      unresolvedConflicts,
      queueDepth,
      activeBgTasks,
      snapshotsAvailable,
      storageBytes,
      avgSyncDurationMs,
      syncFrequency,
      errorRate,
    ] = await Promise.all([
      R.getDeviceCount(tenantId),
      R.getActiveDeviceCount(tenantId),
      R.getEventCount(tenantId),
      R.getPendingEventCount(tenantId),
      R.getUnresolvedConflicts(tenantId).then((c) => c.length),
      R.getQueueDepth(tenantId),
      R.getActiveBgTaskCount(tenantId),
      R.getSnapshotCount(tenantId),
      R.getTotalStorageBytes(tenantId),
      R.getAvgSyncDuration(tenantId),
      R.getSyncFrequency(tenantId),
      R.getErrorRate(tenantId),
    ]);

    const lastAudit = await R.getSyncAuditByTenant(tenantId, 1);
    const lastSyncAt = lastAudit.length > 0 ? lastAudit[0].createdAt : null;

    const lastReplay = await R.listReplaySessions(tenantId, 1);
    const lastReplayAt =
      lastReplay.length > 0 ? lastReplay[0].completedAt : null;

    const compressedBytes = 0;

    return {
      tenantId,
      deviceCount,
      activeDeviceCount,
      totalEvents,
      pendingEvents,
      lastSyncAt,
      lastReplayAt,
      unresolvedConflicts,
      queueDepth,
      activeBgTasks,
      snapshotsAvailable,
      storageBytes,
      compressedBytes,
      compressionRatio:
        storageBytes > 0
          ? parseFloat(((storageBytes - compressedBytes) / storageBytes).toFixed(4))
          : 1,
      syncFrequency,
      avgSyncDurationMs,
      errorRate,
      healthy:
        errorRate < 0.1 &&
        activeBgTasks < 5 &&
        unresolvedConflicts < 100,
    };
  },

  // ── Background Sync ───────────────────────────────────────────────────────

  async scheduleBackgroundSync(
    tenantId: string,
    deviceId?: string,
    syncType: T.SyncType = 'incremental',
    priority = 0,
  ): Promise<T.BackgroundSyncTask> {
    return R.createBackgroundSyncTask({
      tenantId,
      deviceId: deviceId || null,
      syncType,
      priority,
    });
  },

  async processBackgroundSync(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const tasks = await R.getPendingSyncTasks(undefined, 10);
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        await R.updateBackgroundSyncTask(task.id, {
          status: 'processing',
          startedAt: now(),
        });

        if (task.syncType === 'full' || task.syncType === 'incremental') {
          const events = await R.getEventsByTenant(
            task.tenantId,
            0,
            500,
          );
          const result = {
            synced: events.length,
            tenantId: task.tenantId,
          };
          await R.updateBackgroundSyncTask(task.id, {
            status: 'completed',
            result,
            completedAt: now(),
          });
          processed++;
        } else if (task.syncType === 'replay') {
          // Schedule a replay session
          const rply = await this.createReplaySession(task.tenantId, {
            tenantId: task.tenantId,
            fromVersion: 0,
          }, 'system');
          await R.updateBackgroundSyncTask(task.id, {
            status: 'completed',
            result: { replayId: rply.id },
            completedAt: now(),
          });
          processed++;
        } else {
          await R.updateBackgroundSyncTask(task.id, {
            status: 'completed',
            result: { note: `Sync type ${task.syncType} handled` },
            completedAt: now(),
          });
          processed++;
        }
      } catch (err: any) {
        failed++;
        errors.push(`Task ${task.id}: ${err.message}`);
        const updatedTask = await R.findBackgroundSyncTask(task.id);
        const newRetryCount = (updatedTask?.retryCount || 0) + 1;
        if (newRetryCount >= (updatedTask?.maxRetries || 3)) {
          await R.updateBackgroundSyncTask(task.id, {
            status: 'failed',
            errorMessage: err.message,
            retryCount: newRetryCount,
            completedAt: now(),
          });
        } else {
          await R.updateBackgroundSyncTask(task.id, {
            status: 'queued',
            errorMessage: err.message,
            retryCount: newRetryCount,
          });
        }
      }
    }

    return { processed, failed, errors };
  },

  async listBackgroundTasks(
    tenantId?: string,
    limit = 20,
  ): Promise<T.BackgroundSyncTask[]> {
    return R.getPendingSyncTasks(tenantId, limit);
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
