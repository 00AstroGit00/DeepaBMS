> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# Final Go / No-Go Decision — DeepaBMS v1.0

**Decision: 🔴 RED — RELEASE BLOCKED**

Issued by: Independent Release Certification Board
Date: 2026-07-14

## Decision rule applied
GREEN = approved on executed evidence. YELLOW = approved with documented
non-blocking issues. RED = blocked. An item may only be "verified by execution"
if it was actually run in the target environment.

## What WAS verified by execution
- TypeScript compile (`tsc --noEmit` and `tsc` build → `dist/index.js`): PASS.
- ESLint on `src/`: 0 errors (62 pre-existing warnings).
- Version consistency: 1.0.0 across root / backend / Helm.
- Tool/dependency inventory: confirmed `sqlite3` native addon MISSING; `docker`,
  `helm`, `kubectl`, `trivy`, `syft` MISSING.
- Backend production build: PASS.

## What was verified by static inspection only (NOT executed)
- All 8 P8.5 blocker fixes (FIN-01..PERF-09) present in code at the cited lines.
- Prometheus metrics + alert rule rewrites.
- Tenant/JWT binding, PIN-seed guard, WAL pragmas, workflow scheduler wiring.

## What was NOT verified (environment unavailable)
- Jest + Coverage (sqlite3 native missing) → Financial, Security-runtime,
  Operational-runtime, Performance phases unexecuted.
- Docker build, Helm lint, K8s manifest validation, SBOM, container scan,
  benchmarks, DR restore, Expo/Windows production builds.

## Blocking issues
- **F-1 (HIGH):** Deployment/architecture mismatch — K8s/Compose/Helm provision
  postgres + redis, but the backend uses SQLite only (no pg/redis deps/imports).
  SQLite file path vs mounted volume unverified → data-durability risk.
- **F-2 (HIGH):** Runtime certification not executable in audit environment.
- **F-3 (MEDIUM):** Dirty working tree; no `v1.0.0` git tag.

## Go criteria (all required)
1. CI (ubuntu-latest) Jest + coverage GREEN, incl. financial-integrity & observability.
2. F-1 resolved (remove orphan infra OR adopt it; mount SQLite volume correctly).
3. SBOM + container scan clean; Helm lint + kubectl manifest validation PASS.
4. Performance benchmarks executed with evidence.
5. Clean tagged `v1.0.0` commit + checksums + release bundle.
6. `npm audit`/SCA: no Critical/High.

**Current status: NO-GO.** Re-submit for certification after criteria 1–6 are met in CI.
