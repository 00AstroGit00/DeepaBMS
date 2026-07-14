# ADR-0018: Enterprise Platform Operations, Observability & Disaster Recovery Architecture

**Status**: Accepted (2026-07-14)

**Domain**: Infrastructure / Operations / Observability

**Applies to**: Backend (apps/backend/src/domains/platform/), Middleware (apps/backend/src/middleware/)

---

## Context

DeepaBMS operates across Restaurant, Bar, Hotel, Kitchen, POS, Inventory, Purchasing, Credits, Banking, Accounting, Employees, Payroll, GST, Excise, Analytics, and Audit — **16 domain modules** backed by an event-sourced sync engine (see [ADR-0016](#references)) and an enterprise workflow automation layer (see [ADR-0017](#references)). As the platform scales to production deployments with multiple environments (development, staging, production) and a growing fleet of connected devices, the following operational gaps have become critical:

| Aspect | Current State | Problem |
|--------|--------------|---------|
| **Health monitoring** | None — no automated checks | Outages discovered by user reports, no proactive alerting |
| **Observability** | `console.log` statements scattered across codebase | No structured logging, no traceability, no audit trail |
| **Request metrics** | No measurement | Cannot identify slow endpoints, error rate trends, or usage patterns |
| **Alerting** | No alert lifecycle | Critical conditions (disk full, high error rate) go unnoticed |
| **Backup & Restore** | Manual SQLite file copy | No schedule, no encryption, no integrity verification |
| **Deployments** | Manual git pull + restart | No audit trail of what version was deployed when |
| **Disaster Recovery** | No runbook | Recovery from database corruption or sync failure is ad-hoc |
| **Ops visibility** | No dashboard | Operators must SSH and run ad-hoc queries to understand system health |

### Required Capabilities

1. **Health system** — Liveness, readiness, startup probes + deep health checks (database, storage, memory, CPU, uptime, workflow engine, sync engine) with aggregated health status
2. **Observability middleware** — Structured JSON logging with requestId/traceId/spanId correlation, request/response logging with duration, audit event support
3. **Monitoring & alerting** — In-memory request metrics ring buffer with periodic database flush, slow query detection, alert lifecycle (open → acknowledged → resolved → dismissed)
4. **Backup system** — Configurable full/incremental/snapshot/WAL backups, AES-256-GCM encryption, SHA-256 checksum verification, TTL-based retention cleanup
5. **Deployment manager** — Track version deployments across environments with status lifecycle (pending → running → completed / failed / rolled_back)
6. **Disaster recovery** — Runbook with recovery procedures for 6 failure scenarios, recovery status endpoint, simulation engine for testing DR readiness
7. **Ops dashboard** — Single aggregate view combining health, system metrics, database info, API metrics, workflow/sync status, backup status, alerts

## Decision

Build a comprehensive **Enterprise Platform Operations, Observability & Disaster Recovery subsystem** comprising **7 integrated subsystems** that collectively provide production-grade operations management for DeepaBMS.

All subsystems live under `apps/backend/src/domains/platform/` with observability middleware in `apps/backend/src/middleware/`. Data is persisted in SQLite tables within the existing database. The API is mounted at `/api/platform/`.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      ENTERPRISE PLATFORM OPERATIONS                                     │
│                                                                                         │
│  ┌─────────────────┐  ┌──────────────────────┐  ┌────────────────────────────┐        │
│  │  1. Health       │  │  2. Observability     │  │  3. Monitoring & Alerting  │        │
│  │  System          │  │  Middleware            │  │                             │        │
│  │                  │  │                       │  │  ┌──────────────────────┐  │        │
│  │  • Liveness      │  │  • requestId/traceId  │  │  │ Request Metrics      │  │        │
│  │  • Readiness     │  │  • structured JSON    │  │  │ (ring buffer → DB)   │  │        │
│  │  • Startup       │  │  • request logging    │  │  ├──────────────────────┤  │        │
│  │  • Deep checks   │  │  • audit events       │  │  │ Slow Query Detector  │  │        │
│  │  (7 checks)      │  │                       │  │  ├──────────────────────┤  │        │
│  └────────┬─────────┘  └──────────┬────────────┘  │  │ Alert Lifecycle      │  │        │
│           │                       │               │  │ (open→ack→resolved)  │  │        │
│           ▼                       ▼               │  └──────────────────────┘  │        │
│  ┌─────────────────┐  ┌──────────────────────┐  └──────────┬─────────────────┘        │
│  │  4. Backup       │  │  5. Deployment        │             │                          │
│  │  System          │  │  Manager              │             │                          │
│  │                  │  │                       │             │                          │
│  │  • Full/incr/WAL │  │  • Version tracking   │             │                          │
│  │  • AES-256-GCM   │  │  • Environment mgmt   │             │                          │
│  │  • SHA-256 verify│  │  • Rollback support   │             │                          │
│  │  • TTL cleanup   │  │                       │             │                          │
│  └────────┬─────────┘  └──────────┬────────────┘             │                          │
│           │                       │                          │                          │
│           ▼                       ▼                          ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────┐            │
│  │                    7. Ops Dashboard                                      │            │
│  │  (aggregate: health + metrics + alerts + backup + deployment + workflow) │            │
│  └────────────────────────────────────────────────────────────────────────┘            │
│           │                                                                              │
│           ▼                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐            │
│  │                    6. Disaster Recovery                                 │            │
│  │  (runbook + status + simulation + recovery procedures)                  │            │
│  └────────────────────────────────────────────────────────────────────────┘            │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐            │
│  │                    INFRASTRUCTURE (SQLite Tables)                        │            │
│  │  backup_records  health_check_history  monitoring_metrics  alerts       │            │
│  │  deployment_records  request_metrics  slow_query_log                    │            │
│  └────────────────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

The platform operations subsystem uses 7 SQLite tables, all residing in the existing `deepa-bms.db` database:

```
┌──────────────────────┐       ┌──────────────────────────┐
│   backup_records      │       │  health_check_history     │
│──────────────────────│       │──────────────────────────│
│  id              PK   │       │  id                  PK   │
│  type           str   │       │  check_type         str   │
│  status         str   │       │  status             str   │
│  file_path      str   │       │  component          str   │
│  file_size      int   │       │  duration_ms        int   │
│  checksum       str?  │       │  message            str?  │
│  encrypted      bool  │       │  details            json  │
│  retention_days int   │       │  checked_at         ts    │
│  started_at     ts    │       └──────────────────────────┘
│  completed_at   ts?   │                 ▲
│  verified_at    ts?   │                 │ (no FK — standalone)
│  error_message  str?  │
│  metadata       json  │       ┌──────────────────────────┐
│  created_by     str?  │       │  monitoring_metrics       │
└──────────────────────┘       │──────────────────────────│
                                │  id                  PK   │
┌──────────────────────┐       │  metric_name         str   │
│   alerts              │       │  metric_value        num   │
│──────────────────────│       │  metric_unit         str?  │
│  id              PK   │       │  labels              json  │
│  severity        str   │       │  recorded_at         ts    │
│  category        str   │       └──────────────────────────┘
│  title           str   │
│  message         str?  │       ┌──────────────────────────┐
│  source          str?  │       │  request_metrics          │
│  status          str   │       │──────────────────────────│
│  acknowledged_by str?  │       │  id                  PK   │
│  acknowledged_at ts?   │       │  method             str   │
│  resolved_by    str?   │       │  path               str   │
│  resolved_at    ts?    │       │  status_code        int   │
│  metadata       json   │       │  duration_ms        int   │
│  created_at     ts    │       │  request_id         str?  │
└──────────────────────┘       │  user_id            str?  │
                                │  user_role          str?  │
┌──────────────────────┐       │  recorded_at         ts    │
│  deployment_records   │       └──────────────────────────┘
│──────────────────────│
│  id              PK   │       ┌──────────────────────────┐
│  version         str   │       │  slow_query_log           │
│  environment     str   │       │──────────────────────────│
│  status          str   │       │  id                  PK   │
│  commit_hash     str?  │       │  query_text          str   │
│  branch          str?  │       │  duration_ms         int   │
│  artifacts       json  │       │  params              str?  │
│  deployed_by     str?  │       │  source              str?  │
│  rollback_version str? │       │  request_id          str?  │
│  error_message   str?  │       │  recorded_at         ts    │
│  started_at      ts    │       └──────────────────────────┘
│  completed_at    ts?   │
│  duration_seconds int  │
└──────────────────────┘
```

**Key relationships:**
- `health_check_history` is write-only by the health check service; queried for dashboard aggregation
- `monitoring_metrics` is written by the periodic flush from the in-memory ring buffer
- `request_metrics` is written per-request by the `recordApiMetric()` function in monitoring middleware
- `slow_query_log` is written conditionally when a query exceeds the configured threshold (default 500ms)
- `backup_records` status transitions: `running` → `completed` → `verified` | `failed`
- `alerts` status transitions: `open` → `acknowledged` → `resolved` | `dismissed`
- `deployment_records` status transitions: `pending` → `running` → `completed` | `failed` | `rolled_back`

## API Surface

All endpoints are mounted at `/api/platform/`. Authentication via JWT (`authenticate` middleware). Authorization via `authorize()` role check.

### Health (6 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/health` | No | — | Aggregated health (5 checks: db, storage, memory, cpu, uptime). Returns HTTP 503 if status=fail |
| GET | `/health/live` | No | — | Liveness probe (database only). Returns `alive` or `dead` |
| GET | `/health/ready` | No | — | Readiness probe (database + storage + workflow). Returns `ready` or `not_ready` |
| GET | `/health/startup` | No | — | Startup probe (database + uptime). Returns `started` or `starting` |
| GET | `/health/checks` | Yes | owner, manager | Deep health (7 checks: db, storage, memory, cpu, uptime, workflow, sync) |

### Metrics (4 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/metrics` | Yes | owner, manager | In-memory metrics snapshot (ring buffer contents) |
| GET | `/metrics/historical` | Yes | owner, manager, accountant | Historical metrics from `monitoring_metrics` table. Query params: `name`, `since`, `limit` |
| GET | `/metrics/requests` | Yes | owner, manager | Recent request metrics from `request_metrics` table. Query param: `limit` |
| GET | `/metrics/slow-queries` | Yes | owner, manager | Slow queries from `slow_query_log` table. Query param: `limit` |

### Alerts (6 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/alerts` | Yes | owner, manager | List alerts with optional filter (`status`, `severity`, `category`, `offset`, `limit`) |
| GET | `/alerts/:id` | Yes | owner, manager | Get single alert by ID |
| POST | `/alerts` | Yes | owner, manager | Create alert. Body: `severity`, `category`, `title`, `message?`, `source?`, `metadata?` |
| POST | `/alerts/:id/acknowledge` | Yes | owner, manager | Acknowledge alert (status → `acknowledged`) |
| POST | `/alerts/:id/resolve` | Yes | owner, manager | Resolve alert (status → `resolved`) |
| POST | `/alerts/:id/dismiss` | Yes | owner, manager | Dismiss alert (status → `dismissed`) |

### Backups (8 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/backups` | Yes | owner | List backups with optional filter (`type`, `status`, `offset`, `limit`) |
| GET | `/backups/latest` | Yes | owner | Get latest backup by type (`type` query param) |
| GET | `/backups/:id` | Yes | owner | Get single backup record |
| POST | `/backups` | Yes | owner | Create new backup. Body: `type`, `filePath`, `retentionDays?`, `encrypted?`, `metadata?` |
| DELETE | `/backups/:id` | Yes | owner | Delete backup record and associated files |
| POST | `/backups/:id/verify` | Yes | owner | Verify backup checksum and file integrity |
| GET | `/backups/config` | Yes | owner | Get backup schedule configuration (cron, retention, encryption settings) |
| POST | `/backups/cleanup` | Yes | owner | Clean up expired backups per retention TTL |

### Deployments (5 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/deployments` | Yes | owner | List deployments with optional filter (`environment`, `status`, `limit`) |
| GET | `/deployments/:id` | Yes | owner | Get single deployment record |
| POST | `/deployments` | Yes | owner | Create new deployment. Body: `version`, `environment` |
| POST | `/deployments/:id/complete` | Yes | owner | Mark deployment as completed. Body: `commitHash?`, `branch?` |
| POST | `/deployments/:id/rollback` | Yes | owner | Roll back deployment. Body: `rollbackVersion` |

### Disaster Recovery (4 endpoints)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/dr/runbook` | Yes | owner | Get full DR runbook with recovery procedures and estimated RTOs |
| GET | `/dr/status` | Yes | owner, manager | Get recovery status (database health, last backup, uptime) |
| POST | `/dr/simulate` | Yes | owner | Simulate a failure scenario. Body: `scenario` (`database_disconnect`, `workflow_failure`, `queue_corruption`) |
| POST | `/dr/recover` | Yes | owner | Execute recovery for a scenario. Body: `scenario` |

### Dashboard (1 endpoint)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/dashboard` | Yes | owner, manager | Aggregate ops dashboard with health summary, system metrics, database info, API metrics, workflow/sync status, backup info, alerts summary, scheduler info |

### Database (1 endpoint)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/database` | Yes | owner, manager, accountant | Database info (size in bytes, table count, connection status) |

## Component Architecture

### 1. Health System

The Health System provides both simple probe endpoints (liveness, readiness, startup) for container orchestration and a comprehensive deep health check for operational debugging.

**Service**: `platform.service.ts → HealthService`

**7 Checks:**

| Check | Component | Method | Pass Threshold | Warn Threshold | Fail Threshold |
|-------|-----------|--------|---------------|---------------|---------------|
| Database | `database` | `checkDatabase()` | `SELECT 1` succeeds | — | Query fails |
| Storage | `storage` | `checkStorage()` | DB file < 100 MB | < 500 MB | >= 500 MB |
| Memory | `memory` | `checkMemory()` | Heap used/total < 70% | < 90% | >= 90% |
| CPU | `cpu` | `checkCpu()` | Load avg (1m) < 2 | < 4 | >= 4 |
| Uptime | `uptime` | `checkUptime()` | Always pass | — | — |
| Workflow | `workflow` | `checkWorkflow()` | 0 failed instances | > 0 failed instances | — |
| Sync | `sync` | `checkSync()` | Queue < 100 AND conflicts < 10 | Queue >= 100 OR conflicts >= 10 | — |

**Check Result Format:**

```json
{
  "status": "pass" | "warn" | "fail",
  "component": "database",
  "durationMs": 2,
  "message": "Database connection OK",
  "details": {}
}
```

**Aggregation Strategy:**

```
                 ┌─────────────────────────┐
                 │  runAllChecks()          │
                 │  (Promise.all of 5        │
                 │   checks: db, storage,    │
                 │   memory, cpu, uptime)    │
                 └───────────┬─────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
          ┌─────────────────┐  ┌──────────────────┐
          │ Are any checks  │  │ Are any checks   │
          │ status === fail?│  │ status === warn? │
          │                 │  │                  │
          │ Yes → overall   │  │ Yes → overall    │
          │ status = 'fail' │  │ status = 'warn'  │
          │ No → check warn │  │ No → overall     │
          └────────┬────────┘  │ status = 'pass' │
                   │          └──────────────────┘
                   ▼
          ┌─────────────────┐
          │ Record each     │
          │ check to        │
          │ health_check_   │
          │ history table   │
          └─────────────────┘
```

Each check result is persisted via `PlatformRepository.recordHealthCheck()` to `health_check_history` for historical analysis and dashboard aggregation.

### 2. Observability (Middleware)

The observability middleware provides **structured JSON logging** with distributed tracing correlation, request/response logging, and audit event support.

**File**: `middleware/observability.ts`

**3 Middleware Functions:**

**a) `requestId(req, res, next)`**

```
┌─────────────────────────────────────────────────────────────────┐
│  REQUEST ID ASSIGNMENT                                           │
│                                                                  │
│  Incoming Request                                                │
│       │                                                          │
│       ├── Has x-request-id header? → use as requestId           │
│       ├── Has x-correlation-id header? → use as requestId       │
│       └── Neither → generate: base36(now) + counter + hex(2B)  │
│                                                                  │
│  traceId = x-trace-id header || requestId                       │
│  spanId  = crypto.randomBytes(4).toString('hex')                 │
│                                                                  │
│  Attached to: req.requestId, req.traceId, req.spanId            │
└─────────────────────────────────────────────────────────────────┘
```

**b) `requestLogger(req, res, next)`**

