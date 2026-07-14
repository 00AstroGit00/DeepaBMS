# CI Evidence Checklist — DeepaBMS v1.0.0 (P10.1 / R-5)

**Status: NOT VERIFIED.** No GitHub Actions run was observed in this
environment (no network/runner access). The following is the **exact evidence
expected** from a successful `v1.0.0` CI run. Each item must be collected and
attached to the release record before GA can be reconsidered.

## Workflow → expected evidence

### `.github/workflows/test.yml`
- Job `mobile-tests`
  - Log: `npm run lint` exit 0; `npm run ts:check` exit 0; `npm test -- --coverage` exit 0.
  - Artifact: `coverage/` (mobile).
- Job `backend-tests`
  - Log: `cd apps/backend && npm ci` + `npm test -- --coverage` exit 0.
  - Artifact: `apps/backend/coverage/` (backend).
  - **Required:** backend regression suite (financial-integrity, observability,
    …) shows PASS; coverage % recorded.

### `.github/workflows/build.yml`
- Job `build-backend`: image `ghcr.io/<owner>/deepa-bms-backend:<version>` built
  from `apps/backend/Dockerfile.prod`, pushed, **cosign-signed**.
- Job `build-android`: `app-release.apk` artifact.
- Job `build-windows`: `*.exe` artifact.
- SBOM: `sbom.spdx.json` + `sbom.cyclonedx.json` generated (syft) and attached.

### `.github/workflows/security.yml`
- `npm audit --audit-level=high` exit 0 (or matches accepted exceptions).
- CodeQL SARIF uploaded (javascript-typescript).
- `container-scan`: Trivy SARIF (`trivy-results.sarif`) uploaded; **no new
  HIGH/CRITICAL** beyond `SECURITY_EXCEPTIONS.md`.

### `.github/workflows/release-gates.yml`
- `container-smoke`: `docker build` (Dockerfile.prod) → run with `/app/data`
  volume → `curl /health/live` 200 → assert `deepa-bms.db` persisted.
- `helm-k8s-validate`: `helm lint ./helm/deepa-bms` OK; `helm template` OK;
  `kubectl kustomize` (base + overlays) OK; `kubeconform --strict` PASS.
- `perf-benchmark`: k6 `tests/load/smoke.js` PASS (p95<500ms, p99<1000ms,
  failure<1%).

### `.github/workflows/release.yml` / `backup.yml`
- GitHub Release created with APK + EXE assets.
- Backup workflow executes (DB backup artifact) — optional for GA.

## Evidence package to attach to release

- `test.yml` logs + 2 coverage artifacts.
- `build.yml` image digest + cosign signature + 2 SBOM files.
- `security.yml` npm audit report + Trivy SARIF + CodeQL SARIF.
- `release-gates.yml` logs (smoke/helm-k8s/perf) + kubeconform output.
- Build durations / retries for each job.

## How to generate

Push tag `v1.0.0` (or a remediation tag) to the GitHub remote; download the
run artifacts; populate the above. Until then, **CI evidence = NOT VERIFIED**.
