# P11 — Security Certification

**Scope:** supply-chain, secret hygiene, vulnerability posture, SBOM, signing.

## Executable evidence

| Control | Result | Evidence |
|---------|--------|----------|
| Secret scan (repo) | ✅ Pass | no key/token patterns found (P10 scan) |
| `npm audit` (root) | ❌ 14 high / 0 critical | executed 2026-07-14 |
| `npm audit` (backend) | ❌ 5 high / 0 critical | executed 2026-07-14 |
| License file | ✅ MIT present (tree) | `LICENSE` exists; not in `v1.0.0` tag |
| Full-tree license scan | 🔍 Partial | not executed |
| Trivy container scan | 🔍 NOT VERIFIED | no SARIF locally; CI job not run |
| CodeQL | 🔍 NOT VERIFIED | no SARIF locally; CI job not run |
| SBOM (SPDX + CycloneDX) | 🔍 NOT VERIFIED | generated only in CI; none locally |
| Cosign image signing | 🔍 NOT VERIFIED | only in CI; no signatures locally |

## Findings

1. **No critical vulnerabilities.** Severity ceiling is HIGH.
2. **All 19 highs are build/install-time**, not runtime-reachable (see
   `DEPENDENCY_CERTIFICATION.md` Risk Acceptance Matrix). Practical exploitability
   in the deployed system is low and mitigated by lockfile-based installs.
3. **No secrets** were found in the repository.
4. **SBOM and signing are not produced in this environment** — they are defined
   in `build.yml`/`security.yml` but were never executed, so supply-chain
   integrity cannot be certified.

## Certification

🔴 **Security certification FAILS** the GA gate: open high vulnerabilities plus
absent SBOM/signing/Trivy/CodeQL evidence. The highs are documented and
accepted pending upgrade, but "accepted" is not "certified." SBOM and signing
must be generated and attached before GA.
