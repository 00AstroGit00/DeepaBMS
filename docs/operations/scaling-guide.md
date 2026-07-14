# DeepaBMS Scaling Guide

> **Status:** Production reference
> **Audience:** SRE, Platform, Backend
> **Last updated:** 2026-07-14
> **Related:** [Performance Guide](performance-guide.md) · [Deployment Guide](deployment-guide.md) · [Kubernetes Guide](kubernetes-guide.md)

## Table of Contents

1. [When to Scale](#when-to-scale)
2. [Vertical Scaling](#vertical-scaling)
3. [Horizontal Scaling](#horizontal-scaling)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling](#cache-scaling)
6. [Auto-Scaling](#auto-scaling)
7. [Load Balancer Configuration](#load-balancer-configuration)
8. [Capacity Planning](#capacity-planning)

---

## When to Scale

Scale **up/down** when:
- CPU > 70% or memory > 80% sustained 15m.
- p99 latency exceeds SLO (see [Performance](performance-guide.md#benchmark-reference)).
- Error rate climbs due to saturation (not code bug).
- Queue/connection pool saturation.

> **Note:** Scale horizontally for stateless backend; scale vertically for Postgres primary first, then read replicas.

---

## Vertical Scaling

Increase pod/container resources:

```bash
# Compose
# edit deploy.resources.limits in docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d backend

# K8s
kubectl -n deepa-bms set resources deployment/backend --limits=cpu=1,memory=1Gi
```

Vertical is fast but hits a ceiling; use as a stopgap, not strategy.

---

## Horizontal Scaling

Backend is stateless — safe to replicate:

```bash
# Compose (Swarm)
docker service scale deepa-bms_backend=4

# K8s
kubectl -n deepa-bms scale deployment/backend --replicas=5
kubectl -n deepa-bms apply -f k8s/base/hpa-backend.yaml   # HPA
```

Nginx / Service spreads load across replicas.

---

## Database Scaling

### Read Replicas
Offload reporting reads:

```sql
-- replica
SELECT client_addr, state FROM pg_stat_replication;
```
Route read-only report queries to replica connection string.

### Sharding
Not required at current volumes. If a single tenant exceeds ~50M rows, consider tenant-based sharding by `tenant_id` with separate schemas/instances.

> **Warning:** Writes always hit the primary. Sharding splits tenants, not single-tenant writes.

---

## Cache Scaling

Single Redis suffices to ~100k ops/s. Beyond that, run a **Redis Cluster**:

```bash
redis-cli --cluster create <node1:6379> <node2:6379> <node3:6379> --cluster-replicas 1
```

Update backend `REDIS_URL` to the cluster endpoint. Keep `maxmemory-policy allkeys-lru`.

---

## Auto-Scaling

K8s HPA (`k8s/base/hpa-backend.yaml`) scales on CPU:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef: { kind: Deployment, name: backend }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
```

> **Note:** Min 3 replicas for HA across zones. Cap maxReplicas by DB connection budget.

---

## Load Balancer Configuration

- **Ingress/Service** (K8s): round-robin across backend pods; enable session affinity only if needed (avoid — stateless).
- **Nginx** (compose): `upstream backend { server backend:3000; }` with `proxy_pass`.
- Health checks against `/health/ready` to drop unhealthy nodes.
- Enable connection draining on deploys (rolling updates).

---

## Capacity Planning

| Component | Headroom rule | Signal |
|-----------|---------------|--------|
| Backend | +50% over peak | CPU p95, p99 latency |
| Postgres | connections ≤ 70% max | `pg_stat_activity` |
| Redis | memory ≤ 70% max | `used_memory` |
| Network | ≤ 60% link | ingress bytes |

Quarterly review against growth; reserve capacity for 2× projected peak before promo events.

---

*Cross-references: [Performance Guide](performance-guide.md) · [Kubernetes Guide](kubernetes-guide.md) · [SRE Runbook](sre-runbook.md)*