Logs every request on response finish with method, path, status, duration, and user context:

```json
{
  "timestamp": "2026-07-14T10:30:00.000Z",
  "level": "info",
  "requestId": "1abc-def0-a1b2",
  "traceId": "1abc-def0-a1b2",
  "spanId": "b3c4d5e6",
  "method": "POST",
  "path": "/api/platform/backups",
  "message": "POST /api/platform/backups 201 342ms",
  "status": 201,
  "duration": 342,
  "userId": "usr_abc123",
  "role": "owner"
}
```

Log level is determined by HTTP status:
- 500+ → `error` (console.error)
- 400+ → `warn` (console.error)
- Others → `info` (console.log)

**c) `logAuditEvent(req, action, details?)`**

Records audit-worthy actions: `audit.backup_created`, `audit.deployment_completed`, `audit.alert_resolved`. Outputs a structured log entry with `"audit": true` flag for easy filtering.

**Log Entry Schema:**

```typescript
interface LogEntry {
  timestamp: string;
  level: string;
  requestId: string;
  traceId: string;
  spanId: string;
  method: string;
  path: string;
  message: string;
  [key: string]: any;  // extensible
}
```

### 3. Monitoring & Alerting

The monitoring subsystem implements an **in-memory ring buffer** for request metrics that periodically flushes to the database, plus slow query detection and a full alert lifecycle.

