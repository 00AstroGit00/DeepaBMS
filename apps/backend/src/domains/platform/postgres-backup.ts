import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { query, run } from '../../db';

export interface TenantBackupRecord {
  id: string;
  tenantSlug: string;
  schemaName: string;
  backupFile: string;
  fileSize: number;
  checksum: string;
  status: 'running' | 'completed' | 'failed' | 'verified';
  startedAt: string;
  completedAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
}

const BACKUP_DIR = process.env.TENANT_BACKUP_DIR || path.join(__dirname, '..', '..', '..', 'tenant-backups');

function isPostgres(): boolean {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function now(): string {
  return new Date().toISOString();
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function computeChecksum(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function getDbUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/deepabms';
}

async function ensureBackupRecordsTable(): Promise<void> {
  if (isPostgres()) {
    await run(`CREATE SCHEMA IF NOT EXISTS shared`);
    await run(`
      CREATE TABLE IF NOT EXISTS shared.tenant_backup_records (
        id VARCHAR(50) PRIMARY KEY,
        tenant_slug VARCHAR(200) NOT NULL,
        schema_name VARCHAR(200) NOT NULL,
        backup_file VARCHAR(500) NOT NULL,
        file_size BIGINT DEFAULT 0,
        checksum VARCHAR(128),
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        verified_at TIMESTAMP,
        error_message TEXT
      )
    `);
  } else {
    await run(`
      CREATE TABLE IF NOT EXISTS tenant_backup_records (
        id VARCHAR(50) PRIMARY KEY,
        tenant_slug VARCHAR(200) NOT NULL,
        schema_name VARCHAR(200) NOT NULL,
        backup_file VARCHAR(500) NOT NULL,
        file_size BIGINT DEFAULT 0,
        checksum VARCHAR(128),
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        verified_at TIMESTAMP,
        error_message TEXT
      )
    `);
  }
}

function getBackupTable(): string {
  return isPostgres() ? 'shared.tenant_backup_records' : 'tenant_backup_records';
}

export async function createTenantBackup(tenantSlug: string): Promise<TenantBackupRecord> {
  if (!isPostgres()) {
    throw new Error('Tenant backups require PostgreSQL');
  }

  await ensureBackupRecordsTable();

  const tenant = await query(`SELECT id, slug FROM tenants WHERE slug = ? AND status IN ('trial', 'active', 'past_due')`, [tenantSlug]);

  if (tenant.length === 0) {
    throw new Error(`Active tenant not found: ${tenantSlug}`);
  }

  const tenantId = tenant[0].id;
  const schemaName = `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `${sanitizeFilename(tenantSlug)}-${timestamp}.dump`);

  const recordId = uid('tbkp');
  const startedAt = now();

  await run(
    `INSERT INTO ${getBackupTable()} (id, tenant_slug, schema_name, backup_file, status, started_at)
     VALUES (?, ?, ?, ?, 'running', ?)`,
    [recordId, tenantSlug, schemaName, backupFile, startedAt],
  );

  try {
    const dbUrl = getDbUrl();
    const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';

    execSync(
      `${pgDumpPath} ` +
        `--dbname="${dbUrl}" ` +
        `--schema=${sanitizeIdentifier(schemaName)} ` +
        `--format=custom ` +
        `--file="${backupFile}" ` +
        `--no-owner ` +
        `--no-acl ` +
        `--verbose`,
      { timeout: parseInt(process.env.BACKUP_TIMEOUT_MS || '300000', 10) },
    );

    const fileSize = fs.statSync(backupFile).size;
    const checksum = computeChecksum(backupFile);
    const completedAt = now();

    await run(
      `UPDATE ${getBackupTable()} SET status = 'completed', file_size = ?, checksum = ?, completed_at = ? WHERE id = ?`,
      [fileSize, checksum, completedAt, recordId],
    );

    return {
      id: recordId,
      tenantSlug,
      schemaName,
      backupFile,
      fileSize,
      checksum,
      status: 'completed',
      startedAt,
      completedAt,
      verifiedAt: null,
      errorMessage: null,
    };
  } catch (err: any) {
    const errorMessage = err.message;
    const completedAt = now();

    await run(
      `UPDATE ${getBackupTable()} SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
      [errorMessage, completedAt, recordId],
    );

    if (fs.existsSync(backupFile)) {
      try {
        fs.unlinkSync(backupFile);
      } catch {
        /* ignore cleanup failure */
      }
    }

    return {
      id: recordId,
      tenantSlug,
      schemaName,
      backupFile,
      fileSize: 0,
      checksum: '',
      status: 'failed',
      startedAt,
      completedAt,
      verifiedAt: null,
      errorMessage,
    };
  }
}

