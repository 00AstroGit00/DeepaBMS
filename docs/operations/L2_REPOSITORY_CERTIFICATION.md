# DeepaBMS L2 — Repository Certification
**Phase**: L2 Production Infrastructure Certification
**Date**: July 15, 2026
**Standard**: Only executable evidence satisfies a certification gate.

---

## 1. Git Tags

| Tag | Commit | Contains LICENSE | Contains ARCHITECTURE.md | Contains HPA | Checksums Valid |
|:---|:-------|:----------------:|:------------------------:|:------------:|:---------------:|
| `v1.0.0` | `34d6083` | ❌ | ❌ | ❌ Removed in working tree but tag has `k8s/base/hpa-backend.yaml` | ❌ (2 files changed) |
| `v1.0.1` | `21ac0fd` | ✅ | ✅ | ❌ No HPA (contains `helm hpa.yaml` for K8s) | ❌ (2 files changed) |

**Verdict**: Tags exist but are stale. Working tree has diverged from both tags. **NOT CERTIFIED** — requires re-tagging after committing v2.0 changes.

## 2. Release Branch

| Branch | Strategy | Status |
|:-------|:---------|:------:|
| `main` | Trunk-based with feature branches | ✅ Single branch, no divergence |

**Verdict**: ✅ Branch strategy appropriate for current scale.

## 3. Version Consistency

| File | Version |
|:-----|:-------:|
| Root `package.json` | 1.0.1 |
| `apps/backend/package.json` | 1.0.1 |
| `helm/deepa-bms/Chart.yaml` (version) | 1.0.1 |
| `helm/deepa-bms/Chart.yaml` (appVersion) | 1.0.1 |

**Verdict**: ✅ All versions consistent at `1.0.1`.

## 4. CHANGELOG

| File | Exists | Content |
|:-----|:------:|:--------|
| `CHANGELOG.md` | ❌ **MISSING** | Not present in repository |
| GitHub Release artifacts | ❌ NOT VERIFIED | No CI runs observed |

**Verdict**: ❌ **FAIL** — No changelog file. CI workflow `build.yml` references `scripts/ci/changelog.sh` but this has never been executed.

## 5. LICENSE

| File | Type | Verified |
|:-----|:-----|:--------:|
| `LICENSE` | MIT | ✅ Present at repo root (1065 bytes, dated 2026-07-14) |
| README license reference | MIT | ✅ README references MIT license |

**Verdict**: ✅ LICENSE present and correct.

## 6. README

| Check | Result |
|:------|:------:|
| File exists | ✅ `README.md` (6058 bytes) |
| Project description | ✅ |
| Installation instructions | ✅ |
| Quick start | ✅ |
| License reference | ✅ MIT |
| Architecture reference | ✅ Links to `docs/engineering/ARCHITECTURE.md` |

**Verdict**: ✅ README adequate for engineering audience.

## 7. Release Notes

| Document | Exists | Status |
|:---------|:------:|:-------|
| `docs/certification/p9/GA_RELEASE_NOTES.md` | ✅ | v1.0.0 release notes — obsolete (v2.0 changes not documented) |
| `docs/v2/P15_CUSTOMER_LAUNCH_PLAN.md` | ✅ | v2.0 launch plan (untracked, not in git) |

**Verdict**: ⚠️ Release notes exist for v1.0.0 but not updated for v2.0. Untracked v2.0 docs not in any tag.

## 8. Package Versions

| Package | Version | Latest Available | Status |
|:--------|:-------:|:----------------:|:------:|
| Node.js (runtime) | 18 (Docker) / 24 (local) | 22 LTS | ⚠️ Docker uses Node 18 (EOL Oct 2025). Local has v24. |
| sqlite3 | 5.1.7 | 6.0.1 | ⚠️ 5 high vulns require breaking major |
| Express | (implicit via Apollo) | — | ✅ |
| TypeScript | (implicit) | — | ✅ 0 errors |

**Verdict**: ⚠️ Node 18 in Docker is past EOL. sqlite3 upgrade pending.

## 9. Build Scripts

| Script | Path | Verified |
|:-------|:-----|:--------:|
| Backend build | `apps/backend/package.json → build: tsc` | ✅ `npx tsc` — 0 errors |
| Backend test | `apps/backend/package.json → test: jest` | ⚠️ 4 suites fail, 16 suites partial (542 test failures) |
| Root lint | `package.json → lint: eslint .` | ⚠️ Requires CI |
| TypeScript check | `package.json → ts:check: tsc --noEmit` | ⚠️ Root config may not include apps/ |
| CI version script | `scripts/ci/version.sh` | ✅ Exists (analyzed) |
| CI changelog script | `scripts/ci/changelog.sh` | ✅ Exists (not executed) |
| Run-all tests | `scripts/test/run-all.sh` | ✅ Exists |

**Verdict**: ✅ Build scripts exist and backend compiles. Test suite has issues.

## 10. Repository Certification Score

| Category | Max | Score | Status |
|:---------|:---:|:-----:|:-------|
| Git Tags | 10 | 6 | Tags exist but stale |
| Release Branch | 10 | 10 | ✅ Single main branch |
| Version Consistency | 10 | 10 | ✅ All 1.0.1 |
| CHANGELOG | 10 | 0 | ❌ Missing |
| LICENSE | 10 | 10 | ✅ MIT |
| README | 10 | 9 | ✅ Complete |
| Release Notes | 10 | 4 | ⚠️ Outdated |
| Package Versions | 10 | 6 | ⚠️ Node 18, sqlite3 |
| Build Scripts | 10 | 8 | ✅ Builds, tests partial |
| Working Tree Clean | 10 | 0 | ❌ 107 dirty files |
| **TOTAL** | **100** | **63** | **⚠️ CONDITIONAL** |

---

## Conclusion

**Repository Status**: ⚠️ **NOT CERTIFIED** — Version consistency and LICENSE are correct. Critical gaps: missing CHANGELOG, stale tags, dirty working tree. The v2.0 changes (P12-P15) in the working tree must be committed and re-tagged before this certification can pass.