**File**: `middleware/monitoring.ts`

**a) In-Memory Request Metrics**

```
                    REQUEST METRICS PIPELINE

   Request ──→ trackRequestMetrics ──→ In-Memory Map ──→ flushMetrics ──→ SQLite
                     middleware          (ring buffer)     (every 60s)      monitoring_metrics
                                                                           + request_metrics
```

The `metricsStore` is a `Map<string, MetricSample>` keyed by `method:path`:

```typescript
interface MetricSample {
  count: number;
  totalDuration: number;
  statusCounts: Record<number, number>;
}
```

**Flush Strategy:**
- `METRICS_FLUSH_INTERVAL` = 60,000ms (configurable via `METRICS_FLUSH_INTERVAL` env var)
- On flush, two rows are written per metric:
  1. `request.count.{method}.{path}` with count and status code distribution
  2. `request.latency_ms.{method}.{path}` with average duration
- After flush, the map is cleared

**b) Slow Query Detection**

```typescript
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);
```

The `recordSlowQuery()` function is called by the database layer after each query execution. If `durationMs >= 500`, the query is logged to `slow_query_log` with the full query text, duration, params, source module, and associated requestId.

**c) Per-Request Metrics Recording**

The `recordApiMetric()` function is called per-request to insert a row into `request_metrics` with method, path, status code, duration, userId, and userRole. This provides granular request-level data for the dashboard.

