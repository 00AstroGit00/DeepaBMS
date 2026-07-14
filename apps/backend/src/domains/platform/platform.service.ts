import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { PlatformRepository as R } from './platform.repository';
import * as T from './platform.types';
import { query } from '../../db';

function now(): string {
  return new Date().toISOString();
}

// ═════════════════════════════════════════════════════════════════════════
// HEALTH SYSTEM
// ═════════════════════════════════════════════════════════════════════════

export const HealthService = {
  async runAllChecks(): Promise<T.HealthReport> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkMemory(),
      this.checkCpu(),
      this.checkUptime(),
    ]);
    const status: T.HealthStatus = checks.some((c) => c.status === 'fail')
      ? 'fail'
      : checks.some((c) => c.status === 'warn')
        ? 'warn'
        : 'pass';
    for (const check of checks) {
      await R.recordHealthCheck(check);
    }
    return {
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: now(),
      checks,
    };
  },

  async checkDatabase(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    try {
      const ok = await R.testConnection();
      return {
        status: ok ? 'pass' : 'fail',
        component: 'database',
        durationMs: Date.now() - start,
        message: ok ? 'Database connection OK' : 'Database connection failed',
        details: {},
      };
    } catch (err: any) {
      return {
        status: 'fail',
        component: 'database',
        durationMs: Date.now() - start,
        message: err.message,
        details: {},
      };
    }
  },

  async checkStorage(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    try {
      const dbSize = await R.getDatabaseSize();
      const dbPath =
        process.env.SQLITE_DB_PATH ||
        path.join(__dirname, '..', '..', 'deepa-bms.db');
      const stats = fs.statSync(dbPath);
      const free =
        dbSize < 100 * 1024 * 1024
          ? 'pass'
          : dbSize < 500 * 1024 * 1024
            ? 'warn'
            : 'fail';
      return {
        status: free,
        component: 'storage',
        durationMs: Date.now() - start,
        message: `Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`,
        details: {
          dbSizeBytes: dbSize,
          fileSizeBytes: stats.size,
          limitMB: 500,
        },
      };
    } catch (err: any) {
      return {
        status: 'warn',
        component: 'storage',
        durationMs: Date.now() - start,
        message: err.message,
        details: {},
      };
    }
  },

  async checkMemory(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    const heapTotalMB = mem.heapTotal / 1024 / 1024;
    const ratio = heapTotalMB > 0 ? heapUsedMB / heapTotalMB : 0;
    const status: T.HealthStatus =
      ratio < 0.7 ? 'pass' : ratio < 0.9 ? 'warn' : 'fail';
    return {
      status,
      component: 'memory',
      durationMs: Date.now() - start,
      message: `Heap: ${heapUsedMB.toFixed(1)} MB / ${heapTotalMB.toFixed(1)} MB (${(ratio * 100).toFixed(0)}%)`,
      details: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      },
    };
  },

  async checkCpu(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    const loadAvg = os.loadavg();
    const status: T.HealthStatus =
      loadAvg[0] < 2 ? 'pass' : loadAvg[0] < 4 ? 'warn' : 'fail';
    return {
      status,
      component: 'cpu',
      durationMs: Date.now() - start,
      message: `Load average (1m): ${loadAvg[0].toFixed(2)}`,
      details: {
        loadAvg1: loadAvg[0],
        loadAvg5: loadAvg[1],
        loadAvg15: loadAvg[2],
      },
    };
  },

  async checkUptime(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    const uptimeHours = process.uptime() / 3600;
    const status: T.HealthStatus = 'pass';
    return {
      status,
      component: 'uptime',
      durationMs: Date.now() - start,
      message: `Uptime: ${uptimeHours.toFixed(1)} hours`,
      details: { uptimeSeconds: process.uptime(), uptimeHours },
    };
  },

  async checkWorkflow(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    try {
      const activeRows = await query(
        "SELECT COUNT(*) as count FROM workflow_instances WHERE status IN ('pending','running','paused')",
      );
      const failedRows = await query(
        "SELECT COUNT(*) as count FROM workflow_instances WHERE status = 'failed'",
      );
      const status: T.HealthStatus =
        failedRows[0].count === 0 ? 'pass' : 'warn';
      return {
        status,
        component: 'workflow',
        durationMs: Date.now() - start,
        message: `${activeRows[0].count} active, ${failedRows[0].count} failed`,
        details: { active: activeRows[0].count, failed: failedRows[0].count },
      };
    } catch (err: any) {
      return {
        status: 'warn',
        component: 'workflow',
        durationMs: Date.now() - start,
        message: err.message,
        details: {},
      };
    }
  },

  async checkSync(): Promise<T.HealthCheckResult> {
    const start = Date.now();
    try {
      const devices = await query(
        "SELECT COUNT(*) as count FROM device_registry WHERE status = 'active'",
      );
      const queue = await query(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending','failed')",
      );
      const conflicts = await query(
        "SELECT COUNT(*) as count FROM conflict_log WHERE resolution = 'unresolved'",
      );
      const status: T.HealthStatus =
        queue[0].count > 100
          ? 'warn'
          : conflicts[0].count > 10
            ? 'warn'
            : 'pass';
      return {
        status,
        component: 'sync',
        durationMs: Date.now() - start,
        message: `${devices[0].count} devices, ${queue[0].count} queued, ${conflicts[0].count} conflicts`,
        details: {
          activeDevices: devices[0].count,
          pendingQueue: queue[0].count,
          unresolvedConflicts: conflicts[0].count,
        },
      };
    } catch (err: any) {
      return {
        status: 'warn',
        component: 'sync',
        durationMs: Date.now() - start,
        message: err.message,
        details: {},
      };
    }
  },
};

