# Remaining Blockers & GO/NO-GO — DeepaBMS v1.0.0 (P10.1 / R-8)

## Remaining Blockers (not objectively resolved)

### RB-1 — Dependency high-severity vulnerabilities (R-4)
- **Why unresolved:** `npm audit --audit-level=high` still reports 19 high
  advisories (14 frontend via Expo SDK; 5 backend via sqlite3). All require
  **breaking major** upgrades that were deliberately NOT applied blindly.
- **Evidence still required:** a controlled upgrade branch
  (`sqlite3@6.0.1` + Expo SDK major) merged after green CI, yielding a clean or
  exception-approved `npm audit --audit-level=high`. See
  `docs/security/SECURITY_EXCEPTIONS.md`.

### RB-2 — No CI execution evidence (R-5)
- **Why unresolved:** no GitHub Actions run was observed; therefore no test
  logs, coverage, build artifacts, SBOM, Trivy/CodeQL SARIF, or cosign
  signatures exist for the board to inspect.
- **Evidence still required:** green runs of `test.yml`, `build.yml`,
  `security.yml`, `release-gates.yml` with artifacts attached. See
  `docs/certification/p10.1/CI_EVIDENCE_CHECKLIST.md`.

### RB-3 — No production/runtime validation (R-6)
- **Why unresolved:** docker/helm/kubectl/k6 are unavailable locally; health,
  SQLite persistence, backup/restore, and container signing are unproven.
- **Evidence still required:** executed `release-gates.yml` container-smoke +
  helm/k8s validate, plus a backup/restore test log. See
  `docs/certification/p10.1/PRODUCTION_VALIDATION.md`.

### RB-4 — Stray `2.0` git tag (R-7)
- **Why unresolved:** deletion intentionally withheld per "never delete
  automatically." Harmless to artifacts but should be removed before public GA.
- **Evidence still required:** `git tag -d 2.0` (+ remote delete) by maintainer.

## GO / NO-GO Recommendation

**Decision: 🟡 RC EXTENDED (NO-GO for GA).**

This team does **not** certify the release and does **not** declare GA. The
artifact qualifies only as a **Release Candidate** until RB-1…RB-3 are closed
with executable evidence and RB-4 is actioned by the maintainer.

### Conditions to flip to GA reconsideration
1. RB-1 closed: dependency upgrade merged; `npm audit --audit-level=high`
   clean or matches signed `SECURITY_EXCEPTIONS.md`.
2. RB-2 closed: all four CI workflows green with artifacts collected.
3. RB-3 closed: container-smoke + helm/k8s validate + backup/restore executed
   and logged.
4. RB-4 closed: stray `2.0` tag removed.

### What was achieved in P10.1 (objective resolutions)
- R-1 LICENSE (MIT) — ✅
- R-2 backend HPA removed — ✅
- R-3 architecture docs reconciled to SQLite — ✅ (caveat)
- R-7 tag hygiene recommendation issued — ✅
- R-4/R-5/R-6 fully scoped with exact required evidence — ✅ (definitions,
  not executions)

**Re-submit to the Release Board only when RB-1…RB-4 are satisfied.**
