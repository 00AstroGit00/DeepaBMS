import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { query } from '../src/db';
import { PlatformRepository as PR } from '../src/domains/platform/platform.repository';
import * as T from '../src/domains/platform/platform.types';
import {
  HealthService,
  MonitoringService,
  BackupService,
  DeploymentService,
  OpsDashboardService,
  DisasterRecoveryService,
} from '../src/domains/platform/platform.service';
import * as fs from 'fs';
import * as os from 'os';
import express from 'express';
import request from 'supertest';
import platformRouter from '../src/domains/platform/platform.routes';

// ═════════════════════════════════════════════════════════════════════════
// MODULE MOCKS
// ═════════════════════════════════════════════════════════════════════════

jest.mock('../src/db', () => ({
  query: jest.fn(),
  run: jest.fn(),
  db: { get: jest.fn() },
}));

jest.mock('../src/domains/platform/platform.repository', () => ({
  PlatformRepository: {
    testConnection: jest.fn(),
    recordHealthCheck: jest.fn(),
    getDatabaseSize: jest.fn(),
    getTableCount: jest.fn(),
    getLatestHealthStatus: jest.fn(),
    getRecentHealthChecks: jest.fn(),
    createAlert: jest.fn(),
    findAlertById: jest.fn(),
    findAllAlerts: jest.fn(),
    updateAlertStatus: jest.fn(),
    getOpenAlertCount: jest.fn(),
    getCriticalAlertCount: jest.fn(),
    createBackupRecord: jest.fn(),
    findBackupById: jest.fn(),
    findAllBackups: jest.fn(),
    getLatestBackup: jest.fn(),
    updateBackupStatus: jest.fn(),
    getTotalBackupSize: jest.fn(),
    getBackupCount: jest.fn(),
    createDeployment: jest.fn(),
    findDeploymentById: jest.fn(),
    findAllDeployments: jest.fn(),
    updateDeploymentStatus: jest.fn(),
    getMetrics: jest.fn(),
    getRecentRequestMetrics: jest.fn(),
    getSlowQueries: jest.fn(),
    getOpsDashboard: jest.fn(),
  },
}));

jest.mock('fs', () => {
  const mockWriteStream = {
    on: jest.fn((event: string, handler: any) => {
      if (event === 'finish') handler();
      return mockWriteStream;
    }),
    write: jest.fn(),
    end: jest.fn(),
  };
  return {
    existsSync: jest.fn().mockReturnValue(true),
    statSync: jest.fn().mockReturnValue({ size: 1048576 }),
    createReadStream: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnValue(mockWriteStream),
      on: jest.fn().mockReturnThis(),
    }),
    createWriteStream: jest.fn().mockReturnValue(mockWriteStream),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-data')),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

jest.mock('os', () => ({
  loadavg: jest.fn().mockReturnValue([0.5, 0.3, 0.1]),
}));

jest.mock('crypto', () => {
  const mockHash = {
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('a'.repeat(64)),
  };
  return {
    createHash: jest.fn().mockReturnValue(mockHash),
    createCipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(Buffer.from('enc')),
      final: jest.fn().mockReturnValue(Buffer.alloc(0)),
    }),
    scryptSync: jest.fn().mockReturnValue(Buffer.alloc(32)),
    randomBytes: jest.fn().mockReturnValue(Buffer.alloc(16)),
  };
});

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/')),
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate: jest.fn((_req: any, _res: any, next: any) => next()),
  authorize: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

jest.mock('../src/middleware/monitoring', () => ({
  getMetricsMiddleware: jest.fn((_req: any, res: any) => res.json({})),
}));

// ═════════════════════════════════════════════════════════════════════════
// TEST APP
// ═════════════════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());
app.use('/api/platform', platformRouter);

// ═════════════════════════════════════════════════════════════════════════
// SETUP
// ═════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
  (PR.testConnection as jest.Mock).mockResolvedValue(true);
  (PR.recordHealthCheck as jest.Mock).mockResolvedValue(undefined);
  (PR.getDatabaseSize as jest.Mock).mockResolvedValue(2048 * 1024);
  (PR.getTableCount as jest.Mock).mockResolvedValue(42);
});

// ═════════════════════════════════════════════════════════════════════════
// 1. HEALTH SERVICE — runAllChecks
// ═════════════════════════════════════════════════════════════════════════