// ═════════════════════════════════════════════════════════════════════════
// MONITORING SERVICE
// ═════════════════════════════════════════════════════════════════════════

export const MonitoringService = {
  async getAlerts(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.Alert>> {
    return R.findAllAlerts(filter);
  },

  async getAlert(id: string): Promise<T.Alert | null> {
    return R.findAlertById(id);
  },

  async createAlert(dto: T.CreateAlertDto): Promise<T.Alert> {
    return R.createAlert(dto);
  },

  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    await R.updateAlertStatus(id, 'acknowledged', userId);
  },

  async resolveAlert(id: string, userId: string): Promise<void> {
    await R.updateAlertStatus(id, 'resolved', userId);
  },

  async dismissAlert(id: string, userId: string): Promise<void> {
    await R.updateAlertStatus(id, 'dismissed', userId);
  },

  async getMetrics(
    name?: string,
    since?: string,
    limit = 100,
  ): Promise<T.MonitoringMetric[]> {
    return R.getMetrics(name, since, limit);
  },

  async getRecentRequestMetrics(limit = 100): Promise<T.RequestMetric[]> {
    return R.getRecentRequestMetrics(limit);
  },

  async getSlowQueries(limit = 50): Promise<T.SlowQueryEntry[]> {
    return R.getSlowQueries(limit);
  },
};

// ═════════════════════════════════════════════════════════════════════════
// BACKUP & RESTORE SERVICE
// ═════════════════════════════════════════════════════════════════════════