export async function restoreTenantBackup(tenantSlug: string, backupFile: string): Promise<void> {
  if (!isPostgres()) {
    throw new Error('Tenant restore requires PostgreSQL');
  }

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  const tenant = await query(`SELECT id FROM tenants WHERE slug = ?`, [tenantSlug]);

  if (tenant.length === 0) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  const tenantId = tenant[0].id;
  const schemaName = `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;

  const integrity = await verifyBackupIntegrity(backupFile);
  if (!integrity.valid) {
    throw new Error(`Backup integrity check failed: ${integrity.error}`);
  }

  await run(`DROP SCHEMA IF EXISTS ${sanitizeIdentifier(schemaName)} CASCADE`);
  await run(`CREATE SCHEMA IF NOT EXISTS ${sanitizeIdentifier(schemaName)}`);

  try {
    const dbUrl = getDbUrl();
    const pgRestorePath = process.env.PG_RESTORE_PATH || 'pg_restore';

    execSync(
      `${pgRestorePath} ` +
        `--dbname="${dbUrl}" ` +
        `--schema=${sanitizeIdentifier(schemaName)} ` +
        `--format=custom ` +
        `--no-owner ` +
        `--no-acl ` +
        `--exit-on-error ` +
        `"${backupFile}"`,
      { timeout: parseInt(process.env.RESTORE_TIMEOUT_MS || '600000', 10) },
    );

    const record = await query(
      `SELECT id FROM ${getBackupTable()} WHERE backup_file = ? ORDER BY started_at DESC LIMIT 1`,
      [backupFile],
    );

    if (record.length > 0) {
      await run(
        `UPDATE ${getBackupTable()} SET status = 'verified', verified_at = ? WHERE id = ?`,
        [now(), record[0].id],
      );
    }
  } catch (err: any) {
    await run(`DROP SCHEMA IF EXISTS ${sanitizeIdentifier(schemaName)} CASCADE`);
    throw new Error(`Restore failed for tenant ${tenantSlug}: ${err.message}`);
  }
}

export async function verifyBackupIntegrity(backupFile: string): Promise<{
  valid: boolean;
  fileSize: number;
  checksum: string;
  error?: string;
  verifiedAt: string;
}> {
  const result = {
    valid: false,
    fileSize: 0,
    checksum: '',
    error: undefined as string | undefined,
    verifiedAt: now(),
  };

  if (!fs.existsSync(backupFile)) {
    result.error = `File not found: ${backupFile}`;
    return result;
  }

  const stat = fs.statSync(backupFile);
  result.fileSize = stat.size;

  if (stat.size === 0) {
    result.error = 'Backup file is empty';
    return result;
  }

  try {
    result.checksum = computeChecksum(backupFile);
  } catch (err: any) {
    result.error = `Checksum computation failed: ${err.message}`;
    return result;
  }

  if (isPostgres()) {
    try {
      const dbUrl = getDbUrl();
      const pgRestorePath = process.env.PG_RESTORE_PATH || 'pg_restore';

      execSync(
        `${pgRestorePath} ` +
          `--dbname="${dbUrl}" ` +
          `--format=custom ` +
          `--list ` +
          `"${backupFile}"`,
        { timeout: 30000, stdio: 'pipe' },
      );

      result.valid = true;
    } catch (err: any) {
      result.error = `pg_restore list verification failed: ${err.message}`;
      return result;
    }
  } else {
    try {
      const fd = fs.openSync(backupFile, 'r');
      const buffer = Buffer.alloc(128);
      fs.readSync(fd, buffer, 0, 128, 0);
      fs.closeSync(fd);
      const header = buffer.toString('utf8');
      if (header.length > 0) {
        result.valid = true;
      } else {
        result.error = 'File appears to be empty or corrupt';
        return result;
      }
    } catch (err: any) {
      result.error = `File read failed: ${err.message}`;
      return result;
    }
  }

  return result;
}

export async function listTenantBackups(tenantSlug: string): Promise<TenantBackupRecord[]> {
  await ensureBackupRecordsTable();

  const rows = await query(
    `SELECT * FROM ${getBackupTable()} WHERE tenant_slug = ? ORDER BY started_at DESC`,
    [tenantSlug],
  );

  return rows.map((r: any) => ({
    id: r.id,
    tenantSlug: r.tenant_slug,
    schemaName: r.schema_name,
    backupFile: r.backup_file,
    fileSize: r.file_size || 0,
    checksum: r.checksum || '',
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at || null,
    verifiedAt: r.verified_at || null,
    errorMessage: r.error_message || null,
  }));
}

export async function getAllTenantBackups(): Promise<TenantBackupRecord[]> {
  await ensureBackupRecordsTable();

  const rows = await query(
    `SELECT * FROM ${getBackupTable()} ORDER BY started_at DESC LIMIT 100`,
  );

  return rows.map((r: any) => ({
    id: r.id,
    tenantSlug: r.tenant_slug,
    schemaName: r.schema_name,
    backupFile: r.backup_file,
    fileSize: r.file_size || 0,
    checksum: r.checksum || '',
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at || null,
    verifiedAt: r.verified_at || null,
    errorMessage: r.error_message || null,
  }));
}

export async function deleteTenantBackup(backupId: string): Promise<boolean> {
  await ensureBackupRecordsTable();

  const rows = await query(
    `SELECT backup_file FROM ${getBackupTable()} WHERE id = ?`,
    [backupId],
  );

  if (rows.length === 0) return false;

  const backupFile = rows[0].backup_file;

  try {
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
  } catch {
    /* file may be gone */
  }

  await run(`DELETE FROM ${getBackupTable()} WHERE id = ?`, [backupId]);
  return true;
}

export async function verifyLatestBackups(
  tenantSlug: string,
  limit = 5,
): Promise<{ id: string; backupFile: string; verified: boolean; error?: string }[]> {
  const backups = await listTenantBackups(tenantSlug);
  const recent = backups.filter((b) => b.status === 'completed' || b.status === 'verified').slice(0, limit);

  const results: { id: string; backupFile: string; verified: boolean; error?: string }[] = [];

  for (const backup of recent) {
    const integrity = await verifyBackupIntegrity(backup.backupFile);
    results.push({
      id: backup.id,
      backupFile: backup.backupFile,
      verified: integrity.valid,
      error: integrity.error,
    });

    if (integrity.valid) {
      await run(
        `UPDATE ${getBackupTable()} SET status = 'verified', verified_at = ? WHERE id = ?`,
        [now(), backup.id],
      );
    }
  }

  return results;
}
