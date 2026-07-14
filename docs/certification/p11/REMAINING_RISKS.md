# P11 — Remaining Risks

| ID | Risk | Sev | Evidence | Owner |
|----|------|-----|----------|-------|
| RK-1 | Release tag `v1.0.0` does not contain P10.1 fixes (LICENSE, HPA removal, docs) | High | `git ls-tree v1.0.0` lacks `LICENSE`/`ARCHITECTURE.md`; still has `hpa-backend.yaml` | Release Mgmt |
| RK-2 | Dirty working tree (56 uncommitted files) | High | `git status --short` count | Release Mgmt |
| RK-3 | 19 high npm vulnerabilities unremediated | High | `npm audit` (root 14 / backend 5 high) | Security |
| RK-4 | No CI execution evidence (test/build/security/release-gates) | High | no workflow runs observed | Release Mgmt / CI |
| RK-5 | No runtime evidence (Docker/Helm/K8s/health/persistence/backup/perf) | High | docker/helm/kubectl/k6 unavailable | Operations |
| RK-6 | No SBOM / cosign signatures / Trivy / CodeQL artifacts | High | filesystem check: none present | Security |
| RK-7 | Checksums stale and absent from tag | Med | `sha256sum -c` fails; not in tag | Release Mgmt |
| RK-8 | Stray `2.0` git tag | Low | `git tag -l` | Maintainer |
| RK-9 | Full-tree license scan not executed | Low | license-checker not run | Security |
| RK-10 | Production `console.*` noise (135 statements) | Low | grep count (P10) | Engineering |

**GA-blocking:** RK-1, RK-2, RK-3, RK-4, RK-5, RK-6.
