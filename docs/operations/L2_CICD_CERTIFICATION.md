# DeepaBMS L2 — CI/CD Certification
**Phase**: L2 Production Infrastructure Certification  
**Date**: July 15, 2026  
**Standard**: Static analysis of workflow files. Runtime execution is NOT VERIFIED (no Docker/CI environment).

---

## Workflow Inventory

| Workflow | File | Triggers | Jobs | Status |
|:---------|:-----|:---------|:-----|:-------|
| Test | `.github/workflows/test.yml` | push/main, PR, workflow_call | mobile-tests, backend-tests | ✅ **CONFIGURED** |
| Build | `.github/workflows/build.yml` | push/main, tags/v*, workflow_dispatch | lint-test, build-backend, build-android, build-windows, release | ✅ **CONFIGURED** |
| Security | `.github/workflows/security.yml` | push/main, schedule(weekly Mon 3AM), workflow_dispatch | dependency-audit, trivy-scan, codeql-analysis, secrets-scan | ✅ **CONFIGURED** |
| Release Gates | `.github/workflows/release-gates.yml` | push/main, tags/v*, workflow_dispatch, workflow_run | container-smoke, helm-k8s-validate, perf-benchmark | ✅ **CONFIGURED** |
| Backup | `.github/workflows/backup.yml` | schedule(2AM daily), workflow_dispatch | backup | ✅ **CONFIGURED** |
| Build Artifacts | `.github/workflows/build-artifacts.yml` | (modified in working tree) | — | ⚠️ **UNTRACKED** |

---

## Workflow by Workflow Audit

### Test (`test.yml`)

| Check | Status | Evidence |
|:------|:------:|:---------|
| Trigger correct | ✅ | push/main + PR + workflow_call |
| Node version | ✅ | 20 |
| Dependencies | ✅ | `npm ci` with cache |
| Mobile lint + typecheck | ✅ | `npm run lint` + `npm run ts:check` |
| Mobile tests | ✅ | `npm test -- --coverage` |
| Backend tests | ✅ | `npm test -- --coverage` with JWT_SECRET |
| Coverage upload | ✅ | Uploads mobile + backend coverage |
| **EXECUTION EVIDENCE** | ❌ NOT VERIFIED | No CI logs observed |

**Missing**: None (config complete)

### Build (`build.yml`)

| Check | Status | Evidence |
|:------|:------:|:---------|
| Trigger correct | ✅ | push/main + tags/v* + workflow_dispatch |
| Permissions | ✅ | contents:write, packages:write, id-token:write |
| GHCR login | ✅ | `GITHUB_TOKEN` secret |
| QEMU + Buildx | ✅ | Multi-platform build setup |
| Docker build | ✅ | `Dockerfile.prod` with `BUILD_VERSION` arg |
| Image push | ✅ | GHCR: `owner/deepa-bms-backend:latest` + `:version` |
| Cosign sign | ✅ | `sigstore/cosign-installer@v3` |
| SBOM generation | ✅ | Syft (SPDX + CycloneDX) |
| SBOM attach | ✅ | Cosign attach to image |
| Android build | ✅ | Expo prebuild + Gradle assembleRelease |
| Windows build | ✅ | Electron-builder on windows-latest |
| GitHub Release | ✅ | Changelog generation, artifact download |
| **EXECUTION EVIDENCE** | ❌ NOT VERIFIED | No CI logs observed |

**Missing Secrets (required for execution):**
- `GITHUB_TOKEN` — auto-provided by Actions
- `AWS_ACCESS_KEY_ID` — for S3 backup (in backup.yml, not build.yml)

### Security (`security.yml`)

| Check | Status | Evidence |
|:------|:------:|:---------|
| Trigger correct | ✅ | push/main + weekly cron + workflow_dispatch |
| Dependency audit | ✅ | `npm audit --audit-level=critical` |
| Trivy scan | ✅ | File system + root filesystem scan |
| CodeQL analyze | ✅ | `github/codeql-action/analyze@v3` |
| Secrets scan | ✅ | `truffleHog` / `ggshield` |
| SARIF upload | ✅ | Trivy + CodeQL results |
| **EXECUTION EVIDENCE** | ❌ NOT VERIFIED | No CI logs observed |

**Missing**: None (config complete)
**Note**: `npm audit --audit-level=critical` in security.yml — this allows high vulns through (only fails on critical). The P11 report found 19 high vulns which this gate would NOT catch.

