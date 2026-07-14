> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# Known Issues Register — DeepaBMS v1.0

| ID | Severity | Title | Status | Evidence | Action |
|---|---|---|---|---|---|
| F-1 | HIGH | Deployment provisions Postgres+Redis but app uses SQLite only; SQLite volume path unverified (data-loss risk) | OPEN (defect) | STATIC: no pg/redis deps/imports; k8s/compose/helm reference them; `db.ts` writes to `__dirname/../deepa-bms.db`; Dockerfile.prod only makes `/app/data` | Remove orphan infra OR adopt it; mount volume at exact DB path; document durability model |
| F-2 | HIGH | Runtime certification not executable in audit env (sqlite3 native + docker/helm/k8s/SBOM missing) | OPEN (gap) | EXECUTED: jest fails on missing `node_sqlite3.node`; tools absent | Run full suite + container/Helm/K8s/SBOM in CI (ubuntu-latest) |
| F-3 | MEDIUM | No clean tagged `v1.0.0` commit; dirty working tree | OPEN (governance) | EXECUTED: `git status` dirty; no tag | Commit, tag `v1.0.0`, attach checksums |
| F-4 | MEDIUM | No SBOM, container scan, or coverage report produced | OPEN | EXECUTED: `syft`/`trivy` absent | Generate SBOM + `trivy` scan; publish coverage |
| F-5 | LOW | 62 pre-existing ESLint unused-variable warnings | OPEN (non-blocking) | EXECUTED: `eslint src/` → 0 errors / 62 warnings | Optional cleanup; not a GA blocker |
| K-1 | MEDIUM | No dedicated DB rollback script (schema is additive) | OPEN | STATIC | Document manual rollback; consider migration tool |
| K-2 | LOW | Alert rules not validated against a live Prometheus | OPEN | STATIC | Validate in staging Prometheus |

## Resolved (this cycle, static-verified)
- P8.5 FIN-01, FIN-02, SEC-01, SEC-02, SEC-08, OBS-01, OBS-02, PERF-03, PERF-09 —
  fixes present in code (see FINAL_CERTIFICATION_REPORT.md).
