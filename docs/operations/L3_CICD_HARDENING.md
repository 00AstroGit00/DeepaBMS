# DeepaBMS L3 — CI/CD Hardening
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Workflow Review

| Workflow | Jobs | Status | Issues Found | Remediation |
|:---------|:-----|:------:|:-------------|:------------|
| `build.yml` | 5 (lint-test, build-backend, build-android, build-windows, release) | ⚠️ | No issues | — |
| `test.yml` | 2 (mobile-tests, backend-tests) | ✅ | No issues | — |
| `security.yml` | 3 (dependency-scan, codeql, container-scan) | ⚠️ | Dockerfile reference | ✅ Fixed — uses `Dockerfile.prod` |
| `release-gates.yml` | 3 (container-smoke, helm-k8s-validate, perf-benchmark) | ⚠️ | k6 smoke.js path | ✅ Already exists at `tests/load/smoke.js` |
| `backup.yml` | 1 (backup) | ⚠️ | PostgreSQL target, AWS secrets | ✅ Rewritten for SQLite, S3 disabled |

## Duplications Found

| Duplication | Location | Resolution |
|:------------|:---------|:-----------|
| None | — | Workflows are clean — 5 distinct purposes (test, build, security, gates, backup) |

## Broken Workflows

| Workflow | Issue | Fix |
|:---------|:-------|:----|
| `security.yml:70` | Referenced `Dockerfile` (no healthcheck, no USER) | Changed to `Dockerfile.prod` |
| `backup.yml` | Entirely PostgreSQL-targeted | Rewritten for SQLite |

## Workflow Capabilities

| Capability | test.yml | build.yml | security.yml | release-gates.yml | backup.yml |
|:-----------|:--------:|:---------:|:------------:|:-----------------:|:----------:|
| Lint | ✅ | — | — | — | — |
| TypeScript check | ✅ | — | — | — | — |
| Unit tests | ✅ | ✅ (reusable) | — | — | — |
| Docker build | — | ✅ | ✅ (scan) | ✅ (smoke) | — |
| Docker push | — | ✅ | — | — | — |
| SBOM | — | ✅ | — | — | — |
| Cosign sign | — | ✅ | — | — | — |
| Android build | — | ✅ | — | — | — |
| Windows build | — | ✅ | — | — | — |
| CodeQL | — | — | ✅ | — | — |
| Trivy scan | — | — | ✅ | — | — |
| npm audit | — | — | ✅ | — | — |
| Helm lint | — | — | — | ✅ | — |
| Kubeconform | — | — | — | ✅ | — |
| k6 perf test | — | — | — | ✅ | — |
| Backup | — | — | — | — | ✅ |
| GitHub Release | — | ✅ | — | — | — |
| S3 upload | — | — | — | — | ⚠️ (disabled) |

## Secrets Required

| Secret | Status | Used By |
|:-------|:------:|:--------|
| `GITHUB_TOKEN` | ✅ Auto-provided | All workflows |
| `SNYK_TOKEN` | ⚠️ Not configured | `security.yml` (Snyk scan) |
| `AWS_ACCESS_KEY_ID` | ⚠️ Not configured | `backup.yml` (S3) |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ Not configured | `backup.yml` (S3) |
| `AWS_REGION` | ⚠️ Not configured | `backup.yml` (S3) |
| `BACKUP_BUCKET` | ⚠️ Not configured | `backup.yml` (S3) |
