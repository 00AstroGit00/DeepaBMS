# Production Validation — DeepaBMS v1.0.0 (P10.1 / R-6)

**Status: NOT VERIFIED. Never marked PASS** — no container, orchestrator, or
runtime could be executed in the certification environment. Static artifacts
exist and were inventoried; runtime behaviour is unproven.

## What was statically confirmed (NOT a runtime pass)

| Artifact | Exists | Note |
|----------|--------|------|
| `apps/backend/Dockerfile.prod` | ✅ | multi-stage, non-root, `/app/data` volume, HEALTHCHECK `/health/live` |
| `docker-compose.yml` / `docker-compose.prod.yml` | ✅ | `SQLITE_DB_PATH=/app/data/deepa-bms.db`, `bms-sqlite` volume |
| `helm/deepa-bms/` | ✅ | `autoscaling.enabled: false`, PVC at `/app/data` |
| `k8s/base/` + overlays | ✅ | backend `replicas: 1`, no HPA (R-2 closed) |
| `apps/backend/tests/*.test.ts` (17) | ✅ | present, **not executed** (sqlite3 native addon missing) |
| Health routes | ✅ (code) | `/health/live`, `/health`, `/health/ready` defined in `src` |

## What is NOT VERIFIED (evidence still required)

- [ ] **Docker**: image builds; container starts; `/health/live` returns 200.
- [ ] **Helm**: `helm install` succeeds; pod reaches Ready; PVC bound.
- [ ] **Kubernetes**: `kubectl apply -k` succeeds; backend stays 1 replica
      under load (no HPA); PVC persists across restart.
- [ ] **Health endpoints**: liveness/readiness return expected JSON under load.
- [ ] **SQLite persistence**: write → kill pod → restart → data intact on PVC.
- [ ] **Backups**: `sqlite3 .backup` produces a restorable file.
- [ ] **Restore**: replace db file → service serves restored data.
- [ ] **Release artifacts**: signed image + SBOM + cosign signature published.

## Exact evidence required to flip to VERIFIED

1. `release-gates.yml` → `container-smoke` green log (build, run, probe,
   db-file assertion).
2. `release-gates.yml` → `helm-k8s-validate` green (helm lint/template +
   kubeconform) — confirms manifests are valid and HPA-free.
3. A manual or automated backup/restore test log on the target platform.
4. Image digest + cosign signature + SBOM attached to the release.

**Conclusion:** R-6 remains **NOT VERIFIED**. The release must not be promoted
to GA until the above are demonstrated by an executed run.
