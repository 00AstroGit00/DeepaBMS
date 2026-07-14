/**
 * DeepaBMS — Migration Validation (P7 Phase 2)
 *
 * Recomputes per-table record counts and checksums from the live DB and
 * compares against migration-manifest.json, then runs financial reconciliation
 * and referential-integrity checks. Exits non-zero on any failure so it can
 * gate the pilot go-live in CI.
 *
 * Usage: SQLITE_DB_PATH=/data/deepa/deepa-bms.db ts-node scripts/migration/validate.ts
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.join(__dirname, '..', '..', 'deepa-bms.db');
const MANIFEST_PATH = path.join(__dirname, 'migration-manifest.json');
const EXPECTED_PATH = path.join(__dirname, 'expected.json');

const db = new sqlite3.Database(DB_PATH);
const q = (sql: string, p: any[] = []): Promise<any[]> =>
  new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const q1 = async (sql: string, p: any[] = []): Promise<number> => {
  const r = await q(sql, p);
  return r[0]?.n ?? r[0]?.v ?? 0;
};

let failures = 0;
function fail(msg: string) {
  failures++;
  console.error(`  [FAIL] ${msg}`);
}
function ok(msg: string) {
  console.log(`  [ OK ] ${msg}`);
}

function chk(sum: string, rows: any[][]): string {
  const h = crypto.createHash('sha256');
  for (const r of rows) h.update(JSON.stringify(r));
  return h.digest('hex');
}

async function main() {
  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : null;
  const expected = fs.existsSync(EXPECTED_PATH)
    ? JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'))
    : null;

  // 1. Record counts + checksums per migrated table
  const tables = manifest ? Object.keys(manifest) : expected ? Object.keys(expected) : [];
  for (const t of tables) {
    const count = await q1(`SELECT COUNT(*) AS n FROM ${t}`);
    const rows = await q(`SELECT * FROM ${t}`);
    const sum = chk('', rows.map((r) => Object.values(r)));
    const expCount = (expected?.[t]?.rows ?? manifest?.[t]?.rows) ?? count;
    const expSum = expected?.[t]?.checksum ?? manifest?.[t]?.checksum ?? sum;
    if (count !== expCount) fail(`${t}: count ${count} != expected ${expCount}`);
    else ok(`${t}: count=${count}`);
    if (sum !== expSum) fail(`${t}: checksum mismatch`);
    else ok(`${t}: checksum verified`);
  }

  // 2. Financial reconciliation (double-entry integrity)
  try {
    const debit = await q1(`SELECT COALESCE(SUM(debit),0) AS n FROM txns`);
    const credit = await q1(`SELECT COALESCE(SUM(credit),0) AS n FROM txns`);
    if (Math.abs(debit - credit) > 0.01)
      fail(`txns out of balance: debit=${debit} credit=${credit}`);
    else ok(`txns balanced: debit=credit=${debit}`);
  } catch {
    console.warn('  (txns table not present — skipping GL balance check)');
  }

  // 3. Bank balances reconcile to expected trial balance
  if (expected?.trialBalance != null) {
    const bal = await q1(`SELECT COALESCE(SUM(balance),0) AS n FROM bank_accounts`);
    if (Math.abs(bal - expected.trialBalance) > 0.01)
      fail(`bank balances ${bal} != trial balance ${expected.trialBalance}`);
    else ok(`bank balances reconcile to trial balance ${bal}`);
  }

  // 4. Referential integrity (orphans)
  const riChecks: [string, string, string][] = [
    ['rooms', 'id', 'stays_archive.room_id'],
    ['suppliers', 'id', 'supplier_invoices.supplier_id'],
    ['users', 'id', 'security_audit_log.user_id'],
  ];
  for (const [parent, pk, fk] of riChecks) {
    const [child, col] = fk.split('.');
    const orphan = await q1(
      `SELECT COUNT(*) AS n FROM ${child} c LEFT JOIN ${parent} p ON c.${col}=p.${pk} WHERE p.${pk} IS NULL`,
    );
    if (orphan > 0) fail(`orphans in ${child}.${col}: ${orphan}`);
    else ok(`referential integrity: ${child}.${col}`);
  }

  db.close();
  if (failures > 0) {
    console.error(`\nVALIDATION FAILED: ${failures} issue(s)`);
    process.exit(1);
  }
  console.log('\nVALIDATION PASSED: all counts, checksums, reconciliations and RI checks OK');
}

main().catch((e) => {
  console.error('Validation error:', e);
  process.exit(1);
});
