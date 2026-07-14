> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS v1.0.0 — Go / No-Go Decision (P9.1)

## Decision: CONDITIONAL GO (YELLOW)

The v1.0.0 codebase is **release-ready**. Every certification blocker from the
P9 (RED) assessment now has an executable resolution. GA is granted
**contingent** on a green CI run of the certification workflows against the
`v1.0.0` tag.

## Why not a clean GO (GREEN)
Execution evidence for F-2, F-3, F-4, and F-6 could not be produced in the
Termux build environment (no docker / helm / kubectl / kubeconform / k6 / jest
native addon). These gates are fully defined as CI jobs and will execute on the
next push of the tag. Until that run is observed green, the certification
status is CONDITIONAL.

## Why not NO-GO (RED)
- F-1 is fully verified (SQLite-only, zero postgres/redis references).
- F-5 is substantially verified (SBOM, Trivy, npm audit all wired into CI;
  only transitive npm vulns remain, tracked as R-1).
- F-7 is closed (tag + checksums + guides).
- No code defects, no architecture mismatch, no dirty tree remain.

## Conditions for final GO
1. `test.yml` backend-tests job: green, coverage uploaded.
2. `release-gates.yml`: container-smoke, helm-k8s-validate, perf-benchmark green.
3. `build.yml`: image builds from `Dockerfile.prod`, cosign sign + SBOM succeed.
4. `security.yml`: `npm audit --audit-level=high` passes OR accepted via R-1;
   Trivy SARIF has no new CRITICAL/HIGH beyond known baseline.

## Fallback
If any condition fails, the release is held and the failing gate is remediated
before re-tagging. Rollback procedure is documented in
`docs/release/rollback-guide.md`.