export const BackupService = {
  async createBackup(dto: T.CreateBackupDto): Promise<T.BackupRecord> {
    const record = await R.createBackupRecord(dto);
    try {
      const dbPath =
        process.env.SQLITE_DB_PATH ||
        path.join(__dirname, '..', '..', 'deepa-bms.db');
      const backupDir = path.dirname(dto.filePath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const readStream = fs.createReadStream(dbPath);
      const writeStream = fs.createWriteStream(dto.filePath);
      await new Promise<void>((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        readStream.on('error', reject);
      });
      const checksum = dto.encrypted
        ? crypto
            .createHash('sha256')
            .update(fs.readFileSync(dto.filePath))
            .digest('hex')
        : null;
      const fileSize = fs.statSync(dto.filePath).size;
      await R.updateBackupStatus(
        record.id,
        'completed',
        undefined,
        fileSize,
        checksum || undefined,
      );
      if (dto.encrypted) {
        const data = fs.readFileSync(dto.filePath);
        const cipher = crypto.createCipheriv(
          'aes-256-gcm',
          crypto.scryptSync(
            process.env.BACKUP_ENCRYPTION_KEY || 'deepabms-backup-key-default',
            'salt',
            32,
          ),
          crypto.randomBytes(16),
        );
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        fs.writeFileSync(dto.filePath + '.enc', encrypted);
        fs.unlinkSync(dto.filePath);
      }
      const updated = await R.findBackupById(record.id);
      if (updated && dto.type !== 'wal') {
        await R.updateBackupStatus(record.id, 'verified');
      }
      return (await R.findBackupById(record.id)) as T.BackupRecord;
    } catch (err: any) {
      await R.updateBackupStatus(record.id, 'failed', err.message);
      throw err;
    }
  },

  async getBackups(filter?: {
    type?: T.BackupType;
    status?: T.BackupStatus;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.BackupRecord>> {
    return R.findAllBackups(filter);
  },

  async getBackup(id: string): Promise<T.BackupRecord | null> {
    return R.findBackupById(id);
  },

  async getLastBackup(type?: T.BackupType): Promise<T.BackupRecord | null> {
    return R.getLatestBackup(type);
  },

  async deleteBackup(id: string): Promise<void> {
    const backup = await R.findBackupById(id);
    if (backup) {
      try {
        if (fs.existsSync(backup.filePath)) fs.unlinkSync(backup.filePath);
        if (fs.existsSync(backup.filePath + '.enc'))
          fs.unlinkSync(backup.filePath + '.enc');
      } catch {
        /* file may not exist */
      }
    }
    await R.updateBackupStatus(id, 'failed', 'Deleted');
  },

  async verifyBackup(id: string): Promise<boolean> {
    const backup = await R.findBackupById(id);
    if (!backup) throw new Error(`Backup not found: ${id}`);
    if (
      !fs.existsSync(backup.filePath) &&
      !fs.existsSync(backup.filePath + '.enc')
    ) {
      await R.updateBackupStatus(id, 'failed', 'Backup file not found');
      return false;
    }
    const filePath = fs.existsSync(backup.filePath)
      ? backup.filePath
      : backup.filePath + '.enc';
    const stat = fs.statSync(filePath);
    if (backup.checksum) {
      const currentChecksum = crypto
        .createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');
      if (currentChecksum !== backup.checksum) {
        await R.updateBackupStatus(
          id,
          'failed',
          'Checksum mismatch - data corruption detected',
        );
        return false;
      }
    }
    await R.updateBackupStatus(id, 'verified', undefined, stat.size);
    return true;
  },

  async getBackupScheduleConfig(): Promise<T.BackupScheduleConfig> {
    return {
      fullBackupCron:
        process.env.FULL_BACKUP_CRON || T.DEFAULT_BACKUP_CONFIG.fullBackupCron,
      incrementalBackupCron:
        process.env.INCREMENTAL_BACKUP_CRON ||
        T.DEFAULT_BACKUP_CONFIG.incrementalBackupCron,
      retentionDays: parseInt(
        process.env.BACKUP_RETENTION_DAYS ||
          String(T.DEFAULT_BACKUP_CONFIG.retentionDays),
        10,
      ),
      encrypted: process.env.BACKUP_ENCRYPTED !== 'false',
      backupDir: process.env.BACKUP_DIR || T.DEFAULT_BACKUP_CONFIG.backupDir,
      verifyAfterBackup: process.env.BACKUP_VERIFY !== 'false',
    };
  },

  async cleanupOldBackups(): Promise<number> {
    const config = await this.getBackupScheduleConfig();
    const cutoff = new Date(
      Date.now() - config.retentionDays * 86400000,
    ).toISOString();
    const oldBackups = await query(
      "SELECT * FROM backup_records WHERE started_at < ? AND status IN ('completed','verified')",
      [cutoff],
    );
    let cleaned = 0;
    for (const backup of oldBackups) {
      try {
        if (fs.existsSync(backup.file_path)) fs.unlinkSync(backup.file_path);
        if (fs.existsSync(backup.file_path + '.enc'))
          fs.unlinkSync(backup.file_path + '.enc');
      } catch {
        /* ignore */
      }
      await query(
        "UPDATE backup_records SET status = 'failed', error_message = 'Expired' WHERE id = ?",
        [backup.id],
      );
      cleaned++;
    }
    return cleaned;
  },
};

// ═════════════════════════════════════════════════════════════════════════
// DEPLOYMENT SERVICE
// ═════════════════════════════════════════════════════════════════════════

export const DeploymentService = {
  async createDeployment(
    version: string,
    environment: T.DeploymentEnvironment,
    deployedBy?: string,
  ): Promise<T.DeploymentRecord> {
    const record = await R.createDeployment(version, environment, deployedBy);
    await R.updateDeploymentStatus(record.id, 'running');
    return R.findDeploymentById(record.id) as Promise<T.DeploymentRecord>;
  },

  async completeDeployment(
    id: string,
    commitHash?: string,
    branch?: string,
  ): Promise<void> {
    await R.updateDeploymentStatus(id, 'completed');
    if (commitHash || branch) {
      // Update commit info
    }
  },

  async failDeployment(id: string, errorMessage: string): Promise<void> {
    await R.updateDeploymentStatus(id, 'failed', errorMessage);
  },

  async rollbackDeployment(id: string, rollbackVersion: string): Promise<void> {
    await R.updateDeploymentStatus(
      id,
      'rolled_back',
      undefined,
      rollbackVersion,
    );
  },

  async getDeployments(filter?: {
    environment?: T.DeploymentEnvironment;
    status?: T.DeploymentStatus;
    limit?: number;
  }): Promise<T.DeploymentRecord[]> {
    return R.findAllDeployments(filter);
  },

  async getDeployment(id: string): Promise<T.DeploymentRecord | null> {
    return R.findDeploymentById(id);
  },
};

// ═════════════════════════════════════════════════════════════════════════
// OPS DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

export const OpsDashboardService = {
  async getDashboard(): Promise<T.OpsDashboardData> {
    const data = await R.getOpsDashboard();
    const workflowCheck = await HealthService.checkWorkflow();
    data.workflow = {
      activeInstances: workflowCheck.details?.active || 0,
      failedInstances: workflowCheck.details?.failed || 0,
    };
    const syncCheck = await HealthService.checkSync();
    data.sync = {
      activeDevices: syncCheck.details?.activeDevices || 0,
      pendingQueue: syncCheck.details?.pendingQueue || 0,
      unresolvedConflicts: syncCheck.details?.unresolvedConflicts || 0,
    };
    const jobCounts = await query(
      "SELECT COUNT(*) as active FROM scheduled_jobs WHERE status = 'active'",
    );
    data.scheduler = {
      activeJobs: jobCounts[0]?.active || 0,
      pendingJobs: 0,
    };
    return data;
  },
};

// ═════════════════════════════════════════════════════════════════════════
// DISASTER RECOVERY
// ═════════════════════════════════════════════════════════════════════════

export const DisasterRecoveryService = {
  async getRunbook(): Promise<Record<string, any>> {
    return {
      title: 'DeepaBMS Disaster Recovery Runbook',
      version: '1.0.0',
      lastUpdated: now(),
      procedures: {
        databaseRecovery: {
          title: 'Database Recovery',
          steps: [
            'Stop the application server',
            'Identify the latest verified backup',
            'Restore database from backup file',
            'Verify database integrity with PRAGMA integrity_check',
            'Restart the application server',
            'Run health check to verify all systems',
          ],
          commands: [
            'cp backups/deepa-bms-{date}.db deepa-bms.db',
            "node -e \"const {query} = require('./dist/db'); query('PRAGMA integrity_check').then(console.log)\"",
          ],
        },
        nodeFailure: {
          title: 'Node/Application Failure',
          steps: [
            'Check application logs for error details',
            'Restart the node process',
            'Verify health endpoint returns 200',
            'Check sync engine status',
            'Replay any failed workflow instances',
          ],
        },
        syncFailure: {
          title: 'Sync Engine Failure',
          steps: [
            'Check sync audit log for failed sessions',
            'Verify device registry is accessible',
            'Clear corrupted queue items',
            'Reset device checkpoints if needed',
            'Replay failed sync sessions',
          ],
        },
        workflowFailure: {
          title: 'Workflow Engine Failure',
          steps: [
            'Identify failed workflow instances',
            'Check error messages for root cause',
            'Fix underlying issue',
            'Re-run failed workflow steps',
            'Verify compensation steps executed if needed',
          ],
        },
        queueCorruption: {
          title: 'Queue Corruption Recovery',
          steps: [
            'Stop background workers',
            'Identify corrupted queue items',
            'Clear corrupted entries',
            'Restart background workers',
            'Verify queue processing resumes',
          ],
        },
        backupFailure: {
          title: 'Backup Failure Recovery',
          steps: [
            'Check disk space and permissions',
            'Verify backup configuration',
            'Check encryption key validity',
            'Force a new backup attempt',
            'Verify backup integrity',
          ],
        },
      },
      recoveryTime: {
        databaseRecovery: '~15 minutes',
        nodeFailure: '~2 minutes',
        syncFailure: '~10 minutes',
        workflowFailure: '~5 minutes',
        fullSystemRecovery: '~30 minutes',
      },
    };
  },

  async getRecoveryStatus(): Promise<Record<string, any>> {
    const lastBackup = await R.getLatestBackup();
    const dbOk = await R.testConnection();
    return {
      overall: dbOk ? 'healthy' : 'critical',
      database: dbOk ? 'ok' : 'down',
      lastBackup: lastBackup?.startedAt || 'never',
      lastBackupStatus: lastBackup?.status || 'none',
      backupAvailable: !!lastBackup && lastBackup.status === 'verified',
      uptimeSeconds: process.uptime(),
      timestamp: now(),
    };
  },

  async simulateFailure(scenario: string): Promise<Record<string, any>> {
    const scenarios: Record<string, () => Promise<any>> = {
      database_disconnect: async () => {
        await query('DROP TABLE IF EXISTS _dr_test');
        return {
          scenario: 'database_disconnect',
          result: 'simulated',
          note: 'Test table dropped',
        };
      },
      workflow_failure: async () => {
        await query(
          "UPDATE workflow_instances SET status = 'failed', error_message = 'DR simulation' WHERE status = 'running' LIMIT 1",
        );
        return {
          scenario: 'workflow_failure',
          result: 'simulated',
          note: 'One running workflow marked as failed',
        };
      },
      queue_corruption: async () => {
        await query(
          "UPDATE sync_queue SET status = 'failed', error_message = 'DR simulation' WHERE status = 'pending' LIMIT 1",
        );
        return {
          scenario: 'queue_corruption',
          result: 'simulated',
          note: 'One queue item marked as failed',
        };
      },
    };
    const fn = scenarios[scenario];
    if (!fn)
      throw new Error(
        `Unknown scenario: ${scenario}. Available: ${Object.keys(scenarios).join(', ')}`,
      );
    return fn();
  },

  async recoverFromScenario(scenario: string): Promise<Record<string, any>> {
    const recoveries: Record<string, () => Promise<any>> = {
      database_disconnect: async () => {
        return {
          scenario: 'database_disconnect',
          result: 'recovered',
          note: 'Reconnection handled by application',
        };
      },
      workflow_failure: async () => {
        await query(
          "UPDATE workflow_instances SET status = 'pending', error_message = NULL WHERE error_message = 'DR simulation'",
        );
        return {
          scenario: 'workflow_failure',
          result: 'recovered',
          note: 'Workflow instances reset to pending',
        };
      },
      queue_corruption: async () => {
        await query(
          "UPDATE sync_queue SET status = 'pending', error_message = NULL, retry_count = 0 WHERE error_message = 'DR simulation'",
        );
        return {
          scenario: 'queue_corruption',
          result: 'recovered',
          note: 'Queue items reset to pending',
        };
      },
    };
    const fn = recoveries[scenario];
    if (!fn) throw new Error(`Unknown recovery scenario: ${scenario}`);
    return fn();
  },
};
