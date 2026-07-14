# P11 — Verification Matrix

Legend: ✅ Verified (executable) · ⚠️ Partial · ❌ Fail · 🔍 NOT VERIFIED

| # | Gate | Control | Evidence obtained | Verdict |
|---|------|---------|-------------------|---------|
| RB-1 | Dependency | `npm audit` executed (root+backend) | root 28 (14 high) / backend 7 (5 high) | ❌ highs open |
| RB-1 | Dependency | dependency tree | `npm ls --all` (33 direct root deps) | ✅ enumerated |
| RB-1 | Dependency | direct/transitive classified | audit JSON parsed | ✅ |
| RB-1 | Dependency | license compliance | repo `LICENSE` (MIT) added; full-tree license scan NOT executed | 🔍 partial |
| RB-1 | Dependency | CVE severity | 0 critical, 19 high, 13 mod, 3 low | ✅ measured |
| RB-2 | CI | test.yml status | workflow exists; no run observed | 🔍 NOT VERIFIED |
| RB-2 | CI | build.yml (image+SBOM+cosign) | no run; no SBOM/sig locally | 🔍 NOT VERIFIED |
| RB-2 | CI | security.yml (audit/Trivy/CodeQL) | no run; no SARIF locally | 🔍 NOT VERIFIED |
| RB-2 | CI | release-gates.yml | no run observed | 🔍 NOT VERIFIED |
| RB-3 | Runtime | Docker / Compose | files exist; not executed | 🔍 NOT VERIFIED |
| RB-3 | Runtime | SQLite persistence | code path exists; not executed | 🔍 NOT VERIFIED |
| RB-3 | Runtime | Health endpoints | routes in code; not probed | 🔍 NOT VERIFIED |
| RB-3 | Runtime | Backups / Restore | scripts exist; not executed | 🔍 NOT VERIFIED |
| RB-3 | Runtime | Helm / Kubernetes | files exist; not applied | 🔍 NOT VERIFIED |
| RB-3 | Runtime | Perf smoke (k6) | script exists; not run | 🔍 NOT VERIFIED |
| RB-4 | Gov | Git tags | `v1.0.0` present; stray `2.0` | ⚠️ issue |
| RB-4 | Gov | Release notes / changelog | docs exist (not formal) | ⚠️ partial |
| RB-4 | Gov | Checksums | file present locally but STALE + NOT in tag | ❌ |
| RB-4 | Gov | SBOM | none locally | ❌ |
| RB-4 | Gov | LICENSE | present in tree (MIT) but NOT in tag | ❌ |
| RB-4 | Gov | Version numbers | consistent 1.0.0 | ✅ |
| RB-4 | Gov | Repository cleanliness | 56 uncommitted files | ❌ |
| RB-4 | Gov | Signed artifacts | none | ❌ |

**Conclusion:** 4 gates FAIL or are NOT VERIFIED on every executable control.
GA cannot be approved.