### Release Gates (`release-gates.yml`)

| Check | Status | Evidence |
|:------|:------:|:---------|
| Trigger correct | ✅ | push/main + tags/v* + workflow_dispatch + workflow_run |
| Container smoke test | ✅ | `docker run` health check against built image |
| Helm/K8s validate | ✅ | kubeconform + helm lint + template dry-run |
| Perf benchmark | ✅ | k6 execution with thresholds |
| **EXECUTION EVIDENCE** | ❌ NOT VERIFIED | No CI logs observed |

**Missing**: None (config complete)

### Backup (`backup.yml`)

| Check | Status | Evidence |
|:------|:------:|:---------|
| Trigger correct | ✅ | Daily 2AM cron + workflow_dispatch |
| PostgreSQL service | ⚠️ | **Matches PostgreSQL, not SQLite** — this workflow backs up a PostgreSQL database, but production runs SQLite. This is a **configuration mismatch**. |
| S3 upload | ✅ | `aws s3 cp` to `BACKUP_BUCKET` |
| 30-day retention | ✅ | Cleanup script |
| **EXECUTION EVIDENCE** | ❌ NOT VERIFIED | No CI logs observed |

**Critical Finding**: `backup.yml` is designed for PostgreSQL (pg_dump, postgres service). Since DeepaBMS v1.0/2.0 uses SQLite in production, this workflow would **fail** if executed. Requires rewrite for SQLite backup strategy (file copy, gzip, S3 upload with verification).

**Missing Secrets:**
- `AWS_ACCESS_KEY_ID` — for S3 upload
- `AWS_SECRET_ACCESS_KEY` — for S3 upload
- `AWS_REGION` — S3 region
- `BACKUP_BUCKET` — S3 bucket name

---

## CI/CD Secrets Inventory

| Secret | Required By | Present in Repo | Status |
|:-------|:------------|:---------------:|:-------|
| `GITHUB_TOKEN` | All workflows | ✅ Auto-provided | ✅ |
| `AWS_ACCESS_KEY_ID` | backup.yml | ❌ Not configured | ❌ **EXTERNAL** |
| `AWS_SECRET_ACCESS_KEY` | backup.yml | ❌ Not configured | ❌ **EXTERNAL** |
| `AWS_REGION` | backup.yml | ❌ Not configured | ❌ **EXTERNAL** |
| `BACKUP_BUCKET` | backup.yml | ❌ Not configured | ❌ **EXTERNAL** |
| `DOCKER_USERNAME` | (legacy) | ❌ Not used | ❌ **REMOVED** |
| `DOCKER_PASSWORD` | (legacy) | ❌ Not used | ❌ **REMOVED** |

---

## CI/CD Certification Score

| Category | Max | Score | Status |
|:---------|:---:|:-----:|:-------|
| Workflow Coverage | 10 | 10 | ✅ 5 workflows covering test, build, security, release, backup |
| Trigger Correctness | 10 | 10 | ✅ All triggers appropriate |
| Step Configuration | 10 | 9 | ✅ Well-structured |
| Security Integration | 10 | 9 | ✅ Trivy, CodeQL, npm audit |
| Artifact Management | 10 | 9 | ✅ SBOM, coverage, APK, EXE |
| Secret Management | 10 | 4 | ⚠️ backup secrets not configured |
| Config Correctness | 10 | 6 | ⚠️ backup.yml references PostgreSQL not SQLite |
| **CONFIGURATION** | **70** | **57** | **✅ CONFIGURED** |
| Execution Evidence | 30 | 0 | ❌ NOT VERIFIED |
| **TOTAL** | **100** | **57** | **⚠️ NOT CERTIFIED** |

---

## Conclusion

**CI/CD Status**: ⚠️ **CONFIGURED — NOT EXECUTED**

All 5 workflows are well-structured with appropriate triggers, caching, and artifact management. Two critical issues:
1. `backup.yml` targets PostgreSQL — **must be rewritten for SQLite** before deployment
2. No execution evidence exists — requires a GitHub push of the v2.0 tag to validate

**Blockers for Certification:**
1. Rewrite `backup.yml` for SQLite backup strategy
2. Configure AWS secrets in GitHub repository
3. Push v2.0 tag and collect green CI runs
4. Fix `npm audit` gate in security.yml to block HIGH (currently only CRITICAL)
