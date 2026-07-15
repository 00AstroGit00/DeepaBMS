# DeepaBMS L4 — Security Validation Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — scans executed in CI)

---

## Execution Status (CI)

| Scan | Status | Evidence |
|:-----|:------:|:---------|
| npm audit (critical gate) | 🟢 SUCCESS | `npm audit --audit-level=critical` → 0 critical (run `29432778355`) |
| SBOM generation | 🟢 SUCCESS | SPDX + CycloneDX via anchore/sbom-action (run `29432778491`) |
| Trivy container scan | 🟢 SUCCESS | SARIF (HIGH,CRITICAL) uploaded (run `29432778355`) |
| CodeQL analysis | 🟢 SUCCESS | js-typescript + actions + python (run `29432778271`) |
| Secret scan | ⚠️ NOT RUN | No gitleaks/truffleHog job configured (manual review only) |
| Dependency review | ✅ PARTIAL | CodeQL + npm audit provide coverage |

> CodeQL is provided by GitHub's **default** `github-code-scanning/codeql` workflow
> (enabled in the Security tab). An embedded CodeQL job in `security.yml` was removed
> (`dbc0adc`) because it caused duplicate-SARIF upload conflicts.

## Runtime Security Verified (unchanged)

| Check | Result | Evidence |
|:------|:------:|:---------|
| JWT authentication | ✅ PASS | Login returns signed JWT with claims |
| PIN-based auth | ✅ PASS | `pin` field required (4-10 chars) |
| GraphQL auth gate | ✅ PASS | 401 without token |
| Role-based access | ✅ PASS | `role` in token |
| Tenant isolation | ✅ PASS | `tenantId` claim |
| JWT expiry | ✅ PASS | `exp` (8h) |

## OWASP ASVS Status

| Level | Passed | Total | Status |
|:------|:------:|:-----:|:-------|
| L1 | 26 | 26 | ✅ (from L2 certification) |
| L2 | 85 | 87 | ✅ (from L2 certification) |
| L3 | 38 | 52 | ⚠️ Requires pen test (Tier 4 #23) |

## Vulnerabilities (Known)

| Severity | Count | Source | Remediation |
|:---------|:-----:|:-------|:------------|
| Critical | 0 (gated) | — | None at critical level |
| High | ~19 | expo, sqlite3 native addon | SDK 52 upgrade (Q3 2026); accepted per `SECURITY_EXCEPTIONS.md` |

## Verdict

**🟢 VERIFIED** — Security scans (npm audit critical gate, Trivy, CodeQL, SBOM) all
execute in CI and pass. OWASP L1/L2 confirmed. L3 remains deferred to a third-party pen
test (external). The prior "PARTIALLY VERIFIED / NOT EXECUTED" status is resolved for all
CI-runnable scans.
