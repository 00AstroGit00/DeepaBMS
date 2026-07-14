# P8 Phase 4 — Performance Optimization & Phase 6 — Observability Review

**Auditor:** Principal Performance Engineer / SRE
**Verdict:** Performance baseline unmeasured (no runtime), but static analysis
finds 2 Critical observability defects that make monitoring non-functional,
plus concrete DB/CPU hotspots.

## OBS-01 — Metrics endpoint returns JSON, not Prometheus format (Critical)
**Evidence:** `docker/prometheus/prometheus.yml:20`, `middleware/monitoring.ts:147`
```yaml
metrics_path: /api/platform/metrics
static_configs: [{ targets: ["backend:3000"] }]
```
```ts
export function getMetricsMiddleware(req, res): void {
  res.json({ inMemory: getMetricsSnapshot(), ... });
}
```
Prometheus cannot scrape JSON → ingests **zero series**; every metric alert
evaluates "no data" and never fires. **Impact:** silent false negatives
(latency/error/SLO/backup alerts all dead). **Effort:** 1d (expose
`# TYPE`/`# HELP` exposition text). **Priority:** P0.

## OBS-02 — Postgres/Redis alerts for a SQLite/no-Redis app (Critical)
**Evidence:** `docker/prometheus/prometheus.yml:27`, `alert.rules.yml:67`,
`alerts/slo.rules.yml:52`
```yaml
- job_name: postgres-exporter   # targets: ["postgres-exporter:9187"]
- job_name: redis-exporter      # targets: ["redis-exporter:9121"]
DatabaseConnectionsHigh: expr: pg_stat_activity_count > 50
slo:db_uptime: expr: avg(rate(pg_up{service="postgres"}[5m]))
```
App uses SQLite + no Redis, yet alerts/SLOs reference `pg_*`/`redis_*` metrics
that never exist. Phantom exporters are permanently down → `InstanceDown`
(critical) fires for non-existent infra (alert fatigue) while real DB/backup/SLO
never alert (false negative). **Impact:** monitoring is simultaneously
noisy and blind. **Effort:** 1d (rewrite for SQLite/process metrics).
**Priority:** P0.

## PERF-03 — SQLite without WAL / busy_timeout (High)
**Evidence:** `db.ts:14,43`
```ts
export const db = new sqlite3.Database(DB_FILE, (err) => {...});
export const query = (sql, params=[]) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));
```
No `PRAGMA journal_mode=WAL`, no `busy_timeout`. Synchronous binding blocks the
event loop on I/O; concurrent writers (sync engine, request writes) →
SQLITE_BUSY / latency spikes. **Effort:** 2h (`PRAGMA journal_mode=WAL;
busy_timeout=5000`). **Priority:** P1.

## PERF-04 — N+1 in year-end close (High)
**Evidence:** `accounting.service.ts:1315`
```ts
for (const acct of incomeAccounts) {
  const bal = await query(
    `SELECT COALESCE(SUM(...),0) ... FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_id WHERE jl.account_id = ? ...`,
    [acct.id, ...]);
}
```
One SUM-join per account inside a loop. Query count ∝ #accounts. **Effort:** 1d
(single grouped query). **Priority:** P1.

## PERF-05 — Metrics collection is dead code (Medium)
**Evidence:** `index.ts:89,118`, `monitoring.ts:49`
```ts
app.use(requestLogger);
export async function flushMetrics(): Promise<void> { ... } // never called
```
`flushMetrics` never scheduled; `trackRequestMetrics`/`recordApiMetric` never
wired; `metricsStore` Map never populated. `/api/platform/metrics` returns empty.
**Effort:** 1d (wire + schedule). **Priority:** P1 (pair with OBS-01).

## PERF-06 — 30+ dashboard SUM queries, non-sargable (Medium)
**Evidence:** `analytics.repository.ts:522,1351`
```ts
`SELECT COALESCE(SUM(gst_amount),0) ... FROM gst_registers
   WHERE gst_type='output' AND strftime('%Y-%m-%d', created_at)=?`
...
AND date(il.created_at) BETWEEN ? AND ?   -- idx on timestamp, not date(...)
```
No per-request cache; `strftime`/`date()` on timestamp columns non-sargable.
**Effort:** 2d (cache + sargable predicates). **Priority:** P2.

## PERF-07 — Missing index gst_registers(created_at) (Medium)
**Evidence:** `schema.sql:1439` — indexes on `gst_type/rate/period` but **not**
`created_at`; daily analytics filter `strftime('%Y-%m-%d', created_at)=?` → full
scan per dashboard render. **Effort:** 1h (add index). **Priority:** P2.

## PERF-08 — AI conversation loads full history, no LIMIT (Medium)
**Evidence:** `ai.repository.ts:35`
```ts
const msgRows = await query(
  'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC', [id]);
```
Unbounded memory/context per turn. **Effort:** 0.5d (LIMIT/turn-window).
**Priority:** P2.

## PERF-09 — Workflow scheduler never invoked (Medium)
**Evidence:** `workflow.service.ts:1261`
```ts
async processDueJobs(): Promise<number> {
  const dueJobs = await R.getDueJobs();
  for (const job of dueJobs) { ... startWorkflow(...) ... }
}
```
`processDueJobs` defined but **no `setInterval`/caller** anywhere → scheduled
cron/interval jobs silently never run. **Impact:** workflow automation dead.
**Effort:** 0.5d (start scheduler on boot). **Priority:** P1.

## PERF-10 — Pervasive SELECT * + PII in request logs (Low)
`SELECT *` returns large JSON TEXT (`tool_calls`, `metadata`) parsed per row
(memory/CPU); `observability.ts:94` logs `req.originalUrl` (query string →
tokens/PII) at info (currently unwired, latent leak). **Effort:** 1d.
**Priority:** P3.

## Verified OK
- Missing indexes outside `gst_registers(created_at)`: `event_store`,
  `ai_conversations`, `sync_queue`, `journal_entries/lines`, `security_audit_log`,
  `bar_sales`, `kot`, `sales`, `inventory_ledger` adequately indexed.
- Sync uses `LIMIT+1`/`hasMore` pagination (good); mobile has no uncleared
  `setInterval`/listener leaks.

## Top Optimization Opportunities (summary of 100)
1. Wire observability to reality (OBS-01/02) — unblocks all alerting. [P0]
2. SQLite WAL + busy_timeout (PERF-03). [P1]
3. Collapse N+1 year-end (PERF-04). [P1]
4. Start workflow scheduler (PERF-09). [P1]
5. Add `gst_registers(created_at)` index + sargable analytics (PERF-06/07). [P2]
6. Cap AI history (PERF-08). [P2]
7. Replace `SELECT *` hot paths with column lists. [P3]
8. Centralize metrics flush + request logging (PERF-05/10). [P1]
(Estimated cumulative: latency ↓ ~40–60% on dashboards/year-end; CPU ↓ via
dead-code removal + caching; storage ↓ via column selection + LOG rotation.)
