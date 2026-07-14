export type DeviceType =
  | 'owner_laptop'
  | 'restaurant_pos'
  | 'bar_pos'
  | 'kitchen_display'
  | 'reception'
  | 'warehouse'
  | 'manager_tablet'
  | 'android_phone'
  | 'windows_desktop'
  | 'web_client';

export const VALID_DEVICE_TYPES: readonly DeviceType[] = [
  'owner_laptop',
  'restaurant_pos',
  'bar_pos',
  'kitchen_display',
  'reception',
  'warehouse',
  'manager_tablet',
  'android_phone',
  'windows_desktop',
  'web_client',
];

export type DeviceStatus =
  'pending' | 'active' | 'disabled' | 'revoked' | 'blocked';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'recovering';

export type QueueOperation = 'push' | 'pull' | 'replay' | 'conflict_resolve';

export type QueueItemStatus =
  'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ConflictType =
  | 'lww'
  | 'merge'
  | 'manual'
  | 'business_rule'
  | 'priority'
  | 'timestamp'
  | 'version';

export type ConflictResolution =
  | 'unresolved'
  | 'local_wins'
  | 'remote_wins'
  | 'merge'
  | 'manual'
  | 'cancelled';

export type SyncType =
  'full' | 'incremental' | 'delta' | 'replay' | 'event_push' | 'event_pull';

export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export type SyncSessionStatus =
  'started' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface DeviceRegistration {
  id: string;
  name: string;
  deviceType: DeviceType;
  publicKey: string;
  deviceSecret: string;
  metadata: Record<string, any>;
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastIp: string | null;
  firmwareVer: string | null;
  appVersion: string | null;
  osVersion: string | null;
  capabilities: string[];
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceDto {
  name: string;
  deviceType: DeviceType;
  publicKey: string;
  firmwareVer?: string;
  appVersion?: string;
  osVersion?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface ApproveDeviceDto {
  deviceId: string;
  approvedBy: string;
  status: DeviceStatus;
}

export interface SyncEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  version: number;
  data: Record<string, any>;
  metadata: Record<string, any>;
  deviceId: string | null;
  userId: string | null;
  serverVersion: number | null;
  signature: string | null;
  isSynced: boolean;
  createdAt: string;
}

export interface CreateEventDto {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  deviceId?: string;
  userId?: string;
  signature?: string;
}

export interface SyncCheckpoint {
  id: string;
  deviceId: string;
  lastEventId: string | null;
  lastEventSeq: number;
  lastSyncAt: string | null;
  eventsPushed: number;
  eventsPulled: number;
  status: SyncStatus;
  errorMessage: string | null;
  deviceVersion: number;
}

export interface SyncQueueItem {
  id: string;
  deviceId: string;
  eventId: string | null;
  operation: QueueOperation;
  payload: Record<string, any> | null;
  status: QueueItemStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  queuedAt: string;
  completedAt: string | null;
}

export interface SyncConflict {
  id: string;
  aggregateType: string;
  aggregateId: string;
  conflictType: ConflictType;
  localVersion: number;
  remoteVersion: number;
  localData: Record<string, any>;
  remoteData: Record<string, any>;
  resolvedData: Record<string, any> | null;
  resolution: ConflictResolution;
  deviceId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SyncAuditEntry {
  id: string;
  deviceId: string;
  userId: string | null;
  syncType: SyncType;
  direction: SyncDirection;
  eventsCount: number;
  bytesTransferred: number;
  durationMs: number;
  status: SyncSessionStatus;
  errorMessage: string | null;
  clientVersion: number;
  serverVersion: number;
  createdAt: string;
}

export interface SyncSessionDto {
  deviceId: string;
  syncType: SyncType;
  direction: SyncDirection;
  events?: SyncEvent[];
}

export interface SyncPushRequest {
  deviceId: string;
  deviceToken: string;
  events: CreateEventDto[];
  lastCheckpoint?: string;
}

export interface SyncPullRequest {
  deviceId: string;
  deviceToken: string;
  checkpoint: string;
  limit?: number;
}

export interface SyncPushResponse {
  accepted: number;
  rejected: number;
  errors: { eventType: string; message: string }[];
  serverCheckpoint: string;
  conflicts: SyncConflict[];
}

export interface SyncPullResponse {
  events: SyncEvent[];
  checkpoint: string;
  hasMore: boolean;
  serverVersion: number;
}

export type AggregateType =
  | 'sale'
  | 'room'
  | 'stay'
  | 'inventory_item'
  | 'stock_move'
  | 'purchase_order'
  | 'liquor'
  | 'journal_entry'
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'loan'
  | 'advance'
  | 'customer'
  | 'credit'
  | 'bank_move'
  | 'setting'
  | 'user'
  | 'device';

export const KNOWN_AGGREGATES: readonly AggregateType[] = [
  'sale',
  'room',
  'stay',
  'inventory_item',
  'stock_move',
  'purchase_order',
  'liquor',
  'journal_entry',
  'employee',
  'attendance',
  'leave',
  'payroll',
  'loan',
  'advance',
  'customer',
  'credit',
  'bank_move',
  'setting',
  'user',
  'device',
];

export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: string;
  status: DeviceStatus;
  batteryLevel?: number;
  storageAvailable?: number;
  pendingEvents?: number;
  lastSyncAt?: string;
  appVersion?: string;
  osVersion?: string;
}
