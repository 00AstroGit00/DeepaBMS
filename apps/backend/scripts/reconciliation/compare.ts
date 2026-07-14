/**
 * DeepaBMS — Parallel Run Reconciliation (P7 Phase 6)
 *
 * Compares legacy ERP daily extracts against DeepaBMS extracts to detect
 * discrepancies during the parallel run. Inputs are two CSV summary files
 * with matching keys; outputs a reconciliation report (JSON + MD).
 *
 * Usage:
 *   ts-node scripts/reconciliation/compare.ts \
 *     --legacy legacy-summary.csv --deepa deepa-summary.csv \
 *     --out reconciliation-report.json
 */
import fs from 'fs';
import path from 'path';

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

function num(v: string): number {
  return parseFloat(v || '0');
}

function main() {
  const args = process.argv.slice(2);
  const get = (k: string) =>
    args[args.indexOf(k) + 1];
  const legacyFile = get('--legacy');
  const deepaFile = get('--deepa');
  const out = get('--out') || path.join(__dirname, 'reconciliation-report.json');
  if (!legacyFile || !deepaFile) {
    console.error('Usage: compare.ts --legacy <csv> --deepa <csv> [--out <json>]');
    process.exit(2);
  }

  const legacy = parseCsv(fs.readFileSync(legacyFile, 'utf8'));
  const deepa = parseCsv(fs.readFileSync(deepaFile, 'utf8'));

  const lmap = new Map(legacy.map((r) => [r.metric, num(r.value)]));
  const dmap = new Map(deepa.map((r) => [r.metric, num(r.value)]));

  const metrics = new Set([...lmap.keys(), ...dmap.keys()]);
  const discrepancies: { metric: string; legacy: number; deepa: number; delta: number }[] = [];
  let maxAbsDelta = 0;

  for (const m of metrics) {
    const l = lmap.get(m) ?? 0;
    const d = dmap.get(m) ?? 0;
    const delta = Math.abs(l - d);
    if (delta > 0.01) {
      discrepancies.push({ metric: m, legacy: l, deepa: d, delta });
      maxAbsDelta = Math.max(maxAbsDelta, delta);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    metricsCompared: metrics.size,
    discrepancies,
    status: discrepancies.length === 0 ? 'MATCH' : 'DISCREPANCIES_FOUND',
    maxAbsDelta,
  };

  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  if (discrepancies.length === 0) {
    console.log(`RECONCILIATION MATCH: ${metrics.size} metrics, 0 discrepancies`);
  } else {
    console.error(`RECONCILIATION: ${discrepancies.length} discrepancy(ies), maxDelta=${maxAbsDelta}`);
    discrepancies.forEach((d) =>
      console.error(`  ${d.metric}: legacy=${d.legacy} deepa=${d.deepa} delta=${d.delta}`),
    );
    process.exit(1);
  }
}

main();
