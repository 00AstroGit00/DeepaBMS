import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query, run } from '../../db';

export const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'migrations');

export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: string;
  checksum: string;
  durationMs: number;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
}

function isPostgres(): boolean {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

function now(): string {
  return new Date().toISOString();
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function ensureVersionTable(): Promise<void> {
  if (isPostgres()) {
    await run(`CREATE SCHEMA IF NOT EXISTS shared`);
    await run(`
      CREATE TABLE IF NOT EXISTS shared.schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(128) NOT NULL,
        duration_ms INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
      )
    `);
  } else {
    await run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(128) NOT NULL,
        duration_ms INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
      )
    `);
  }
}

function computeChecksum(sql: string): string {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

function loadMigrationFiles(): { version: string; name: string; sql: string; checksum: string }[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const migrations: { version: string; name: string; sql: string; checksum: string }[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+[\d_]*[a-zA-Z0-9]?)[-_](.+)\.sql$/);
    if (!match) continue;
    const version = match[1];
    const name = match[2];
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = computeChecksum(sql);
    migrations.push({ version, name, sql, checksum });
  }

  return migrations;
}

export async function runSharedMigration(sql: string, name: string, version: string): Promise<MigrationRecord> {
  await ensureVersionTable();

  const existing = await query(
    `SELECT * FROM ${isPostgres() ? 'shared.schema_migrations' : 'schema_migrations'} WHERE version = ?`,
    [version],
  );

  if (existing.length > 0) {
    const record = existing[0];
    if (record.status === 'applied') {
      return {
        version: record.version,
        name: record.name,
        appliedAt: record.applied_at,
        checksum: record.checksum,
        durationMs: record.duration_ms,
        status: record.status,
      };
    }
  }

  const checksum = computeChecksum(sql);
  const start = Date.now();

  try {
    if (isPostgres()) {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await run('BEGIN');

      for (const stmt of statements) {
        await run(stmt);
      }

      await run(
        `INSERT INTO shared.schema_migrations (version, name, checksum, duration_ms, status)
         VALUES (?, ?, ?, ?, 'applied')
         ON CONFLICT (version) DO UPDATE SET
           name = EXCLUDED.name,
           checksum = EXCLUDED.checksum,
           duration_ms = EXCLUDED.duration_ms,
           status = 'applied',
           applied_at = CURRENT_TIMESTAMP`,
        [version, name, checksum, Date.now() - start],
      );

      await run('COMMIT');
    } else {
      await run(sql);

      const elapsed = Date.now() - start;
      const existingRow = await query(
        `SELECT id FROM schema_migrations WHERE version = ?`,
        [version],
      );

      if (existingRow.length > 0) {
        await run(
          `UPDATE schema_migrations SET name = ?, checksum = ?, duration_ms = ?, status = 'applied', applied_at = CURRENT_TIMESTAMP WHERE version = ?`,
          [name, checksum, elapsed, version],
        );
      } else {
        await run(
          `INSERT INTO schema_migrations (version, name, checksum, duration_ms, status) VALUES (?, ?, ?, ?, 'applied')`,
          [version, name, checksum, elapsed],
        );
      }
    }

    return {
      version,
      name,
      appliedAt: now(),
      checksum,
      durationMs: Date.now() - start,
      status: 'applied',
    };
  } catch (err: any) {
    try {
      if (isPostgres()) {
        await run('ROLLBACK');
      }
    } catch {
      /* rollback failed */
    }

    const elapsed = Date.now() - start;
    await run(
      `INSERT INTO ${isPostgres() ? 'shared.schema_migrations' : 'schema_migrations'} (version, name, checksum, duration_ms, status)
       VALUES (?, ?, ?, ?, 'failed')
       ON CONFLICT (version) DO UPDATE SET
         status = 'failed',
         duration_ms = EXCLUDED.duration_ms`,
      [version, name, checksum, elapsed],
    );

    throw new Error(`Migration ${version}-${name} failed: ${err.message}`);
  }
}

export async function runTenantMigrations(sql: string, name: string, version: string): Promise<{ tenantId: string; result: MigrationRecord }[]> {
  if (!isPostgres()) {
    throw new Error('Tenant migrations require PostgreSQL');
  }

  const tenants = await query(
    `SELECT id, slug FROM tenants WHERE status IN ('trial', 'active', 'past_due')`,
  );

  if (tenants.length === 0) {
    return [];
  }

  const results: { tenantId: string; result: MigrationRecord }[] = [];
  const checksum = computeChecksum(sql);

  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
    const start = Date.now();

    try {
      const prefixedSql = `SET LOCAL search_path TO ${sanitizeIdentifier(schemaName)}, public;\n${sql}`;
      const statements = prefixedSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await run(stmt);
      }

      await run(
        `INSERT INTO shared.schema_migrations (version, name, checksum, duration_ms, status, applied_at)
         VALUES (?, ?, ?, ?, 'applied', CURRENT_TIMESTAMP)
         ON CONFLICT (version) DO NOTHING`,
        [`${version}_${tenant.id}`, `${name} (tenant: ${tenant.slug})`, checksum, Date.now() - start],
      );

      results.push({
        tenantId: tenant.id,
        result: {
          version: `${version}_${tenant.id}`,
          name: `${name} (tenant: ${tenant.slug})`,
          appliedAt: now(),
          checksum,
          durationMs: Date.now() - start,
          status: 'applied',
        },
      });
    } catch (err: any) {
      results.push({
        tenantId: tenant.id,
        result: {
          version: `${version}_${tenant.id}`,
          name: `${name} (tenant: ${tenant.slug})`,
          appliedAt: now(),
          checksum,
          durationMs: Date.now() - start,
          status: 'failed',
        },
      });
    }
  }

  return results;
}

export async function rollbackMigration(version: string): Promise<MigrationRecord | null> {
  await ensureVersionTable();

  const table = isPostgres() ? 'shared.schema_migrations' : 'schema_migrations';

  const existing = await query(
    `SELECT * FROM ${table} WHERE version = ? AND status = 'applied'`,
    [version],
  );

  if (existing.length === 0) {
    return null;
  }

  const record = existing[0];

  if (isPostgres()) {
    await run(
      `UPDATE ${table} SET status = 'rolled_back', applied_at = CURRENT_TIMESTAMP WHERE version = ?`,
      [version],
    );
  } else {
    await run(
      `UPDATE ${table} SET status = 'rolled_back', applied_at = CURRENT_TIMESTAMP WHERE version = ?`,
      [version],
    );
  }

  return {
    version: record.version,
    name: record.name,
    appliedAt: now(),
    checksum: record.checksum,
    durationMs: record.duration_ms,
    status: 'rolled_back',
  };
}

export async function getMigrationStatus(): Promise<MigrationRecord[]> {
  await ensureVersionTable();

  const table = isPostgres() ? 'shared.schema_migrations' : 'schema_migrations';
  const rows = await query(
    `SELECT * FROM ${table} ORDER BY applied_at DESC`,
  );

  return rows.map((r: any) => ({
    version: r.version,
    name: r.name,
    appliedAt: r.applied_at,
    checksum: r.checksum,
    durationMs: r.duration_ms,
    status: r.status,
  }));
}

export async function runPendingMigrations(): Promise<MigrationRecord[]> {
  const migrations = loadMigrationFiles();
  const applied = await getMigrationStatus();
  const appliedVersions = new Set(applied.map((m) => m.version));

  const results: MigrationRecord[] = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    const result = await runSharedMigration(migration.sql, migration.name, migration.version);
    results.push(result);
  }

  return results;
}

export async function runPendingTenantMigrations(): Promise<{ tenantId: string; result: MigrationRecord }[]> {
  const migrations = loadMigrationFiles();
  const applied = await getMigrationStatus();
  const appliedVersions = new Set(applied.map((m) => m.version));

  const allResults: { tenantId: string; result: MigrationRecord }[] = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    const results = await runTenantMigrations(migration.sql, migration.name, migration.version);
    allResults.push(...results);
  }

  return allResults;
}
