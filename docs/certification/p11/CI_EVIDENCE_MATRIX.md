# P11 — CI Evidence Matrix (RB-2)

**Status: 🔍 NOT VERIFIED.** No GitHub Actions run was observed in the
certification environment (no runner/network access). Each row states the
expected artifact and whether it was collected.

| Workflow | Job | Expected evidence | Collected? |
|----------|-----|------------------|------------|
| test.yml | mobile-tests | lint/tsc/test logs; `coverage/` (mobile) | ❌ |
| test.yml | backend-tests | `npm test` log; `apps/backend/coverage/`; regression PASS | ❌ |
| build.yml | build-backend | image digest `ghcr.io/.../deepa-bms-backend:<ver>`; cosign signature | ❌ |
| build.yml | build-android | `app-release.apk` | ❌ |
| build.yml | build-windows | `*.exe` | ❌ |
| build.yml | SBOM | `sbom.spdx.json` + `sbom.cyclonedx.json` (syft) | ❌ |
| security.yml | dependency-scan | `npm audit --audit-level=high` log | ❌ (local audit run, but CI job not executed) |
| security.yml | codeql | CodeQL SARIF | ❌ |
| security.yml | container-scan | Trivy SARIF | ❌ |
| release-gates.yml | container-smoke | build+run+/health/live+db-persist log | ❌ |
| release-gates.yml | helm-k8s-validate | helm lint/template + kubeconform log | ❌ |
| release-gates.yml | perf-benchmark | k6 output (p95/p99/failure) | ❌ |
| release.yml | release | GitHub Release + APK/EXE assets | ❌ |

## What exists statically (not execution)
- All six workflow YAML files present and YAML-valid (parsed in P9.1).
- `tests/load/smoke.js` k6 script present.

## Exact evidence required to flip to VERIFIED
Push `v1.0.0` to the GitHub remote; download run artifacts; attach each row's
evidence above. Until then **RB-2 = NOT VERIFIED** and cannot satisfy a release
gate.
