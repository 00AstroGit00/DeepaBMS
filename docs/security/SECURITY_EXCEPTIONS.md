# Security Exceptions — DeepaBMS v1.0.0

**Scope:** High/Critical vulnerabilities from `npm audit` (root = frontend/Expo
tree; `apps/backend` = backend tree).
**Generated:** 2026-07-14 (P10.1 remediation).
**Policy:** No dependency was blindly upgraded. Every listed item requires a
**breaking major upgrade** and MUST be resolved via a controlled upgrade +
full CI regression, not `npm audit fix --force`.

## Summary

| Tree | High | Critical | Fix path | Safe auto-fix |
|------|------|----------|----------|---------------|
| root (frontend) | 14 | 0 | `expo@57.0.4` (BREAKING) + `expo-splash-screen@57.0.2`, `jest-expo@57.0.1` | No |
| apps/backend | 5 | 0 | `sqlite3@6.0.1` (BREAKING) | No |

Total distinct high advisories: 19 (cacache & tar appear in both trees).

## Exception Register (HIGH)

| # | Package | Tree | Type | Fix (BREAKING) | Recommended action | ETA | Status |
|---|---------|------|------|----------------|-------------------|-----|--------|
| 1 | expo | root | direct | expo@57.0.4 | Controlled Expo SDK major upgrade + CI regression | v1.0.1 | OPEN |
| 2 | expo-splash-screen | root | direct | 57.0.2 | Same as #1 | v1.0.1 | OPEN |
| 3 | jest-expo | root | direct | 57.0.1 | Same as #1 | v1.0.1 | OPEN |
| 4 | @expo/cli | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 5 | @expo/config | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 6 | @expo/config-plugins | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 7 | @expo/metro-config | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 8 | @expo/plist | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 9 | @expo/prebuild-config | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 10 | @xmldom/xmldom | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 11 | expo-asset | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 12 | expo-constants | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 13 | cacache | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 14 | tar | root | transitive | expo@57.0.4 | Same as #1 | v1.0.1 | OPEN |
| 15 | sqlite3 | backend | direct | sqlite3@6.0.1 | Controlled sqlite3 major upgrade + backend CI regression | v1.0.1 | OPEN |
| 16 | cacache | backend | transitive | sqlite3@6.0.1 | Same as #15 | v1.0.1 | OPEN |
| 17 | make-fetch-happen | backend | transitive | sqlite3@6.0.1 | Same as #15 | v1.0.1 | OPEN |
| 18 | node-gyp | backend | transitive | sqlite3@6.0.1 | Same as #15 | v1.0.1 | OPEN |
| 19 | tar | backend | transitive | sqlite3@6.0.1 | Same as #15 | v1.0.1 | OPEN |

## Risk context

- `tar` / `cacache` (path-traversal / arbitrary file overwrite) affect the
  **build/install toolchain**, not the runtime request path. Exposure is
  primarily to a malicious or compromised npm tarball during install/build.
- `@xmldom/xmldom` (XML injection) lives in the Expo/React-Native build
  toolchain (plist/Gradle XML handling), not in the backend runtime.
- No **critical** severity issues are present.

## Acceptance conditions (sign-off required)

These exceptions are accepted **only** pending:

1. A controlled upgrade branch that bumps Expo SDK and sqlite3 to the fixed
   majors.
2. Green CI run of `test.yml` (backend + mobile), `release-gates.yml`
   (container-smoke, helm-k8s-validate, perf-benchmark), and `security.yml`
   (`npm audit --audit-level=high` clean or reduced to accepted exceptions).
3. Security owner sign-off recorded here.

**Until then, these remain OPEN exceptions and block a clean `npm audit
--audit-level=high`.**

## Non-high items

Root also reports 1 low + 13 moderate (postcss, uuid, fast-xml-parser, send,
@expo/bunyan, @react-native-community/cli*, xcode, etc.). These are
lower-severity, mostly transitive dev/build deps; they should be swept in the
same controlled upgrade where non-breaking patches apply.
