> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS v1.0.0 — Risk Register (P9.1)

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R-1 | Transitive npm vulns (`tar`/`node-tar`/`cacache` via `sqlite3@6.0.1`); 5 high, 2 low | High | Medium (build-chain supply chain) | Bump `sqlite3` to a patched major in CI; re-run `npm audit`; track in dependabot | Release Eng |
| R-2 | Backend single-replica ceiling (SQLite single-writer) | Medium | Medium (scale limit) | Document capacity model; offload read load to mobile/web cache; future: read replica via replicated SQLite or Postgres option | Architecture |
| R-3 | CI execution evidence not yet captured for F-2/F-3/F-4/F-6 | Medium | High (cert gap) | Push `v1.0.0` tag; confirm green run of `test.yml`, `release-gates.yml`, `build.yml`, `security.yml` | Release Eng |
| R-4 | Helm/K8s manifest drift if edited without `release-gates.yml` | Low | Medium | `helm lint` + `kubeconform --strict` gate on every PR via `release-gates.yml` | Release Eng |
| R-5 | SQLite file corruption on volume failure | Low | High | Documented backup (`sqlite3 .backup`) + restore in upgrade/rollback guides; scheduled `scripts/db/verify-integrity.sh` | Operations |
| R-6 | JWT secret weaker than 64 bytes in some deployments | Low | High | `.env*.example` enforces 64-byte random; deployment checklist verifies | Security |

## Acceptance criteria for GREEN
- R-1: `npm audit --audit-level=high` clean OR formally accepted with ETA.
- R-3: All four certification workflows green against `v1.0.0`.
- R-4: Manifest validation runs on every PR (already wired).