**d) Alert Lifecycle**

```
                    ALERT STATE MACHINE

           ┌─────────────────────────────────────┐
           │              OPEN                     │
           │  (initial state on creation)         │
           └────────┬────────────────┬───────────┘
                    │                │
            acknowledge            dismiss
                    │                │
                    ▼                ▼
           ┌────────────────┐  ┌──────────┐
           │ ACKNOWLEDGED   │  │ DISMISSED │
           │ (assigned to   │  │ (hidden,  │
           │  user)         │  │  terminal)│
           └────────┬───────┘  └──────────┘
                    │
                resolve
                    │
                    ▼
           ┌────────────────┐
           │   RESOLVED     │
           │  (fixed,       │
           │   terminal)    │
           └────────────────┘
```

**Alert Schema:**

```
┌──────────────┬──────────────────────────────────────┐
│ Field         │ Description                           │
├──────────────┼──────────────────────────────────────┤
│ severity      │ critical | high | medium | low | info │
│ category      │ e.g., "database", "sync", "backup"    │
│ title         │ Short human-readable title             │
│ message       │ Detailed description                   │
│ source        │ Originating component                  │
│ status        │ open | acknowledged | resolved | dismissed │
│ acknowledgedBy│ User ID who acknowledged               │
│ resolvedBy    │ User ID who resolved                   │
│ metadata      │ JSON key-value for extensibility       │
└──────────────┴──────────────────────────────────────┘
```

### 4. Backup System

The backup system provides **file-system snapshot strategy** with optional encryption, checksum verification, and retention-based cleanup.

**Service**: `platform.service.ts → BackupService`

**Backup Types:**
| Type | Description |
|------|-------------|
| `full` | Complete database file copy |
| `incremental` | Database file copy (WAL checkpointed) |
| `snapshot` | Database file copy (point-in-time) |
| `wal` | Write-Ahead Log file copy only |

**Backup Flow:**

```
                   BACKUP CREATION SEQUENCE

   ┌──────────┐   ┌──────────────┐   ┌────────────────┐   ┌──────────────┐
   │  Client  │   │  Route       │   │  BackupService  │   │  Filesystem  │
   │──POST───>│   │──────────────│   │────────────────│   │──────────────│
   │ /backups  │   │ validate dto │   │ createBackup()  │   │              │
   │          │   │              │   │  │                 │              │
   │          │   │              │   │  ├─ R.createBackup│   │              │
   │          │   │              │   │  │  → id='bkp-xxx'│   │              │
   │          │   │              │   │  │  → status=run  │   │              │
   │          │   │              │   │  │  ─ record      │   │              │
   │          │   │              │   │  ▼                 │              │
   │          │   │              │   │  ├─ mkdir backupDir│   │              │
   │          │   │              │   │  ├─ stream db →   │   │              │
   │          │   │              │   │  │  filePath      │   │              │
   │          │   │              │   │  │  ──────────────>│   backup.db    │
   │          │   │              │   │  │                 │              │
   │          │   │              │   │  ├─ sha256 checksum│   │              │
   │          │   │              │   │  ├─ if encrypted:  │   │              │
   │          │   │              │   │  │  cipher(         │   │              │
   │          │   │              │   │  │   aes-256-gcm)  │   │              │
   │          │   │              │   │  │  write .enc     │   │              │
   │          │   │              │   │  │  delete orig    │   │              │
   │          │   │              │   │  ├─ R.updateStatus │   │              │
   │          │   │              │   │  │  → completed    │   │              │
   │          │   │              │   │  ├─ if type!=wal:  │   │              │
   │          │   │              │   │  │  → verified     │   │              │
   │          │   │              │   │  └─ return record  │   │              │
   │  <───────│─── result        │                        │              │
   └──────────┘   └──────────────┘   └────────────────┘   └──────────────┘
```

**Encryption (AES-256-GCM):**

```
   plaintext.db
       │
       ▼
   crypto.createCipheriv(
     'aes-256-gcm',
     scrypt( BACKUP_ENCRYPTION_KEY, salt, 32 ),
     randomBytes(16)   // IV
   )
       │
       ▼
   plaintext.db.enc   (original .db deleted after encryption)
```

**Checksum Verification (SHA-256):**

```
   verifyBackup(id)
       │
       ├─ Find backup record
       ├─ Stat file (exists + size)
       ├─ If checksum stored:
       │     current = sha256(file)
       │     if current !== stored → status='failed', return false
       └─ Update status='verified'
```

**TTL Retention Cleanup:**

