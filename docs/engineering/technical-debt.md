# DeepaBMS Technical Debt Report

## Summary
**Technical Debt Score: 8.0/10** — Backend domain refactoring (P2-6) eliminated the 433-line monolith. Remaining HIGH items are frontend-only.

---

---



## High Debt Items

### TDC-03: buildSeed.ts — 1028 Lines (Maintainability)
- **File**: `src/context/store/buildSeed.ts`
- **Severity**: High
- **Effort**: Medium (4 hours)
- **Problem**: Single file generates all demo data for 7 domains
- **Fix**: Split into domain-specific seed files (sales, rooms, liquor, employees, etc.)
- **Note**: Backend seed was refactored in P2-6 (domain seed modules + bootstrap framework). Frontend buildSeed.ts remains — deferred to P2-6B.

### TDC-04: Large Screen Files (Maintainability)
| File | Lines |
|---|---|
| Employees.tsx | 1138 |
| Banking.tsx | 1071 |
| Bar.tsx | 888 |
| DayBook.tsx | 883 |
| Reports.tsx | 784 |
- **Severity**: High
- **Effort**: High (multiple days)
- **Fix**: Extract inline modals, forms, and helpers into separate components

### TDC-05: No API Authentication on /api/sync (Security) ✅ FIXED
- **File**: `apps/backend/src/index.ts:229`
- **Severity**: High
- **Effort**: Low
- **Fix Applied**: JWT authenticate + authorize middleware applied (P2-4).

### TDC-06: User Definitions Duplicated
- **Files**: `AuthContext.tsx:86-135` and `buildSeed.ts:258-306`
- **Severity**: High
- **Effort**: Low (30 min)
- **Fix**: Export DEFAULT_USERS from AuthContext and import in buildSeed

---

## Medium Debt Items

### TDC-07: StoreContext.tsx Contains Reducer (Confusion)
- **File**: `src/context/StoreContext.tsx:351-693`
- **Severity**: Medium
- **Issue**: Exports both `StoreProvider` (context) and `reducer` function inline, while reducers also exist in `store/reducers/`
- **Fix**: Remove inline reducer, use only `rootReducer` from `store/rootReducer.ts`

### TDC-08: No Test Coverage for Screens
- **Severity**: Medium
- **Issue**: 0 component/screen tests exist
- **Fix**: Add rendering tests for critical screens (Login, Dashboard, DayBook)

### TDC-09: No Integration Tests
- **Severity**: Medium
- **Issue**: No test validates full data flow
- **Fix**: Add integration test for: dispatch → reducer → selector chain

### TDC-10: No API Tests
- **Severity**: Medium
- **Issue**: Backend has zero tests
- **Fix**: Add endpoint tests for auth, sync, CRUD routes

### TDC-11: Root Artifacts
- **Files**: `bundle.js`, `target.html`, `extracted_modules/`
- **Severity**: Medium
- **Fix**: Remove from repository (add to .gitignore if build outputs)

---

## Low Debt Items

### TDC-12: No License File
- **Severity**: Low
- **Fix**: Add MIT license

### TDC-13: No API Documentation
- **Severity**: Low
- **Fix**: Generate OpenAPI spec for backend

### TDC-14: Missing Indexes
- **Tables**: bank_moves, liquor_audits, security_audit_log
- **Severity**: Low
- **Fix**: Add date indexes

### TDC-15: Inline Styles Everywhere
- **Severity**: Low
- **Issue**: All styles are inline objects (StyleSheet.create not used)
- **Fix**: Extract common styles to StyleSheet (low priority — negligible perf impact in RN)

### TDC-16: No E2E Tests
- **Severity**: Low
- **Fix**: Add Detox or similar E2E tests

---

## Already Fixed Debt (Recent Improvements)
- ✅ Reducer split from 1100+ lines into 10 domain reducers (commit `a684b8e`)
- ✅ Error boundary added
- ✅ Constant-time PIN comparison implemented
- ✅ Rate limiting on backend
- ✅ Database schema with indexes
- ✅ Crash-safe file writes for sync
- ✅ Test suite reports generated
- ✅ **TDC-01**: Plaintext PIN in Backend — bcrypt hashing implemented (P2-1)
- ✅ **TDC-02**: Hardcoded Secrets — secrets migrated to env vars with startup validation (P2-2)
- ✅ **TDC-05**: No API Authentication on /api/sync — JWT auth middleware applied (P2-4)
- ✅ **Backend monolith resolved**: 433-line index.ts → 8 domain route files + seed framework + bootstrap (P2-6)

---

## Technical Debt Trend
```
Before recent refactoring: 4/10
Current state:            8.0/10
Target:                   8.5/10 (after Phase 2)
```

## Priority Order for Resolution
1. Split frontend buildSeed.ts (TDC-03 / P2-6B)
2. Screen test expansion (TDC-08)
3. Remove inline reducer from StoreContext (TDC-07)
4. Add screen/API tests (TDC-08, TDC-09, TDC-10)
5. Split large screen files (TDC-04)
6. Remove root artifacts (TDC-11)
