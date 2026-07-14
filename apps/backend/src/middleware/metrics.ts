/**
 * M2-1 — Prometheus Metrics Registry
 *
 * Self-contained in-memory registry rendered in Prometheus exposition format
 * at /api/platform/metrics. Replaces the previous JSON response (OBS-01) so
 * Prometheus can scrape real series and fire alerts (OBS-02). Counters are
 * also flushed to `metric_counters` for durability across restarts.
 *
 * No external dependency is used; the exposition format is produced manually.
 */
import { run, query } from '../db';

type Labels = Record<string, string | number>;

interface Series {
  name: string;
  type: 'counter' | 'gauge';
  help: string;
  value: number;
  labels: Labels;
}

interface HistogramState {
  help: string;
  buckets: number[];
  labels: Labels;
  counts: number[];
  sum: number;
  count: number;
}

const series = new Map<string, Series>();
const histograms = new Map<string, HistogramState>();

const HTTP_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function key(name: string, labels: Labels): string {
  const l = Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`)
    .join(',');
  return l ? `${name}{${l}}` : name;
}

export function incCounter(
  name: string,
  labels: Labels = {},
  value = 1,
  help = '',
): void {
  const k = key(name, labels);
  const s = series.get(k);
  if (s) s.value += value;
  else series.set(k, { name, type: 'counter', help, value, labels });
}

export function setGauge(
  name: string,
  value: number,
  labels: Labels = {},
  help = '',
): void {
  const k = key(name, labels);
  series.set(k, { name, type: 'gauge', help, value, labels });
}

function observeHistogram(
  name: string,
  labels: Labels,
  value: number,
  help: string,
  buckets: number[],
): void {
  const k = key(name, labels);
  let h = histograms.get(k);
  if (!h) {
    h = {
      help,
      buckets,
      labels,
      counts: new Array(buckets.length).fill(0),
      sum: 0,
      count: 0,
    };
    histograms.set(k, h);
  }
  h.sum += value;
  h.count += 1;
  for (let i = 0; i < buckets.length; i++) {
    if (value <= buckets[i]) {
      h.counts[i] += 1;
      break;
    }
  }
}

export function trackHttpRequest(
  durationMs: number,
  status: number,
  method: string,
  route: string,
): void {
  const labels = {
    method,
    route: route || 'unknown',
    status: String(status),
  };
  incCounter('deepa_http_requests_total', labels, 1, 'Total HTTP requests');
  observeHistogram(
    'deepa_http_request_duration_seconds',
    labels,
    Math.max(durationMs, 0) / 1000,
    'HTTP request duration in seconds',
    HTTP_BUCKETS,
  );
}

export function renderPrometheus(): string {
  const lines: string[] = [];
  for (const s of series.values()) {
    if (s.help) lines.push(`# HELP ${s.name} ${s.help}`);
    lines.push(`# TYPE ${s.name} ${s.type}`);
    const labelStr = Object.keys(s.labels)
      .sort()
      .map((k) => `${k}="${s.labels[k]}"`)
      .join(',');
    lines.push(`${s.name}${labelStr ? `{${labelStr}}` : ''} ${s.value}`);
  }
  for (const [k, h] of histograms.entries()) {
    const base = k.split('{')[0];
    if (h.help) lines.push(`# HELP ${base} ${h.help}`);
    lines.push(`# TYPE ${base} histogram`);
    const labelStr = k.includes('{') ? k.slice(k.indexOf('{')) : '';
    const open = labelStr ? labelStr.slice(0, -1) + ',' : '{';
    let cumulative = 0;
    for (let i = 0; i < h.buckets.length; i++) {
      cumulative += h.counts[i];
      lines.push(`${base}_bucket${open}le="${h.buckets[i]}"} ${cumulative}`);
    }
    lines.push(`${base}_bucket${open}le="+Inf"} ${h.count}`);
    lines.push(`${base}_count${labelStr} ${h.count}`);
    lines.push(`${base}_sum${labelStr} ${h.sum}`);
  }
  return lines.join('\n') + '\n';
}

/** Persist current counters to DB (called by flush / scheduler). */
export async function flushCountersToDb(): Promise<void> {
  for (const s of series.values()) {
    if (s.type !== 'counter') continue;
    const labelStr = JSON.stringify(s.labels);
    try {
      await run(
        `INSERT INTO metric_counters (name, labels, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(name, labels) DO UPDATE SET value = value + excluded.value, updated_at = excluded.updated_at`,
        [s.name, labelStr, s.value, new Date().toISOString()],
      );
    } catch {
      /* non-fatal */
    }
  }
}

export async function dbGauges(): Promise<void> {
  setGauge(
    'process_start_time_seconds',
    Math.floor(Date.now() / 1000),
    {},
    'Process start time in seconds since epoch',
  );
  try {
    const r = await query(
      `SELECT (SELECT COUNT(*) FROM sales) AS sales,
              (SELECT COUNT(*) FROM bar_sales WHERE status='completed') AS bar,
              (SELECT COUNT(*) FROM journal_entries WHERE status='posted') AS journals,
              (SELECT COUNT(*) FROM ledger_post_failures WHERE resolved=0) AS ledger_fail`,
    );
    if (r[0]) {
      setGauge(
        'deepa_sales_total',
        Number(r[0].sales),
        {},
        'Total sales records',
      );
      setGauge(
        'deepa_bar_sales_total',
        Number(r[0].bar),
        {},
        'Completed bar sales',
      );
      setGauge(
        'deepa_journals_posted',
        Number(r[0].journals),
        {},
        'Posted journals',
      );
      setGauge(
        'deepa_ledger_post_failures',
        Number(r[0].ledger_fail),
        {},
        'Unresolved ledger auto-post failures',
      );
    }
  } catch {
    /* non-fatal */
  }
}
