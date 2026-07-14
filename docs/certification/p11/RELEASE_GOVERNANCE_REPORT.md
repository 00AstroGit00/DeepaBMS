# P11 — Release Governance Report (RB-4)

**Status: ❌ FAIL.** Several governance controls are not satisfied by
executable evidence.

## Controls verified

| Control | Result | Evidence |
|---------|--------|----------|
| Version numbers | ✅ | root/backend `package.json` = `1.0.0`; `helm/Chart.yaml` version/appVersion = `1.0.0` |
| LICENSE file | ⚠️ | `LICENSE` (MIT) present in **working tree** but `git ls-tree v1.0.0` shows it is **NOT in the tag** |
| Git tag `v1.0.0` | ✅ exists | points to `34d6083` |
| Stray tag `2.0` | ⚠️ | points to `10faa24` ("Add README.md"), an ancestor of `v1.0.0` — mislabeled orphan |

## Controls FAILED

| Control | Result | Evidence |
|---------|--------|----------|
| Repository cleanliness | ❌ | `git status --short` → **56 uncommitted files** (the P10.1 fixes are not committed) |
| Release artifact completeness | ❌ | `v1.0.0` tag tree **lacks** `LICENSE`, `docs/engineering/ARCHITECTURE.md`, and **still contains** pre-fix `k8s/base/hpa-backend.yaml` |
| Checksums | ❌ | `release-v1.0.0.checksums.txt` present locally but **stale** (`sha256sum -c` now fails after P10.1 edits) and **NOT in the tag** |
| SBOM | ❌ | no SBOM artifact exists (generated only in CI) |
| Signed artifacts | ❌ | no cosign signatures exist |
| Release artifacts (APK/EXE/image) | ❌ | not built (no CI run) |
| Changelog / formal release notes | ⚠️ | certification docs exist; no formal `CHANGELOG`/release notes for the certified tree |

## Tag `2.0` disposition

- **Recommendation: REMOVE** (locally and on remote, if present).
- Rationale: it sits on an ancient commit and conflicts with the `v1.0.0`
  semantic-version lineage; it is not a release of record.
- **Action withheld:** per mandate, the tag is **not deleted automatically**.
  Maintainer must authorize `git tag -d 2.0` (+ `git push origin --delete 2.0`).

## Governance verdict

The release is **not governed to GA standard**: the tagged artifact is
internally inconsistent (missing fixes, contains pre-fix manifests), the tree
is dirty, and SBOM/signing/checksums are absent or stale. RB-4 FAILS.
