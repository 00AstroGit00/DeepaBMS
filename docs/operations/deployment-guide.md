> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Deployment Guide

> **Status:** Production-ready reference
> **Audience:** DevOps, Platform, SRE
> **Last updated:** 2026-07-14
> **Related:** [Operations Manual](operations-manual.md) · [SRE Runbook](sre-runbook.md) · [Kubernetes Guide](kubernetes-guide.md) · [Helm Guide](helm-guide.md) · [Docker Guide](docker-guide.md)

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Single-Server Docker Deployment](#single-server-docker-deployment)
5. [Docker Swarm Deployment](#docker-swarm-deployment)
6. [Kubernetes (kubectl + Kustomize)](#kubernetes-kubectl--kustomize)
7. [Helm Deployment](#helm-deployment)
8. [Production Readiness Checklist](#production-readiness-checklist)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)

---

## Overview

DeepaBMS ships as a set of containerized services:

| Component      | Image / Path                  | Port  | Notes                                  |
|----------------|-------------------------------|-------|----------------------------------------|
| Backend API    | `apps/backend` (Dockerfile.prod) | 3000  | Express + JWT, rate-limited           |
| PostgreSQL     | `postgres:15-alpine`          | 5432  | Primary datastore                     |
| Redis          | `redis:7-alpine`              | 6379  | Cache + session store                 |
| Web proxy      | `nginx:stable-alpine`         | 80/443| Reverse proxy, TLS termination         |
| Monitoring     | Prometheus / Grafana / Alertmanager | 9090/3001/9093 | Optional `monitoring` profile |

> **Note:** The repository default `docker-compose.yml` uses SQLite for local dev. Production deployments **must** use the PostgreSQL-backed `docker-compose.prod.yml` or Kubernetes/Helm.

---

## Prerequisites

- Docker Engine `>= 24.x` and Docker Compose `>= 2.20` (or Podman with compose plugin).
- For K8s: a cluster `>= 1.27` and `kubectl` aligned to server version.
- For Helm: `helm >= 3.14`.
- A DNS name for the deployment (e.g. `bms.example.com`).
- TLS certificate (Let's Encrypt or enterprise CA).
- At least **2 vCPU / 4 GiB RAM** for a single node; more for HA.
- Outbound internet for image pulls (or a private registry mirror).
- `git`, `curl`, and `jq` on the operator workstation.

> **Warning:** Never deploy with default passwords. Rotate every secret in `.env.production` before first launch.

---

## Environment Configuration

Copy the production template and fill in values:

```bash
cp .env.production.example .env.production
```

Required variables (see `.env.production.example` for the full list):

```bash
POSTGRES_DB=deepa_bms
POSTGRES_USER=deepa_admin
POSTGRES_PASSWORD=<strong-unique-value>

REDIS_PASSWORD=<strong-unique-value>

JWT_SECRET=<64-char-random>
JWT_EXPIRY=86400

GRAFANA_ADMIN_PASSWORD=<strong-unique-value>
BUILD_VERSION=1.0.0
```

> **Note:** `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, and `JWT_SECRET` are mandatory — the compose file will refuse to start without them.

Generate a strong secret:

```bash
openssl rand -hex 32   # use for JWT_SECRET / passwords
```

---

## Single-Server Docker Deployment

This is the simplest production topology: one host running all services via Compose.

```bash
# Build backend image with immutable metadata
export BUILD_VERSION=1.0.0 BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) VCS_REF=$(git rev-parse --short HEAD)

# Start core stack (postgres, redis, backend, nginx)
docker compose -f docker-compose.prod.yml up -d --wait

# (Optional) Enable monitoring
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

Verify containers are healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

> **Warning:** The single-server mode has **no HA**. A host failure is a full outage. Use it only for small deployments or as a staging replica of the K8s topology.

---

## Docker Swarm Deployment

Swarm provides multi-node orchestration with rolling updates and secrets.

```bash
# Initialize the cluster
docker swarm init --advertise-addr <manager-ip>

# Convert env secrets to swarm secrets
echo "$POSTGRES_PASSWORD" | docker secret create postgres_password -
echo "$JWT_SECRET"        | docker secret create jwt_secret -

# Deploy the stack (compose file supports deploy blocks)
docker stack deploy -c docker-compose.prod.yml deepa-bms
```

Common operations:

```bash
docker stack services deepa-bms          # list services
docker service logs deepa-bms_backend    # tail logs
docker service scale deepa-bms_backend=4 # manual scale
docker stack rm deepa-bms                # tear down
```

> **Note:** Swarm does not honor the Compose `profiles:` for monitoring reliably — deploy monitoring separately with `docker stack deploy -c docker-compose.monitoring.yml monitoring` if needed.

---

## Kubernetes (kubectl + Kustomize)

Manifests live under `k8s/base` with environment overlays in `k8s/overlays/{staging,production}`.

```bash
# Preview rendered manifests for production
kubectl kustomize k8s/overlays/production

# Apply staging
kubectl apply -k k8s/overlays/staging

# Apply production
kubectl apply -k k8s/overlays/production

# Watch rollout
kubectl -n deepa-bms rollout status deployment/backend
```

Secrets are referenced by `k8s/base/secret.yaml` (placeholder) — populate via sealed secrets or an external secrets operator:

```bash
kubectl -n deepa-bms create secret generic deepa-secrets \
  --from-literal=POSTGRES_PASSWORD=... \
  --from-literal=JWT_SECRET=... \
  --from-literal=REDIS_PASSWORD=... \
  --dry-run=client -o yaml | kubectl apply -f -
```

> **Note:** The base namespace is `deepa-bms`. CI injects overlay `BUILD_VERSION` via `kustomize edit set image`. See [Kubernetes Guide](kubernetes-guide.md) for ingress/TLS and HPA details.

---

## Helm Deployment

The chart is in `helm/deepa-bms`.

```bash
# Lint before deploy
helm lint helm/deepa-bms -f helm/deepa-bms/values.yaml

# Install into a dedicated namespace
helm upgrade --install deepa-bms helm/deepa-bms \
  --namespace deepa-bms --create-namespace \
  --set backend.image.tag=1.0.0 \
  --set postgres.auth.password=$(cat /run/secrets/postgres) \
  --values helm/deepa-bms/values.yaml

# Status
helm status deepa-bms -n deepa-bms
helm get notes deepa-bms -n deepa-bms
```

See [Helm Guide](helm-guide.md) for chart structure, values, and customization.

---

## Production Readiness Checklist

- [ ] `.env.production` populated; no default credentials
- [ ] TLS certificate installed and auto-renew configured
- [ ] PostgreSQL nightly backups scheduled and tested (see [Disaster Recovery](disaster-recovery-guide.md))
- [ ] Redis persistence (`appendonly yes`) enabled
- [ ] Resource limits set on all containers/pods
- [ ] Health checks configured (backend `/health/live`, `/health/ready`)
- [ ] Monitoring stack deployed; Grafana dashboards provisioned
- [ ] Alertmanager routes configured (PagerDuty/Slack)
- [ ] Log rotation via `json-file` max-size/max-file
- [ ] Firewall allows only 80/443 (and 22 from bastion)
- [ ] DNS A/AAAA records point to the ingress/LB
- [ ] Backups copied off-site (object storage)
- [ ] Runbook access documented for on-call

---

## Post-Deployment Verification

```bash
# Liveness
curl -f http://localhost:3000/health/live && echo "LIVE OK"

# Readiness (DB + Redis reachable)
curl -f http://localhost:3000/health/ready && echo "READY OK"

# API smoke test
curl -f http://localhost/api/health | jq .

# End-to-end through nginx
curl -fI https://bms.example.com/ && echo "INGRESS OK"
```

Confirm metrics are scraped:

```bash
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health!="up")'
```

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| Backend crash-loops | DB not ready / bad secret | `docker logs backend`; check `POSTGRES_*` and `JWT_SECRET` |
| 502 from nginx | Backend not listening | Verify `depends_on` health; check `curl localhost:3000/health/live` |
| Redis auth error | Wrong `REDIS_PASSWORD` | Align compose/env with Redis config |
| Pods `ImagePullBackOff` | Registry/auth | `kubectl describe pod`; check image pull secret |
| TLS handshake fail | Expired cert | Renew; see SRE Runbook [cert expiry](sre-runbook.md#certificate-expiry) |
| High latency | Connection pool exhaustion | See [Performance Guide](performance-guide.md) |

> **Note:** For deeper, symptom-driven steps, jump to the [SRE Runbook](sre-runbook.md).

---

*Cross-references: [Operations Manual](operations-manual.md) · [Administrator Guide](administrator-guide.md) · [CI/CD Guide](ci-cd-guide.md)*