describe('HealthService — runAllChecks', () => {
  test('returns pass when all checks pass', async () => {
    (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.3, 0.1]);
    const report = await HealthService.runAllChecks();
    expect(report.status).toBe('pass');
    expect(report.checks).toHaveLength(5);
    expect(report.checks.every((c) => c.status === 'pass')).toBe(true);
    expect(report.version).toBeTruthy();
    expect(report.timestamp).toBeTruthy();
    expect(typeof report.uptime).toBe('number');
  });

  test('returns warn when at least one check warns', async () => {
    (os.loadavg as jest.Mock).mockReturnValue([2.5, 1.8, 1.2]);
    const report = await HealthService.runAllChecks();
    expect(report.status).toBe('warn');
    const cpuCheck = report.checks.find((c) => c.component === 'cpu');
    expect(cpuCheck?.status).toBe('warn');
  });

  test('returns fail when database check fails', async () => {
    (PR.testConnection as jest.Mock).mockRejectedValue(
      new Error('DB unreachable'),
    );
    const report = await HealthService.runAllChecks();
    expect(report.status).toBe('fail');
    const dbCheck = report.checks.find((c) => c.component === 'database');
    expect(dbCheck?.status).toBe('fail');
  });

  test('records each health check via repository', async () => {
    await HealthService.runAllChecks();
    expect(PR.recordHealthCheck as jest.Mock).toHaveBeenCalledTimes(5);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. HEALTH SERVICE — Individual Checks
// ═════════════════════════════════════════════════════════════════════════

describe('HealthService — Individual Checks', () => {
  test('checkDatabase returns pass on successful connection', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    const result = await HealthService.checkDatabase();
    expect(result.status).toBe('pass');
    expect(result.component).toBe('database');
    expect(result.message).toContain('OK');
  });

  test('checkDatabase returns fail on connection error', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(false);
    const result = await HealthService.checkDatabase();
    expect(result.status).toBe('fail');
  });

  test('checkDatabase returns fail on thrown exception', async () => {
    (PR.testConnection as jest.Mock).mockRejectedValue(
      new Error('Connection refused'),
    );
    const result = await HealthService.checkDatabase();
    expect(result.status).toBe('fail');
    expect(result.message).toBe('Connection refused');
  });

  test('checkStorage returns pass for small database', async () => {
    (PR.getDatabaseSize as jest.Mock).mockResolvedValue(1024 * 1024);
    const result = await HealthService.checkStorage();
    expect(result.status).toBe('pass');
    expect(result.component).toBe('storage');
  });

  test('checkMemory returns pass for normal heap usage', async () => {
    const result = await HealthService.checkMemory();
    expect(['pass', 'warn']).toContain(result.status);
    expect(result.component).toBe('memory');
    expect(result.details).toHaveProperty('heapUsed');
    expect(result.details).toHaveProperty('heapTotal');
  });

  test('checkCpu returns pass for low load', async () => {
    (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.3, 0.1]);
    const result = await HealthService.checkCpu();
    expect(result.status).toBe('pass');
    expect(result.component).toBe('cpu');
  });

  test('checkCpu returns warn for moderate load', async () => {
    (os.loadavg as jest.Mock).mockReturnValue([2.5, 1.8, 1.2]);
    const result = await HealthService.checkCpu();
    expect(result.status).toBe('warn');
  });

  test('checkCpu returns fail for high load', async () => {
    (os.loadavg as jest.Mock).mockReturnValue([5.0, 4.0, 3.0]);
    const result = await HealthService.checkCpu();
    expect(result.status).toBe('fail');
  });

  test('checkUptime always returns pass', async () => {
    const result = await HealthService.checkUptime();
    expect(result.status).toBe('pass');
    expect(result.component).toBe('uptime');
    expect(result.details).toHaveProperty('uptimeSeconds');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. HEALTH SERVICE — Workflow & Sync
// ═════════════════════════════════════════════════════════════════════════

describe('HealthService — Workflow & Sync Checks', () => {
  test('checkWorkflow returns pass when no failed instances', async () => {
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('workflow_instances') && sql.includes('pending'))
        return [{ count: 3 }];
      if (sql.includes('status')) return [{ count: 0 }];
      return [];
    });
    const result = await HealthService.checkWorkflow();
    expect(result.status).toBe('pass');
    expect(result.component).toBe('workflow');
    expect(result.message).toContain('3 active');
  });

  test('checkWorkflow returns warn when failed instances exist', async () => {
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('pending')) return [{ count: 5 }];
      if (sql.includes("'failed'")) return [{ count: 2 }];
      return [];
    });
    const result = await HealthService.checkWorkflow();
    expect(result.status).toBe('warn');
    expect(result.message).toContain('2 failed');
  });

  test('checkWorkflow handles query error gracefully', async () => {
    (query as jest.Mock).mockRejectedValue(new Error('Table not found'));
    const result = await HealthService.checkWorkflow();
    expect(result.status).toBe('warn');
    expect(result.message).toBe('Table not found');
  });

  test('checkSync returns pass for healthy sync', async () => {
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('device_registry')) return [{ count: 10 }];
      if (sql.includes('sync_queue')) return [{ count: 5 }];
      if (sql.includes('conflict_log')) return [{ count: 0 }];
      return [];
    });
    const result = await HealthService.checkSync();
    expect(result.status).toBe('pass');
    expect(result.message).toContain('10 devices');
  });

  test('checkSync returns warn when queue exceeds 100 items', async () => {
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('device_registry')) return [{ count: 10 }];
      if (sql.includes('sync_queue')) return [{ count: 150 }];
      if (sql.includes('conflict_log')) return [{ count: 0 }];
      return [];
    });
    const result = await HealthService.checkSync();
    expect(result.status).toBe('warn');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. MONITORING SERVICE — Alerts
// ═════════════════════════════════════════════════════════════════════════

