> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS v1.0.0 — Authoritative Architecture

> This document is the single source of truth for the v1.0.0 production
> architecture. Any other document in this repository that mentions alternative
> relational databases or external caches contains **legacy design notes** and
> does not describe the deployed system.

## Datastore

- **SQLite 3** is the only production datastore. No PostgreSQL, MySQL, or other
  RDBMS is used or deployed.
- The backend opens a single SQLite file (default `deepa-bms.db`, overridable
  via `SQLITE_DB_PATH`).
- **Write mode:** WAL (`PRAGMA journal_mode=WAL`) for concurrent reader/writer
  support on a single writer.
- **Single-writer constraint:** SQLite allows only one writer at a time. The
  backend therefore runs as **exactly one replica** (`replicas: 1`). Horizontal
  Pod Autoscaling of the backend is **disabled** — scaling out would corrupt the
  database.

## Persistence

- Docker Compose: named volume `bms-sqlite` mounted at `/app/data`.
- Kubernetes: `PersistentVolumeClaim` `sqlite-pvc` mounted at `/app/data`.
- Helm: `sqlite.persistence` backed by a PVC at `/app/data`.
- The SQLite file and its `-wal`/`-shm` siblings must be included in any backup.

## Caching / Sessions

- **No Redis or external cache.** Sessions and tokens are stateless JWTs.
- Any reference to Redis (e.g., for token-revocation blocklists) is a legacy
  design note; v1.0.0 does not implement server-side token revocation.

## Deployment Topology

- Backend: single replica, stateless app process over a SQLite file.
- Web / mobile frontends: independently scalable (they are clients of the API).
- Ingress terminates external traffic to the backend service.

## Backup & Restore

- Backup: `sqlite3 <db> ".backup '<dest>'"` or filesystem copy of the db file
  plus `-wal`/`-shm` while the service is stopped or idle.
- Restore: stop the backend, replace the db file, restart.
- Integrity check: `sqlite3 <db> "PRAGMA integrity_check;"`.

## Future Options (NOT in v1.0.0)

- Multi-instance deployment would require a different datastore or a
  SQLite-replication layer. This is out of scope for v1.0.0 and is documented
  only as a future consideration in historical ADRs.
