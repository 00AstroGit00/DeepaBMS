# DeepaBMS Docker Guide

> **Status:** Production reference
> **Audience:** Ops, Developers, SRE
> **Last updated:** 2026-07-14
> **Related:** [Deployment Guide](deployment-guide.md) · [Kubernetes Guide](kubernetes-guide.md) · [CI/CD Guide](ci-cd-guide.md)

## Table of Contents

1. [Images](#images)
2. [Building Images](#building-images)
3. [Compose Profiles](#compose-profiles)
4. [Production vs Development](#production-vs-development)
5. [Volumes](#volumes)
6. [Networking](#networking)
7. [Health Checks](#health-checks)
8. [Logging](#logging)

---

## Images

- `apps/backend/Dockerfile` — dev (ts-node, hot reload).
- `apps/backend/Dockerfile.prod` — multi-stage, compiles `dist`, runs `node dist/index.js`.
- Base images: `node:20-alpine` (backend), `postgres:15-alpine`, `redis:7-alpine`, `nginx:stable-alpine`.

> **Note:** Always build prod images from `Dockerfile.prod` — the dev Dockerfile is not hardened.

---

## Building Images

```bash
export BUILD_VERSION=1.0.0 BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) VCS_REF=$(git rev-parse --short HEAD)

docker build -f apps/backend/Dockerfile.prod \
  --build-arg BUILD_VERSION=$BUILD_VERSION \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VCS_REF=$VCS_REF \
  -t deepa-bms-backend:$BUILD_VERSION apps/backend
```

Embedded metadata appears in `/health` and image labels (`org.opencontainers.image.revision`).

---

## Compose Profiles

`docker-compose.prod.yml` uses profiles to split monitoring:

```bash
docker compose -f docker-compose.prod.yml up -d --wait            # core only
docker compose -f docker-compose.prod.yml --profile monitoring up -d  # + prometheus/grafana/alertmanager
```

> **Warning:** Without `--profile monitoring`, Prometheus/Grafana won't start — you lose metrics and alerts.

---

## Production vs Development

| Aspect | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
|--------|----------------------------|-----------------------------------|
| DB | SQLite (local file) | PostgreSQL 15 |
| Restart | `no` | `always` |
| Healthchecks | none | enabled |
| Resource limits | none | set |
| Log rotation | default | `json-file` 10m×3 |
| Secrets | inline | env file + required vars |

> **Note:** Never run the dev compose in production — SQLite has no concurrency safety or backup tooling.

---

## Volumes

Named volumes persist state:

```yaml
volumes:
  pgdata:      # postgres data
  redis-data:  # redis AOF
  prometheus-data:
  grafana-data:
```

Backup a volume: `docker run --rm -v pgdata:/data -v $PWD:/backup busybox tar czf /backup/pg.tar.gz /data`.

> **Warning:** `docker compose down -v` deletes these volumes. Confirm backups first (see [DR](disaster-recovery-guide.md)).

---

## Networking

All services attach to `bms-net` (bridge). Only nginx publishes ports `80/443`; DB/Redis are internal.

```bash
docker network ls
docker network inspect deepa-bms_bms-net
```

For Swarm, use overlay networks and attach services accordingly.

---

## Health Checks

Defined per service:

```yaml
healthcheck:
  test: ["CMD", "curl", "--fail", "http://localhost:3000/health/live"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

`depends_on` uses `condition: service_healthy` so backend waits for Postgres/Redis.

---

## Logging

Central `x-logging` anchor:

```yaml
x-logging: &default-logging
  driver: "json-file"
  options: { max-size: "10m", max-file: "3" }
```

Tail: `docker compose -f docker-compose.prod.yml logs --tail=100 backend`.
Ship to Loki/ELK via logging driver or sidecar.

> **Note:** The 10m×3 cap prevents disk-full. See [SRE: Disk Full](sre-runbook.md#disk-full) if overridden.

---

*Cross-references: [Deployment Guide](deployment-guide.md) · [Kubernetes Guide](kubernetes-guide.md) · [CI/CD Guide](ci-cd-guide.md) · [Operations Manual](operations-manual.md)*
