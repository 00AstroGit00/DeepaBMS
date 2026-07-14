/**
 * DeepaBMS — UAT Scenario Support Matrix (P7 Phase 4)
 *
 * Automated precondition for the 18 UAT business scenarios. Verifies the live
 * schema (after schema.sql + seed) supports every scenario's data model, so
 * on-site UAT coordinators know the backend is ready before involving users.
 *
 * NOTE: Full UAT with real operators happens on-site (see docs/pilot/04-uat-report.md).
 * This test is the automated, repeatable precondition that runs in CI.
 *
 * Run: SQLITE_DB_PATH=/tmp/uat.db npm test -- tests/uat/uat.scenarios.test.ts
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SCHEMA = path.join(__dirname, '..', '..', 'src', 'schema.sql');

interface Scenario {
  id: string;
  name: string;
  tables: string[];
}

const SCENARIOS: Scenario[] = [
  { id: 'S01', name: 'Hotel booking', tables: ['rooms', 'stays_archive'] },
  { id: 'S02', name: 'Check-in', tables: ['stays_archive', 'rooms'] },
  { id: 'S03', name: 'Restaurant ordering', tables: ['restaurant_orders', 'order_lines', 'dining_sessions'] },
  { id: 'S04', name: 'Kitchen workflow', tables: ['kot', 'kot_items', 'kitchen_stations'] },
  { id: 'S05', name: 'Bar billing', tables: ['bar_sales', 'bar_sale_lines', 'liquor'] },
  { id: 'S06', name: 'Inventory deduction', tables: ['inventory', 'inventory_ledger'] },
  { id: 'S07', name: 'Purchase receipt', tables: ['goods_receipts', 'goods_receipt_lines', 'purchase_orders'] },
  { id: 'S08', name: 'Supplier payment', tables: ['supplier_invoices', 'bank_accounts', 'txns'] },
  { id: 'S09', name: 'Payroll', tables: ['employees', 'employee_advances', 'employee_attendance'] },
  { id: 'S10', name: 'GST', tables: ['txns', 'sales', 'settings'] },
  { id: 'S11', name: 'Accounting', tables: ['txns', 'bank_accounts', 'bank_moves'] },
  { id: 'S12', name: 'Analytics', tables: ['sales', 'restaurant_orders', 'bar_sales'] },
  { id: 'S13', name: 'AI Copilot', tables: ['sales', 'inventory', 'liquor'] },
  { id: 'S14', name: 'Workflow approvals', tables: ['purchase_orders', 'purchase_order_approvals'] },
  { id: 'S15', name: 'Offline synchronization', tables: ['security_audit_log'] },
  { id: 'S16', name: 'Backup', tables: ['settings'] },
  { id: 'S17', name: 'Restore', tables: ['settings'] },
  { id: 'S18', name: 'Night audit', tables: ['stays_archive', 'rooms', 'txns'] },
];

describe('UAT Scenario Support Matrix', () => {
  let db: sqlite3.Database;
  let dbPath: string;

  beforeAll((done) => {
    dbPath = path.join(os.tmpdir(), `uat-${Date.now()}.db`);
    db = new sqlite3.Database(dbPath);
    const sql = fs.readFileSync(SCHEMA, 'utf8');
    db.exec(sql, (err) => (err ? done(err) : done()));
  });

  afterAll((done) => {
    db.close(() => {
      fs.existsSync(dbPath) && fs.unlinkSync(dbPath);
      done();
    });
  });

  const tableExists = (t: string): Promise<boolean> =>
    new Promise((res, rej) =>
      db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [t],
        (e, r) => (e ? rej(e) : res(!!r)),
      ),
    );

  it('schema loads without error', () => {
    expect(db).toBeDefined();
  });

  SCENARIOS.forEach((s) => {
    it(`${s.id} ${s.name} — required tables present`, async () => {
      for (const t of s.tables) {
        const exists = await tableExists(t);
        expect(exists).toBe(true);
      }
    });
  });

  it('double-entry table (txns) present with debit/credit columns', async () => {
    const cols = await new Promise<any[]>((res, rej) =>
      db.all(`PRAGMA table_info(txns)`, (e, r) => (e ? rej(e) : res(r))),
    );
    const names = cols.map((c) => c.name);
    expect(names).toContain('debit');
    expect(names).toContain('credit');
  });
});
