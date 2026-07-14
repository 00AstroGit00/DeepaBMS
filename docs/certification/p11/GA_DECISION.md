# P11 — GA Decision

## Decision: 🔴 RELEASE BLOCKED

Version 1.0.0 does **not** qualify for General Availability. The certification
authority finds the release artifact internally inconsistent and lacking the
executable evidence required by every release gate.

GA was **not** approved. RC EXTENDED was **not** selected because the tagged
`v1.0.0` tree is not even the post-remediation candidate (it omits the P10.1
fixes), so there is no coherent release candidate to extend.

---

## Every remaining blocker (with evidence / owner / action / exit criteria)

### B-1 — Release tag omits P10.1 fixes
- **Evidence:** `git ls-tree -r v1.0.0` lacks `LICENSE`, `docs/engineering/ARCHITECTURE.md`; still lists `k8s/base/hpa-backend.yaml`.
- **Owner:** Release Management
- **Action:** Commit the P10.1 remediation, then re-tag (move `v1.0.0` to the
  new commit, or cut `v1.0.1`) so the release tree includes LICENSE + HPA
  removal + doc reconciliation.
- **Exit criteria:** `git ls-tree -r <release-tag>` contains `LICENSE`,
  `docs/engineering/ARCHITECTURE.md`, and **no** `k8s/base/hpa-backend.yaml`.

### B-2 — Dirty working tree
- **Evidence:** `git status --short` → 56 uncommitted files.
- **Owner:** Release Management
- **Action:** Review and commit the P10.1 changes as a release-hardening commit.
- **Exit criteria:** `git status --short` is empty at the release commit.

### B-3 — 19 high vulnerabilities open (RB-1)
- **Evidence:** `npm audit` root 14 high / backend 5 high, 0 critical; all
  require breaking majors (`expo@57.0.4`, `sqlite3@6.0.1`); none runtime-
  reachable (build/install only).
- **Owner:** Security
- **Action:** Execute the Upgrade Roadmap in `DEPENDENCY_CERTIFICATION.md`
  (controlled branch + CI regression); or record formal Risk Acceptance sign-
  off if deferring.
- **Exit criteria:** `npm audit --audit-level=high` returns 0 high, or remaining
  highs equal the signed `SECURITY_EXCEPTIONS.md` list with Security approval.

### B-4 — No CI execution evidence (RB-2)
- **Evidence:** No GitHub Actions run observed; no logs/artifacts/coverage/SBOM/
  Trivy/CodeQL/cosign exist.
- **Owner:** Release Management / CI
- **Action:** Push the release tag; collect green runs of `test.yml`,
  `build.yml`, `security.yml`, `release-gates.yml` with all artifacts.
- **Exit criteria:** Each row of `CI_EVIDENCE_MATRIX.md` has collected evidence.

### B-5 — No runtime evidence (RB-3)
- **Evidence:** docker/helm/kubectl/k6 unavailable; health/persistence/backup/
  restore/perf unproven.
- **Owner:** Operations
- **Action:** Execute `release-gates.yml` (container-smoke, helm-k8s-validate,
  perf-benchmark) + a backup/restore test on target platform.
- **Exit criteria:** Each row of `RUNTIME_EVIDENCE_MATRIX.md` has collected
  evidence; HPA-free, valid manifests; k6 thresholds met.

### B-6 — No SBOM / signing / scan artifacts (RB-4/security)
- **Evidence:** filesystem check: no SBOM, no cosign signatures, no Trivy/
  CodeQL SARIF.
- **Owner:** Security
- **Action:** Ensure `build.yml` (syft SBOM + cosign) and `security.yml` (Trivy
  + CodeQL) run and attach artifacts.
- **Exit criteria:** SBOM (SPDX + CycloneDX), cosign signature, Trivy SARIF,
  CodeQL SARIF attached to the release.

### B-7 — Stale / absent checksums
- **Evidence:** `sha256sum -c` fails (tree changed after generation);
  checksums file not in the `v1.0.0` tag.
- **Owner:** Release Management
- **Action:** Regenerate checksums from the final release tree; commit into the
  tag.
- **Exit criteria:** `sha256sum -c release-<ver>.checksums.txt` passes against
  the tagged tree; file present in tag.

### B-8 — Stray `2.0` tag
- **Evidence:** `git tag -l` → `2.0` on commit `10faa24` (ancestor of `v1.0.0`).
- **Owner:** Maintainer
- **Action:** Authorize `git tag -d 2.0` (+ remote delete). Not auto-deleted.
- **Exit criteria:** `git tag -l` contains only intended semver tags.

---

## Re-submission path

1. Close B-1, B-2, B-7 (commit fixes; re-tag; regenerate checksums).
2. Close B-3 (dependency upgrade or signed acceptance).
3. Close B-4, B-5, B-6 (push tag → green CI + runtime + supply-chain artifacts).
4. Close B-8 (remove stray tag).
5. Re-run this P11 certification; expect 🟢 GA APPROVED when all evidence present.
