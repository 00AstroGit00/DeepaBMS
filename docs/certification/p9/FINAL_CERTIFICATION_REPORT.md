> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Version 1.0 — Final Certification Report

**Certifying authority:** Independent Release Certification Board (acting as board, not
implementation team)
**Date:** 2026-07-14
**Target environment for this audit:** Termux / Android (node v24.17.0, npm 11.18.0)
**Intended GA target:** Linux x64 / Kubernetes + container images (CI: ubuntu-latest)

---

## Evidence classification legend
- **[EXECUTED]** — actually run in the audit environment and observed.
- **[STATIC]** — confirmed by reading source/config; not executed at runtime.
- **[NOT VERIFIED]** — required tool/runtime absent in the audit environment; cannot
  be certified here. Must be executed in CI / a capable environment before GA.

---

## Phase 1 — Build Certification

| Check | Result | Evidence |
|---|---|---|
| Clean checkout | **FAIL (governance)** | [EXECUTED] `git status` shows a **dirty working tree** (modified `package.json`, `schema.sql`, `db.ts`, `index.ts`, `docker-compose.yml`, `eslint.config.js`, etc. + many untracked files). No `v1.0.0` git tag exists. A GA release must be cut from a clean, tagged commit. |
| Dependency install | **PASS (partial)** | [EXECUTED] `npm` present (11.18.0); `node_modules` populated. Full `npm ci` not re-run (environment network/time constraints). |
| Production build (backend) | **PASS** | [EXECUTED] `npm run build` → `tsc` emitted `dist/index.js` (exit 0). |
| Production build (Expo app / Windows) | **NOT VERIFIED** | [NOT VERIFIED] Android/iOS builds require EAS (not available in Termux); Windows needs `dotnet`. Not executed. |
| TypeScript | **PASS** | [EXECUTED] `npx tsc --noEmit` → clean (no errors). |
| ESLint | **PASS (0 errors)** | [EXECUTED] `npx eslint src/` → `✖ 62 problems (0 errors, 62 warnings)`. All 62 are pre-existing unused-variable warnings, none introduced by the P8.5 changes. |
| Jest | **NOT VERIFIED** | [NOT VERIFIED] `npx jest` fails: `Could not locate the bindings file ... node_sqlite3.node`. The `sqlite3` native addon is not compiled in this environment. **No runtime test executed.** |
| Coverage | **NOT VERIFIED** | [NOT VERIFIED] jest-based; inherits the sqlite3 failure. |
| Docker build | **NOT VERIFIED** | [NOT VERIFIED] `docker` binary absent. |
| Helm lint | **NOT VERIFIED** | [NOT VERIFIED] `helm` binary absent. |
| K8s manifest validation | **PARTIAL** | [STATIC] Manifests exist (`k8s/base`, `k8s/overlays`); not validated with `kubectl`/`kubeconform`. **Critical mismatch found (see Finding F-1).** |
| SBOM generation | **NOT VERIFIED** | [NOT VERIFIED] `syft`/`cyclonedx` absent. |
| Container scan | **NOT VERIFIED** | [NOT VERIFIED] `trivy`/`grype` absent. |

**Phase 1 verdict:** Cannot certify. Two hard gaps: (1) Jest/coverage not executable
here; (2) no container/Helm/K8s tooling. Plus a release-governance defect (dirty tree,
no tag).

---

## Phase 2 — Release Artifact Verification

| Artifact | Result | Evidence |
|---|---|---|
| Docker images | NOT VERIFIED | [NOT VERIFIED] cannot build (`docker` absent). |
| Helm charts | EXISTS / NOT VERIFIED | [STATIC] `helm/deepa-bms/Chart.yaml` present; `version: 1.0.0`, `appVersion: 1.0.0`. Not linted. |
| Compose files | EXISTS / DEFECT | [STATIC] `docker-compose.yml` and `docker-compose.prod.yml` provision `postgres` (+ `redis-data` in prod). App uses SQLite only (see F-1). |
| Migration scripts | EXISTS | [STATIC] `schema.sql` applied via `db.ts` (`initializeDatabase`); idempotent ALTERs for `force_password_change` + `gst_registers(created_at)` index. |
| Rollback scripts | NOT FOUND | [STATIC] No dedicated rollback script located; schema is additive (CREATE IF NOT EXISTS) so rollback is manual. |
| Backup scripts | EXISTS | [STATIC] `.github/workflows/backup.yml` present (GitHub Actions). Not executed. |
| Release bundles | NOT VERIFIED | [NOT VERIFIED] no bundle produced. |
| Checksums | NOT VERIFIED | [NOT VERIFIED] no checksum artifacts generated. |
| Version numbers | **CONSISTENT** | [EXECUTED] root `package.json` = `1.0.0`, `apps/backend/package.json` = `1.0.0`, `helm` `version/appVersion` = `1.0.0`. |
| Semantic version consistency | **PASS** | [EXECUTED] all three align at `1.0.0`. |