```
   cleanupOldBackups()
       │
       ├─ Get config.retentionDays (default: 30, env: BACKUP_RETENTION_DAYS)
       ├─ Cutoff = now - retentionDays * 86400000
       ├─ SELECT backups WHERE started_at < cutoff AND status IN ('completed','verified')
       ├─ For each:
       │     ├─ Delete file (and .enc if exists)
       │     └─ UPDATE status = 'failed', error_message = 'Expired'
       └─ Return count of cleaned backups
```

**Default Configuration:**
```json
{
  "fullBackupCron": "0 2 * * 0",
  "incrementalBackupCron": "0 2 * * 1-6",
  "retentionDays": 30,
  "encrypted": true,
  "backupDir": "./backups",
  "verifyAfterBackup": true
}
```

### 5. Deployment Manager

The Deployment Manager tracks versioned application deployments across environments with a status lifecycle and rollback support.

**Service**: `platform.service.ts → DeploymentService`

**Deployment Lifecycle:**

```
                     DEPLOYMENT STATUS MACHINE

                        ┌──────────────┐
                        │   PENDING    │
                        │  (created)   │
                        └──────┬───────┘
                               │ auto-transition
                               ▼
                        ┌──────────────┐
                        │   RUNNING    │
                        │  (in-flight) │
                        └──────┬───────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
                   ▼                       ▼
            ┌──────────────┐       ┌──────────────┐
            │  COMPLETED   │       │   FAILED     │
            │  (success)   │       │  (with error)│
            └──────┬───────┘       └──────┬───────┘
                   │                      │
                   │ rollback             │ rollback
                   ▼                      ▼
            ┌──────────────────────────────────────┐
            │            ROLLED_BACK                │
            │  (rollback_version tracks revert-to)  │
            └──────────────────────────────────────┘
```

**Environment Support:**
| Environment | Description |
|-------------|-------------|
| `development` | Local dev/test |
| `staging` | Pre-production validation |
| `production` | Live deployment |

**Deployment Record Fields:**
- `version` — Semantic version string (e.g., `2.5.0`)
- `environment` — Target environment
- `status` — Current lifecycle state
- `commitHash` — Git commit SHA
- `branch` — Git branch name
- `deployedBy` — User who triggered the deployment
- `rollbackVersion` — Version rolled back to (set on rollback)
- `durationSeconds` — Auto-calculated on completion/failure/rollback

### 6. Disaster Recovery

Disaster Recovery provides a **runbook**, **recovery status tracking**, **scenario simulation**, and **recovery procedures** for common failure modes.

**Service**: `platform.service.ts → DisasterRecoveryService`

**DR Runbook — 6 Recovery Procedures:**

| Procedure | Title | Estimated RTO | Key Steps |
|-----------|-------|---------------|-----------|
| `databaseRecovery` | Database Recovery | ~15 min | Stop app, latest verified backup, restore, PRAGMA integrity_check, restart |
| `nodeFailure` | Node/App Failure | ~2 min | Check logs, restart process, verify health, check sync, replay workflows |
| `syncFailure` | Sync Engine Failure | ~10 min | Check audit log, verify device registry, clear corrupted queue, reset checkpoints |
| `workflowFailure` | Workflow Engine Failure | ~5 min | Identify failed instances, check errors, fix root cause, re-run failed steps |
| `queueCorruption` | Queue Corruption | ~5 min | Stop workers, identify corrupted items, clear entries, restart workers |
| `backupFailure` | Backup Failure Recovery | ~5 min | Check disk/permissions, verify config, check encryption key, force new backup |

**Recovery Status:**

```json
{
  "overall": "healthy" | "critical",
  "database": "ok" | "down",
  "lastBackup": "2026-07-14T02:00:00.000Z",
  "lastBackupStatus": "verified",
  "backupAvailable": true,
  "uptimeSeconds": 172800,
  "timestamp": "2026-07-14TT10:30:00.000Z"
}
```

**Simulation Engine:**

3 supported scenarios that can be triggered via `POST /dr/simulate`:

| Scenario | Effect |
|----------|--------|
| `database_disconnect` | Drops a test table to simulate DB failure |
| `workflow_failure` | Marks one running workflow instance as `failed` with DR simulation message |
| `queue_corruption` | Marks one pending sync queue item as `failed` with DR simulation message |

Each scenario has a corresponding `POST /dr/recover` that resets the simulated state.

### 7. Ops Dashboard

The Ops Dashboard aggregates data from all subsystems into a single JSON response, providing a comprehensive view of platform health at a glance.

**Service**: `platform.service.ts → OpsDashboardService`

**Dashboard Data Shape:**

```json
{
  "health": { "status": "pass", "totalChecks": 5, "passing": 5, "failing": 0, "warning": 0 },
  "system": {
    "uptime": 172800,
    "memory": { "rss": 125829120, "heapTotal": 83886080, "heapUsed": 62914560, "external": 4194304 },
    "cpu": { "loadAvg": [0.45, 0.52, 0.48] },
    "node": "v20.11.0",
    "platform": "linux"
  },
  "database": { "size": 52428800, "tableCount": 42, "status": "pass" },
  "api": {
    "totalEndpoints": 0,
    "recentMetrics": [ ... ],
    "slowQueries": [ ... ]
  },
  "workflow": { "activeInstances": 12, "failedInstances": 0 },
  "sync": { "activeDevices": 8, "pendingQueue": 3, "unresolvedConflicts": 0 },
  "backup": { "lastBackup": { ... }, "totalBackups": 14, "status": "pass" },
  "alerts": { "open": 2, "critical": 0, "recent": [ ... ] },
  "scheduler": { "activeJobs": 5, "pendingJobs": 0 },
  "storage": { "dbSize": 52428800, "backupSize": 157286400 }
}
```

The dashboard is assembled by:
1. `PlatformRepository.getOpsDashboard()` — fetches health summary, database info, recent metrics, slow queries, backup info, alert counts
2. `HealthService.checkWorkflow()` — augments workflow instance counts
3. `HealthService.checkSync()` — augments sync device/queue/conflict counts
4. Direct query to `scheduled_jobs` — augments scheduler job counts

## Pipeline Diagrams

### Diagram 1: Health Check Flow

