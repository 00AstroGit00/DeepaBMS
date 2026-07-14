# DeepaBMS — Performance Optimization Report

**Product:** DeepaBMS (Business Management System)
**Version:** 1.0.0
**Date:** July 2026
**Scope:** Backend API (`apps/backend`), PostgreSQL 15 (prod) / SQLite (dev), Redis 7 session & cache tier
**Audience:** Engineering, SRE, Platform, and Enterprise readiness reviewers

---

## 1. Executive Summary

DeepaBMS is a single-process Node.js/Express backend serving a 20-domain business
suite (sales, inventory, restaurant, bar, hotel, accounting, HR, workflow, AI). The
schema (`apps/backend/src/schema.sql`) defines ~120 tables with a comprehensive set
of single-column and composite indexes already in place. The application currently
runs **SQLite in development** and targets **PostgreSQL 15 + Redis 7** in the
production compose stack (`docker-compose.prod.yml`), which is the correct foundation
for enterprise scale.

This report identifies optimizations across five axes — Database, Caching, Application,
Horizontal Scaling, and Benchmarking. Headline findings:

- The server currently has **no response compression** (`compression` middleware is
  absent in `index.ts`), inflating payload sizes on analytics/export endpoints.
- Concurrency is served by a single Node process with a default V8 heap; CPU-bound
  AI forecasting/anomaly detection runs on the request thread.
- The analytics domain already implements a **TTL cache** (`analytics_cache` table,
  `expires_at`), which is a strong pattern to extend to Redis.
- Database indexing is mature; the next wins come from **composite covering indexes**
  and **time-based partitioning** of append-only log tables.

Overall the system is well-structured for optimization; none of the recommendations
are architectural rewrites — they are additive hardening steps.

---

## 2. Database Optimization

### 2.1 Current Index Inventory (from `schema.sql`)

The schema already ships the following representative indexes (non-exhaustive):

| Table | Existing Indexes |
|-------|------------------|
| `sales` | `idx_sales_date`, `idx_sales_dept` |
| `txns` | `idx_txns_date` |
| `inventory_ledger` | `idx_ledger_item`, `idx_ledger_kind`, `idx_ledger_date`, `idx_ledger_batch` |
| `credit_ledger` | `idx_ledger_account` |
| `security_audit_log` | `idx_audit_date` |
| `purchase_orders` | `idx_po_supplier`, `idx_po_status`, `idx_po_date`, `idx_po_number` |
| `restaurant_orders` | `idx_order_status`, `idx_order_date`, `idx_order_table` |
| `journal_entries` | `idx_je_date`, `idx_je_status`, `idx_je_voucher`, `idx_je_type`, `idx_je_reference`, `idx_je_period` |
| `folios` | `idx_folio_status`, `idx_folio_guest` |
| `event_store` | `idx_event_agg`, `idx_event_type`, `idx_event_created`, `idx_event_version` |
| `analytics_cache` | `idx_ac_key` |
| `analytics_events` | `idx_ae_type`, `idx_ae_period` |
| `sync_queue` | `idx_queue_device`, `idx_queue_status` |

These cover the majority of hot-path lookups (per-entity, per-status, per-date-range).

### 2.2 Recommended Additional Indexes (Composite / Covering)

For PostgreSQL, the following composite covering indexes remove the heaviest
sequential scans on analytical and dashboard queries:

```sql
-- Dashboard revenue rollups (daily_summaries already UNIQUE(date); cover the scan)
CREATE INDEX IF NOT EXISTS idx_daily_rev ON daily_summaries(date DESC, total_revenue, net_profit);

-- Sales cross-filter by date + department (most common dashboard filter)
CREATE INDEX IF NOT EXISTS idx_sales_date_dept ON sales(date DESC, dept);

-- Journal entries filtered by open period + status
CREATE INDEX IF NOT EXISTS idx_je_period_status ON journal_entries(period_id, status, entry_date DESC);

-- Open folios sorted by balance (receivables screen)
CREATE INDEX IF NOT EXISTS idx_folio_status_balance ON folios(status, balance_amount DESC);

-- Approval backlog ordered by expiry
CREATE INDEX IF NOT EXISTS idx_ar_expires_status ON approval_requests(expires_at, status);

-- Analytics cache garbage-collection sweep
CREATE INDEX IF NOT EXISTS idx_analytics_cache_exp ON analytics_cache(expires_at);

-- Pending sync queue sweep
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(status, queued_at);
```

