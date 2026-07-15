import { run, query } from '../db';

type Labels = Record<string, string | number>;

interface Series {
  name: string;
  type: 'counter' | 'gauge' | 'summary';
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

interface SummaryState {
  help: string;
  labels: Labels;
  quantiles: number[];
  values: number[];
  sum: number;
  count: number;
}

const series = new Map<string, Series>();
const histograms = new Map<string, HistogramState>();
const summaries = new Map<string, SummaryState>();

const HTTP_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const SLO_LATENCY_BUCKETS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30];

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

function observeSummary(
  name: string,
  labels: Labels,
  value: number,
  help: string,
  quantiles: number[],
): void {
  const k = key(name, labels);
  let s = summaries.get(k);
  if (!s) {
    s = {
      help,
      labels,
      quantiles,
      values: [],
      sum: 0,
      count: 0,
    };
    summaries.set(k, s);
  }
  s.sum += value;
  s.count += 1;
  s.values.push(value);
}

export function trackHttpRequest(
  durationMs: number,
  status: number,
  method: string,
  route: string,
  tenantSlug?: string,
): void {
  const baseLabels: Labels = {
    method,
    route: route || 'unknown',
    status: String(status),
  };
  const tenantLabels: Labels = tenantSlug
    ? { ...baseLabels, tenant_slug: tenantSlug }
    : baseLabels;

  incCounter('deepa_http_requests_total', tenantLabels, 1, 'Total HTTP requests');
  incCounter('deepa_http_requests_total', baseLabels, 1, 'Total HTTP requests (all tenants)');

  observeHistogram(
    'deepa_http_request_duration_seconds',
    tenantLabels,
    Math.max(durationMs, 0) / 1000,
    'HTTP request duration in seconds',
    HTTP_BUCKETS,
  );
  observeHistogram(
    'deepa_http_request_duration_seconds',
    baseLabels,
    Math.max(durationMs, 0) / 1000,
    'HTTP request duration in seconds (all tenants)',
    HTTP_BUCKETS,
  );

  incCounter(
    'deepa_http_requests_by_status',
    { ...tenantLabels, status_code: String(status) },
    1,
    'HTTP requests by status code',
  );
  incCounter(
    'deepa_http_requests_by_status',
    { ...baseLabels, status_code: String(status) },
    1,
    'HTTP requests by status code (all tenants)',
  );
}

export function recordSlowQueryMetric(
  durationMs: number,
  queryText: string,
  tenantSlug?: string,
): void {
  const labels: Labels = tenantSlug ? { tenant_slug: tenantSlug } : {};
  observeSummary(
    'deepa_slow_query_duration_seconds',
    labels,
    durationMs / 1000,
    'Slow query duration in seconds',
    [0.5, 0.95, 0.99],
  );
  incCounter('deepa_slow_queries_total', labels, 1, 'Total slow queries');
}

export function recordSloMetric(
  tenantSlug: string,
  sloName: string,
  latencyMs: number,
  errorRate: number,
  availability: number,
): void {
  const labels: Labels = { tenant_slug: tenantSlug, slo_name: sloName };

  setGauge(
    'deepa_slo_latency_seconds',
    latencyMs / 1000,
    { ...labels },
    `SLO ${sloName} average latency in seconds`,
  );

  setGauge(
    'deepa_slo_error_rate',
    errorRate,
    { ...labels },
    `SLO ${sloName} error rate`,
  );

  setGauge(
    'deepa_slo_availability',
    availability,
    { ...labels },
    `SLO ${sloName} availability`,
  );

  incCounter(
    'deepa_slo_violations_total',
    { ...labels, violation_type: 'latency' },
    0,
    'SLO latency violations',
  );
  incCounter(
    'deepa_slo_violations_total',
    { ...labels, violation_type: 'error_rate' },
    0,
    'SLO error rate violations',
  );
}

export function recordSloViolation(
  tenantSlug: string,
  sloName: string,
  violationType: string,
): void {
  const labels: Labels = { tenant_slug: tenantSlug, slo_name: sloName, violation_type: violationType };
  incCounter('deepa_slo_violations_total', labels, 1, 'SLO violations');
  setGauge(
    'deepa_slo_violation_active',
    1,
    { ...labels },
    'SLO violation active flag',
  );
}

export function setErrorBudgetMetric(
  tenantSlug: string,
  sloName: string,
  budgetRemaining: number,
  budgetTotal: number,
): void {
  const labels: Labels = { tenant_slug: tenantSlug, slo_name: sloName };
  setGauge(
    'deepa_error_budget_remaining',
    budgetRemaining,
    { ...labels },
    `Error budget remaining for ${sloName}`,
  );
  setGauge(
    'deepa_error_budget_total',
    budgetTotal,
    { ...labels },
    `Error budget total for ${sloName}`,
  );
  setGauge(
    'deepa_error_budget_ratio',
    budgetTotal > 0 ? budgetRemaining / budgetTotal : 0,
    { ...labels },
    `Error budget ratio remaining for ${sloName}`,
  );
}

export function setActiveConnections(
  count: number,
  tenantSlug?: string,
): void {
  const labels: Labels = tenantSlug ? { tenant_slug: tenantSlug } : {};
  setGauge(
    'deepa_active_connections',
    count,
    labels,
    'Active database connections',
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
  for (const [k, s] of summaries.entries()) {
    const base = k.split('{')[0];
    if (s.help) lines.push(`# HELP ${base} ${s.help}`);
    lines.push(`# TYPE ${base} summary`);
    const labelStr = k.includes('{') ? k.slice(k.indexOf('{')) : '';
    const sorted = [...s.values].sort((a, b) => a - b);
    for (const q of s.quantiles) {
      const idx = Math.min(Math.floor(q * sorted.length), sorted.length - 1);
      lines.push(`${base}${labelStr}{quantile="${q}"} ${sorted[idx] || 0}`);
    }
    lines.push(`${base}_count${labelStr} ${s.count}`);
    lines.push(`${base}_sum${labelStr} ${s.sum}`);
  }
  return lines.join('\n') + '\n';
}

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
      setGauge('deepa_sales_total', Number(r[0].sales), {}, 'Total sales records');
      setGauge('deepa_bar_sales_total', Number(r[0].bar), {}, 'Completed bar sales');
      setGauge('deepa_journals_posted', Number(r[0].journals), {}, 'Posted journals');
      setGauge('deepa_ledger_post_failures', Number(r[0].ledger_fail), {}, 'Unresolved ledger auto-post failures');
    }
  } catch {
    /* non-fatal */
  }
}