```
                    HEALTH CHECK PIPELINE

   External Probe              Express Route                HealthService
   (K8s / Docker)              (platform.routes.ts)         (platform.service.ts)
         │                           │                           │
         │  GET /health/live         │                           │
         │──────────────────────────>│                           │
         │                           │  checkDatabase()          │
         │                           │──────────────────────────>│
         │                           │                           ├─ SELECT 1 AS ok
         │                           │                           │  (via repository)
         │                           │                           │
         │                    ┌──────┴──────┐                    │
         │                    │  status=pass │                    │
         │                    │  ? alive     │                    │
         │                    │  : dead      │                    │
         │                    └─────────────┘                    │
         │  {"status":"alive",  │                                │
         │   "database":"pass"}  │                                │
         │<─────────────────────│                                │
         │                           │                           │
         │  GET /health              │                           │
         │──────────────────────────>│                           │
         │                           │  runAllChecks()           │
         │                           │──────────────────────────>│
         │                           │                           ├─ checkDatabase()
         │                           │                           ├─ checkStorage()
         │                           │                           ├─ checkMemory()
         │                           │                           ├─ checkCpu()
         │                           │                           ├─ checkUptime()
         │                           │                           │  (Promise.all)
         │                           │                           │
         │                           │                    ┌──────┴──────┐
         │                           │                    │ Aggregate:  │
         │                           │                    │ any fail →  │
         │                           │                    │ overall=fail│
         │                           │                    │ else any    │
         │                           │                    │ warn→warn   │
         │                           │                    │ else pass   │
         │                           │                    └─────────────┘
         │                           │                           │
         │                           │  ← recordHealthCheck() → SQLite
         │                           │                           │
         │  {status, checks[]}       │                           │
         │<─────────────────────────│                           │
         │                           │                           │
         │  GET /health/checks       │                           │
         │  (auth: owner/manager)    │                           │
         │──────────────────────────>│                           │
         │                           │  all 7 checks            │
         │                           │  (includes workflow +    │
         │                           │   sync)                   │
         │                           │──────────────────────────>│
         │                           │                           │
```

### Diagram 2: Request Monitoring Flow

```
                  REQUEST MONITORING PIPELINE

   Client               Express                 monitoringMiddleware          SQLite
    │                      │                           │                       │
    │   POST /api/...      │                           │                       │
    │─────────────────────>│                           │                       │
    │                      │                           │                       │
    │                      │  trackRequestMetrics      │                       │
    │                      │──────────────────────────>│                       │
    │                      │                           │                       │
    │                      │                           ├─ start = Date.now()  │
    │                      │                           │                       │
    │                      │  [request handled by       │                       │
    │                      │   route handler]          │                       │
    │                      │                           │                       │
    │                      │  res.on('finish')         │                       │
    │                      │<──────────────────────────│                       │
    │                      │                           │                       │
    │                      │                           ├─ key = "POST:/api/x" │
    │                      │                           ├─ metricsStore.get()  │
    │                      │                           ├─ increment count     │
    │                      │                           ├─ add duration        │
    │                      │                           ├─ track statusCode    │
    │                      │                           └─ metricsStore.set()  │
    │                      │                           │                       │
    │  <──response───      │                           │                       │
    │                      │                           │                       │
    │                      │    [periodic flush]       │                       │
    │                      │                           │                       │
    │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ flushMetrics() ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│
    │                      │                           │                       │
    │                      │                           ├─ for (key, sample)   │
    │                      │                           │                       │
    │                      │                           ├─ INSERT              │
    │                      │                           │  monitoring_metrics   │
    │                      │                           │  (request.count...)   │
    │                      │                           │──────────────────────>│
    │                      │                           │                       │
    │                      │                           ├─ INSERT              │
    │                      │                           │  monitoring_metrics   │
    │                      │                           │  (latency.ms...)      │
    │                      │                           │──────────────────────>│
    │                      │                           │                       │
    │                      │                           └─ metricsStore.clear() │
    │                      │                           │                       │
    │                      │  recordApiMetric()        │                       │
    │                      │  (per-request)            │                       │
    │                      │──────────────────────────>│                       │
    │                      │                           ├─ INSERT              │
    │                      │                           │  request_metrics      │
    │                      │                           │──────────────────────>│
    │                      │                           │                       │
```

### Diagram 3: Backup Creation Flow

```
                       BACKUP CREATION PIPELINE

   Client            Route                BackupService            Filesystem         SQLite
    │                  │                      │                       │                 │
    │ POST /backups    │                      │                       │                 │
    │ { type:"full",   │                      │                       │                 │
    │   filePath:"..."}│                      │                       │                 │
    │─────────────────>│                      │                       │                 │
    │                  │                      │                       │                 │
    │                  │  validate dto        │                       │                 │
    │                  │  createBackup(dto)   │                       │                 │
    │                  │─────────────────────>│                       │                 │
    │                  │                      │                       │                 │
    │                  │                      │  INSERT backup_records│                 │
    │                  │                      │  (status=running)     │                 │
    │                  │                      │──────────────────────────────────────>│
    │                  │                      │                       │                 │
    │                  │                      │  mkdir backupDir      │                 │
    │                  │                      │──────────────────────>│                 │
    │                  │                      │                       │                 │
    │                  │                      │  fs.createReadStream  │                 │
    │                  │                      │──────────────────────>│                 │
    │                  │                      │  .pipe(writeStream)   │                 │
    │                  │                      │  await finish         │── backup.db ──>│
    │                  │                      │                       │                 │
    │                  │                      │  if encrypted:        │                 │
    │                  │                      │    cipher(aes-256-gcm)│                 │
    │                  │                      │    write .enc         │── backup.db.enc│
    │                  │                      │    unlink original    │── delete orig  │
    │                  │                      │                       │                 │
    │                  │                      │  sha256 checksum      │                 │
    │                  │                      │──────────────────────>│                 │
    │                  │                      │                       │                 │
    │                  │                      │  UPDATE status=       │                 │
    │                  │                      │   completed, fileSize,│                 │
    │                  │                      │   checksum            │                 │
    │                  │                      │──────────────────────────────────────>│
    │                  │                      │                       │                 │
    │                  │                      │  if type != wal:      │                 │
    │                  │                      │    UPDATE status=     │                 │
    │                  │                      │     verified          │                 │
    │                  │                      │──────────────────────────────────────>│
    │                  │                      │                       │                 │
    │                  │  return BackupRecord │                       │                 │
    │  <──201──        │<─────────────────────│                       │                 │
    │                  │                      │                       │                 │
```