### 2.3 AI / Workflow Index Recommendations

The workflow and AI domains perform status + priority scans and correlation lookups:

```sql
-- Workflow instance backlog (running instances by priority)
CREATE INDEX IF NOT EXISTS idx_wfi_running_priority
  ON workflow_instances(status, priority DESC, started_at)
  WHERE status IN ('running','pending');

-- AI forecast/anomaly event correlation
CREATE INDEX IF NOT EXISTS idx_ae_type_period_gen
  ON analytics_events(event_type, period, generated_at DESC);

-- Business rule evaluation fast-path (active rules by domain)
CREATE INDEX IF NOT EXISTS idx_br_active_domain
  ON business_rules(status, domain) WHERE status = 'active';
```

### 2.4 Query Optimization

- **Replace `SELECT *` in list endpoints** with explicit column projection to enable
  index-only scans and shrink wire payloads (esp. `analytics`, `event_store`,
  `inventory_ledger`).
- **Parameterized pagination**: enforce `LIMIT`/`OFFSET` or keyset pagination on every
  collection route. The current `express.json({ limit: '5mb' })` body cap is fine, but
  response streams for lists are unbounded — add `page`/`pageSize` validation in
  `middleware/validate.ts`.
- **Pre-aggregate** the dashboard KPIs into `daily_summaries` / `monthly_summaries`
  (already modeled) via scheduled jobs instead of recomputing across fact tables on
  every request. The `analytics_cache` TTL table should back every `/api/analytics`
  response.
- **N+1 elimination**: repository methods that loop `SELECT` per parent (e.g. order
  lines per order, folio charges per folio) should be collapsed into a single
  `WHERE parent_id IN (...)` or a joined query.

### 2.5 PostgreSQL Connection Pooling

The production stack runs PostgreSQL 15. The Node layer must not open a raw client per
request. Introduce a pool:

```ts
import { Pool } from 'pg';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 20),   // ~2× vCPU per replica
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
});
```

Front the pool with **PgBouncer** in transaction mode (add a `pgbouncer` service to
`docker-compose.prod.yml`, `pool_mode=transaction`, `max_client_conn=1000`,
`default_pool_size=25`). This lets the backend scale horizontally without exhausting
PostgreSQL connections. For SQLite (dev), keep a single connection but wrap writes in
`BEGIN IMMEDIATE` to avoid `SQLITE_BUSY` under concurrency.

### 2.6 Time-Based Partitioning for `audit_log` / `analytics_events`

Append-only log tables grow without bound and dominate backup size and slow scans.
Use PostgreSQL declarative partitioning:

```sql
-- security_audit_log partitioned by month (rename existing to _YYYYMM)
CREATE TABLE security_audit_log (
  id VARCHAR(50), date TIMESTAMP NOT NULL, user_id VARCHAR(50),
  user_name VARCHAR(100), action VARCHAR(255), ip_address VARCHAR(45)
) PARTITION BY RANGE (date);

CREATE TABLE security_audit_log_2026_07
  PARTITION OF security_audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- analytics_events partitioned by period
CREATE TABLE analytics_events (
  id VARCHAR(50), event_type VARCHAR(30), period VARCHAR(10),
  data TEXT, threshold_breaches TEXT, generated_at TIMESTAMP
) PARTITION BY RANGE (generated_at);
```

Benefits: partition pruning on date-range dashboards, fast drop/archive of old
partitions (`DETACH PARTITION`), and smaller autovacuum overhead. A monthly partition
rotation job (cron in `scheduled_jobs`) creates the next partition ahead of time.

---

## 3. Caching Strategy

### 3.1 Redis Session Store

The backend currently holds no distributed session state; JWT is stateless. For
refresh-token revocation, device sessions, and the sync token table, adopt a Redis
session store (Redis 7 is already in the prod compose):

```ts
import Redis from 'ioredis';
export const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');
// refresh tokens: SET session:{jti} {payload} EX 604800  (7-day TTL)
// sync tokens:    SET sync:device:{id} {checkpoint} EX 3600
```

This externalizes state from the Node process, enabling horizontal scaling (§6).

### 3.2 API Response Cache-Control

Add `Cache-Control` headers to safe read endpoints:

