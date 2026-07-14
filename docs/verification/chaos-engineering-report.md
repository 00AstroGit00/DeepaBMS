> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# Chaos Engineering Report — DeepaBMS v1.0 RC1

**Phase:** P6-6 (Resilience & Chaos — Design Assessment)
**Date:** 2026-07-14
**Verdict:** DESIGN-ONLY (no fault-injection executed; environment limits)

## 1. Limitation
No chaos tooling (Litmus, Chaos Mesh, Gremlin) or multi-node cluster is available
here. This report captures the **resilience design** present in P5 artifacts and
defines the chaos experiments to run against the production Kubernetes deployment.

## 2. Resilience Controls Present (P5)
- **Database backups:** `scripts/backup/`, `scripts/restore/`, `scripts/db/`,
  `scripts/dr/` (17 scripts) — scheduled + DR runbooks.
- **Monitoring:** Prometheus + Grafana + Alertmanager + Loki/Promtail +
  OTel collector configs (`docker/`).
- **Availability:** `docker-compose.prod.yml` + k8s Deployments with
  resource limits, liveness/readiness probes (to confirm in k8s YAML).
- **DR:** documented recovery objectives in `docs/operations/`.

## 3. Identified Fragilities
- **Sync `setTimeout` race** (also PERF-3): status flag can desync under
  repeated failures.
- **Single-tenant fallback** path in `tenant.ts` is untested under failure.
- **Mobile offline:** no automated test of offline-then-online reconciliation
  under partial network loss.
- **Native sqlite3** dependency is a single point of failure if the binary
  fails to load on a target architecture.

## 4. Chaos Experiment Plan (staging/prod)
| Exp | Fault | Expected | Blast Radius |
|-----|-------|----------|--------------|
| CE-1 | Kill backend pod | K8s reschedules < 30s, no data loss | 1 replica |
| CE-2 | Drop DB volume | Restore from latest backup < RTO | cluster |
| CE-3 | Partition mobile↔API | Queued offline, reconciles on return | device |
| CE-4 | Spike 10× load | 5xx < 5%, autoscale triggers | service |
| CE-5 | Kill etcd/redis | Alert fires, no silent corruption | cluster |

## 5. Findings Summary
| ID | Severity | Finding |
|----|----------|---------|
| CE-1 | Info | No chaos experiments executed (env limit) |
| CE-2 | Medium | Sync race under repeated failure |
| CE-3 | Low | Single-tenant fallback untested under fault |
| CE-4 | Medium | Offline reconciliation lacks fault test |

## 6. Recommendations
1. **(Medium/1wk/High/Med)** Execute CE-1…CE-5 against staging K8s before GA.
2. **(Medium/2d/Med/Nil)** Harden sync status with a state machine, not setTimeout.
3. **(Low/1d/Low/Nil)** Add offline-reconciliation fault test to mobile QA.