### Diagram 4: DR Simulation Flow

```
                    DISASTER RECOVERY SIMULATION PIPELINE

   Operator            Route                    DisasterRecoveryService       SQLite
    │                    │                              │                      │
    │ POST /dr/simulate  │                              │                      │
    │ {scenario:"workflow│                              │                      │
    │  _failure"}        │                              │                      │
    │───────────────────>│                              │                      │
    │                    │                              │                      │
    │                    │  simulateFailure(scenario)   │                      │
    │                    │─────────────────────────────>│                      │
    │                    │                              │                      │
    │                    │  ┌─ database_disconnect: ────│                      │
    │                    │  │   DROP TABLE _dr_test     │                      │
    │                    │  │──────────────────────────>│                      │
    │                    │  │                           │                      │
    │                    │  ├─ workflow_failure: ───────│                      │
    │                    │  │   UPDATE workflow_inst     │                      │
    │                    │  │   status='failed'         │                      │
    │                    │  │──────────────────────────>│                      │
    │                    │  │                           │                      │
    │                    │  └─ queue_corruption: ───────│                      │
    │                    │      UPDATE sync_queue        │                      │
    │                    │      status='failed'         │                      │
    │                    │──────────────────────────────>│                      │
    │                    │                              │                      │
    │                    │  Return result:              │                      │
    │                    │  {scenario, result, note}    │                      │
    │                    │<─────────────────────────────│                      │
    │                    │                              │                      │
    │  {scenario:"work   │                              │                      │
    │   flow_failure",   │                              │                      │
    │   result:"sim     │                              │                      │
    │   ulated"}         │                              │                      │
    │<───────────────────│                              │                      │
    │                    │                              │                      │
    │                    │   [Operator investigates]    │                      │
    │                    │                              │                      │
    │ POST /dr/recover   │                              │                      │
    │ {scenario:"workflow│                              │                      │
    │  _failure"}        │                              │                      │
    │───────────────────>│                              │                      │
    │                    │  recoverFromScenario(scenario)│                      │
    │                    │─────────────────────────────>│                      │
    │                    │                              │                      │
    │                    │  ├─ workflow_failure: ───────│                      │
    │                    │  │   UPDATE workflow_inst     │                      │
    │                    │  │   status='pending'        │                      │
    │                    │  │   WHERE error='DR sim'    │                      │
    │                    │  │──────────────────────────>│                      │
    │                    │                              │                      │
    │                    │  Return: {scenario, result,  │                      │
    │                    │           note}              │                      │
    │  <── result ──────│<─────────────────────────────│                      │
    │                    │                              │                      │
```

### Diagram 5: Deployment Lifecycle

```
                      DEPLOYMENT LIFECYCLE PIPELINE

   Deployer          Route                   DeploymentService           SQLite
    │                  │                          │                       │
    │ POST /deployments│                          │                       │
    │ {version:"2.5.0",│                          │                       │
    │  env:"production"}│                          │                       │
    │─────────────────>│                          │                       │
    │                  │                          │                       │
    │                  │  createDeployment(        │                       │
    │                  │   version, env, user)     │                       │
    │                  │─────────────────────────>│                       │
    │                  │                          │                       │
    │                  │                          │  INSERT deployment    │
    │                  │                          │  (status=pending)     │
    │                  │                          │──────────────────────>│
    │                  │                          │                       │
    │                  │                          │  UPDATE status=running│
    │                  │                          │──────────────────────>│
    │                  │                          │                       │
    │  <── 201 ────────│  return record           │                       │
    │                  │<─────────────────────────│                       │
    │                  │                          │                       │
    │                  │                          │                       │
    │  [Deployer runs  │                          │                       │
    │   actual deploy  │                          │                       │
    │   steps — git    │                          │                       │
    │   pull, migrate, │                          │                       │
    │   restart]       │                          │                       │
    │                  │                          │                       │
    │                  │                          │                       │
    │ POST /deployments│                          │                       │
    │  /:id/complete   │                          │                       │
    │ {commitHash:     │                          │                       │
    │  "abc123def"}    │                          │                       │
    │─────────────────>│                          │                       │
    │                  │  completeDeployment()    │                       │
    │                  │─────────────────────────>│                       │
    │                  │                          │                       │
    │                  │                          │  UPDATE status=       │
    │                  │                          │   completed           │
    │                  │                          │  SET completed_at,    │
    │                  │                          │   duration_seconds    │
    │                  │                          │──────────────────────>│
    │                  │                          │                       │
    │  <── 200 ────────│                          │                       │
    │                  │                          │                       │
    │    [If failure]  │                          │                       │
    │                  │                          │                       │
    │                  │  [route catches error]   │                       │
    │                  │  failDeployment(id, err) │                       │
    │                  │─────────────────────────>│                       │
    │                  │                          │  UPDATE status=failed │
    │                  │                          │  SET error_message    │
    │                  │                          │──────────────────────>│
    │                  │                          │                       │
    │    [If rollback] │                          │                       │
    │                  │                          │                       │
    │ POST /deployments│                          │                       │
    │  /:id/rollback   │                          │                       │
    │ {rollbackVersion │                          │                       │
    │  :"2.4.0"}       │                          │                       │
    │─────────────────>│                          │                       │
    │                  │  rollbackDeployment(     │                       │
    │                  │   id, rollbackVersion)   │                       │
    │                  │─────────────────────────>│                       │
    │                  │                          │                       │
    │                  │                          │  UPDATE status=       │
    │                  │                          │   rolled_back         │
    │                  │                          │  SET rollback_version │
    │                  │                          │──────────────────────>│
    │                  │                          │                       │
```

