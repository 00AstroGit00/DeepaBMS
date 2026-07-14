> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Operations Manual

> **Status:** Production reference
> **Audience:** Operations, On-call Engineers, SysAdmins
> **Last updated:** 2026-07-14
> **Related:** [Deployment Guide](deployment-guide.md) · [SRE Runbook](sre-runbook.md) · [Administrator Guide](administrator-guide.md) · [Incident Response](incident-response-guide.md)

## Table of Contents

1. [Introduction](#introduction)
2. [Starting and Stopping Services](#starting-and-stopping-services)
3. [Health Monitoring](#health-monitoring)
4. [Log Management](#log-management)
5. [Backup Verification](#backup-verification)
6. [User Management](#user-management)
7. [Tenant Management](#tenant-management)
8. [Performance Monitoring](#performance-monitoring)
9. [Routine Maintenance](#routine-maintenance)
10. [Escalation](#escalation)

---

## Introduction

This manual covers the day-to-day operation of a running DeepaBMS deployment. It assumes the system was deployed per the [Deployment Guide](deployment-guide.md). Commands are given for Docker Compose, Kubernetes, and Helm variants; choose the one matching your environment.

> **Note:** All stateful data (PostgreSQL, Redis) lives on persistent volumes. Never delete volumes without an verified off-site backup.

---

## Starting and Stopping Services

### Docker Compose

```bash
# Start
docker compose -f docker-compose.prod.yml up -d --wait

# Stop (keeps volumes)
docker compose -f docker-compose.prod.yml stop

# Stop and remove containers (keeps volumes)
docker compose -f docker-compose.prod.yml down

# Full teardown INCLUDING volumes (DANGEROUS)
docker compose -f docker-compose.prod.yml down -v
```

### Kubernetes

```bash
kubectl -n deepa-bms scale deployment/backend --replicas=0   # stop
kubectl -n deepa-bms scale deployment/backend --replicas=3   # start
```

### Helm

```bash
helm upgrade --install deepa-bms helm/deepa-bms -n deepa-bms
helm uninstall deepa-bms -n deepa-bms
```

> **Warning:** `down -v` and `helm uninstall` without `--keep-history` will destroy data volumes. Always confirm a fresh backup exists first.

---

## Health Monitoring

The backend exposes two endpoints:

- `/health/live` — process is up (liveness probe).
- `/health/ready` — DB and Redis dependencies are reachable (readiness probe).

```bash
curl -f http://localhost:3000/health/live
curl -f http://localhost:3000/health/ready
```

Kubernetes probes are defined in `k8s/base/deployment-backend.yaml`:

```yaml
livenessProbe:
  httpGet: { path: /health/live, port: 3000 }
  initialDelaySeconds: 20
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health/ready, port: 3000 }
  periodSeconds: 5
```

Prometheus scrapes `/metrics`. Use the Grafana "DeepaBMS Backend" dashboard for SLO panels.

> **Note:** A pod passing `live` but failing `ready` stays in rotation draining — watch the readiness gauge, not just liveness.

---

## Log Management

Logs use the `json-file` driver with rotation: `max-size: 10m`, `max-file: 3`.

```bash
# Compose
docker compose -f docker-compose.prod.yml logs --tail=200 --follow backend

# Kubernetes
kubectl -n deepa-bms logs -l app=backend --tail=200 -f

# Helm
kubectl -n deepa-bms logs deployment/backend
```

Aggregate to a central store (Loki/ELK) via the Fluent Bit sidecar pattern. Retention target: **30 days** hot, **1 year** cold.

> **Warning:** Do not disable log rotation. Unbounded logs have caused disk-full incidents — see [SRE Runbook: Disk Full](sre-runbook.md#disk-full).

---

## Backup Verification

Backups are produced by `apps/backend/scripts` and `docker/postgres` jobs. Verify, don't assume:

```bash
# List recent backups
ls -lh apps/backend/backups/

# Verify a Postgres dump restores into a scratch DB
pg_restore -l apps/backend/backups/deepa_bms_$(date +%F).dump | head

# Checksum integrity
sha256sum apps/backend/backups/deepa_bms_*.dump
```

A backup is only valid if a restore test passes. Schedule a monthly restore drill — see [Disaster Recovery](disaster-recovery-guide.md).

---

## User Management

Users authenticate via JWT; passwords hashed with bcrypt.

```bash
# Create admin (backend CLI helper)
node apps/backend/dist/scripts/create-user.js --email admin@example.com --role admin

# List users
curl -H "Authorization: Bearer $TOKEN" https://bms.example.com/api/users

# Reset a user password (forces re-login)
node apps/backend/dist/scripts/reset-password.js --email user@example.com
```

Role matrix: `admin`, `manager`, `cashier`, `viewer`. See [Administrator Guide](administrator-guide.md#roles--permissions).

> **Note:** Deactivated users retain JWTs until expiry. Rotate `JWT_SECRET` to force global logout in emergencies.

---

## Tenant Management

DeepaBMS supports a single-org deployment by default. For multi-tenant installs, tenant isolation is enforced at the data layer via `tenant_id`.

```bash
# Create tenant
curl -H "Authorization: Bearer $TOKEN" -X POST https://bms.example.com/api/tenants \
  -d '{"name":"Acme Pvt Ltd","slug":"acme"}'

# Suspend tenant (readonly mode)
curl -X PATCH https://bms.example.com/api/tenants/acme -d '{"status":"suspended"}'
```

> **Warning:** Deleting a tenant is irreversible and cascades to all child records. Require a second approver.

---

## Performance Monitoring

Key signals to watch (Grafana):

- `http_request_duration_seconds` p95/p99
- `pg_stat_activity` active connections
- `redis_connected_clients`
- Container CPU/memory vs. limits
- Node event-loop lag

Set alerts:
- p99 latency > 800 ms for 5m → page
- CPU > 80% for 10m → ticket
- Memory > 90% → page

See [Performance Guide](performance-guide.md) and [Scaling Guide](scaling-guide.md).

---

## Routine Maintenance

| Task | Frequency | Command |
|------|-----------|---------|
| Vacuum/analyze Postgres | Weekly | `docker exec deepa-bms-postgres psql -U deepa_admin -c "VACUUM ANALYZE;"` |
| Redis AOF rewrite check | Weekly | `redis-cli BGREWRITEAOF` |
| Image security scan | Per release | Trivy on `deepa-bms-backend` |
| Certificate check | Daily | `openssl x509 -enddate -noout -in fullchain.pem` |
| Backup restore drill | Monthly | See DR guide |
| Log rotation audit | Monthly | Verify `json-file` config |

> **Note:** Perform maintenance in a low-traffic window and announce via the status page.

---

## Escalation

1. **On-call engineer** responds to pages; follows [SRE Runbook](sre-runbook.md).
2. **SRE lead** engaged if mitigation fails after 15 minutes or SEV1.
3. **Engineering manager / Incident commander** for customer-impacting SEV1 — see [Incident Response](incident-response-guide.md).
4. **Vendor/cloud support** opened in parallel for infra faults (RDS, cluster).

Escalation contacts are maintained in [Disaster Recovery – DR Contacts](disaster-recovery-guide.md#dr-contacts).

---

*Cross-references: [SRE Runbook](sre-runbook.md) · [Administrator Guide](administrator-guide.md) · [Disaster Recovery](disaster-recovery-guide.md) · [Incident Response](incident-response-guide.md)*