- `/api/analytics/dashboard` → `public, max-age=60, stale-while-revalidate=300`
- `/api/inventory` (list) → `private, max-age=30`
- `/api/rooms` → `private, max-age=15`
- Mutation endpoints (`POST/PUT/DELETE`) → `no-store`

Implement via a small `cacheControl(maxAge)` Express helper in `middleware/`.

### 3.3 Existing Analytics TTL Cache

The `analytics_cache` table already implements a DB-backed TTL cache keyed by
`cache_key` with `expires_at`. This is correct but co-located with the primary DB.
**Recommendation:** promote hot cache keys to Redis with the same `expires_at`
semantics, falling back to the table for durability. `kpi_definitions.min_refresh_interval`
(already modeled, default 300s) should drive the TTL per KPI.

### 3.4 AI Context Caching

`domains/ai/ai.context.ts` assembles a large prompt context (ledger history, KPIs,
rules). Cache the assembled context in Redis keyed by a content hash with a short TTL
(60–120s) so repeated copilot calls within a session do not recompute embeddings /
retrieval:

```ts
const ctxKey = `ai:ctx:${hash(businessId + window)}`;
const cached = await redis.get(ctxKey);
if (cached) return JSON.parse(cached);
const ctx = await buildContext(...);
await redis.set(ctxKey, JSON.stringify(ctx), 'EX', 90);
```

This cuts token spend and latency on the most expensive path.

---

## 4. Application Optimization

### 4.1 Gzip / Brotli Compression

`index.ts` does **not** import `compression`. Add it immediately after `requestLogger`:

```ts
import compression from 'compression';
app.use(compression({ level: 6, threshold: '1kb' }));
```

For nginx/ingress in front, enable Brotli. Expected payload reduction: 70–85% on JSON
and 90%+ on exported CSV/HTML.

### 4.2 Lazy Loading / Code Splitting

- Routes are already mounted modularly; convert heavy domains (AI, analytics, workflow)
  to dynamic `import()` so the initial bundle and cold-start stay small.
- In the React Native app, defer non-critical screens with `React.lazy` and route-based
  splitting (per AGENTS.md perf note on large lists).

### 4.3 Pagination

Every collection route must enforce bounded results. Add a shared `paginate(req)`
helper returning `LIMIT`/`OFFSET` (or keyset cursors) and a default `pageSize=50`,
max `500`. Apply to `sales`, `inventory_ledger`, `event_store`, `restaurant_orders`,
`journal_entries`, `sync_queue`.

### 4.4 Streaming Exports

Reports (daily/monthly summaries, GST registers, ledger exports) currently build the
full payload in memory. Switch to streaming:

- Use `JSONStream` / `csv-write-stream` piping to `res`.
- Set `Content-Disposition: attachment` and `Content-Type` correctly.
- Cap export window (e.g. max 13 months) to bound memory and time.

### 4.5 Node `--max-old-space-size`

The container default V8 heap (≈2 GB on a 4 GB host) is insufficient under AI workload
memory pressure. Set in the Dockerfile / compose:

```yaml
environment:
  NODE_OPTIONS: "--max-old-space-size=2048"
command: ["node", "--max-old-space-size=2048", "dist/index.js"]
```

Also add `--optimize-for-size` on memory-constrained edge nodes.

### 4.6 Worker Threads for Forecasting / Anomaly

`ai.forecast.ts` and `ai.anomaly.ts` are CPU-bound (time-series math, statistical
scoring). Offload to a worker pool so the event loop stays free:

```ts
import { Worker } from 'worker_threads';
const w = new Worker('./dist/domains/ai/ai.worker.js');
w.postMessage({ type: 'forecast', payload });
w.on('message', (r) => res.json(r));
```

Use a fixed pool (`os.cpus().length - 1` workers) fronted by a job queue, with a
timeout so a stuck forecast cannot hang a request.

### 4.7 Event Loop & GC Monitoring

- In `middleware/monitoring.ts`, sample `eventLoopLag` (e.g. via `monitor-event-loop`)
  and expose `event_loop_ms` on `/health`.
- Emit GC stats (`--trace-gc` in staging) and alert when p99 lag > 100 ms.
- Use `clinic.js` / `0x` in pre-prod profiling runs to locate hot functions.

---

## 5. Horizontal Scaling

### 5.1 Stateless Backend Verification

