# Updated Release Checklist — DeepaBMS v1.0.0 (P10.1 / R-8)

## Pre-release (done in P10.1)

- [x] LICENSE file present (MIT) — R-1
- [x] README references LICENSE — R-1
- [x] `package.json` (root + backend) carry `"license": "MIT"` — R-1
- [x] Backend HPA removed from `k8s/base` — R-2
- [x] `kubectl kustomize k8s/base` emits no HorizontalPodAutoscaler — R-2
- [x] Authoritative `docs/engineering/ARCHITECTURE.md` (SQLite) — R-3
- [x] All postgres/redis docs legacy-labelled — R-3
- [x] `database.md` current-state claim corrected — R-3
- [x] `npm audit` classified (root + backend) — R-4
- [x] `SECURITY_EXCEPTIONS.md` + `DEPENDENCY_REMEDIATION.md` written — R-4
- [x] `CI_EVIDENCE_CHECKLIST.md` written — R-5
- [x] `PRODUCTION_VALIDATION.md` written (NOT VERIFIED) — R-6
- [x] `GIT_TAG_HYGIENE.md` written (recommend delete `2.0`) — R-7

## Required before GA (NOT yet done)

- [ ] Dependency upgrade branch: `sqlite3@6.0.1` (backend) + Expo SDK major
      (frontend) applied — R-4
- [ ] `npm audit --audit-level=high` clean (or matches signed exceptions) — R-4
- [ ] Push `v1.0.0` → green `test.yml` (mobile + backend coverage) — R-5
- [ ] Green `build.yml` (image + cosign sign + SBOM spdx + cyclonedx) — R-5
- [ ] Green `security.yml` (npm audit + Trivy SARIF + CodeQL) — R-5
- [ ] Green `release-gates.yml` (container-smoke + helm-k8s-validate +
      perf-benchmark) — R-5/R-6
- [ ] Backup/restore test executed and logged — R-6
- [ ] Maintainer deletes stray `2.0` tag — R-7
- [ ] Confirm/swap license (MIT) if maintainer prefers otherwise — R-9

## Go/No-Go gate

- GA may be reconsidered only when every box in "Required before GA" is ticked
  with attached evidence. Until then: **RC EXTENDED**.
