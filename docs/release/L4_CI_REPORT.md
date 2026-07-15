# DeepaBMS L4 — CI Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026
**Executor**: GitHub Actions (ubuntu-latest / windows-latest runners)
**Repository**: https://github.com/00AstroGit00/DeepaBMS

---

## Execution Status — ALL WORKFLOWS EXECUTED ✅

| Workflow | Latest Run | Status | Evidence |
|:---------|:----------:|:------:|:---------|
| `test.yml` | `29427105463` | 🟡 PARTIAL | Backend tests executed — 436 fail (schema drift); mobile pass |
| `build.yml` | `29432778491` | 🟡 PARTIAL | Image+APK+EXE+SBOM+Cosign built; lint-test (backend) fails |
| `security.yml` | `29432778355` | ✅ SUCCESS | Dependency Scan + Container Scan (Trivy) pass |
| `release-gates.yml` | `29432778118` | ✅ SUCCESS | F-3 Container Smoke, F-4 Helm/K8s, F-6 k6 all pass |
| `backup.yml` | — | ⏭️ SCHEDULED | Daily 02:00 cron; not triggered by push (by design) |

> **Note**: `backup.yml` is intentionally `on.schedule` (daily) + `workflow_dispatch`. It is
> not part of the push pipeline; it will run on its next scheduled tick and on manual dispatch.

---

## Detailed Per-Workflow Evidence

### `build.yml` — run `29432778491` (sha `3800cea`, main)
| Job | Result | Evidence |
|:----|:------:|:---------|
| Build & Push Backend Image | ✅ SUCCESS | Pushed `ghcr.io/00astrogit00/deepa-bms-backend:latest` + `:3800cea` |
| └ Install Cosign | ✅ SUCCESS | sigstore/cosign-installer@v3 |
| └ Sign image with Cosign | ✅ SUCCESS | `cosign sign --yes` attached signature |
| └ Generate SBOM | ✅ SUCCESS | anchore/sbom-action (SPDX + CycloneDX) |
| └ Attach SBOM to image | ✅ SUCCESS | SBOM uploaded to registry |
| └ Upload SBOM artifact | ✅ SUCCESS | `sbom.spdx.json` / `sbom.cdx.json` |
| Build Windows EXE Installer | ✅ SUCCESS | `Deepa.BMS-Setup-2.0.0.exe` produced (NSIS) |
| Build Android APK | ✅ SUCCESS | `app-release.apk` produced (EAS/local) |
| lint-test | 🔴 FAILURE | **Pre-existing backend schema-drift test failures** (not CI) |
| Create GitHub Release | ⏭️ SKIPPED | Only runs on `refs/tags/v*` push |

> Earlier identical build run `29430354268` confirmed Cosign/Generate SBOM/Attach SBOM/Upload SBOM
> all `[success]`; run `29430359376` (v2.0.0 tag) confirmed **Create GitHub Release** `[success]`
> producing the public release with APK + EXE assets.

### `release-gates.yml` — run `29432778118` (main, success)
| Gate | Result | Evidence |
|:----|:------:|:---------|
| F-3 Container Smoke | ✅ SUCCESS | Backend image boots, `/health/live` → 200, seed OK |
| F-4 Helm/K8s Validate | ✅ SUCCESS | `helm template` + `kubeconform` (incl. NetworkPolicy) clean |
| F-6 Performance Smoke | ✅ SUCCESS | k6: p95=2.39ms, p99=7.43ms, 2400 reqs, error=0% (thresholds: p95<500ms, p99<1000ms, err<1%) |

Also verified on v2.0.0 tag run `29427890301` (success) and main run `29430353762` (success).

### `security.yml` — run `29432778355` (sha `3800cea`, success)
| Job | Result | Evidence |
|:----|:------:|:---------|
| Dependency Scan | ✅ SUCCESS | `npm audit --audit-level=critical` → 0 critical (high accepted per policy) |
| Container Scan | ✅ SUCCESS | Trivy SARIF (HIGH,CRITICAL) uploaded to code-scanning |

CodeQL is provided by GitHub's default `github-code-scanning/codeql` workflow — run
`29432778271` (js-typescript + actions + python) ✅ SUCCESS.

### `test.yml` — run `29427105463` (backend)
| Suite group | Result | Evidence |
|:----|:------:|:---------|
| Mobile tests (Jest/expo) | ✅ PASS | All mobile suites green |
| Backend tests | 🔴 15 suites FAIL / 3 PASS | **436 failed / 1079 passed / 1515 total** |

Backend failures are **pre-existing schema drift** (e.g. `no such column: created_at` in
`employee_profiles`, missing auto-posting config rows) — an application data-layer defect,
**not** a CI infrastructure failure. Documented as the sole open engineering risk.

---

## Verdict

**🟢 CI/CD FULLY EXECUTED** — All 4 push-triggered workflows ran on GitHub-hosted runners.
Release Engineering artifacts (Docker image → GHCR, Cosign signature, SBOM, Android APK,
Windows EXE, GitHub Release v2.0.0) are produced and verifiable. Security scans (npm audit,
Trivy) and CodeQL pass. Performance smoke (k6) passes in CI.

**Single remaining gap**: backend unit/integration test suites (436/1515 failing) due to
schema drift — application defect, tracked separately from CI.
