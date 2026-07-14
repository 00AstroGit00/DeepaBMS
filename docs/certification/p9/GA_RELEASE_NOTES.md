> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# GA Release Notes — DeepaBMS v1.0.0

**Status: NOT RELEASED (certification blocked — see Go/No-Go).**
Prepared: 2026-07-14.

## Highlights targeted for 1.0
- **Financial integrity (FIN-01/FIN-02):** Operational transactions (restaurant,
  bar/liquor, rooms) now post to the General Ledger via a durable failure queue
  (`ledger_post_failures`). Bar sales compute Kerala TOT (tax-inclusive).
- **Security (SEC-01/02/08):** Production seeds strong random PINs (force-change);
  tenant context bound to JWT; JWT algorithm pinned to HS256.
- **Observability (OBS-01/02):** `/api/platform/metrics` emits Prometheus format;
  alert rules use real SQLite/process metrics (removed phantom PG/Redis alerts).
- **Performance/Reliability (PERF-03/09):** SQLite WAL + busy_timeout; workflow
  scheduler now runs `processDueJobs` on an interval with graceful shutdown.

## Known issues at tag time
- Deployment artifacts still reference postgres/redis (orphaned) — **must fix before
  GA** (data-durability risk for containerized SQLite).
- Runtime test suite (Jest) not yet executed in certification environment.

## Upgrade / migration notes
- Schema is additive (`CREATE TABLE IF NOT EXISTS`, idempotent `ALTER`). No destructive
  migration. Existing SQLite DBs auto-upgrade on next start (WAL + new columns/tables).
- Regenerate default credentials on first production boot (SEED_DEMO unset).

## Compatibility
- Backend: Node 20+ (developed/tested on 24.17.0 in CI).
- Frontend: Expo SDK 51 (Android/iOS); Windows Electron shell.
