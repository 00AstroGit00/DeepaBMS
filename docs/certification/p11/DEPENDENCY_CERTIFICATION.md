# P11 — Dependency Certification (RB-1)

**Executable evidence:** `npm audit --json` run locally for `root` and
`apps/backend` on 2026-07-14. No dependency was upgraded (per "do not blindly
upgrade").

## 1. Audit totals

| Tree | critical | high | moderate | low | total |
|------|----------|------|----------|-----|-------|
| root (frontend/Expo) | 0 | 14 | 13 | 1 | 28 |
| apps/backend | 0 | 5 | 0 | 2 | 7 |

**0 critical. 19 high advisories.** Every high is reachable only through a
**breaking major** upgrade: `expo@57.0.4` (frontend) and `sqlite3@6.0.1`
(backend).

## 2. Security Exception Register (per high)

Columns: Package | Tree | Type | Reachable at runtime? | Dev/build only? |
Upgrade path | Breaking? | Accepted?

| Package | Tree | Type | Runtime-reachable | Dev/build-only | Upgrade | Breaking | Accepted |
|---------|------|------|-------------------|----------------|---------|----------|----------|
| expo | root | direct | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| expo-splash-screen | root | direct | No | Yes | 57.0.2 | Yes | Pending upgrade |
| jest-expo | root | direct | No | Yes (test) | 57.0.1 | Yes | Pending upgrade |
| @expo/cli | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @expo/config | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @expo/config-plugins | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @expo/metro-config | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @expo/plist | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @expo/prebuild-config | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| @xmldom/xmldom | root | trans | No | Yes (build XML) | expo@57.0.4 | Yes | Pending upgrade |
| expo-asset | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| expo-constants | root | trans | No | Yes | expo@57.0.4 | Yes | Pending upgrade |
| cacache | root | trans | No | Yes (install) | expo@57.0.4 | Yes | Pending upgrade |
| tar | root | trans | No | Yes (install) | expo@57.0.4 | Yes | Pending upgrade |
| sqlite3 | backend | direct | No | Yes (build) | sqlite3@6.0.1 | Yes | Pending upgrade |
| cacache | backend | trans | No | Yes (install) | sqlite3@6.0.1 | Yes | Pending upgrade |
| make-fetch-happen | backend | trans | No | Yes (install) | sqlite3@6.0.1 | Yes | Pending upgrade |
| node-gyp | backend | trans | No | Yes (build) | sqlite3@6.0.1 | Yes | Pending upgrade |
| tar | backend | trans | No | Yes (install) | sqlite3@6.0.1 | Yes | Pending upgrade |

## 3. Risk Acceptance Matrix

| Risk | Exploitable in deployed app? | Mitigation (today) | Residual | Accept? |
|------|------------------------------|-------------------|----------|---------|
| tar/cacache path traversal | No (install-time only) | `npm ci` from locked tree; vetted registry; CI install isolation | Low | Yes (pending upgrade) |
| @xmldom/xmldom XML injection | No (build-time XML only) | Untrusted XML not processed at runtime | Low | Yes (pending upgrade) |
| Expo-chain highs | No (dev/build tooling) | Dev machines + CI only; no prod exposure | Low | Yes (pending upgrade) |
| sqlite3-chain highs | No (native build only) | Build in CI, not on end-user devices | Low | Yes (pending upgrade) |

**Conclusion:** No high is runtime-reachable in the deployed backend or mobile
app. All are build/install-time and mitigated by lockfile-based installs. They
are **accepted as known risks** pending the controlled upgrade below, with
Security sign-off recorded in `docs/security/SECURITY_EXCEPTIONS.md`.

## 4. Upgrade Roadmap

| Step | Action | Gate |
|------|--------|------|
| 1 | Branch `chore/deps-v1.0.1` from `v1.0.0` (post-fix commit) | — |
| 2 | Backend: `npm install sqlite3@6.0.1`; rebuild native; run backend Jest + `tsc` | CI green |
| 3 | Frontend: stage Expo SDK major upgrade; run mobile Jest + typecheck; verify EAS prebuild | CI green |
| 4 | Re-run `npm audit --audit-level=high` → expect 0 high (or only signed exceptions) | Security sign-off |
| 5 | Merge → `main`; tag `v1.0.1`; re-run full CI + release-gates | GA re-cert |

## 5. License compliance

- Repo `LICENSE` = MIT (added P10.1). MIT is permissive and compatible with the
  dependency set (predominantly MIT/Apache/BSD). A **full-tree license scan** was
  NOT executed in this environment → license compliance = 🔍 PARTIAL (no
  copyleft conflict expected, but not machine-verified).

## 6. Certification statement

Dependency certification is **CONDITIONAL FAIL**: 19 high advisories are open
and unremediated, though none are runtime-exploitable and all are accepted
pending a controlled breaking upgrade. GA cannot be granted while
`npm audit --audit-level=high` is non-clean.
