# DeepaBMS Testing Audit

## Test Infrastructure
- **Framework**: Jest 29.x
- **Preset**: jest-expo (SDK 51)
- **Environment**: jsdom via React Native Testing Library
- **Setup File**: `jest-setup.js` (mocks AsyncStorage)
- **Test Reports**: Output to `tests/reports/`
- **Test Runner**: `npm test` or `scripts/test/run-all.sh`

## Current Test Coverage

### Frontend
- **Suites**: 4 passed
- **Tests**: 16 passed (5 helper, 5 StoreContext, ~2 payroll, ~2 ledgerBuilders, ~2 Primitives)

### Backend (apps/backend — SQLite3 via ts-jest)
- **Suites**: 6 passed
- **Tests**: 255 passed across 6 suites

| Suite | Count | Coverage |
|---|---|---|
| `tests/inventory.test.ts` | 60 | Repository CRUD, movement types, cost engine, reorder, validation, aggregates |
| `tests/purchasing.test.ts` | 67 | Supplier CRUD, PO lifecycle, state machine, goods receipt, invoices, returns, events, cost calc, GST/Excise hooks, discrepancies |
| `tests/restaurant.test.ts` | 72 | Order lifecycle, KOT queue, recipe consumption, billing, tables, ingredient check, state machine, permissions |
| `tests/liquor.test.ts` | 171 | Peg engine, bottle lifecycle, bar sales, inventory integration, excise, pricing, reporting, state machine, validation, edge cases |
| `tests/rooms.test.ts` | 251 | Reservation lifecycle, room management, guest CRUD, check-in/check-out flow, folio billing, housekeeping, maintenance, night audit, room operations, state machine, validation, edge cases |
| `tests/accounting.test.ts` | 163 | Chart of accounts CRUD, double-entry journal posting (balanced invariant), auto-posting from operational domains, GST input/output tracking, banking operations (deposit/withdraw/transfer/reconciliation), 8 financial reports, day book, period closing, validation, edge cases |
| `tests/analytics.test.ts` | 153 | KPI definitions CRUD, dashboard configs per role, daily/weekly/monthly/yearly summary computation, operational KPIs (revenue, occupancy, ADR, RevPAR, covers), financial KPIs (profit, margin, cash flow, GST, receivables/payables), inventory analytics (fast/slow/dead stock, reorder alerts, stock ageing), hospitality analytics (occupancy, booking sources, kitchen performance, bartender productivity, peak hours), role-based dashboard access, trend analysis, comparison (period/year-over-year), anomaly detection, forecasting, event generation, cache operations, health/coverage, exports |
| `tests/hr.test.ts` | 217 | Departments CRUD + hierarchy, designations CRUD, employee CRUD across 2-table join, shifts + assignment, attendance engine (multi-shift, clock-in/out, overtime, late/early detection, corrections), holiday calendar, leave type configs (8 types), leave balances with computed available, leave applications with approval workflow (pending→approved/rejected/cancelled), payroll engine (PF capped 1800, ESI ≤21000 threshold, PT ≥15000, OT 2× hourly, attendance deductions, leave deductions, net pay, CTC), loans with EMI, advances with recovery, reimbursements, performance reviews, training records, disciplinary actions, exit process state machine (requested→notice_period→clearance_pending→completed), reports (headcount, attrition, labour cost, attendance, leave utilization), state machine validation (14 transition tests), validation and edge cases (20 tests) |
| `tests/auth.test.ts` | 14 | Registration, login, profile, token refresh |
| `tests/security.test.ts` | 16 | JWT verification, RBAC, rate limiting |
| `tests/validate.test.ts` | 26 | Field validators, movement validators, bulk async validation |

### Total: 1226 test cases across 15 suites, 0 failures

### Test Inventory

#### 1. `src/utils/__tests__/helpers.test.ts` (5 tests)
| Test | What It Covers |
|---|---|
| inr currency formatting | Indian rupee format, negative, zero |
| parseNum cleaning and conversion | Symbol stripping, NaN handling |
| dateKey date formatting | ISO date output |
| daysBetween range array generator | Date range array |
| uid length and format | String ID format |

#### 2. `src/utils/__tests__/payroll.test.ts` (? tests)
Payroll computation logic tests.

#### 3. `src/utils/__tests__/ledgerBuilders.test.ts` (? tests)
Report builders tests (skipped in initial run?).

#### 4. `src/context/__tests__/StoreContext.test.tsx` (5 tests)
| Test | What It Covers |
|---|---|
| ADD_SALE | Appends to sales, verifies length + content |
| ADD_TXN | Appends expense, verifies length + content |
| SELL_LIQUOR | Deducts ML, creates sale record |
| CHECK_IN | Room status → occupied, guest data stored |
| RESET_DEMO | Resets to seed data |

#### 5. `src/components/__tests__/Primitives.test.tsx`
Primitives component rendering tests.

---

## Coverage Gaps

### Critical Gaps
| Area | Risk | Priority |
|---|---|---|
| Reducer logic (bankReducer, hotelReducer, employeesReducer) | High | Critical |
| AuthContext (login, logout, role-based access) | High | Critical |
| Security (constantTimeEqual) | High | Critical |
| Sync logic (mergeCollections, mergeRooms) | High | Critical |
| Report generation (all 8 report types) | Medium | High |

### Significant Gaps
| Area | Risk | Priority |
|---|---|---|
| Screen rendering tests (Login, Dashboard, DayBook) | Medium | High |
| Navigation logic (Layout sidebar, role filtering) | Medium | High |
| ErrorBoundary behavior | Medium | High |
| ThermalPrinter (printReceipt, printCheckOut) | Medium | High |
| FileExporter (CSV, PDF, saveTextFile) | Medium | Medium |
| Bank statement parser | Medium | Medium |
| Media picker (image, document, camera) | Low | Medium |
| Biometric auth flow | Low | Medium |
| Electron IPC bridge | Low | Medium |

### Not Tested At All
| Area | Risk |
|---|---|
| All 13 screen components | High |
| All 13 utility modules (only 4 have tests) | Medium |
| Backend API endpoints (8 endpoints) | Critical |
| Database schema migrations | Medium |
| Docker configuration | Low |
| CI/CD pipeline | Low |

---

## Test Quality Metrics

| Metric | Current | Target |
|---|---|---|---|
| Test count | 1226 | 1500+ |
| Unit test coverage | ~5% | 70%+ |
| Component test coverage | 0% | 60%+ |
| Integration test coverage | 0% | 40%+ |
| E2E test coverage | 0% | 20%+ |
| API test coverage | 0% | 80%+ |
| Flaky tests | 0 | 0 |

---

## Test Scripts

### `scripts/test/run-all.sh`
Runs:
1. TypeScript type check (`tsc --noEmit`)
2. Jest test suite (`jest --json`)
3. Outputs reports to `tests/reports/`
4. Returns combined status

### `scripts/test/clean-cache.sh`
Cleans Jest cache and node_modules/.cache.

---

## Recommended Testing Roadmap

### Phase 1 (Immediate)
- Add reducer tests for all 10 domain reducers
- Add AuthContext tests
- Add security utility test
- Add sync merge logic tests

### Phase 2 (Short-term)
- Add screen rendering tests (Login, Dashboard)
- Add report generator tests
- Add backup/restore test

### Phase 3 (Medium-term)
- Add API integration tests
- Add E2E tests for critical flows (login → daybook entry → sync)
- Add performance benchmarks