Confirm the API process holds **no process-local mutable state**:

- ✅ JWT auth is stateless (verified in `middleware/auth.ts`).
- ⚠ Sync checkpoints & queue currently live in the DB (shared) — already safe.
- ⚠ In-memory caches (if any added) must move to Redis (§3).
- ⚠ Scheduled jobs use `scheduled_jobs` table — add a distributed lock
  (`pg_advisory_lock` / Redis `SET NX`) so only one replica executes a job.

**Result:** the backend is horizontally scalable once caches are externalized.

### 5.2 Session Affinity

With Redis-backed sessions (§3.1) and stateless JWT, **no sticky sessions are
required**. If a temporary in-memory cache is used during transition, enable
least-conn routing without affinity, or use Redis so affinity is unnecessary.

### 5.3 Read Replicas for Reporting

Analytical/read-heavy domains (`analytics`, `accounting` reports, `hr` payroll history)
can point at a PostgreSQL **read replica**:

```ts
export const readPool = new Pool({ connectionString: process.env.READ_REPLICA_URL });
// use readPool in analytics.repository + reporting routes
```

Writes continue to the primary. Use replica lag monitoring to avoid serving stale
balances on the folio/receivables screens (route those to primary).

### 5.4 Autoscaling

- HPA on the backend deployment keyed to CPU (70%) and `event_loop_ms` (p95 > 80 ms).
- Min 2 replicas for HA, max 8 under peak (festival / month-end close).
- Pre-warm on a cron before known peaks (month-end, festival nights).

---

## 6. Benchmark Methodology

### 6.1 Tooling

- **k6** (preferred) for HTTP load with staged VUs and percentile thresholds.
- **autocannon** as a fallback for quick single-endpoint RPS checks.
- **pgbench** for PostgreSQL capacity, **EXPLAIN ANALYZE** for query plans.
- Supplied harnesses: `scripts/benchmark/load-test.sh`, `scripts/benchmark/db-benchmark.sh`.

### 6.2 Scenarios

| Scenario | VUs | Duration | Endpoints |
|----------|-----|----------|-----------|
| Smoke | 10 | 1m | `/health`, `/api/sales` |
| Steady-state | 50 | 10m | all hot reads + 1 write |
| Peak (month-end) | 200 | 15m | analytics, journal, folio |
| Stress | 500 | 10m | ramp to find knee |
| Soak | 100 | 12h | mixed, watch leak/lag |

### 6.3 Regression Detection

- CI runs the smoke + steady-state scenarios against a staging replica.
- k6 `thresholds` fail the build if `p95 > 800 ms` or `p99 > 1500 ms` or error rate
  `> 1%`.
- Store results JSON; compare p95/p99 against the previous release baseline; flag
  regressions > 10%.
- db-benchmark flags any query exceeding `THRESHOLD_MS` (default 50 ms).

### 6.4 Metrics Collected

- Latency: p50 / p95 / p99 (ms)
- Throughput: requests/sec, bytes/sec
- Errors: HTTP ≥ 500 rate, timeouts
- Saturation: CPU, RSS, event-loop lag, DB connection pool wait

---

## 7. Prioritized Action Plan

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| P0 | Add `compression` middleware | High | Low |
| P0 | Add `Cache-Control` + Redis session store | High | Med |
| P1 | Composite covering indexes (§2.2–2.3) | High | Low |
| P1 | PgBouncer + pg Pool | High | Med |
| P1 | Pagination on all list routes | High | Med |
| P2 | Time-partition `security_audit_log` / `analytics_events` | Med | Med |
| P2 | Worker threads for forecast/anomaly | High | Med |
| P2 | Streaming exports | Med | Med |
| P3 | Read replicas for analytics | Med | Med |
| P3 | AI context caching in Redis | Med | Low |

---

## 8. Appendix — Command Reference

```bash
# HTTP load test (k6 or autocannon)
scripts/benchmark/load-test.sh http://localhost:3000 50 60s

# Database query benchmark (auto-detects PG vs SQLite)
scripts/benchmark/db-benchmark.sh 50 5

# PostgreSQL capacity
pgbench -c 50 -j 4 -T 60 "$DATABASE_URL"

# Query plan
psql "$DATABASE_URL" -c "EXPLAIN ANALYZE <query>"
```

*End of Performance Optimization Report.*
