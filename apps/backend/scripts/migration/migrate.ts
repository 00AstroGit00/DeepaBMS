/**
 * DeepaBMS — Data Migration Runner (P7 Phase 2)
 *
 * Loads legacy ERP CSV exports and maps them into the DeepaBMS SQLite schema.
 * Self-contained (uses only `sqlite3`, no new dependencies). Designed to run
 * in CI / on the pilot server, NOT in Termux (native sqlite3 binary required).
 *
 * Usage:
 *   SQLITE_DB_PATH=/data/deepa/deepa-bms.db \
 *   LEGACY_DIR=./scripts/migration/legacy \
 *   ts-node scripts/migration/migrate.ts
 *
 * Produces: scripts/migration/migration-manifest.json (counts + checksums)
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const LEGACY_DIR = process.env.LEGACY_DIR || path.join(__dirname, 'legacy');
const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.join(__dirname, '..', '..', 'deepa-bms.db');
const MANIFEST_PATH = path.join(__dirname, 'migration-manifest.json');

// ---- minimal CSV parser (no external dep) ----
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

// ---- migration registry: legacy file -> target table + column map ----
interface Mapping {
  file: string;
  table: string;
  columns: string[];
  transform?: (row: Record<string, string>) => any[];
}

const MAPPINGS: Mapping[] = [
  {
    file: 'employees.csv',
    table: 'employees',
    columns: ['id', 'name', 'role', 'department', 'joined_at', 'active'],
    transform: (r) => [
      r.id,
      r.name,
      r.role || 'employee',
      r.department || 'general',
      r.joined_at || new Date().toISOString(),
      r.active === 'false' ? 0 : 1,
    ],
  },
  {
    file: 'customers.csv',
    table: 'credit_accounts',
    columns: ['id', 'name', 'balance', 'credit_limit', 'gstin'],
    transform: (r) => [
      r.id,
      r.name,
      parseFloat(r.balance || '0'),
      parseFloat(r.credit_limit || '0'),
      r.gstin || '',
    ],
  },
  {
    file: 'suppliers.csv',
    table: 'suppliers',
    columns: ['id', 'name', 'gstin', 'contact', 'outstanding'],
    transform: (r) => [
      r.id,
      r.name,
      r.gstin || '',
      r.contact || '',
      parseFloat(r.outstanding || '0'),
    ],
  },
  {
    file: 'inventory.csv',
    table: 'inventory',
    columns: ['id', 'sku', 'name', 'category', 'quantity', 'unit_cost', 'unit_price'],
    transform: (r) => [
      r.id,
      r.sku,
      r.name,
      r.category || 'general',
      parseFloat(r.quantity || '0'),
      parseFloat(r.unit_cost || '0'),
      parseFloat(r.unit_price || '0'),
    ],
  },
  {
    file: 'liquor.csv',
    table: 'liquor',
    columns: ['id', 'brand', 'category', 'bottles', 'open_bottles', 'unit_cost', 'unit_price'],
    transform: (r) => [
      r.id,
      r.brand,
      r.category || 'spirits',
      parseFloat(r.bottles || '0'),
      parseFloat(r.open_bottles || '0'),
      parseFloat(r.unit_cost || '0'),
      parseFloat(r.unit_price || '0'),
    ],
  },
  {
    file: 'rooms.csv',
    table: 'rooms',
    columns: ['id', 'number', 'type', 'rate', 'status'],
    transform: (r) => [
      r.id,
      r.number,
      r.type || 'standard',
      parseFloat(r.rate || '0'),
      r.status || 'available',
    ],
  },
  {
    file: 'reservations.csv',
    table: 'stays_archive',
    columns: ['id', 'room_id', 'guest_name', 'check_in', 'check_out', 'status'],
    transform: (r) => [
      r.id,
      r.room_id,
      r.guest_name,
      r.check_in,
      r.check_out,
      r.status || 'booked',
    ],
  },
  {
    file: 'account_balances.csv',
    table: 'bank_accounts',
    columns: ['id', 'name', 'balance'],
    transform: (r) => [r.id, r.name, parseFloat(r.balance || '0')],
  },
  {
    file: 'purchase_history.csv',
    table: 'supplier_invoices',
    columns: ['id', 'supplier_id', 'invoice_no', 'date', 'amount', 'paid'],
    transform: (r) => [
      r.id,
      r.supplier_id,
      r.invoice_no,
      r.date,
      parseFloat(r.amount || '0'),
      parseFloat(r.paid || '0'),
    ],
  },
];

function checksum(rows: any[][]): string {
  const h = crypto.createHash('sha256');
  for (const row of rows) h.update(JSON.stringify(row));
  return h.digest('hex');
}

async function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.error(`Legacy directory not found: ${LEGACY_DIR}`);
    process.exit(2);
  }
  const db = new sqlite3.Database(DB_PATH);
  const manifest: Record<string, { rows: number; checksum: string }> = {};

  for (const m of MAPPINGS) {
    const file = path.join(LEGACY_DIR, m.file);
    if (!fs.existsSync(file)) {
      console.warn(`  SKIP ${m.file} (not provided)`);
      continue;
    }
    const rowsRaw = parseCsv(fs.readFileSync(file, 'utf8'));
    const values = rowsRaw.map((r) => (m.transform ? m.transform(r) : m.columns.map((c) => r[c])));
    const placeholders = m.columns.map(() => '?').join(',');
    const sql = `INSERT OR IGNORE INTO ${m.table} (${m.columns.join(',')}) VALUES (${placeholders})`;

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN');
        const stmt = db.prepare(sql);
        for (const v of values) stmt.run(v);
        stmt.finalize((e) => {
          if (e) {
            db.run('ROLLBACK');
            return reject(e);
          }
          db.run('COMMIT', (ce) => (ce ? reject(ce) : resolve()));
        });
      });
    });

    manifest[m.table] = { rows: values.length, checksum: checksum(values) };
    console.log(`  ${m.table}: ${values.length} rows migrated`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${MANIFEST_PATH}`);
  db.close();
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
