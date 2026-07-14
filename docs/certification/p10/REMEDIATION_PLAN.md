> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS v1.0.0 — Remediation Plan (P10 Board)

**Decision:** 🔴 RELEASE BLOCKED
**Re-submission for GA requires:** all items closed with executable evidence.

Each item lists the defect, the action, and an **objective exit criterion**
(verifiable, not estimated).

---

## R-1 — Add an OSI License  (BLOCKER, legal)

**Defect:** No `LICENSE`/`COPYING` file exists; README states the project is
"released without a specified license." Enterprise distribution is not legally
permissible without one.

**Action:** Add a license file (e.g., `MIT` per README suggestion), reference it
from `README.md`, and confirm no source file asserts conflicting terms.

**Exit criteria:**
- `ls LICENSE*` succeeds at repo root.
- `grep -i "license" README.md` references the chosen license.
- `git ls-files LICENSE` confirms it is tracked in `v1.0.0`.

---

## R-2 — Remove HPA from SQLite backend  (BLOCKER, data integrity)

**Defect:** `k8s/base/hpa-backend.yaml` is referenced in
`k8s/base/kustomization.yaml` (line 17). Autoscaling a SQLite single-writer
backend risks concurrent-write corruption. `deployment-backend.yaml` already
pins `replicas: 1`; the HPA contradicts and overrides this under load.

**Action:** Delete `k8s/base/hpa-backend.yaml` and remove its entry from
`kustomization.yaml`. Confirm no HorizontalPodAutoscaler remains for the
backend in any overlay.

**Exit criteria:**
- `grep -rn "hpa-backend\|HorizontalPodAutoscaler" k8s/` returns nothing for the backend.
- `kubectl kustomize k8s/base` (or CI `release-gates.yml` kubeconform job) produces no `HorizontalPodAutoscaler` object for `backend`.
- `kubectl kustomize k8s/overlays/production` likewise clean.

---

## R-3 — Reconcile architecture documentation with SQLite design  (BLOCKER, cert integrity)

**Defect:** `docs/engineering/*.md` and ADRs (`ADR-0002`, `ADR-0006`,
`ADR-0013`, `ADR-0017`, `ADR-0020`) reference PostgreSQL/Redis, contradicting
the certified SQLite-only runtime.

**Action:** Update or explicitly mark these documents as historical/obsolete,
and add a single authoritative "v1.0.0 Architecture (SQLite)" note. Ensure the
deployed design (SQLite, single replica, no Redis) is the documented source of
truth.

**Exit criteria:**
- `grep -riE "postgres|redis" docs/` returns matches **only** inside blocks
  explicitly labelled "historical / obsolete / future option".
- A current architecture doc states SQLite as the production datastore.

---

## R-4 — Produce executable CI/build/test/runtime evidence  (BLOCKER, verification)

**Defect:** No CI logs, build artifacts, test reports, coverage, SBOM, or
runtime evidence exist. The board cannot attest functionality or safety.

**Action:** Push tag `v1.0.0` (or a remediation tag) to trigger GitHub Actions
and capture green runs of:
- `test.yml` → backend Jest suite + coverage upload.
- `release-gates.yml` → container-smoke, helm-k8s-validate, perf-benchmark.
- `build.yml` → image build (Dockerfile.prod) + cosign sign + SBOM (SPDX +
  CycloneDX) publish.
- `security.yml` → `npm audit` gate + Trivy SARIF + CodeQL.

**Exit criteria:**
- All four workflows show **green** runs against the certified tag.
- Backend coverage artifact published and ≥ agreed threshold.
- SBOM artifacts and cosign signatures present in the release.
- Trivy SARIF shows no NEW HIGH/CRITICAL beyond accepted baseline.

---

## R-5 — Remediate or formally accept 14 high npm vulnerabilities  (BLOCKER, security)

**Defect:** Full `npm audit` = 28 vulns (14 high): `tar`, `cacache`,
`@xmldom/xmldom`, `@expo/cli`, `xmldom`, etc.

**Action:** Upgrade the offending dependencies (e.g., `sqlite3` major bump,
Expo toolchain) where possible; for items with no fix, record a documented,
time-bound accepted-risk exception signed by Security.

**Exit criteria:**
- `npm audit --audit-level=high` returns **0 high** (clean), OR
- A signed `SECURITY_EXCEPTIONS.md` lists each high vuln with remediation ETA
  and Security sign-off, and `npm audit --audit-level=critical` is clean.

---

## R-6 — Publish lint evidence  (CONDITIONAL, quality)

**Defect:** `eslint .` could not complete within the environment timeout; lint
status is unconfirmed.

**Action:** Run ESLint in CI (or locally with adequate resources) and publish
the error count.

**Exit criteria:**
- `npx eslint .` reports **0 errors** (warnings documented/accepted).

---

## R-7 — Fix git tag hygiene  (MINOR, integrity)

**Defect:** Stray tag `2.0` points to ancient commit `10faa24`.

**Action:** Delete the erroneous `2.0` tag (or repoint it to the correct
commit) so only intentional semver tags remain.

**Exit criteria:**
- `git tag -l` contains only intended tags; `2.0` removed or corrected.

---

## R-8 — Reduce production log noise  (MINOR, quality)

**Defect:** 135 `console.*` statements in `src` + `apps/backend/src`.

**Action:** Retain intentional startup banners; gate or remove the rest behind
a log level.

**Exit criteria:**
- `grep -rnE "console\.(log|debug)" apps/backend/src src` reduced to an
  approved allow-list (startup banners only).

---

## Sequencing

1. R-1, R-2, R-3 (documentation/legal/integrity) — can close immediately.
2. R-4, R-5, R-6 — require CI execution after code/config changes.
3. R-7, R-8 — housekeeping, close alongside.
4. Re-submit to the board with the evidence artifacts from R-4/R-5/R-6.

**GA is granted only when R-1 through R-6 are closed with the objective exit
criteria satisfied.**
