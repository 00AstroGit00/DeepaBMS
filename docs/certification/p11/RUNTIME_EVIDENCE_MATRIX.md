# P11 — Runtime Evidence Matrix (RB-3)

**Status: 🔍 NOT VERIFIED. Never marked PASS** — no container, orchestrator,
or load generator could be executed (docker/helm/kubectl/k6 MISSING locally).
Static artifacts were inventoried; behaviour is unproven.

| Control | Expected evidence | Executed? | Verdict |
|---------|------------------|-----------|---------|
| Docker build | `docker build -f apps/backend/Dockerfile.prod` success | ❌ | NOT VERIFIED |
| Container startup | container reaches Ready | ❌ | NOT VERIFIED |
| Container shutdown | graceful stop (SIGTERM) | ❌ | NOT VERIFIED |
| Graceful restart | restart retains state | ❌ | NOT VERIFIED |
| Health probes | `/health/live`, `/health/ready` 200 under load | ❌ | NOT VERIFIED |
| Docker Compose | `up` healthy; volume `bms-sqlite` | ❌ | NOT VERIFIED |
| SQLite persistence | write → kill → restart → data intact | ❌ | NOT VERIFIED |
| Volume persistence | PVC bound; db file on `/app/data` | ❌ (manifest only) | NOT VERIFIED |
| Backups | `sqlite3 .backup` produces file | ❌ | NOT VERIFIED |
| Restore | replace db → serve restored data | ❌ | NOT VERIFIED |
| Helm install | `helm install` succeeds; 1 backend pod | ❌ | NOT VERIFIED |
| Kubernetes apply | `kubectl apply -k` succeeds; no HPA | ❌ (manifest only) | NOT VERIFIED |
| Performance smoke | k6 p95<500ms, p99<1000ms, fail<1% | ❌ | NOT VERIFIED |

## Static inventory (exists, not executed)
- `apps/backend/Dockerfile.prod` (non-root, `/app/data`, HEALTHCHECK)
- `docker-compose.yml` / `docker-compose.prod.yml` (SQLITE_DB_PATH + volume)
- `helm/deepa-bms/` (autoscaling disabled, PVC)
- `k8s/base/` + overlays (backend replicas:1, no HPA after R-2)
- `apps/backend/tests/*.test.ts` (17, **not executed** — sqlite3 addon missing)
- `tests/load/smoke.js` (k6, not run)

## Required evidence to flip to VERIFIED
1. Green `release-gates.yml` → `container-smoke` (build, run, probe, db assert).
2. Green `release-gates.yml` → `helm-k8s-validate` (helm lint/template +
   kubeconform) confirming HPA-free, valid manifests.
3. A backup/restore test log on the target platform.
4. k6 `perf-benchmark` output meeting thresholds.
