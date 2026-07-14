> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS v1.0.0 — Final GA Certification Report (P9.1)

**Date:** 2026-07-14
**Version under certification:** v1.0.0 (tag `v1.0.0`, commit `e053827`)
**Decision:** CONDITIONAL GO (YELLOW) — see Go/No-Go.

## Scope
Closure of the seven release blockers (F-1 … F-7) identified in the P9
certification (RED). No business functionality was added; changes are limited
to deployment packaging, CI certification gates, and release artifacts.

## Blocker disposition

| ID | Blocker | Resolution | Verification method | Status |
|----|---------|------------|---------------------|--------|
| F-1 | Deployment/architecture mismatch (postgres+redis) | SQLite declared official; all postgres/redis removed from docker-compose, k8s, helm, .env | Static inspection + execution (grep) | **CLOSED** |
| F-2 | Regression suite not executed | Backend SQLite jest suite wired into `test.yml`; dead postgres service removed; jest config confirmed | Automated testing (CI) | **CLOSED (pending CI run)** |
| F-3 | Container runtime / health / volume unverified | `release-gates.yml` container-smoke builds `Dockerfile.prod`, runs with `/app/data` volume, probes `/health/live`, asserts SQLite file persisted | Execution (CI) | **CLOSED (pending CI run)** |
| F-4 | Helm/K8s manifests unvalidated | `release-gates.yml` runs `helm lint`, `helm template`, `kubectl kustomize`, `kubeconform --strict` | Execution (CI) | **CLOSED (pending CI run)** |
| F-5 | SBOM / supply chain | SPDX + CycloneDX SBOM in `build.yml`; Trivy in `security.yml`; `npm audit` in `security.yml`. Local `npm audit` shows 7 vulns (transitive tar/cacache via sqlite3@6.0.1) | Automated testing (CI) + local audit | **CLOSED (residual: 7 npm vulns)** |
| F-6 | Performance unverified | `release-gates.yml` k6 smoke load (20 VU / 30s) with p95<500ms, p99<1000ms, failure<1% thresholds | Execution (CI) | **CLOSED (pending CI run)** |
| F-7 | No tag / dirty tree | All changes committed; `v1.0.0` tag created; SHA256 checksums + upgrade/rollback guides produced | Execution | **CLOSED** |

## Verification evidence produced locally (Termux)
- `npx tsc --noEmit` — PASS (0 errors).
- `npx eslint src/` — 0 errors (62 pre-existing warnings, none release-blocking).
- `npm audit` — 7 vulnerabilities (2 low, 5 high): `tar`/`node-tar`/`cacache`
  transitive via `sqlite3@6.0.1`. Fix requires a breaking `sqlite3` bump and
  is tracked in the Risk Register.
- `grep` across `docker-compose*.yml`, `k8s/`, `helm/`, `.env*` — **zero**
  references to postgres/redis remain.
- `git tag v1.0.0` created; `release-v1.0.0.checksums.txt` generated
  (447 tracked files).

## Verification evidence pending (requires ubuntu-latest CI)
The Termux environment cannot execute `docker`, `helm`, `kubectl`,
`kubeconform`, `k6`, or the `sqlite3` native addon required by Jest. All
remaining gates are **defined as executable CI jobs** and will produce
evidence on the next push of the `v1.0.0` tag:
- `test.yml` → backend-tests (SQLite jest suite + coverage)
- `release-gates.yml` → container-smoke, helm-k8s-validate, perf-benchmark
- `build.yml` → image build (Dockerfile.prod) + cosign sign + SBOM
- `security.yml` → npm audit gate + Trivy SARIF + CodeQL

## Residual risks
1. **npm transitive vulnerabilities** (tar/cacache via sqlite3@6.0.1) — high
   severity, not yet remediated; see Risk Register R-1.
2. **Backend single-replica** — by design (SQLite single-writer); capacity
   ceiling ~1 backend pod. See R-2.
3. **CI execution evidence not yet captured** — gating certification on the
   green run of the workflows above. See R-3.

## Sign-off
- Release Engineering (P9.1 board): APPROVED for CONDITIONAL GO.
- Final GO contingent on green CI run of `test.yml`, `release-gates.yml`,
  `build.yml`, `security.yml` against tag `v1.0.0`.
