import { query, run } from '../../db';
import * as T from './sync.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const SyncRepository = {
  // ── Device Registry ───────────────────────────────────────────────────────

  async registerDevice(
    dto: T.RegisterDeviceDto,
  ): Promise<T.DeviceRegistration> {
    const id = uid('dev');
    const secret = uid('sec');
    await run(
      `INSERT INTO device_registry (id, name, device_type, public_key, device_secret,
        metadata, firmware_ver, app_version, os_version, capabilities, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.deviceType,
        dto.publicKey,
        secret,
        JSON.stringify(dto.metadata || {}),
        dto.firmwareVer || null,
        dto.appVersion || null,
        dto.osVersion || null,
        JSON.stringify(dto.capabilities || []),
        'system',
      ],
    );
    return this.findDeviceById(id) as Promise<T.DeviceRegistration>;
  },

  async findDeviceById(id: string): Promise<T.DeviceRegistration | null> {
    const rows = await query(`SELECT * FROM device_registry WHERE id = ?`, [
      id,
    ]);
    if (!rows.length) return null;
    return this.mapDevice(rows[0]);
  },

  async findDeviceBySecret(
    secret: string,
  ): Promise<T.DeviceRegistration | null> {
    const rows = await query(
      `SELECT * FROM device_registry WHERE device_secret = ?`,
      [secret],
    );
    if (!rows.length) return null;
    return this.mapDevice(rows[0]);
  },

  async findAllDevices(filter?: {
    status?: T.DeviceStatus;
    deviceType?: T.DeviceType;
    tenantId?: string;
  }): Promise<T.DeviceRegistration[]> {
    let sql = 'SELECT * FROM device_registry WHERE 1=1';
    const params: any[] = [];
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.deviceType) {
      sql += ' AND device_type = ?';
      params.push(filter.deviceType);
    }
    if (filter?.tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(filter.tenantId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapDevice(r));
  },

  async updateDeviceStatus(
    id: string,
    status: T.DeviceStatus,
    approvedBy?: string,
  ): Promise<void> {
    if (approvedBy) {
      await run(
        `UPDATE device_registry SET status = ?, approved_by = ?, approved_at = ?, updated_at = ?
         WHERE id = ?`,
        [status, approvedBy, now(), now(), id],
      );
    } else {
      await run(
        `UPDATE device_registry SET status = ?, updated_at = ? WHERE id = ?`,
        [status, now(), id],
      );
    }
  },

  async updateDeviceHeartbeat(
    id: string,
    ip: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const updates: string[] = ['last_seen_at = ?', 'last_ip = ?'];
    const params: any[] = [now(), ip];
    if (metadata?.firmwareVer) {
      updates.push('firmware_ver = ?');
      params.push(metadata.firmwareVer);
    }
    if (metadata?.appVersion) {
      updates.push('app_version = ?');
      params.push(metadata.appVersion);
    }
    if (metadata?.osVersion) {
      updates.push('os_version = ?');
      params.push(metadata.osVersion);
    }
    params.push(id);
    await run(
      `UPDATE device_registry SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async getDeviceCount(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await query(
        'SELECT COUNT(*) as count FROM device_registry WHERE tenant_id = ?',
        [tenantId],
      );
      return rows[0].count;
    }
    const rows = await query('SELECT COUNT(*) as count FROM device_registry');
    return rows[0].count;
  },

  getActiveDeviceCount: async (tenantId?: string): Promise<number> => {
    if (tenantId) {
      const rows = await query(
        "SELECT COUNT(*) as count FROM device_registry WHERE status = 'active' AND tenant_id = ?",
        [tenantId],
      );
      return rows[0].count;
    }
    const rows = await query(
      "SELECT COUNT(*) as count FROM device_registry WHERE status = 'active'",
    );
    return rows[0].count;
  },

  mapDevice(row: any): T.DeviceRegistration {
    return {
      id: row.id,
      name: row.name,
      deviceType: row.device_type,
      publicKey: row.public_key,
      deviceSecret: row.device_secret,
      metadata: JSON.parse(row.metadata || '{}'),
      status: row.status,
      lastSeenAt: row.last_seen_at || null,
      lastIp: row.last_ip || null,
      firmwareVer: row.firmware_ver || null,
      appVersion: row.app_version || null,
      osVersion: row.os_version || null,
      capabilities: JSON.parse(row.capabilities || '[]'),
      approvedBy: row.approved_by || null,
      approvedAt: row.approved_at || null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ── Event Store ───────────────────────────────────────────────────────────

  async createEvent(dto: T.CreateEventDto): Promise<T.SyncEvent> {
    const id = uid('evt');
    const version = await this.getNextVersion(
      dto.aggregateType,
      dto.aggregateId,
    );
    await run(
      `INSERT INTO event_store (id, aggregate_type, aggregate_id, event_type, version,
        data, metadata, device_id, user_id, signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.aggregateType,
        dto.aggregateId,
        dto.eventType,
        version,
        JSON.stringify(dto.data),
        JSON.stringify(dto.metadata || {}),
        dto.deviceId || null,
        dto.userId || null,
        dto.signature || null,
      ],
    );
    return this.findEventById(id) as Promise<T.SyncEvent>;
  },

  async createEventsBulk(events: T.CreateEventDto[]): Promise<T.SyncEvent[]> {
    const results: T.SyncEvent[] = [];
    for (const evt of events) {
      results.push(await this.createEvent(evt));
    }
    return results;
  },

  async findEventById(id: string): Promise<T.SyncEvent | null> {
    const rows = await query('SELECT * FROM event_store WHERE id = ?', [id]);
    if (!rows.length) return null;
    return this.mapEvent(rows[0]);
  },

  async getEventsSince(
    eventId: string | null,
    limit = 1000,
    tenantId?: string,
  ): Promise<T.SyncEvent[]> {
    if (tenantId) {
      if (!eventId) {
        const rows = await query(
          'SELECT * FROM event_store WHERE tenant_id = ? ORDER BY created_at ASC, version ASC LIMIT ?',
          [tenantId, limit],
        );
        return rows.map((r: any) => this.mapEvent(r));
      }
      const rows = await query(
        `SELECT * FROM event_store WHERE tenant_id = ? AND id > (SELECT MAX(id) FROM event_store WHERE id = ? AND tenant_id = ?)
         ORDER BY created_at ASC, version ASC LIMIT ?`,
        [tenantId, eventId, tenantId, limit],
      );
      return rows.map((r: any) => this.mapEvent(r));
    }
    if (!eventId) {
      const rows = await query(
        'SELECT * FROM event_store ORDER BY created_at ASC, version ASC LIMIT ?',
        [limit],
      );
      return rows.map((r: any) => this.mapEvent(r));
    }
    const rows = await query(
      `SELECT * FROM event_store WHERE id > (SELECT MAX(id) FROM event_store WHERE id = ?)
       ORDER BY created_at ASC, version ASC LIMIT ?`,
      [eventId, limit],
    );
    return rows.map((r: any) => this.mapEvent(r));
  },

  async getEventsByAggregate(
    aggregateType: string,
    aggregateId: string,
  ): Promise<T.SyncEvent[]> {
    const rows = await query(
      `SELECT * FROM event_store WHERE aggregate_type = ? AND aggregate_id = ?
       ORDER BY version ASC`,
      [aggregateType, aggregateId],
    );
    return rows.map((r: any) => this.mapEvent(r));
  },

  async getEventsByDevice(
    deviceId: string,
    since?: string,
  ): Promise<T.SyncEvent[]> {
    let sql = 'SELECT * FROM event_store WHERE device_id = ?';
    const params: any[] = [deviceId];
    if (since) {
      sql += ' AND created_at > ?';
      params.push(since);
    }
    sql += ' ORDER BY created_at ASC';
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapEvent(r));
  },

  async getEventsByTenant(
    tenantId: string,
    sinceVersion?: number,
    limit = 1000,
  ): Promise<T.SyncEvent[]> {
    let sql = 'SELECT * FROM event_store WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (sinceVersion !== undefined && sinceVersion !== null) {
      sql += ' AND version > ?';
      params.push(sinceVersion);
    }
    sql += ' ORDER BY version ASC LIMIT ?';
    params.push(limit);
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapEvent(r));
  },

  async getNextVersion(
    aggregateType: string,
    aggregateId: string,
  ): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
       FROM event_store WHERE aggregate_type = ? AND aggregate_id = ?`,
      [aggregateType, aggregateId],
    );
    return rows[0].next_ver;
  },

  async getMaxVersion(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await query(
        'SELECT COALESCE(MAX(version), 0) AS max_ver FROM event_store WHERE tenant_id = ?',
        [tenantId],
      );
      return rows[0].max_ver;
    }
    const rows = await query(
      'SELECT COALESCE(MAX(version), 0) AS max_ver FROM event_store',
    );
    return rows[0].max_ver;
  },

  async getEventCount(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await query(
        'SELECT COUNT(*) as count FROM event_store WHERE tenant_id = ?',
        [tenantId],
      );
      return rows[0].count;
    }
    const rows = await query('SELECT COUNT(*) as count FROM event_store');
    return rows[0].count;
  },

  async getPendingEventCount(tenantId: string): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM event_store WHERE tenant_id = ? AND is_synced = 0",
      [tenantId],
    );
    return rows[0].count;
  },

  mapEvent(row: any): T.SyncEvent {
    return {
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      version: row.version,
      data: JSON.parse(row.data || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      deviceId: row.device_id || null,
      userId: row.user_id || null,
      serverVersion: row.server_version || null,
      signature: row.signature || null,
      isSynced: !!row.is_synced,
      createdAt: row.created_at,
    };
  },

  // ── Sync Checkpoints ──────────────────────────────────────────────────────

  async getCheckpoint(deviceId: string): Promise<T.SyncCheckpoint | null> {
    const rows = await query(
      'SELECT * FROM sync_checkpoints WHERE device_id = ?',
      [deviceId],
    );
    if (!rows.length) return null;
    return this.mapCheckpoint(rows[0]);
  },

  async upsertCheckpoint(
    deviceId: string,
    lastEventId: string,
    seq: number,
  ): Promise<void> {
    const existing = await this.getCheckpoint(deviceId);
    if (existing) {
      await run(
        `UPDATE sync_checkpoints SET last_event_id = ?, last_event_seq = ?,
         last_sync_at = ?, status = 'idle', events_pushed = events_pushed + 1
         WHERE device_id = ?`,
        [lastEventId, seq, now(), deviceId],
      );
    } else {
      const id = uid('chk');
      await run(
        `INSERT INTO sync_checkpoints (id, device_id, last_event_id, last_event_seq, last_sync_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, deviceId, lastEventId, seq, now()],
      );
    }
  },

  async updateCheckpointStatus(
    deviceId: string,
    status: T.SyncStatus,
    errorMessage?: string,
  ): Promise<void> {
    await run(
      `UPDATE sync_checkpoints SET status = ?, error_message = ?, last_sync_at = ?
       WHERE device_id = ?`,
      [status, errorMessage || null, now(), deviceId],
    );
  },

  async updateSyncCheckpoint(
    deviceId: string,
    fields: {
      lastEventId?: string;
      lastEventSeq?: number;
      lastSyncAt?: string;
      eventsPushed?: number;
      eventsPulled?: number;
      status?: T.SyncStatus;
      errorMessage?: string | null;
      deviceVersion?: number;
    },
  ): Promise<void> {
    const existing = await this.getCheckpoint(deviceId);
    if (!existing) {
      const id = uid('chk');
      await run(
        `INSERT INTO sync_checkpoints (id, device_id, last_event_id, last_event_seq,
          last_sync_at, events_pushed, events_pulled, status, error_message, device_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          deviceId,
          fields.lastEventId || null,
          fields.lastEventSeq || 0,
          fields.lastSyncAt || now(),
          fields.eventsPushed || 1,
          fields.eventsPulled || 0,
          fields.status || 'idle',
          fields.errorMessage ?? null,
          fields.deviceVersion || 1,
        ],
      );
      return;
    }
    const assignments: string[] = [];
    const params: any[] = [];
    if (fields.lastEventId !== undefined) {
      assignments.push('last_event_id = ?');
      params.push(fields.lastEventId);
    }
    if (fields.lastEventSeq !== undefined) {
      assignments.push('last_event_seq = ?');
      params.push(fields.lastEventSeq);
    }
    if (fields.lastSyncAt !== undefined) {
      assignments.push('last_sync_at = ?');
      params.push(fields.lastSyncAt);
    }
    if (fields.eventsPushed !== undefined) {
      assignments.push('events_pushed = events_pushed + ?');
      params.push(fields.eventsPushed);
    }
    if (fields.eventsPulled !== undefined) {
      assignments.push('events_pulled = events_pulled + ?');
      params.push(fields.eventsPulled);
    }
    if (fields.status !== undefined) {
      assignments.push('status = ?');
      params.push(fields.status);
    }
    if (fields.errorMessage !== undefined) {
      assignments.push('error_message = ?');
      params.push(fields.errorMessage);
    }
    if (fields.deviceVersion !== undefined) {
      assignments.push('device_version = ?');
      params.push(fields.deviceVersion);
    }
    if (assignments.length === 0) return;
    params.push(deviceId);
    await run(
      `UPDATE sync_checkpoints SET ${assignments.join(', ')}, updated_at = ? WHERE device_id = ?`,
      [...params, now()],
    );
  },

  mapCheckpoint(row: any): T.SyncCheckpoint {
    return {
      id: row.id,
      deviceId: row.device_id,
      lastEventId: row.last_event_id || null,
      lastEventSeq: row.last_event_seq || 0,
      lastSyncAt: row.last_sync_at || null,
      eventsPushed: row.events_pushed || 0,
      eventsPulled: row.events_pulled || 0,
      status: row.status || 'idle',
      errorMessage: row.error_message || null,
      deviceVersion: row.device_version || 1,
    };
  },

  // ── Sync Queue ────────────────────────────────────────────────────────────

  async enqueue(dto: {
    deviceId: string;
    eventId?: string;
    operation: T.QueueOperation;
    payload?: Record<string, any>;
  }): Promise<T.SyncQueueItem> {
    const id = uid('sq');
    await run(
      `INSERT INTO sync_queue (id, device_id, event_id, operation, payload, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.deviceId,
        dto.eventId || null,
        dto.operation,
        dto.payload ? JSON.stringify(dto.payload) : null,
        'pending',
      ],
    );
    return this.findQueueItem(id) as Promise<T.SyncQueueItem>;
  },

  async findQueueItem(id: string): Promise<T.SyncQueueItem | null> {
    const rows = await query('SELECT * FROM sync_queue WHERE id = ?', [id]);
    if (!rows.length) return null;
    return this.mapQueueItem(rows[0]);
  },

  async getPendingQueue(deviceId: string): Promise<T.SyncQueueItem[]> {
    const rows = await query(
      `SELECT * FROM sync_queue WHERE device_id = ? AND status IN ('pending', 'failed')
       AND retry_count < max_retries ORDER BY queued_at ASC`,
      [deviceId],
    );
    return rows.map((r: any) => this.mapQueueItem(r));
  },

  async getQueueDepth(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await query(
        "SELECT COUNT(*) as count FROM sync_queue sq JOIN device_registry dr ON sq.device_id = dr.id WHERE dr.tenant_id = ? AND sq.status IN ('pending', 'failed')",
        [tenantId],
      );
      return rows[0].count;
    }
    const rows = await query(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')",
    );
    return rows[0].count;
  },

  async updateQueueStatus(
    id: string,
    status: T.QueueItemStatus,
    errorMessage?: string,
  ): Promise<void> {
    if (status === 'failed') {
      await run(
        `UPDATE sync_queue SET status = ?, retry_count = retry_count + 1,
         error_message = ?, completed_at = ? WHERE id = ?`,
        [status, errorMessage || null, now(), id],
      );
    } else if (status === 'completed') {
      await run(
        `UPDATE sync_queue SET status = ?, completed_at = ? WHERE id = ?`,
        [status, now(), id],
      );
    } else {
      await run(
        `UPDATE sync_queue SET status = ?, error_message = ? WHERE id = ?`,
        [status, errorMessage || null, id],
      );
    }
  },

  mapQueueItem(row: any): T.SyncQueueItem {
    return {
      id: row.id,
      deviceId: row.device_id,
      eventId: row.event_id || null,
      operation: row.operation,
      payload: row.payload ? JSON.parse(row.payload) : null,
      status: row.status,
      retryCount: row.retry_count || 0,
      maxRetries: row.max_retries || 3,
      errorMessage: row.error_message || null,
      queuedAt: row.queued_at,
      completedAt: row.completed_at || null,
    };
  },

  // ── Conflict Log ──────────────────────────────────────────────────────────

  async logConflict(conflict: {
    aggregateType: string;
    aggregateId: string;
    conflictType: T.ConflictType;
    localVersion: number;
    remoteVersion: number;
    localData: Record<string, any>;
    remoteData: Record<string, any>;
    deviceId?: string;
  }): Promise<T.SyncConflict> {
    const id = uid('conf');
    await run(
      `INSERT INTO conflict_log (id, aggregate_type, aggregate_id, conflict_type,
        local_version, remote_version, local_data, remote_data, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        conflict.aggregateType,
        conflict.aggregateId,
        conflict.conflictType,
        conflict.localVersion,
        conflict.remoteVersion,
        JSON.stringify(conflict.localData),
        JSON.stringify(conflict.remoteData),
        conflict.deviceId || null,
      ],
    );
    return this.findConflict(id) as Promise<T.SyncConflict>;
  },

  async findConflict(id: string): Promise<T.SyncConflict | null> {
    const rows = await query('SELECT * FROM conflict_log WHERE id = ?', [id]);
    if (!rows.length) return null;
    return this.mapConflict(rows[0]);
  },

  async resolveConflict(
    id: string,
    resolution: T.ConflictResolution,
    resolvedData: Record<string, any>,
    resolvedBy: string,
  ): Promise<void> {
    await run(
      `UPDATE conflict_log SET resolution = ?, resolved_data = ?,
       resolved_by = ?, resolved_at = ? WHERE id = ?`,
      [resolution, JSON.stringify(resolvedData), resolvedBy, now(), id],
    );
  },

  async getUnresolvedConflicts(tenantId?: string): Promise<T.SyncConflict[]> {
    let sql =
      "SELECT * FROM conflict_log WHERE resolution = 'unresolved'";
    const params: any[] = [];
    if (tenantId) {
      sql +=
        ' AND aggregate_id IN (SELECT id FROM event_store WHERE tenant_id = ?)';
      params.push(tenantId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapConflict(r));
  },

  mapConflict(row: any): T.SyncConflict {
    return {
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      conflictType: row.conflict_type,
      localVersion: row.local_version,
      remoteVersion: row.remote_version,
      localData: JSON.parse(row.local_data || '{}'),
      remoteData: JSON.parse(row.remote_data || '{}'),
      resolvedData: row.resolved_data ? JSON.parse(row.resolved_data) : null,
      resolution: row.resolution || 'unresolved',
      deviceId: row.device_id || null,
      resolvedBy: row.resolved_by || null,
      resolvedAt: row.resolved_at || null,
      notes: row.notes || null,
      createdAt: row.created_at,
    };
  },

  // ── Sync Audit ────────────────────────────────────────────────────────────

  async logSyncAudit(entry: {
    deviceId: string;
    tenantId?: string;
    userId?: string;
    syncType: T.SyncType;
    direction: T.SyncDirection;
    eventsCount?: number;
    bytesTransferred?: number;
    durationMs?: number;
    status: T.SyncSessionStatus;
    errorMessage?: string;
    clientVersion?: number;
    serverVersion?: number;
  }): Promise<void> {
    const id = uid('sa');
    await run(
      `INSERT INTO sync_audit_log (id, device_id, tenant_id, user_id, sync_type, direction,
        events_count, bytes_transferred, duration_ms, status, error_message,
        client_version, server_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.deviceId,
        entry.tenantId || null,
        entry.userId || null,
        entry.syncType,
        entry.direction,
        entry.eventsCount || 0,
        entry.bytesTransferred || 0,
        entry.durationMs || 0,
        entry.status,
        entry.errorMessage || null,
        entry.clientVersion || 1,
        entry.serverVersion || 1,
      ],
    );
  },

  async getSyncHistory(
    deviceId: string,
    limit = 50,
  ): Promise<T.SyncAuditEntry[]> {
    const rows = await query(
      `SELECT * FROM sync_audit_log WHERE device_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [deviceId, limit],
    );
    return rows.map((r: any) => this.mapAuditEntry(r));
  },

  async getSyncAuditByTenant(
    tenantId: string,
    limit = 50,
  ): Promise<T.SyncAuditEntry[]> {
    const rows = await query(
      `SELECT * FROM sync_audit_log WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [tenantId, limit],
    );
    return rows.map((r: any) => this.mapAuditEntry(r));
  },

  async getAvgSyncDuration(tenantId: string): Promise<number> {
    const rows = await query(
      "SELECT AVG(duration_ms) AS avg_ms FROM sync_audit_log WHERE tenant_id = ? AND status = 'completed'",
      [tenantId],
    );
    return rows[0].avg_ms || 0;
  },

  async getSyncFrequency(tenantId: string): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) AS count FROM sync_audit_log WHERE tenant_id = ? AND status = 'completed' AND created_at > datetime('now', '-1 day')",
      [tenantId],
    );
    return rows[0].count || 0;
  },

  async getTotalStorageBytes(tenantId: string): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(LENGTH(data) + LENGTH(metadata)), 0) AS total
       FROM event_store WHERE tenant_id = ?`,
      [tenantId],
    );
    return rows[0].total || 0;
  },

  mapAuditEntry(row: any): T.SyncAuditEntry {
    return {
      id: row.id,
      deviceId: row.device_id,
      userId: row.user_id || null,
      syncType: row.sync_type,
      direction: row.direction,
      eventsCount: row.events_count || 0,
      bytesTransferred: row.bytes_transferred || 0,
      durationMs: row.duration_ms || 0,
      status: row.status,
      errorMessage: row.error_message || null,
      clientVersion: row.client_version || 1,
      serverVersion: row.server_version || 1,
      createdAt: row.created_at,
    };
  },

  // ── Snapshots ─────────────────────────────────────────────────────────────

  async createSnapshot(dto: {
    tenantId: string;
    label: string | null;
    state: Record<string, any>;
    eventVersion: number;
    eventCount: number;
    compressedSize: number | null;
    checksum: string | null;
    tags: string[];
    createdBy: string;
    ttlMs?: number;
  }): Promise<T.Snapshot> {
    const id = uid('snap');
    const expiresAt = dto.ttlMs
      ? new Date(Date.now() + dto.ttlMs).toISOString()
      : null;
    await run(
      `INSERT INTO sync_snapshots (id, tenant_id, label, state, event_version, event_count,
        compressed_size, checksum, tags, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.tenantId,
        dto.label,
        JSON.stringify(dto.state),
        dto.eventVersion,
        dto.eventCount,
        dto.compressedSize || null,
        dto.checksum || null,
        JSON.stringify(dto.tags || []),
        dto.createdBy,
        expiresAt,
      ],
    );
    return this.findSnapshotById(id) as Promise<T.Snapshot>;
  },

  async findSnapshotById(id: string): Promise<T.Snapshot | null> {
    const rows = await query('SELECT * FROM sync_snapshots WHERE id = ?', [id]);
    if (!rows.length) return null;
    return this.mapSnapshot(rows[0]);
  },

  async listSnapshots(
    tenantId: string,
    limit = 20,
  ): Promise<T.Snapshot[]> {
    const rows = await query(
      `SELECT * FROM sync_snapshots WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [tenantId, limit],
    );
    return rows.map((r: any) => this.mapSnapshot(r));
  },

  async getLatestSnapshot(
    tenantId: string,
  ): Promise<T.Snapshot | null> {
    const rows = await query(
      `SELECT * FROM sync_snapshots WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    );
    if (!rows.length) return null;
    return this.mapSnapshot(rows[0]);
  },

  async deleteSnapshot(id: string): Promise<void> {
    await run('DELETE FROM sync_snapshots WHERE id = ?', [id]);
  },

  async markSnapshotRestored(
    id: string,
  ): Promise<void> {
    await run(
      'UPDATE sync_snapshots SET restored_at = ? WHERE id = ?',
      [now(), id],
    );
  },

  async getSnapshotCount(tenantId: string): Promise<number> {
    const rows = await query(
      'SELECT COUNT(*) as count FROM sync_snapshots WHERE tenant_id = ?',
      [tenantId],
    );
    return rows[0].count;
  },

  mapSnapshot(row: any): T.Snapshot {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      label: row.label || null,
      state: JSON.parse(row.state || '{}'),
      eventVersion: row.event_version || 0,
      eventCount: row.event_count || 0,
      compressedSize: row.compressed_size || null,
      checksum: row.checksum || null,
      tags: JSON.parse(row.tags || '[]'),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at || null,
      restoredAt: row.restored_at || null,
    };
  },

  // ── Replay Sessions ───────────────────────────────────────────────────────

  async createReplaySession(dto: {
    tenantId: string;
    aggregateId: string | null;
    aggregateType: string | null;
    fromVersion: number;
    toVersion: number | null;
    createdBy: string;
  }): Promise<T.ReplaySession> {
    const id = uid('rply');
    await run(
      `INSERT INTO sync_replay_sessions (id, tenant_id, aggregate_id, aggregate_type,
        from_version, to_version, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        dto.tenantId,
        dto.aggregateId || null,
        dto.aggregateType || null,
        dto.fromVersion,
        dto.toVersion || null,
        dto.createdBy,
      ],
    );
    return this.findReplaySession(id) as Promise<T.ReplaySession>;
  },

  async findReplaySession(id: string): Promise<T.ReplaySession | null> {
    const rows = await query(
      'SELECT * FROM sync_replay_sessions WHERE id = ?',
      [id],
    );
    if (!rows.length) return null;
    return this.mapReplaySession(rows[0]);
  },

  async updateReplaySession(
    id: string,
    fields: {
      status?: T.ReplayStatus;
      eventsCount?: number;
      checksum?: string;
      integrity?: boolean;
      errorMessage?: string | null;
      completedAt?: string;
    },
  ): Promise<void> {
    const assignments: string[] = [];
    const params: any[] = [];
    if (fields.status !== undefined) {
      assignments.push('status = ?');
      params.push(fields.status);
    }
    if (fields.eventsCount !== undefined) {
      assignments.push('events_count = ?');
      params.push(fields.eventsCount);
    }
    if (fields.checksum !== undefined) {
      assignments.push('checksum = ?');
      params.push(fields.checksum);
    }
    if (fields.integrity !== undefined) {
      assignments.push('integrity = ?');
      params.push(fields.integrity ? 1 : 0);
    }
    if (fields.errorMessage !== undefined) {
      assignments.push('error_message = ?');
      params.push(fields.errorMessage);
    }
    if (fields.completedAt !== undefined) {
      assignments.push('completed_at = ?');
      params.push(fields.completedAt);
    }
    if (assignments.length === 0) return;
    params.push(id);
    await run(
      `UPDATE sync_replay_sessions SET ${assignments.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async listReplaySessions(
    tenantId: string,
    limit = 20,
  ): Promise<T.ReplaySession[]> {
    const rows = await query(
      `SELECT * FROM sync_replay_sessions WHERE tenant_id = ?
       ORDER BY started_at DESC LIMIT ?`,
      [tenantId, limit],
    );
    return rows.map((r: any) => this.mapReplaySession(r));
  },

  mapReplaySession(row: any): T.ReplaySession {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      aggregateId: row.aggregate_id || null,
      aggregateType: row.aggregate_type || null,
      fromVersion: row.from_version || 0,
      toVersion: row.to_version || null,
      eventsCount: row.events_count || 0,
      status: row.status || 'pending',
      checksum: row.checksum || null,
      integrity: row.integrity === null ? null : !!row.integrity,
      errorMessage: row.error_message || null,
      startedAt: row.started_at,
      completedAt: row.completed_at || null,
      createdBy: row.created_by,
    };
  },

  // ── Background Sync Tasks ─────────────────────────────────────────────────

  async createBackgroundSyncTask(dto: {
    tenantId: string;
    deviceId: string | null;
    syncType: T.SyncType;
    priority?: number;
    maxRetries?: number;
  }): Promise<T.BackgroundSyncTask> {
    const id = uid('bgst');
    await run(
      `INSERT INTO sync_background_tasks (id, tenant_id, device_id, sync_type, priority, status,
        max_retries)
       VALUES (?, ?, ?, ?, ?, 'queued', ?)`,
      [
        id,
        dto.tenantId,
        dto.deviceId || null,
        dto.syncType,
        dto.priority || 0,
        dto.maxRetries || 3,
      ],
    );
    return this.findBackgroundSyncTask(id) as Promise<T.BackgroundSyncTask>;
  },

  async findBackgroundSyncTask(
    id: string,
  ): Promise<T.BackgroundSyncTask | null> {
    const rows = await query(
      'SELECT * FROM sync_background_tasks WHERE id = ?',
      [id],
    );
    if (!rows.length) return null;
    return this.mapBackgroundSyncTask(rows[0]);
  },

  async getPendingSyncTasks(
    tenantId?: string,
    limit = 10,
  ): Promise<T.BackgroundSyncTask[]> {
    let sql =
      "SELECT * FROM sync_background_tasks WHERE status IN ('queued', 'failed') AND retry_count < max_retries";
    const params: any[] = [];
    if (tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    sql += ' ORDER BY priority DESC, scheduled_at ASC LIMIT ?';
    params.push(limit);
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapBackgroundSyncTask(r));
  },

  async updateBackgroundSyncTask(
    id: string,
    fields: {
      status?: T.BgSyncTaskStatus;
      errorMessage?: string | null;
      result?: Record<string, any> | null;
      startedAt?: string;
      completedAt?: string;
      retryCount?: number;
    },
  ): Promise<void> {
    const assignments: string[] = [];
    const params: any[] = [];
    if (fields.status !== undefined) {
      assignments.push('status = ?');
      params.push(fields.status);
    }
    if (fields.errorMessage !== undefined) {
      assignments.push('error_message = ?');
      params.push(fields.errorMessage);
    }
    if (fields.result !== undefined) {
      assignments.push('result = ?');
      params.push(JSON.stringify(fields.result));
    }
    if (fields.startedAt !== undefined) {
      assignments.push('started_at = ?');
      params.push(fields.startedAt);
    }
    if (fields.completedAt !== undefined) {
      assignments.push('completed_at = ?');
      params.push(fields.completedAt);
    }
    if (fields.retryCount !== undefined) {
      assignments.push('retry_count = ?');
      params.push(fields.retryCount);
    }
    if (assignments.length === 0) return;
    params.push(id);
    await run(
      `UPDATE sync_background_tasks SET ${assignments.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async getActiveBgTaskCount(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await query(
        "SELECT COUNT(*) as count FROM sync_background_tasks WHERE tenant_id = ? AND status IN ('queued', 'processing')",
        [tenantId],
      );
      return rows[0].count;
    }
    const rows = await query(
      "SELECT COUNT(*) as count FROM sync_background_tasks WHERE status IN ('queued', 'processing')",
    );
    return rows[0].count;
  },

  mapBackgroundSyncTask(row: any): T.BackgroundSyncTask {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      deviceId: row.device_id || null,
      syncType: row.sync_type,
      priority: row.priority || 0,
      status: row.status || 'queued',
      errorMessage: row.error_message || null,
      result: row.result ? JSON.parse(row.result) : null,
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at || null,
      completedAt: row.completed_at || null,
      retryCount: row.retry_count || 0,
      maxRetries: row.max_retries || 3,
    };
  },

  // ── Health ────────────────────────────────────────────────────────────────

  async getSyncHealth(): Promise<{
    deviceCount: number;
    activeDevices: number;
    eventCount: number;
    pendingQueue: number;
    unresolvedConflicts: number;
    lastSyncAt: string | null;
  }> {
    const deviceCount = await this.getDeviceCount();
    const activeDevices = await this.getActiveDeviceCount();
    const eventCount = await this.getEventCount();
    const pendingRows = await query(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')",
    );
    const conflicts = await this.getUnresolvedConflicts();
    const lastSync = await query(
      'SELECT MAX(created_at) as last FROM sync_audit_log WHERE status = ?',
      ['completed'],
    );
    return {
      deviceCount,
      activeDevices,
      eventCount,
      pendingQueue: pendingRows[0].count,
      unresolvedConflicts: conflicts.length,
      lastSyncAt: lastSync[0].last || null,
    };
  },

  async getErrorRate(tenantId: string): Promise<number> {
    const total = await query(
      'SELECT COUNT(*) as count FROM sync_audit_log WHERE tenant_id = ?',
      [tenantId],
    );
    if (!total[0].count) return 0;
    const failed = await query(
      "SELECT COUNT(*) as count FROM sync_audit_log WHERE tenant_id = ? AND status = 'failed'",
      [tenantId],
    );
    return failed[0].count / total[0].count;
  },
};
