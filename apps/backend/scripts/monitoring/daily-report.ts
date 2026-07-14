/**
 * DeepaBMS — Daily Production Monitoring Report (P7 Phase 7)
 *
 * Queries the live DB for operational metrics and writes a daily report
 * (JSON + Markdown) for the pilot operations log. Designed to run from cron.
 *
 * Usage: SQLITE_DB_PATH=/data/deepa/deepa-bms.db ts-node scripts/monitoring/daily-report.ts
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(__dirname, '..', '..', 'deepa-bms.db');
const OUT_DIR = process.env.REPORT_DIR || path.join(__dirname, 'reports');
const db = new sqlite3.Database(DB_PATH);
const q1 = (sql: string, p: any[] = []): Promise<number> =>
  new Promise((res, rej) => db.get(sql, p, (e: any, r: any) => (e ? rej(e) : res(r?.v ?? r?.n ?? 0))));
const q = (sql: string, p: any[] = []): Promise<any[]> =>
  new Promise((res, rej) => db.all(sql, p, (e: any, r: any) => (e ? rej(e) : res(r))));

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const since = `${today} 00:00:00`;

  const salesCount = await q1(`SELECT COUNT(*) AS n FROM sales WHERE created_at >= ?`, [since]);
  const revenue = await q1(`SELECT COALESCE(SUM(amount),0) AS n FROM sales WHERE created_at >= ?`, [since]);
  const failedTxns = await q1(
    `SELECT COUNT(*) AS n FROM security_audit_log WHERE action LIKE '%fail%' AND date >= ?`,
    [since],
  );
  const roomsOccupied = await q1(`SELECT COUNT(*) AS n FROM rooms WHERE status='occupied'`);
  const lowStock = await q1(`SELECT COUNT(*) AS n FROM inventory WHERE quantity <= reorder_level`);
  const openBottles = await q1(`SELECT COUNT(*) AS n FROM liquor WHERE open_bottles > 0`);
  const pendingPO = await q1(`SELECT COUNT(*) AS n FROM purchase_orders WHERE status='pending'`);
  const auditEvents = await q1(`SELECT COUNT(*) AS n FROM security_audit_log WHERE date >= ?`, [since]);

  const report = {
    date: today,
    generatedAt: new Date().toISOString(),
    metrics: {
      salesCount,
      revenue,
      failedTransactions: failedTxns,
      roomsOccupied,
      lowStockItems: lowStock,
      openLiquorBottles: openBottles,
      pendingPurchaseOrders: pendingPO,
      auditEvents,
    },
    alerts: [] as string[],
  };

  if (failedTxns > 0) report.alerts.push(`${failedTxns} failed transactions today`);
  if (lowStock > 0) report.alerts.push(`${lowStock} inventory items at/below reorder level`);
  if (pendingPO > 0) report.alerts.push(`${pendingPO} purchase orders pending`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, `daily-${today}.json`);
  const mdPath = path.join(OUT_DIR, `daily-${today}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    mdPath,
    `# Daily Operations Report — ${today}\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| Sales | ${salesCount} |\n| Revenue | ₹${revenue} |\n` +
      `| Failed txns | ${failedTxns} |\n| Rooms occupied | ${roomsOccupied} |\n` +
      `| Low stock | ${lowStock} |\n| Open bottles | ${openBottles} |\n` +
      `| Pending POs | ${pendingPO} |\n| Audit events | ${auditEvents} |\n\n` +
      (report.alerts.length ? `**Alerts:**\n- ${report.alerts.join('\n- ')}\n` : `**No alerts.**\n`),
  );
  console.log(`Daily report written: ${mdPath}`);
  db.close();
}

main().catch((e) => {
  console.error('Daily report failed:', e);
  process.exit(1);
});