---

## Phase 3 — Financial Certification

| Workflow | Result | Evidence |
|---|---|---|
| Journal postings | STATIC ONLY | [STATIC] `ledger-integration.ts` `postOperationalToLedger` is wired at 3 call sites (restaurant.service.ts:608, liquor.service.ts:911, rooms.service.ts:373). Not executed end-to-end (jest blocked). |
| Double-entry integrity | NOT VERIFIED | [NOT VERIFIED] no runtime reconciliation executed. |
| Trial balance / BS / P&L | NOT VERIFIED | [NOT VERIFIED] requires running reports; jest blocked. |
| GST | STATIC ONLY | [STATIC] `gst_registers` populated by `accounting.service`; `bar_sale` TOT now computed (liquor.service.ts:372-373). Not executed. |
| Liquor taxation (FIN-02) | STATIC ONLY | [STATIC] TOT split `subtotal*rate/(100+rate)` implemented; `tot_amount` columns written. Not executed. |
| Hotel folios / Restaurant billing | STATIC ONLY | [STATIC] call sites present. |
| Payroll journals | NOT VERIFIED | [NOT VERIFIED] not exercised. |
| Bank reconciliation | NOT VERIFIED | [NOT VERIFIED] not exercised. |
| Revenue recognition | STATIC ONLY | [STATIC] ledger post on settled payment. |

**Phase 3 verdict:** No financial workflow was reconciled at runtime. Cannot certify.

---

## Phase 4 — Security Certification

| Control | Result | Evidence |
|---|---|---|
| Authentication | STATIC (improved) | [STATIC] `auth.ts` `authenticate` + `signToken` adds `tenantId`; algorithm pinned `algorithms: ['HS256']` (SEC-08). |
| Authorization | STATIC | [STATIC] `authorize(...)` RBAC present. |
| Tenant isolation (SEC-02) | STATIC | [STATIC] `tenant.ts` derives tenant from JWT `tenantId` for authed requests; 403 on mismatch. **Not executed (no jest).** |
| JWT validation | STATIC | [STATIC] issuer/audience + alg pin present. |
| Secret handling | NOT VERIFIED | [NOT VERIFIED] `.env` usage / secret store not exercised; `.env.example` exists [STATIC]. |
| OWASP Top 10 | NOT VERIFIED | [NOT VERIFIED] no DAST/SAST executed; SBOM absent. |
| Prompt injection resistance | NOT VERIFIED | [NOT VERIFIED] AI/copilot modules not pen-tested. |
| Audit logs | STATIC | [STATIC] `ledger_post_failures`, `slow_query_log`, workflow audit present. |
| Security headers | NOT VERIFIED | [NOT VERIFIED] not exercised via HTTP. |
| Rate limiting | STATIC | [STATIC] `rateLimit` imported in index.ts. |
| Dependency vulnerabilities | NOT VERIFIED | [NOT VERIFIED] `npm audit` / SCA not run; SBOM absent. |
| Container scan | NOT VERIFIED | [NOT VERIFIED] `trivy` absent. |

---

## Phase 5 — Operational Certification

| Control | Result | Evidence |
|---|---|---|
| Monitoring / Metrics (OBS-01) | STATIC | [STATIC] `/api/platform/metrics` emits Prometheus text via `metrics.ts` (counters/gauges/histogram). |
| Alerts (OBS-02) | STATIC (partial) | [STATIC] `alert.rules.yml` / `slo.rules.yml` rewritten to SQLite/process metrics; PG/Redis exporters removed from `prometheus.yml`. **Not validated by Prometheus.** |
| Logging / Tracing | NOT VERIFIED | [NOT VERIFIED] not exercised. |
| Backup / Restore | STATIC | [STATIC] `backup.yml` workflow present; restore not executed. |
| Scheduler (PERF-09) | STATIC | [STATIC] `startWorkflowScheduler` wired in `index.ts:251`; SIGTERM/SIGINT clears it. Not executed. |
| Workflow execution | STATIC | [STATIC] `processDueJobs` now invoked by scheduler. |
| Sync engine | NOT VERIFIED | [NOT VERIFIED] not exercised. |
| Night audit | NOT VERIFIED | [NOT VERIFIED] not exercised. |
| Health endpoints | STATIC | [STATIC] `getHealth` exists. |

---

## Phase 6 — Performance Certification

