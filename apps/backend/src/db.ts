import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILE =
  process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'deepa-bms.db');

// Ensure parent directory exists (critical for custom folder volumes)
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to SQLite database at:', DB_FILE);
  }
});

// ── M2-2: SQLite reliability hardening ────────────────────────────────────
// Enable WAL for concurrent readers/writers, busy_timeout to avoid SQLITE_BUSY
// on hot paths (sync engine + request writes), and foreign keys for integrity.
db.serialize(() => {
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA busy_timeout=5000;');
  db.run('PRAGMA foreign_keys=ON;');
  db.run('PRAGMA wal_autocheckpoint=1000;');
  db.run('PRAGMA synchronous=NORMAL;');
});

// Run migrations on start
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    fs.readFile(schemaPath, 'utf8', (err, sql) => {
      if (err) {
        return reject(err);
      }
      db.exec(sql, (execErr) => {
        if (execErr) {
          return reject(execErr);
        }
        // Idempotent column addition for existing databases (M1-1).
        db.run(
          'ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT 0',
          () => {
            /* column may already exist — ignore error */
          },
        );
        console.log(
          'Database tables, checks and constraints verified successfully.',
        );
        resolve();
      });
    });
  });
};

export const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

export const run = (
  sql: string,
  params: any[] = [],
): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// ── M2-2: transaction retry (handles SQLITE_BUSY transiently) ──────────────
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

// ── M2-2: database integrity verification ─────────────────────────────────
export const verifyIntegrity = (): Promise<{ ok: boolean; detail: string }> => {
  return new Promise((resolve) => {
    db.get('PRAGMA integrity_check', (err, row: any) => {
      if (err) return resolve({ ok: false, detail: err.message });
      const ok =
        row && (row.integrity_check === 'ok' || row.integrity_check === 0);
      resolve({
        ok: !!ok,
        detail: row ? String(row.integrity_check) : 'no result',
      });
    });
  });
};
