// import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// ── Database Provider Interface ───────────────────────────────────────────
export interface DatabaseProvider {
  query(sql: string, params?: any[]): Promise<any[]>;
  run(
    sql: string,
    params?: any[],
  ): Promise<{ lastID: number; changes: number }>;
  initializeSchema(): Promise<void>;
  verifyIntegrity(): Promise<{ ok: boolean; detail: string }>;
}

// ── SQLite Provider Implementation ─────────────────────────────────────────
export class SQLiteProvider implements DatabaseProvider {
  private sqliteDb: any; // Use any to avoid top-level sqlite3 type dependency
  private dbFile: string;

  constructor() {
    // Lazy-load sqlite3 bindings to avoid process crashes in non-sqlite environments
    const sqlite3 = require('sqlite3').verbose();
    this.dbFile =
      process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'deepa-bms.db');
    const dbDir = path.dirname(this.dbFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.sqliteDb = new sqlite3.Database(this.dbFile);
    this.sqliteDb.serialize(() => {
      this.sqliteDb.run('PRAGMA journal_mode=WAL;');
      this.sqliteDb.run('PRAGMA busy_timeout=5000;');
      this.sqliteDb.run('PRAGMA foreign_keys=ON;');
      this.sqliteDb.run('PRAGMA wal_autocheckpoint=1000;');
      this.sqliteDb.run('PRAGMA synchronous=NORMAL;');
    });
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, params, (err: any, rows: any) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  run(
    sql: string,
    params: any[] = [],
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.sqliteDb.run(sql, params, function (this: any, err: any) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async initializeSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      fs.readFile(schemaPath, 'utf8', (err, sql) => {
        if (err) return reject(err);
        this.sqliteDb.exec(sql, (execErr: any) => {
          if (execErr) return reject(execErr);
          // Idempotent column checks
          this.sqliteDb.run(
            'ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT 0',
            () => resolve(),
          );
        });
      });
    });
  }

  verifyIntegrity(): Promise<{ ok: boolean; detail: string }> {
    return new Promise((resolve) => {
      this.sqliteDb.get('PRAGMA integrity_check', (err: any, row: any) => {
        if (err) return resolve({ ok: false, detail: err.message });
        const ok =
          row && (row.integrity_check === 'ok' || row.integrity_check === 0);
        resolve({ ok, detail: row ? String(row.integrity_check) : 'unknown' });
      });
    });
  }

  getRawDb(): any {
    return this.sqliteDb;
  }
}

// ── PostgreSQL Provider Implementation ─────────────────────────────────────
export class PostgresProvider implements DatabaseProvider {
  private pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/deepabms';
    this.pool = new Pool({
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  private translateSql(sql: string): string {
    let index = 1;
    let insideSingleQuote = false;
    let insideDoubleQuote = false;
    let result = '';
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      if (char === "'" && sql[i - 1] !== '\\') {
        insideSingleQuote = !insideSingleQuote;
        result += char;
      } else if (char === '"' && sql[i - 1] !== '\\') {
        insideDoubleQuote = !insideDoubleQuote;
        result += char;
      } else if (char === '?' && !insideSingleQuote && !insideDoubleQuote) {
        result += `$${index++}`;
      } else {
        result += char;
      }
    }
    return result;
  }

  private translateDdl(sql: string): string {
    let cleanSql = sql.replace(/PRAGMA[^;]+;/gi, '');
    cleanSql = cleanSql.replace(
      /INTEGER PRIMARY KEY AUTOINCREMENT/gi,
      'SERIAL PRIMARY KEY',
    );
    // Map BOOLEAN type to SMALLINT to support strict integer equality comparisons (= 0, = 1) in SQL queries
    cleanSql = cleanSql.replace(/\bBOOLEAN\b/gi, 'SMALLINT');
    return cleanSql;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const pgSql = this.translateSql(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rows;
  }

  async run(
    sql: string,
    params: any[] = [],
  ): Promise<{ lastID: number; changes: number }> {
    const pgSql = this.translateSql(sql);
    const result = await this.pool.query(pgSql, params);
    // Map last insert ID or row count where available
    const lastID =
      (result.rows && result.rows[0] && (result.rows[0] as any).id) || 0;
    return { lastID, changes: result.rowCount || 0 };
  }

  async initializeSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const ddl = this.translateDdl(sql);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(ddl);

      // Idempotent column check for users table
      await client.query(`
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE users ADD COLUMN force_password_change SMALLINT DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN null;
          END;
        END;
        $$;
      `);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async verifyIntegrity(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.pool.query('SELECT 1');
      return { ok: true, detail: 'PostgreSQL connection active' };
    } catch (err: any) {
      return { ok: false, detail: err.message };
    }
  }
}

// ── Database Provider Factory ──────────────────────────────────────────────
export const DatabaseFactory = {
  getProvider(): DatabaseProvider {
    const usePostgres =
      process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
    if (usePostgres) {
      console.log('[DB] Initializing cloud PostgreSQL provider...');
      return new PostgresProvider();
    }
    console.log('[DB] Initializing local SQLite3 provider...');
    return new SQLiteProvider();
  },
};

// Lazy singleton — created on first use, not at module import time.
// This ensures tests can set process.env.SQLITE_DB_PATH (or DB_PROVIDER)
// before the provider is instantiated.
let _activeProvider: DatabaseProvider | null = null;

function getActiveProvider(): DatabaseProvider {
  if (!_activeProvider) {
    _activeProvider = DatabaseFactory.getProvider();
  }
  return _activeProvider;
}

/** Reset the provider singleton — used by tests to get a fresh connection. */
export function resetProvider(): void {
  _activeProvider = null;
}

/**
 * Returns the currently active provider instance (or null if not yet created).
 * Used by tests in afterAll to close the SQLite connection without creating a
 * new provider via DatabaseFactory.getProvider().
 */
export function getActiveProviderInstance(): DatabaseProvider | null {
  return _activeProvider;
}

// ── Backwards Compatible API Exports ────────────────────────────────────────
export const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return getActiveProvider().query(sql, params);
};

export const run = (
  sql: string,
  params: any[] = [],
): Promise<{ lastID: number; changes: number }> => {
  return getActiveProvider().run(sql, params);
};

export const initializeDatabase = (): Promise<void> => {
  return getActiveProvider().initializeSchema();
};

export const verifyIntegrity = (): Promise<{ ok: boolean; detail: string }> => {
  return getActiveProvider().verifyIntegrity();
};

// SQLite transaction retry logic remains active
export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> => {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (/SQLITE_BUSY|SQLITE_LOCKED/.test(err?.message || '')) {
        await new Promise((r) => setTimeout(r, 50 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

// Legacy raw db object wrapper proxy (for index.ts health checks / serialization fallback)
export const db = {
  get(
    sql: string,
    params: any[] = [],
    callback?: (err: any, row?: any) => void,
  ) {
    getActiveProvider()
      .query(sql, params)
      .then((rows) => {
        if (callback) callback(null, rows[0]);
      })
      .catch((err) => {
        if (callback) callback(err);
      });
  },
  run(sql: string, params: any[] = [], callback?: (err: any) => void) {
    getActiveProvider()
      .run(sql, params)
      .then(() => {
        if (callback) callback(null);
      })
      .catch((err) => {
        if (callback) callback(err);
      });
  },
  serialize(callback: () => void) {
    callback();
  },
} as any;
