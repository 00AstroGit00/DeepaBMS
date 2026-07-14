> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Administrator Guide

> **Status:** Production reference
> **Audience:** System Administrators, Tenant Admins
> **Last updated:** 2026-07-14
> **Related:** [Operations Manual](operations-manual.md) · [Deployment Guide](deployment-guide.md) · [Security Hardening](../security/security-hardening-guide.md) · [SRE Runbook](sre-runbook.md)

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Roles & Permissions](#roles--permissions)
3. [Configuration Management](#configuration-management)
4. [Security](#security)
5. [Database Administration](#database-administration)
6. [Backup & Restore](#backup--restore)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Architecture Overview

```
                 ┌────────────┐
   Clients ─────▶│   Nginx    │  TLS termination, rate limit
                 │ (web:80/443)│
                 └─────┬──────┘
                       │
                 ┌─────▼──────┐
                 │  Backend   │  Express API :3000
                 │  (Node)    │  JWT auth, bcrypt
                 └──┬─────┬───┘
                    │     │
              ┌─────▼┐   ┌▼─────┐
              │Postgres│ │ Redis │  cache / sessions
              │ :5432 │ │ :6379 │
              └────────┘ └───────┘

   Optional: Prometheus :9090 → Grafana :3001 → Alertmanager :9093
```

- **Backend:** stateless Express service; horizontally scalable.
- **PostgreSQL 15:** system of record. SQLite only for local dev.
- **Redis 7:** cache + token blacklist.
- **Nginx:** reverse proxy, TLS, gzip.

> **Note:** The backend is horizontally stateless — all shared state is in Postgres/Redis. This is what makes [Scaling](scaling-guide.md) safe.

---

## Roles & Permissions

| Role     | Capabilities                                                        |
|----------|---------------------------------------------------------------------|
| `admin`  | Full system + tenant + user management, config, backups             |
| `manager`| Create/edit business records, view reports, manage cashiers         |
| `cashier`| Record transactions, print receipts                                 |
| `viewer` | Read-only dashboards and reports                                    |

Permissions are enforced in `apps/backend/src/middleware/authorize.ts` via RBAC decorators. Adding a role requires a migration and middleware update.

> **Warning:** Never grant `admin` to a service account used by the mobile app. Use scoped API keys.

---

## Configuration Management

Configuration precedence (low → high):

1. `config/default.yaml`
2. Environment file (`.env.production`)
3. Runtime env vars / K8s ConfigMap / Helm values
4. Secrets (never in config files)

Centralize non-secret config in `k8s/base/configmap.yaml` or `helm/deepa-bms/templates/configmap.yaml`. Secrets belong in `secret.yaml` / external secrets operator.

> **Note:** Changing `JWT_EXPIRY` or `JWT_SECRET` invalidates all active sessions. Plan for a forced re-login.

---

## Security

- All traffic over TLS 1.2+; HSTS enabled in nginx.
- Passwords hashed with bcrypt (cost ≥ 12).
- JWTs signed with `HS256`; short expiry; refresh via Redis blacklist.
- Rate limiting via `express-rate-limit` (see [API Deployment Guide](api-deployment-guide.md)).
- CORS allowlist restricted to known origins.

See the dedicated [Security Hardening Guide](../security/security-hardening-guide.md) for the full checklist (secret rotation, network policy, PodSecurity, audit logging).

> **Warning:** `JWT_SECRET` compromise = full account takeover. Rotate immediately and invalidate sessions on suspected leak.

---

## Database Administration

Connect for admin tasks:

```bash
docker exec -it deepa-bms-postgres psql -U deepa_admin -d deepa_bms
# or kubectl
kubectl -n deepa-bms exec -it deploy/postgres -- psql -U deepa_admin -d deepa_bms
```

Common maintenance:

```sql
-- Active connections
SELECT pid, usename, application_name, state FROM pg_stat_activity;

-- Bloat / size
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY 2 DESC;

-- Vacuum
VACUUM ANALYZE;
```

Tune `shared_buffers` (25% RAM), `max_connections` (match pool), `work_mem`. See [Performance Guide](performance-guide.md).

---

## Backup & Restore

Backups are managed by `apps/backend/scripts/backup.sh` (logical `pg_dump`) and copied to object storage.

```bash
# Manual backup
docker exec deepa-bms-postgres pg_dump -U deepa_admin deepa_bms > backup_$(date +%F).sql

# Restore
docker exec -i deepa-bms-postgres psql -U deepa_admin -d deepa_bms < backup_$(date +%F).sql
```

Recovery procedures (multi-step, off-site, tested) are in [Disaster Recovery](disaster-recovery-guide.md).

> **Warning:** A logical dump taken while writes occur is consistent only with `--serializable-deferrable` or during a brief freeze. Prefer the scheduled job.

---

## Monitoring

- **Metrics:** Prometheus scrapes `/metrics` from backend; Postgres/Redis exporters optional.
- **Dashboards:** Grafana provisioned from `docker/grafana/provisioning`.
- **Alerts:** `docker/prometheus/alert.rules.yml` → Alertmanager routes.
- **Logs:** `json-file` rotation; ship to central store.

Key alerts to keep enabled: service down, p99 latency, error rate, disk usage, cert expiry.

---

## Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| Cannot log in | `pg_stat_activity`; user row `active` flag | Reset password; check `JWT_SECRET` match |
| 403 on API | Role assignment | Verify RBAC in `authorize.ts` |
| Slow queries | `pg_stat_statements` | Add index; see perf guide |
| Redis OOM | `redis-cli info memory` | Increase `maxmemory`; eviction policy |
| Config not applied | Precedence order | Check ConfigMap vs env override |

---

## FAQ

**Q: How do I force all users to log out?**
A: Rotate `JWT_SECRET`. Existing tokens become invalid; clients must re-auth.

**Q: Can I run without Redis?**
A: Not in production — rate limiting and token blacklist depend on it. Dev SQLite mode can skip it.

**Q: Where are secrets stored?**
A: `secret.yaml` (K8s), Helm values (sealed), or external secrets operator. Never in git.

**Q: How do I add a new role?**
A: DB migration + `authorize.ts` middleware + docs update. Coordinate with [Release Engineering](release-engineering-guide.md).

**Q: SQLite vs PostgreSQL?**
A: SQLite is dev-only. Production is PostgreSQL for concurrency and backup tooling.

---

*Cross-references: [Operations Manual](operations-manual.md) · [SRE Runbook](sre-runbook.md) · [Security Hardening](../security/security-hardening-guide.md) · [Disaster Recovery](disaster-recovery-guide.md)*
