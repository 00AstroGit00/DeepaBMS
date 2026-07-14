# Dependency Remediation Plan — DeepaBMS v1.0.0 (P10.1 / R-4)

## Method

`npm audit --json` executed locally for `root` (frontend/Expo monorepo) and
`apps/backend`. Results classified by severity, dependency type
(direct/transitive), fix availability, and whether the fix is a breaking major
upgrade. No packages were upgraded automatically.

## Root (frontend) — `npm audit`

```
vulnerabilities: { info:0, low:1, moderate:13, high:14, critical:0, total:28 }
```

- **14 high**, **0 critical**. Every high is reachable only through a **breaking
  major** upgrade of the Expo toolchain (`expo@57.0.4`, plus
  `expo-splash-screen@57.0.2`, `jest-expo@57.0.1`).
- Representative advisories: `@xmldom/xmldom` (XML injection), `tar` / `cacache`
  (path traversal / file overwrite), multiple `@expo/*` (transitive via expo).
- Non-high: 13 moderate (postcss, uuid, fast-xml-parser, send,
  @react-native-community/cli*, xcode, @expo/bunyan, etc.), 1 low.

## Backend — `apps/backend` `npm audit`

```
vulnerabilities: { info:0, low:2, moderate:0, high:5, critical:0, total:7 }
```

- **5 high**, **0 critical**. All trace to `sqlite3` and are fixed only by the
  **breaking major** `sqlite3@6.0.1`.
- Packages: `sqlite3` (direct), `cacache`, `make-fetch-happen`, `node-gyp`,
  `tar` (transitive via sqlite3's build chain).

## Decision: do NOT blindly upgrade

Per R-4, breaking major upgrades are applied only through a controlled process:

1. **Branch** `chore/deps-v1.0.1` created from `v1.0.0`.
2. **Backend:** `npm install sqlite3@6.0.1` in `apps/backend`; rebuild native
   addon; run `apps/backend` Jest suite + `tsc`.
3. **Frontend:** upgrade Expo SDK to the fixed major in a separate, carefully
   staged step; run mobile Jest + typecheck; verify EAS/Expo prebuild still
   works.
4. **CI gate:** push branch → `test.yml`, `release-gates.yml`, `security.yml`
   must be green; `npm audit --audit-level=high` must be clean or reduced to the
   signed exceptions in `SECURITY_EXCEPTIONS.md`.
5. **Merge** to `main` only after green CI + Security sign-off; tag `v1.0.1`.

## Safe mitigations available now (no code change)

- Pin CI to install from a vetted, hash-locked `package-lock.json`; run
  `npm ci` (already done) to avoid resolving newer compromised transitive
  versions during install.
- Restrict install-time network access / use an internal npm proxy with
  allow-listed packages to blunt `tar`/`cacache` build-path exposure.
- These reduce, but do not eliminate, the audit findings.

## Exit criteria (R-4 closed)

- `npm audit --audit-level=high` returns **0 high** in both root and backend,
  OR the remaining highs are exactly those listed in `SECURITY_EXCEPTIONS.md`
  with Security sign-off, and `npm audit --audit-level=critical` is clean.
- Both trees pass CI regression after the controlled upgrade.
