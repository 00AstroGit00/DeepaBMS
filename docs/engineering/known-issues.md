# DeepaBMS Known Issues

## Critical Issues





---

## High Issues







### KNI-06: `useElectron.ts` Uses `key` Array Destructuring Warning
- **Description**: `[event, handler]` in `useElectronShortcut` dependencies may cause lint warnings

---

## Medium Issues

### KNI-07: buildSeed.ts Runs on Every Fresh Launch
- **File**: `src/context/store/buildSeed.ts`
- **Description**: 1028-line function generates full demo dataset on load
- **Impact**: Slows cold start

### KNI-08: FlatList Without getItemLayout on Multiple Screens
- **Files**: DayBook.tsx, Sales.tsx, Banking.tsx, Employees.tsx
- **Impact**: Scrolling performance degrades with many items

### KNI-09: AuthContext Save/Load Race on AsyncStorage
- **File**: `src/context/AuthContext.tsx:173-188`
- **Description**: No locking on async operations

### KNI-10: Audit Log Capped at 500 Events
- **File**: `src/context/StoreContext.tsx:675`
- **Description**: Old events silently dropped

---

## Low Issues

### KNI-11: Root Files `bundle.js` and `target.html`
- **Description**: Appear to be build artifacts or exports committed to repo

### KNI-12: `pin_hash` Column Name Misleading
- **File**: `apps/backend/src/schema.sql:19`
- **Description**: Column named `pin_hash` but stores plaintext

### KNI-13: No Graceful Error on Missing TSC/Jest
- **Description**: `npm run ts:check` and `npm test` fail with "command not found" if node_modules not installed

### KNI-14: README Contains No License
- **Description**: License section says "released without a specified license"

### KNI-15: Some Screen Files Over 800 Lines
- **Files**: Employees.tsx (1138), Banking.tsx (1071), Bar.tsx (888), DayBook.tsx (883)
- **Description**: Violates maintainability best practices

---

## Platform-Specific Issues

### Android (Termux)
| Issue | Description |
|---|---|
| Phantom process killer | Android 12+ may kill Metro bundler |
| No local build | Must use EAS cloud builds |
| Shebang paths | Need termux-fix-shebang for scripts |

### Windows (Electron)
| Issue | Description |
|---|---|
| Path resolution | fix-paths.js required after expo export |
| GPU rendering | GPU blacklist ignored via CLI flags |

### Web
| Issue | Description |
|---|---|
| React Native components | Some RN-only components may fail on web |
| AsyncStorage | Web uses localStorage-like polyfill |

---

## Deprecated Items

| Item | Replacement | Status |
|---|---|---|
| KNI-01: Backend Seed Uses Plaintext PIN | bcrypt.hash() in seedUsersTable | ✅ Resolved P2-1 |
| KNI-02: Login Endpoint Doesn't Hash | bcrypt.compare() in login handler | ✅ Resolved P2-1 |
| KNI-12: pin_hash Column Name Misleading | Now stores actual bcrypt hashes | ✅ Resolved P2-1 |
| KNI-05: Docker Compose Secrets in Plaintext | Env vars with .env file + docker-compose ${VAR} | ✅ Resolved P2-2 |
| KNI-04: Sync Endpoint Unauthenticated | JWT authenticate + authorize middleware on /api/sync | ✅ Resolved P2-4 |
| KNI-03: No Input Validation on POST Endpoints | Centralized validation framework with field-level schemas | ✅ Resolved P2-4A |
