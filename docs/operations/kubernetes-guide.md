> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Kubernetes Guide

> **Status:** Production reference
> **Audience:** SRE, Platform
> **Last updated:** 2026-07-14
> **Related:** [Deployment Guide](deployment-guide.md) · [Helm Guide](helm-guide.md) · [Scaling Guide](scaling-guide.md) · [Docker Guide](docker-guide.md)

## Table of Contents

1. [Cluster Requirements](#cluster-requirements)
2. [Manifests (Base)](#manifests-base)
3. [Kustomize Overlays](#kustomize-overlays)
4. [Deploy](#deploy)
5. [Ingress & TLS](#ingress--tls)
6. [Persistent Volumes](#persistent-volumes)
7. [Horizontal Pod Autoscaler](#horizontal-pod-autoscaler)
8. [Rolling Updates](#rolling-updates)
9. [Monitoring](#monitoring)

---

## Cluster Requirements

- Kubernetes `>= 1.27`; 3+ worker nodes across ≥ 2 AZs.
- Ingress controller (nginx) + cert-manager.
- Metrics server (for HPA).
- Default StorageClass with reclaim policy `Retain` for stateful volumes.
- NetworkPolicy support (CNI: Calico/Cilium).

> **Note:** Namespace `deepa-bms` is created by `k8s/base/namespace.yaml`.

---

## Manifests (Base)

Located in `k8s/base/`:

- `namespace.yaml` — `deepa-bms`
- `deployment-*.yaml` — backend, postgres, redis, web(nginx)
- `service-*.yaml` — ClusterIP services
- `configmap.yaml` / `secret.yaml` — config & secrets (placeholders)
- `ingress.yaml` — host routing + TLS
- `pvc.yaml` — persistent volumes
- `hpa-backend.yaml` — autoscaling

---

## Kustomize Overlays

```bash
k8s/
├── base/
└── overlays/
    ├── staging/
    └── production/
```

Production overlay sets image tags, replica counts, and resource sizes:

```bash
kubectl kustomize k8s/overlays/production
kubectl apply -k k8s/overlays/production
```

> **Note:** Set `BUILD_VERSION` via `kustomize edit set image` in CI to pin immutable tags.

---

## Deploy

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
kubectl -n deepa-bms rollout status deployment/backend
```

Secrets must be created separately (sealed/external):

```bash
kubectl -n deepa-bms create secret generic deepa-secrets \
  --from-literal=POSTGRES_PASSWORD=... --from-literal=JWT_SECRET=...
```

---

## Ingress & TLS

`k8s/base/ingress.yaml` routes `bms.example.com` → backend service; TLS via cert-manager `ClusterIssuer`.

```yaml
tls:
  - hosts: [bms.example.com]
    secretName: deepa-bms-tls
```

> **Warning:** Missing TLS secret → ingress 404/redirect loops. Verify cert-manager issued it (`kubectl get certificate`).

---

## Persistent Volumes

`k8s/base/pvc.yaml` claims for Postgres and Redis. Use `Retain` + scheduled snapshots.

```bash
kubectl -n deepa-bms get pvc
kubectl -n deepa-bms describe pvc pgdata
```

Backups: see [DR](disaster-recovery-guide.md).

---

## Horizontal Pod Autoscaler

`k8s/base/hpa-backend.yaml`:

```yaml
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
```

Requires metrics-server. Tune max by DB connection budget ([Scaling](scaling-guide.md#auto-scaling)).

---

## Rolling Updates

Deployments use `RollingUpdate` (maxSurge 1, maxUnavailable 0) for zero-downtime.

```bash
kubectl -n deepa-bms set image deployment/backend backend=deepa-bms-backend:1.1.0
kubectl -n deepa-bms rollout status deployment/backend
kubectl -n deepa-bms rollout undo deployment/backend   # rollback
```

> **Note:** Readiness probe gates traffic; ensure `/health/ready` reflects true dependency health.

---

## Monitoring

- Prometheus scrapes backend `/metrics`; ServiceMonitor or annotations.
- Grafana dashboards provisioned from `docker/grafana/provisioning`.
- Alerts: `docker/prometheus/alert.rules.yml` → Alertmanager.
- Pod/log metrics via `kubectl top` + central log store.

See [Operations Manual – Monitoring](operations-manual.md#health-monitoring) and [SRE Runbook](sre-runbook.md).

---

*Cross-references: [Helm Guide](helm-guide.md) · [Deployment Guide](deployment-guide.md) · [Scaling Guide](scaling-guide.md) · [SRE Runbook](sre-runbook.md)*