| Metric | Result | Evidence |
|---|---|---|
| Latency / Throughput / Memory / CPU / DB / Startup / Concurrency | **NOT VERIFIED** | [NOT VERIFIED] benchmark suite requires a running backend + sqlite3 (native missing). No benchmark executed. |
| WAL (PERF-03) | STATIC | [STATIC] `db.ts` sets `journal_mode=WAL`, `busy_timeout=5000`, `foreign_keys`, `synchronous=NORMAL`. |

---

## Phase 7 — Disaster Recovery Certification

| Item | Result | Evidence |
|---|---|---|
| Backup | STATIC | [STATIC] `backup.yml` + `metric_counters`/`ledger_post_failures` durability. |
| Restore | NOT VERIFIED | [NOT VERIFIED] restore runbook not executed. |
| Recovery / Failover / Rollback | NOT VERIFIED | [NOT VERIFIED] no execution. |
| Recovery documentation / runbooks | EXISTS | [STATIC] `k8s/README.md`, ops docs present. |

---

## Phase 8 — Production Readiness Review

- **No unresolved Critical issues (code):** P8.5 blockers are statically present in code.
- **High issues:** (1) **F-1 deployment/architecture mismatch** (postgres+redis in K8s/Compose/Helm while app uses SQLite) — confirmed. (2) **F-2 runtime verification gap** (jest/docker/helm/k8s/SBOM not executable here).
- **Medium issues:** dirty working tree / no release tag (F-3); 62 pre-existing lint warnings; no rollback script; no SBOM.
- **Support / Ops / Migration / Training docs:** partially present (`docs/` tree, `k8s/README.md`).

---

## Findings (confirmed)

- **F-1 (HIGH, deployment defect):** The application uses **SQLite only** — `apps/backend/package.json` has **no** `pg`/`postgres`/`redis`/`mysql` dependency, and `src/` contains **zero** imports of those clients. Yet `k8s/base` deploys `deployment-postgres.yaml` + `deployment-redis.yaml` (+ services), `docker-compose.yml`/`docker-compose.prod.yml` provision `postgres` (and `redis-data`), and the Helm chart templates `deployment-postgres.yaml` gated by `.Values.postgres.enabled`. These are orphaned infrastructure. **Worse:** `db.ts` writes the SQLite file to `path.join(__dirname,'..','deepa-bms.db')` (i.e. inside the image workdir), while `Dockerfile.prod` only creates `/app/data`. If a PVC is mounted anywhere other than that exact path, **all financial data is lost on pod restart.** This is a data-durability defect for the containerized path and must be reconciled before GA.
- **F-2 (HIGH, verification gap):** Jest, Docker, Helm, kubectl, SBOM, and benchmark tooling are unavailable in the audit environment → all runtime-dependent certification phases are **not verified by execution**. The CI pipeline (ubuntu-latest) is the authoritative environment and must emit green results.
- **F-3 (MEDIUM, governance):** Working tree is dirty and no `v1.0.0` tag exists. GA must be cut from a clean, tagged commit.
- **F-4 (MEDIUM):** No SBOM, no container scan, no coverage report produced.
- **F-5 (LOW):** 62 pre-existing ESLint unused-variable warnings (no new ones).

---

## Decision

**RED — RELEASE BLOCKED.**

Rationale: The board cannot certify GA because (a) the core runtime certification
phases — Financial (Phase 3), Security runtime (Phase 4), Operational runtime (Phase 5),
Performance (Phase 6), DR execution (Phase 7) — were **not executed** (sqlite3 native
binary and container/orchestration tooling absent), and (b) a confirmed deployment/
architecture mismatch (F-1) makes the containerized data-durability story unsafe, and
(c) release governance is incomplete (F-3: no clean tagged commit).

The **code-level P8.5 fixes are present and statically verified**, TypeScript compiles,
ESLint reports 0 errors, and the backend builds. These are necessary but not sufficient
for GA.

### Conditions to flip to GREEN (Go)
1. Execute the full Jest suite + coverage in CI (ubuntu-latest) — must be green,
   including `tests/financial-integrity.test.ts` and `tests/observability.test.ts`.
2. Resolve **F-1**: remove postgres/redis from K8s/Compose/Helm (or make the app
   actually use them) AND mount the SQLite volume at the exact `deepa-bms.db` path;
   document the single-node SQLite durability model.
3. Produce SBOM (`syft`) + container scan (`trivy`), and pass Helm lint + `kubectl`
   manifest validation.
4. Execute performance benchmarks and capture evidence.
5. Cut a clean, tagged `v1.0.0` commit; attach checksums + release bundle.
6. Run `npm audit` / SCA and confirm no Critical/High vulnerabilities.

Until 1–5 are evidenced, the release remains **NO-GO**.