## Security & RBAC

The platform operations API uses JWT-based authentication (`authenticate` middleware) with role-based authorization (`authorize` middleware). Three roles interact with operations endpoints:

| Role | Health | Metrics | Alerts | Backups | Deployments | DR | Dashboard | Database |
|------|--------|---------|--------|---------|-------------|----|-----------|----------|
| **owner** | All 6 | All 4 | All 6 | All 8 | All 5 | All 4 | Yes | Yes |
| **manager** | No-auth probes + `/checks` | `/metrics` (in-memory), `/metrics/historical`, `/metrics/requests`, `/metrics/slow-queries` | All 6 | — | — | `/dr/status` only | Yes | Yes |
| **accountant** | No-auth probes only | `/metrics/historical` only | — | — | — | — | — | Yes |

**Key RBAC rules:**
- **Liveness, readiness, startup** health endpoints require no authentication (intended for load balancers/orchestrators)
- **Deep health checks** (`/health/checks`) require owner or manager
- **Backup, deployment, DR simulation/recovery** endpoints are owner-only (destructive operations)
- **Historical metrics** are readable by accountant (non-sensitive aggregate data)
- **Alert management** (create, acknowledge, resolve) is available to both owner and manager (operational necessity)
- **All write operations** (POST/PUT/DELETE) are owner-only except alert management which allows manager acknowledgment

## Implementation Plan (Phases)

### Phase 1: Health System + Middleware (Observability, Monitoring)

**Deliverables:**
- `platform.types.ts` — All type definitions (HealthReport, HealthCheckResult, HealthSummary)
- `HealthService` with 7 checks: database, storage, memory, cpu, uptime, workflow, sync
- `PlatformRepository` with `recordHealthCheck()`, `getDatabaseSize()`, `testConnection()`
- 5 health routes: `/health`, `/health/live`, `/health/ready`, `/health/startup`, `/health/checks`
- `observability.ts` — `requestId`, `requestLogger`, `structuredLog`, `logAuditEvent` middleware
- `monitoring.ts` — `trackRequestMetrics`, `flushMetrics`, `recordApiMetric`, `recordSlowQuery`, `getMetricsMiddleware`

**Tables created:** `health_check_history`, `monitoring_metrics`, `request_metrics`, `slow_query_log`

**Verification:** `GET /health` returns aggregate status, `GET /health/live` returns `{"status":"alive"}`, structured JSON appears in server logs

### Phase 2: Alerts + Metrics Endpoints

**Deliverables:**
- `Alert` CRUD operations in repository and service
- Alert status lifecycle: open → acknowledged → resolved → dismissed
- 6 alert routes: `GET /alerts`, `GET /alerts/:id`, `POST /alerts`, `POST /alerts/:id/acknowledge`, `POST /alerts/:id/resolve`, `POST /alerts/:id/dismiss`
- 4 metrics routes: `GET /metrics`, `GET /metrics/historical`, `GET /metrics/requests`, `GET /metrics/slow-queries`

**Tables created:** `alerts`

**Verification:** Create alert via `POST /alerts`, list via `GET /alerts`, acknowledge and resolve; verify in-memory metrics via `GET /metrics`

### Phase 3: Backup System

**Deliverables:**
- `BackupService` with `createBackup()`, `getBackups()`, `getBackup()`, `getLastBackup()`, `deleteBackup()`, `verifyBackup()`, `getBackupScheduleConfig()`, `cleanupOldBackups()`
- File system snapshot with stream-based copy
- AES-256-GCM encryption via `crypto.createCipheriv` + `crypto.scryptSync`
- SHA-256 checksum verification
- TTL-based cleanup (default 30 days)
- 8 backup routes (CRUD + verify + config + cleanup)

**Tables created:** `backup_records`

**Verification:** Create backup via `POST /backups`, verify checksum via `POST /backups/:id/verify`, clean up expired via `POST /backups/cleanup`

### Phase 4: Deployment Manager

**Deliverables:**
- `DeploymentService` with `createDeployment()`, `completeDeployment()`, `failDeployment()`, `rollbackDeployment()`, `getDeployments()`, `getDeployment()`
- Lifecycle: pending → running → completed | failed | rolled_back
- Auto-calculated `duration_seconds` on terminal states
- 5 deployment routes (list, get, create, complete, rollback)

**Tables created:** `deployment_records`

**Verification:** Create deployment, complete it, verify duration is calculated; create another and roll it back

### Phase 5: Disaster Recovery

**Deliverables:**
- `DisasterRecoveryService` with:
  - `getRunbook()` — Returns structured runbook with 6 recovery procedures and estimated RTOs
  - `getRecoveryStatus()` — Returns overall health, database status, last backup info, uptime
  - `simulateFailure(scenario)` — 3 scenarios: `database_disconnect`, `workflow_failure`, `queue_corruption`
  - `recoverFromScenario(scenario)` — Reset simulated failures
- 4 DR routes: runbook, status, simulate, recover

**Verification:** Get runbook via `GET /dr/runbook`, check status via `GET /dr/status`, simulate workflow failure via `POST /dr/simulate`, recover via `POST /dr/recover`

### Phase 6: Ops Dashboard + Routes

**Deliverables:**
- `OpsDashboardService.getDashboard()` — Aggregates health summary, system info, database info, API metrics, workflow/sync status, backup info, alerts summary, scheduler info
- Dashboard route: `GET /dashboard`
- Database info route: `GET /database`
- Integration wiring with existing workflow and sync modules for live instance/device counts
- Final RBAC annotations across all routes

**Verification:** `GET /dashboard` returns comprehensive JSON with all sections populated

---

## References

- ADR-0016: Offline Synchronization & Conflict Resolution Architecture
- ADR-0017: Enterprise Workflow Automation, Notification & Business Rules Engine
- [Express.js Middleware Documentation](https://expressjs.com/en/guide/using-middleware.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html) (AES-256-GCM, SHA-256, scrypt)
- [Health Check Response Format for HTTP APIs](https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html) (draft-inadarei-api-health-check)