describe('MonitoringService — Alerts', () => {
  const mockAlert: T.Alert = {
    id: 'alert-001',
    severity: 'high',
    category: 'system',
    title: 'Disk space low',
    message: 'Less than 10% free',
    source: 'monitor',
    status: 'open',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    metadata: { threshold: 10 },
    createdAt: '2026-07-14T10:00:00.000Z',
  };

  test('getAlerts returns paginated alerts', async () => {
    (PR.findAllAlerts as jest.Mock).mockResolvedValue({
      data: [mockAlert],
      total: 1,
      offset: 0,
      limit: 50,
    });
    const result = await MonitoringService.getAlerts();
    expect(result.total).toBe(1);
    expect(result.data[0].title).toBe('Disk space low');
  });

  test('getAlerts filters by status and severity', async () => {
    (PR.findAllAlerts as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      offset: 0,
      limit: 50,
    });
    const result = await MonitoringService.getAlerts({
      status: 'open',
      severity: 'critical',
    });
    expect(result.total).toBe(0);
    expect(PR.findAllAlerts).toHaveBeenCalledWith({
      status: 'open',
      severity: 'critical',
    });
  });

  test('getAlerts returns empty result when no matches', async () => {
    (PR.findAllAlerts as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      offset: 0,
      limit: 50,
    });
    const result = await MonitoringService.getAlerts();
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  test('getAlert returns alert by id', async () => {
    (PR.findAlertById as jest.Mock).mockResolvedValue(mockAlert);
    const result = await MonitoringService.getAlert('alert-001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('alert-001');
  });

  test('getAlert returns null when alert not found', async () => {
    (PR.findAlertById as jest.Mock).mockResolvedValue(null);
    const result = await MonitoringService.getAlert('nonexistent');
    expect(result).toBeNull();
  });

  test('createAlert creates and returns new alert', async () => {
    (PR.createAlert as jest.Mock).mockResolvedValue(mockAlert);
    const dto: T.CreateAlertDto = {
      severity: 'high',
      category: 'system',
      title: 'Disk space low',
    };
    const result = await MonitoringService.createAlert(dto);
    expect(result.id).toBe('alert-001');
    expect(PR.createAlert).toHaveBeenCalledWith(dto);
  });

  test('acknowledgeAlert updates alert status to acknowledged', async () => {
    (PR.updateAlertStatus as jest.Mock).mockResolvedValue(undefined);
    await MonitoringService.acknowledgeAlert('alert-001', 'user-1');
    expect(PR.updateAlertStatus).toHaveBeenCalledWith(
      'alert-001',
      'acknowledged',
      'user-1',
    );
  });

  test('resolveAlert updates alert status to resolved', async () => {
    (PR.updateAlertStatus as jest.Mock).mockResolvedValue(undefined);
    await MonitoringService.resolveAlert('alert-001', 'user-1');
    expect(PR.updateAlertStatus).toHaveBeenCalledWith(
      'alert-001',
      'resolved',
      'user-1',
    );
  });

  test('dismissAlert updates alert status to dismissed', async () => {
    (PR.updateAlertStatus as jest.Mock).mockResolvedValue(undefined);
    await MonitoringService.dismissAlert('alert-001', 'user-1');
    expect(PR.updateAlertStatus).toHaveBeenCalledWith(
      'alert-001',
      'dismissed',
      'user-1',
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 5. MONITORING SERVICE — Metrics & Queries
// ═════════════════════════════════════════════════════════════════════════

describe('MonitoringService — Metrics & Queries', () => {
  const mockMetric: T.MonitoringMetric = {
    id: 'm-001',
    metricName: 'api_requests_total',
    metricValue: 1500,
    metricUnit: 'count',
    labels: { method: 'GET' },
    recordedAt: '2026-07-14T10:00:00.000Z',
  };

  const mockRequestMetric: T.RequestMetric = {
    id: 'rm-001',
    method: 'GET',
    path: '/api/health',
    statusCode: 200,
    durationMs: 42,
    requestId: 'req-001',
    userId: 'u-001',
    userRole: 'owner',
    recordedAt: '2026-07-14T10:00:00.000Z',
  };

  const mockSlowQuery: T.SlowQueryEntry = {
    id: 'sq-001',
    queryText: 'SELECT * FROM large_table WHERE ...',
    durationMs: 5200,
    params: null,
    source: 'reports',
    requestId: 'req-002',
    recordedAt: '2026-07-14T10:00:00.000Z',
  };

  test('getMetrics returns all metrics', async () => {
    (PR.getMetrics as jest.Mock).mockResolvedValue([mockMetric]);
    const result = await MonitoringService.getMetrics();
    expect(result).toHaveLength(1);
    expect(result[0].metricName).toBe('api_requests_total');
  });

  test('getMetrics filters by name and since', async () => {
    (PR.getMetrics as jest.Mock).mockResolvedValue([mockMetric]);
    const result = await MonitoringService.getMetrics(
      'api_requests_total',
      '2026-07-01T00:00:00.000Z',
      50,
    );
    expect(result).toHaveLength(1);
    expect(PR.getMetrics).toHaveBeenCalledWith(
      'api_requests_total',
      '2026-07-01T00:00:00.000Z',
      50,
    );
  });

  test('getMetrics returns empty array when none exist', async () => {
    (PR.getMetrics as jest.Mock).mockResolvedValue([]);
    const result = await MonitoringService.getMetrics();
    expect(result).toHaveLength(0);
  });

  test('getRecentRequestMetrics returns request metrics', async () => {
    (PR.getRecentRequestMetrics as jest.Mock).mockResolvedValue([
      mockRequestMetric,
    ]);
    const result = await MonitoringService.getRecentRequestMetrics(10);
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('GET');
  });

  test('getSlowQueries returns slow query entries', async () => {
    (PR.getSlowQueries as jest.Mock).mockResolvedValue([mockSlowQuery]);
    const result = await MonitoringService.getSlowQueries(25);
    expect(result).toHaveLength(1);
    expect(result[0].durationMs).toBe(5200);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 6. BACKUP SERVICE — createBackup
// ═════════════════════════════════════════════════════════════════════════

describe('BackupService — createBackup', () => {
  const mockBackupRecord: T.BackupRecord = {
    id: 'bkp-001',
    type: 'full',
    status: 'verified',
    filePath: '/backups/deepa-bms-2026-07-14.db',
    fileSize: 2097152,
    checksum: null,
    encrypted: false,
    retentionDays: 30,
    startedAt: '2026-07-14T10:00:00.000Z',
    completedAt: '2026-07-14T10:01:00.000Z',
    verifiedAt: '2026-07-14T10:02:00.000Z',
    errorMessage: null,
    metadata: {},
    createdBy: 'system',
  };

  const rawRecord = { ...mockBackupRecord, status: 'running' as const };

  test('creates a non-encrypted backup successfully', async () => {
    (PR.createBackupRecord as jest.Mock).mockResolvedValue(rawRecord);
    (PR.findBackupById as jest.Mock)
      .mockResolvedValueOnce(rawRecord)
      .mockResolvedValueOnce(mockBackupRecord);
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);

    const dto: T.CreateBackupDto = {
      type: 'full',
      filePath: '/backups/test.db',
      encrypted: false,
    };
    const result = await BackupService.createBackup(dto);

    expect(result.status).toBe('verified');
    expect(PR.createBackupRecord).toHaveBeenCalledWith(dto);
    expect(PR.updateBackupStatus).toHaveBeenCalled();
  });

  test('creates an encrypted backup successfully', async () => {
    (PR.createBackupRecord as jest.Mock).mockResolvedValue(rawRecord);
    (PR.findBackupById as jest.Mock)
      .mockResolvedValueOnce(rawRecord)
      .mockResolvedValueOnce(mockBackupRecord);
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);

    const dto: T.CreateBackupDto = {
      type: 'full',
      filePath: '/backups/encrypted.db',
      encrypted: true,
    };
    const result = await BackupService.createBackup(dto);

    expect(result.status).toBe('verified');
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('marks backup as failed on file system error', async () => {
    (PR.createBackupRecord as jest.Mock).mockResolvedValue(rawRecord);
    (PR.findBackupById as jest.Mock).mockResolvedValue(rawRecord);
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);
    (fs.createReadStream as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });

    await expect(
      BackupService.createBackup({
        type: 'full',
        filePath: '/invalid/path.db',
      }),
    ).rejects.toThrow();
    expect(PR.updateBackupStatus).toHaveBeenCalledWith(
      expect.any(String),
      'failed',
      expect.any(String),
    );
  });

  test('handles WAL backup type without verification', async () => {
    const walRecord = { ...rawRecord };
    (PR.createBackupRecord as jest.Mock).mockResolvedValue(walRecord);
    (PR.findBackupById as jest.Mock)
      .mockResolvedValueOnce(walRecord)
      .mockResolvedValueOnce(mockBackupRecord);
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);

    const dto: T.CreateBackupDto = {
      type: 'wal',
      filePath: '/backups/wal.db',
      encrypted: false,
    };
    const result = await BackupService.createBackup(dto);

    expect(result.status).toBe('verified');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 7. BACKUP SERVICE — Queries
// ═════════════════════════════════════════════════════════════════════════

describe('BackupService — Queries', () => {
  const mockBackup: T.BackupRecord = {
    id: 'bkp-001',
    type: 'full',
    status: 'verified',
    filePath: '/backups/test.db',
    fileSize: 1048576,
    checksum: 'abc123',
    encrypted: false,
    retentionDays: 30,
    startedAt: '2026-07-14T10:00:00.000Z',
    completedAt: '2026-07-14T10:01:00.000Z',
    verifiedAt: '2026-07-14T10:02:00.000Z',
    errorMessage: null,
    metadata: {},
    createdBy: 'system',
  };

  test('getBackups returns paginated backups', async () => {
    (PR.findAllBackups as jest.Mock).mockResolvedValue({
      data: [mockBackup],
      total: 1,
      offset: 0,
      limit: 50,
    });
    const result = await BackupService.getBackups();
    expect(result.total).toBe(1);
    expect(result.data[0].type).toBe('full');
  });

  test('getBackups filters by type and status', async () => {
    (PR.findAllBackups as jest.Mock).mockResolvedValue({
      data: [mockBackup],
      total: 1,
      offset: 0,
      limit: 10,
    });
    const result = await BackupService.getBackups({
      type: 'full',
      status: 'verified',
      offset: 0,
      limit: 10,
    });
    expect(result.data).toHaveLength(1);
    expect(PR.findAllBackups).toHaveBeenCalledWith({
      type: 'full',
      status: 'verified',
      offset: 0,
      limit: 10,
    });
  });

  test('getBackups returns empty when no backups exist', async () => {
    (PR.findAllBackups as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      offset: 0,
      limit: 50,
    });
    const result = await BackupService.getBackups();
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  test('getBackup returns backup by id', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(mockBackup);
    const result = await BackupService.getBackup('bkp-001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('bkp-001');
  });

  test('getBackup returns null when not found', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(null);
    const result = await BackupService.getBackup('nonexistent');
    expect(result).toBeNull();
  });

  test('getLastBackup returns latest backup', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue(mockBackup);
    const result = await BackupService.getLastBackup();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('bkp-001');
  });

  test('getLastBackup returns null when no backups exist', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue(null);
    const result = await BackupService.getLastBackup('full');
    expect(result).toBeNull();
    expect(PR.getLatestBackup).toHaveBeenCalledWith('full');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 8. BACKUP SERVICE — verify, schedule, cleanup
// ═════════════════════════════════════════════════════════════════════════

describe('BackupService — verify, schedule & cleanup', () => {
  const mockBackup: T.BackupRecord = {
    id: 'bkp-001',
    type: 'full',
    status: 'completed',
    filePath: '/backups/test.db',
    fileSize: 1048576,
    checksum: 'a'.repeat(64),
    encrypted: false,
    retentionDays: 30,
    startedAt: '2026-07-14T10:00:00.000Z',
    completedAt: '2026-07-14T10:01:00.000Z',
    verifiedAt: null,
    errorMessage: null,
    metadata: {},
    createdBy: 'system',
  };

  test('verifyBackup returns true for valid backup', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(mockBackup);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1048576 });
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);

    const result = await BackupService.verifyBackup('bkp-001');
    expect(result).toBe(true);
    expect(PR.updateBackupStatus).toHaveBeenCalledWith(
      'bkp-001',
      'verified',
      undefined,
      1048576,
    );
  });

  test('verifyBackup returns false when backup not found', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(null);
    await expect(BackupService.verifyBackup('nonexistent')).rejects.toThrow(
      'Backup not found',
    );
  });

  test('verifyBackup returns false when file is missing', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(mockBackup);
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const result = await BackupService.verifyBackup('bkp-001');
    expect(result).toBe(false);
    expect(PR.updateBackupStatus).toHaveBeenCalledWith(
      'bkp-001',
      'failed',
      'Backup file not found',
    );
  });

  test('verifyBackup detects checksum mismatch', async () => {
    const badBackup = { ...mockBackup, checksum: 'b'.repeat(64) };
    (PR.findBackupById as jest.Mock).mockResolvedValue(badBackup);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const result = await BackupService.verifyBackup('bkp-001');
    expect(result).toBe(false);
  });

  test('getBackupScheduleConfig returns default configuration', async () => {
    const config = await BackupService.getBackupScheduleConfig();
    expect(config.fullBackupCron).toBe(T.DEFAULT_BACKUP_CONFIG.fullBackupCron);
    expect(config.retentionDays).toBe(T.DEFAULT_BACKUP_CONFIG.retentionDays);
    expect(config.backupDir).toBe(T.DEFAULT_BACKUP_CONFIG.backupDir);
  });

  test('cleanupOldBackups removes expired backups', async () => {
    const expiredBackup = {
      id: 'bkp-old',
      file_path: '/backups/old.db',
      file_path_enc: '/backups/old.db.enc',
    };
    (query as jest.Mock).mockResolvedValue([expiredBackup]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const result = await BackupService.cleanupOldBackups();
    expect(result).toBe(1);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('cleanupOldBackups returns 0 when no expired backups', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result = await BackupService.cleanupOldBackups();
    expect(result).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 9. DEPLOYMENT SERVICE
// ═════════════════════════════════════════════════════════════════════════

describe('DeploymentService', () => {
  const mockPending: T.DeploymentRecord = {
    id: 'dep-001',
    version: '1.2.3',
    environment: 'production',
    status: 'pending',
    commitHash: null,
    branch: null,
    artifacts: [],
    deployedBy: 'devops-bot',
    rollbackVersion: null,
    errorMessage: null,
    startedAt: '2026-07-14T10:00:00.000Z',
    completedAt: null,
    durationSeconds: 0,
  };

  const mockRunning: T.DeploymentRecord = {
    ...mockPending,
    status: 'running',
  };

  test('createDeployment creates with running status', async () => {
    (PR.createDeployment as jest.Mock).mockResolvedValue(mockPending);
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    (PR.findDeploymentById as jest.Mock).mockResolvedValue(mockRunning);

    const result = await DeploymentService.createDeployment(
      '1.2.3',
      'production',
      'devops-bot',
    );
    expect(result.status).toBe('running');
    expect(PR.createDeployment).toHaveBeenCalledWith(
      '1.2.3',
      'production',
      'devops-bot',
    );
    expect(PR.updateDeploymentStatus).toHaveBeenCalledWith(
      'dep-001',
      'running',
    );
  });

  test('completeDeployment marks deployment as completed', async () => {
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    await DeploymentService.completeDeployment('dep-001', 'abc123', 'main');
    expect(PR.updateDeploymentStatus).toHaveBeenCalledWith(
      'dep-001',
      'completed',
    );
  });

  test('failDeployment marks deployment as failed', async () => {
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    await DeploymentService.failDeployment('dep-001', 'Build failed');
    expect(PR.updateDeploymentStatus).toHaveBeenCalledWith(
      'dep-001',
      'failed',
      'Build failed',
    );
  });

  test('rollbackDeployment marks as rolled_back', async () => {
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    await DeploymentService.rollbackDeployment('dep-001', '1.2.2');
    expect(PR.updateDeploymentStatus).toHaveBeenCalledWith(
      'dep-001',
      'rolled_back',
      undefined,
      '1.2.2',
    );
  });

  test('getDeployments returns all deployments', async () => {
    (PR.findAllDeployments as jest.Mock).mockResolvedValue([mockRunning]);
    const result = await DeploymentService.getDeployments();
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('1.2.3');
  });

  test('getDeployments filters by environment', async () => {
    (PR.findAllDeployments as jest.Mock).mockResolvedValue([mockRunning]);
    await DeploymentService.getDeployments({
      environment: 'production',
    });
    expect(PR.findAllDeployments).toHaveBeenCalledWith({
      environment: 'production',
    });
  });

  test('getDeployments returns empty array when none exist', async () => {
    (PR.findAllDeployments as jest.Mock).mockResolvedValue([]);
    const result = await DeploymentService.getDeployments();
    expect(result).toHaveLength(0);
  });

  test('getDeployment returns deployment by id', async () => {
    (PR.findDeploymentById as jest.Mock).mockResolvedValue(mockPending);
    const result = await DeploymentService.getDeployment('dep-001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('dep-001');
  });

  test('getDeployment returns null when not found', async () => {
    (PR.findDeploymentById as jest.Mock).mockResolvedValue(null);
    const result = await DeploymentService.getDeployment('nonexistent');
    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 10. OPS DASHBOARD SERVICE
// ═════════════════════════════════════════════════════════════════════════

describe('OpsDashboardService', () => {
  const mockDashboardData: T.OpsDashboardData = {
    health: {
      status: 'pass',
      totalChecks: 5,
      passing: 5,
      failing: 0,
      warning: 0,
      timestamp: '2026-07-14T12:00:00.000Z',
    },
    system: {
      uptime: 3600,
      memory: {
        rss: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        heapUsed: 80 * 1024 * 1024,
        external: 10 * 1024 * 1024,
      },
      cpu: { loadAvg: [0.5, 0.3, 0.1] },
      node: 'v20.0.0',
      platform: 'linux',
    },
    database: { size: 2048 * 1024, tableCount: 42, status: 'pass' },
    api: { totalEndpoints: 30, recentMetrics: [], slowQueries: [] },
    workflow: { activeInstances: 0, failedInstances: 0 },
    sync: { activeDevices: 0, pendingQueue: 0, unresolvedConflicts: 0 },
    backup: { lastBackup: null, totalBackups: 0, status: 'warn' },
    alerts: { open: 2, critical: 1, recent: [] },
    scheduler: { activeJobs: 0, pendingJobs: 0 },
    storage: { dbSize: 2048 * 1024, backupSize: 0 },
  };

  test('getDashboard returns complete dashboard data', async () => {
    (PR.getOpsDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
    (PR.getLatestBackup as jest.Mock).mockResolvedValue(null);
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    (query as jest.Mock).mockResolvedValue([{ active: 3 }]);

    const result = await OpsDashboardService.getDashboard();
    expect(result).toHaveProperty('health');
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('database');
    expect(result).toHaveProperty('api');
    expect(result).toHaveProperty('workflow');
    expect(result).toHaveProperty('sync');
    expect(result).toHaveProperty('backup');
    expect(result).toHaveProperty('alerts');
    expect(result).toHaveProperty('scheduler');
    expect(result).toHaveProperty('storage');
  });

  test('getDashboard enriches workflow data from health check', async () => {
    (PR.getOpsDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('workflow_instances') && sql.includes('pending'))
        return [{ count: 5 }];
      if (sql.includes('status') && sql.includes('failed'))
        return [{ count: 1 }];
      if (sql.includes('device_registry')) return [{ count: 8 }];
      if (sql.includes('sync_queue')) return [{ count: 3 }];
      if (sql.includes('conflict_log')) return [{ count: 0 }];
      if (sql.includes('scheduled_jobs')) return [{ active: 5 }];
      return [];
    });

    const result = await OpsDashboardService.getDashboard();
    expect(result.workflow.activeInstances).toBe(5);
    expect(result.workflow.failedInstances).toBe(1);
  });

  test('getDashboard handles empty scheduler data', async () => {
    (PR.getOpsDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
    (query as jest.Mock).mockResolvedValue([]);
    const result = await OpsDashboardService.getDashboard();
    expect(result.scheduler.activeJobs).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 11. DISASTER RECOVERY — Runbook & Status
// ═════════════════════════════════════════════════════════════════════════

describe('DisasterRecoveryService — Runbook & Status', () => {
  test('getRunbook returns complete runbook with all procedures', async () => {
    const runbook = await DisasterRecoveryService.getRunbook();
    expect(runbook.title).toBe('DeepaBMS Disaster Recovery Runbook');
    expect(runbook.version).toBe('1.0.0');
    expect(runbook.procedures).toHaveProperty('databaseRecovery');
    expect(runbook.procedures).toHaveProperty('nodeFailure');
    expect(runbook.procedures).toHaveProperty('syncFailure');
    expect(runbook.procedures).toHaveProperty('workflowFailure');
    expect(runbook.procedures).toHaveProperty('queueCorruption');
    expect(runbook.procedures).toHaveProperty('backupFailure');
    expect(runbook.procedures.databaseRecovery.steps).toHaveLength(6);
    expect(runbook.recoveryTime).toHaveProperty('fullSystemRecovery');
  });

  test('getRecoveryStatus returns healthy when database is up', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue({
      startedAt: '2026-07-14T08:00:00.000Z',
      status: 'verified',
    });
    (PR.testConnection as jest.Mock).mockResolvedValue(true);

    const status = await DisasterRecoveryService.getRecoveryStatus();
    expect(status.overall).toBe('healthy');
    expect(status.database).toBe('ok');
    expect(status.backupAvailable).toBe(true);
    expect(status.lastBackupStatus).toBe('verified');
  });

  test('getRecoveryStatus returns critical when database is down', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue(null);
    (PR.testConnection as jest.Mock).mockResolvedValue(false);

    const status = await DisasterRecoveryService.getRecoveryStatus();
    expect(status.overall).toBe('critical');
    expect(status.database).toBe('down');
    expect(status.backupAvailable).toBe(false);
  });

  test('getRecoveryStatus handles no backups', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue(null);
    (PR.testConnection as jest.Mock).mockResolvedValue(true);

    const status = await DisasterRecoveryService.getRecoveryStatus();
    expect(status.lastBackup).toBe('never');
    expect(status.lastBackupStatus).toBe('none');
    expect(status.backupAvailable).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 12. DISASTER RECOVERY — Simulate & Recover
// ═════════════════════════════════════════════════════════════════════════

describe('DisasterRecoveryService — Simulate & Recover', () => {
  test('simulateFailure handles database_disconnect scenario', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result = await DisasterRecoveryService.simulateFailure(
      'database_disconnect',
    );
    expect(result.scenario).toBe('database_disconnect');
    expect(result.result).toBe('simulated');
  });

  test('simulateFailure handles workflow_failure scenario', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result =
      await DisasterRecoveryService.simulateFailure('workflow_failure');
    expect(result.scenario).toBe('workflow_failure');
    expect(result.result).toBe('simulated');
  });

  test('simulateFailure handles queue_corruption scenario', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result =
      await DisasterRecoveryService.simulateFailure('queue_corruption');
    expect(result.scenario).toBe('queue_corruption');
    expect(result.result).toBe('simulated');
  });

  test('simulateFailure throws for unknown scenario', async () => {
    await expect(
      DisasterRecoveryService.simulateFailure('unknown_scenario'),
    ).rejects.toThrow('Unknown scenario');
  });

  test('recoverFromScenario handles database_disconnect', async () => {
    const result = await DisasterRecoveryService.recoverFromScenario(
      'database_disconnect',
    );
    expect(result.scenario).toBe('database_disconnect');
    expect(result.result).toBe('recovered');
  });

  test('recoverFromScenario handles workflow_failure', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result =
      await DisasterRecoveryService.recoverFromScenario('workflow_failure');
    expect(result.scenario).toBe('workflow_failure');
    expect(result.result).toBe('recovered');
  });

  test('recoverFromScenario handles queue_corruption', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const result =
      await DisasterRecoveryService.recoverFromScenario('queue_corruption');
    expect(result.scenario).toBe('queue_corruption');
    expect(result.result).toBe('recovered');
  });

  test('recoverFromScenario throws for unknown scenario', async () => {
    await expect(
      DisasterRecoveryService.recoverFromScenario('unknown'),
    ).rejects.toThrow('Unknown recovery scenario');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 13. PLATFORM ROUTES — Health
// ═════════════════════════════════════════════════════════════════════════

describe('Platform Routes — Health', () => {
  test('GET /api/platform/health returns health report', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.3, 0.1]);

    const res = await request(app).get('/api/platform/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('checks');
    expect(res.body.checks.length).toBe(5);
  });

  test('GET /api/platform/health/live returns alive status', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    const res = await request(app).get('/api/platform/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(res.body.database).toBe('pass');
  });

  test('GET /api/platform/health/live returns dead when DB down', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(false);
    const res = await request(app).get('/api/platform/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dead');
  });

  test('GET /api/platform/health/ready returns ready when all checks pass', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    (PR.getDatabaseSize as jest.Mock).mockResolvedValue(1024 * 1024);
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('pending')) return [{ count: 0 }];
      if (sql.includes('failed')) return [{ count: 0 }];
      return [];
    });
    const res = await request(app).get('/api/platform/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks).toHaveProperty('database');
  });

  test('GET /api/platform/health/startup returns started', async () => {
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    const res = await request(app).get('/api/platform/health/startup');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('started');
    expect(res.body).toHaveProperty('uptime');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 14. PLATFORM ROUTES — Alerts
// ═════════════════════════════════════════════════════════════════════════

describe('Platform Routes — Alerts', () => {
  test('GET /api/platform/alerts returns alerts list', async () => {
    (PR.findAllAlerts as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      offset: 0,
      limit: 50,
    });
    const res = await request(app).get('/api/platform/alerts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  test('GET /api/platform/alerts/:id returns alert when found', async () => {
    (PR.findAlertById as jest.Mock).mockResolvedValue({
      id: 'alert-001',
      severity: 'high',
      category: 'system',
      title: 'Test Alert',
      message: null,
      source: null,
      status: 'open',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      metadata: {},
      createdAt: '2026-07-14T10:00:00.000Z',
    });
    const res = await request(app).get('/api/platform/alerts/alert-001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('alert-001');
  });

  test('GET /api/platform/alerts/:id returns 404 when not found', async () => {
    (PR.findAlertById as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/api/platform/alerts/nonexistent');
    expect(res.status).toBe(404);
  });

  test('POST /api/platform/alerts creates a new alert', async () => {
    (PR.createAlert as jest.Mock).mockResolvedValue({
      id: 'alert-002',
      severity: 'critical',
      category: 'system',
      title: 'Out of memory',
      message: null,
      source: null,
      status: 'open',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      metadata: {},
      createdAt: '2026-07-14T12:00:00.000Z',
    });
    const res = await request(app).post('/api/platform/alerts').send({
      severity: 'critical',
      category: 'system',
      title: 'Out of memory',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('alert-002');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 15. PLATFORM ROUTES — Backups
// ═════════════════════════════════════════════════════════════════════════

describe('Platform Routes — Backups', () => {
  test('GET /api/platform/backups returns backups list', async () => {
    (PR.findAllBackups as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      offset: 0,
      limit: 50,
    });
    const res = await request(app).get('/api/platform/backups');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  test('GET /api/platform/backups/:id returns backup when found', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue({
      id: 'bkp-001',
      type: 'full',
      status: 'verified',
      filePath: '/backups/test.db',
      fileSize: 1024,
      checksum: null,
      encrypted: false,
      retentionDays: 30,
      startedAt: '2026-07-14T10:00:00.000Z',
      completedAt: null,
      verifiedAt: null,
      errorMessage: null,
      metadata: {},
      createdBy: 'system',
    });
    const res = await request(app).get('/api/platform/backups/bkp-001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('bkp-001');
  });

  test('GET /api/platform/backups/:id returns 404 when not found', async () => {
    (PR.findBackupById as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/api/platform/backups/nonexistent');
    expect(res.status).toBe(404);
  });

  test('POST /api/platform/backups creates a new backup', async () => {
    const rawBackup = {
      id: 'bkp-002',
      type: 'full',
      status: 'running' as const,
      filePath: '/backups/new.db',
    };
    const completedBackup = { ...rawBackup, status: 'verified' as const };
    (PR.createBackupRecord as jest.Mock).mockResolvedValue(rawBackup);
    (PR.findBackupById as jest.Mock)
      .mockResolvedValueOnce(rawBackup)
      .mockResolvedValueOnce(completedBackup);
    (PR.updateBackupStatus as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/platform/backups')
      .send({ type: 'full' });
    expect(res.status).toBe(201);
  });

  test('GET /api/platform/backups/config returns schedule config', async () => {
    const res = await request(app).get('/api/platform/backups/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fullBackupCron');
    expect(res.body).toHaveProperty('retentionDays');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 16. PLATFORM ROUTES — Deployments
// ═════════════════════════════════════════════════════════════════════════

describe('Platform Routes — Deployments', () => {
  test('GET /api/platform/deployments returns deployments', async () => {
    (PR.findAllDeployments as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/platform/deployments');
    expect(res.status).toBe(200);
  });

  test('POST /api/platform/deployments creates a new deployment', async () => {
    (PR.createDeployment as jest.Mock).mockResolvedValue({
      id: 'dep-001',
      version: '2.0.0',
      environment: 'staging',
      status: 'pending',
    });
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    (PR.findDeploymentById as jest.Mock).mockResolvedValue({
      id: 'dep-001',
      version: '2.0.0',
      environment: 'staging',
      status: 'running',
    });
    const res = await request(app)
      .post('/api/platform/deployments')
      .send({ version: '2.0.0', environment: 'staging' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('running');
  });

  test('POST /api/platform/deployments/:id/complete completes deployment', async () => {
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    const res = await request(app)
      .post('/api/platform/deployments/dep-001/complete')
      .send({ commitHash: 'abc123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deployment completed');
  });

  test('POST /api/platform/deployments/:id/rollback rolls back deployment', async () => {
    (PR.updateDeploymentStatus as jest.Mock).mockResolvedValue(undefined);
    const res = await request(app)
      .post('/api/platform/deployments/dep-001/rollback')
      .send({ rollbackVersion: '1.0.0' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('1.0.0');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 17. PLATFORM ROUTES — Disaster Recovery & Dashboard
// ═════════════════════════════════════════════════════════════════════════

describe('Platform Routes — DR & Dashboard', () => {
  test('GET /api/platform/dr/runbook returns runbook', async () => {
    const res = await request(app).get('/api/platform/dr/runbook');
    expect(res.status).toBe(200);
    expect(res.body.title).toContain('Runbook');
  });

  test('GET /api/platform/dr/status returns recovery status', async () => {
    (PR.getLatestBackup as jest.Mock).mockResolvedValue({
      startedAt: '2026-07-14T08:00:00.000Z',
      status: 'verified',
    });
    (PR.testConnection as jest.Mock).mockResolvedValue(true);
    const res = await request(app).get('/api/platform/dr/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overall');
  });

  test('POST /api/platform/dr/simulate simulates a failure scenario', async () => {
    (query as jest.Mock).mockResolvedValue([]);
    const res = await request(app)
      .post('/api/platform/dr/simulate')
      .send({ scenario: 'database_disconnect' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('simulated');
  });

  test('POST /api/platform/dr/recover recovers from a scenario', async () => {
    const res = await request(app)
      .post('/api/platform/dr/recover')
      .send({ scenario: 'database_disconnect' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('recovered');
  });

  test('GET /api/platform/dashboard returns ops dashboard', async () => {
    (PR.getOpsDashboard as jest.Mock).mockResolvedValue({
      health: {
        status: 'pass',
        totalChecks: 5,
        passing: 5,
        failing: 0,
        warning: 0,
        timestamp: '2026-07-14T12:00:00.000Z',
      },
      system: {
        uptime: 3600,
        memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
        cpu: { loadAvg: [0, 0, 0] },
        node: '',
        platform: '',
      },
      database: { size: 0, tableCount: 0, status: 'pass' },
      api: { totalEndpoints: 0, recentMetrics: [], slowQueries: [] },
      workflow: { activeInstances: 0, failedInstances: 0 },
      sync: { activeDevices: 0, pendingQueue: 0, unresolvedConflicts: 0 },
      backup: { lastBackup: null, totalBackups: 0, status: 'warn' },
      alerts: { open: 0, critical: 0, recent: [] },
      scheduler: { activeJobs: 0, pendingJobs: 0 },
      storage: { dbSize: 0, backupSize: 0 },
    });
    (query as jest.Mock).mockResolvedValue([{ active: 0 }]);
    const res = await request(app).get('/api/platform/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('health');
    expect(res.body).toHaveProperty('system');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 18. TYPE VALIDATION
// ═════════════════════════════════════════════════════════════════════════

describe('Type Validation — Health Types', () => {
  test('HealthStatus has correct values', () => {
    const statuses: T.HealthStatus[] = ['pass', 'fail', 'warn'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('pass');
    expect(statuses).toContain('fail');
    expect(statuses).toContain('warn');
  });

  test('HealthCheckResult has all required properties', () => {
    const check: T.HealthCheckResult = {
      status: 'pass',
      component: 'test',
      durationMs: 10,
      message: 'ok',
      details: {},
    };
    expect(check.status).toBe('pass');
    expect(typeof check.durationMs).toBe('number');
    expect(typeof check.details).toBe('object');
  });

  test('HealthReport has required structure', () => {
    const report: T.HealthReport = {
      status: 'pass',
      version: '1.0.0',
      uptime: 100,
      timestamp: new Date().toISOString(),
      checks: [],
    };
    expect(report.uptime).toBeGreaterThan(0);
    expect(Array.isArray(report.checks)).toBe(true);
  });
});

describe('Type Validation — Alert Types', () => {
  test('AlertSeverity has correct values', () => {
    const severities: T.AlertSeverity[] = [
      'critical',
      'high',
      'medium',
      'low',
      'info',
    ];
    expect(severities).toHaveLength(5);
    expect(severities).toContain('critical');
    expect(severities).toContain('info');
  });

  test('AlertStatus has correct values', () => {
    const statuses: T.AlertStatus[] = [
      'open',
      'acknowledged',
      'resolved',
      'dismissed',
    ];
    expect(statuses).toHaveLength(4);
  });

  test('VALID_ALERT_SEVERITIES constant matches AlertSeverity', () => {
    expect(T.VALID_ALERT_SEVERITIES).toContain('critical');
    expect(T.VALID_ALERT_SEVERITIES).toContain('high');
    expect(T.VALID_ALERT_SEVERITIES).toContain('medium');
    expect(T.VALID_ALERT_SEVERITIES).toContain('low');
    expect(T.VALID_ALERT_SEVERITIES).toContain('info');
    expect(T.VALID_ALERT_SEVERITIES.length).toBe(5);
  });

  test('CreateAlertDto has required fields', () => {
    const dto: T.CreateAlertDto = {
      severity: 'high',
      category: 'system',
      title: 'Test',
      message: 'msg',
      source: 'monitor',
      metadata: { key: 'val' },
    };
    expect(dto.severity).toBeTruthy();
    expect(dto.category).toBeTruthy();
    expect(dto.title).toBeTruthy();
  });
});

describe('Type Validation — Backup Types', () => {
  test('BackupType has correct values', () => {
    const types: T.BackupType[] = ['full', 'incremental', 'snapshot', 'wal'];
    expect(types).toHaveLength(4);
  });

  test('BackupStatus has correct values', () => {
    const statuses: T.BackupStatus[] = [
      'running',
      'completed',
      'failed',
      'verified',
    ];
    expect(statuses).toHaveLength(4);
  });

  test('BackupRecord has all required properties', () => {
    const record: T.BackupRecord = {
      id: 'bkp-001',
      type: 'full',
      status: 'verified',
      filePath: '/backups/test.db',
      fileSize: 1024,
      checksum: null,
      encrypted: false,
      retentionDays: 30,
      startedAt: new Date().toISOString(),
      completedAt: null,
      verifiedAt: null,
      errorMessage: null,
      metadata: {},
      createdBy: 'admin',
    };
    expect(record.id).toBeTruthy();
    expect(['full', 'incremental', 'snapshot', 'wal']).toContain(record.type);
    expect(['running', 'completed', 'failed', 'verified']).toContain(
      record.status,
    );
  });

  test('DEFAULT_BACKUP_CONFIG has expected defaults', () => {
    expect(T.DEFAULT_BACKUP_CONFIG.fullBackupCron).toBe('0 2 * * 0');
    expect(T.DEFAULT_BACKUP_CONFIG.retentionDays).toBe(30);
    expect(T.DEFAULT_BACKUP_CONFIG.encrypted).toBe(true);
    expect(T.DEFAULT_BACKUP_CONFIG.backupDir).toBe('./backups');
    expect(T.DEFAULT_BACKUP_CONFIG.verifyAfterBackup).toBe(true);
  });
});

describe('Type Validation — Deployment & Dashboard Types', () => {
  test('DeploymentEnvironment has correct values', () => {
    const envs: T.DeploymentEnvironment[] = [
      'development',
      'staging',
      'production',
    ];
    expect(envs).toHaveLength(3);
  });

  test('DeploymentStatus has correct values', () => {
    const statuses: T.DeploymentStatus[] = [
      'pending',
      'running',
      'completed',
      'failed',
      'rolled_back',
    ];
    expect(statuses).toHaveLength(5);
  });

  test('DeploymentRecord has all required properties', () => {
    const dep: T.DeploymentRecord = {
      id: 'dep-001',
      version: '1.0.0',
      environment: 'production',
      status: 'completed',
      commitHash: 'abc123',
      branch: 'main',
      artifacts: ['build.zip'],
      deployedBy: 'admin',
      rollbackVersion: null,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 120,
    };
    expect(dep.id).toBeTruthy();
    expect(dep.version).toBe('1.0.0');
  });

  test('OpsDashboardData has required section keys', () => {
    const data: T.OpsDashboardData = {
      health: {
        status: 'pass',
        totalChecks: 0,
        passing: 0,
        failing: 0,
        warning: 0,
        timestamp: '',
      },
      system: {
        uptime: 0,
        memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
        cpu: { loadAvg: [] },
        node: '',
        platform: '',
      },
      database: { size: 0, tableCount: 0, status: 'pass' },
      api: { totalEndpoints: 0, recentMetrics: [], slowQueries: [] },
      workflow: { activeInstances: 0, failedInstances: 0 },
      sync: { activeDevices: 0, pendingQueue: 0, unresolvedConflicts: 0 },
      backup: { lastBackup: null, totalBackups: 0, status: 'pass' },
      alerts: { open: 0, critical: 0, recent: [] },
      scheduler: { activeJobs: 0, pendingJobs: 0 },
      storage: { dbSize: 0, backupSize: 0 },
    };
    expect(data).toHaveProperty('health');
    expect(data).toHaveProperty('system');
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('api');
    expect(data).toHaveProperty('workflow');
    expect(data).toHaveProperty('sync');
    expect(data).toHaveProperty('backup');
    expect(data).toHaveProperty('alerts');
    expect(data).toHaveProperty('scheduler');
    expect(data).toHaveProperty('storage');
    expect(Object.keys(data)).toHaveLength(10);
  });

  test('PaginatedResult interface has expected shape', () => {
    const result: T.PaginatedResult<string> = {
      data: ['a', 'b'],
      total: 2,
      offset: 0,
      limit: 10,
    };
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBe(2);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
  });

  test('FilterParams allows optional field combinations', () => {
    const full: T.FilterParams = {
      status: 'open',
      severity: 'high',
      category: 'system',
      environment: 'production',
      metricName: 'cpu',
      offset: 0,
      limit: 100,
      since: '2026-01-01',
      until: '2026-12-31',
      orderBy: 'created_at',
      orderDir: 'desc',
    };
    expect(full.status).toBe('open');
    expect(full.orderDir).toBe('desc');

    const empty: T.FilterParams = {};
    expect(Object.keys(empty)).toHaveLength(0);
  });
});
