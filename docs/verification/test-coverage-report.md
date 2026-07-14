# Test Coverage Report — DeepaBMS v1.0 RC1

**Phase:** P6-3 (Test Inventory & Coverage Analysis)
**Date:** 2026-07-14
**Verdict:** PARTIAL (static inventory only — runtime coverage not measurable on Termux)

## 1. Environment Limitation
Tests rely on `better-sqlite3` / `sqlite3` native bindings. The Termux/Android
ARM64 environment lacks a working native build, so **Jest cannot execute here**.
Coverage % and mutation scores are therefore **not measured**; only static
counts are reported. CI on `ubuntu-latest` / `node:20` (see `.github/workflows/test.yml`)
is the authoritative coverage gate.

## 2. Inventory
- Test files: **15**
- Test cases (`it(`/`test(`): **1,693**
- Total test source lines: ~22,000

### Per-file mapping
| Test File | Target | Notes |
|-----------|--------|-------|
| security.test.ts | authz / middleware | cross-cutting |
| auth.test.ts | auth domain | login, PIN, JWT |
| validate.test.ts | validation middleware | schema enforcement |
| inventory.test.ts | inventory domain | ledger, stock |
| sync.test.ts | sync domain | offline/online |
| restaurant.test.ts | restaurant domain | orders, kitchen |
| purchasing.test.ts | purchasing domain | PO, GRN |
| analytics.test.ts | analytics domain | BI queries |
| platform.test.ts | platform ops | 114 cases (P4-8) |
| workflow.test.ts | workflow engine | 109 cases (P4-7) |
| accounting.test.ts | financial core | ledgers, GST |
| liquor.test.ts | bar / peg tracking | excise |
| rooms.test.ts | PMS | room status |
| ai.test.ts | AI copilot | 173 cases (P4-9) |
| hr.test.ts | HRMS / payroll | |

## 3. Coverage Gaps
- **No dedicated suite** for `audit`, `employees`, `sales` (route-only domains).
- **No frontend tests** (Expo/React Native `src/` screens) — UI unverified by
  automated tests; relies on manual QA and the `ErrorBoundary` guard.
- **No integration/E2E** suite exercising cross-domain flows (e.g., sale →
  accounting → GST ledger).
- **No load/performance test** (see `performance-benchmark-report.md`).

## 4. Mutation Testing
Not executed (Stryker requires running the suite, which is blocked here).
Track as a CI follow-up on Ubuntu runners.

## 5. Findings Summary
| ID | Severity | Finding |
|----|----------|---------|
| TC-1 | High | Runtime coverage unmeasurable on Termux (native sqlite3 missing) |
| TC-2 | Medium | 3 domains lack dedicated suites (audit/employees/sales) |
| TC-3 | High | Frontend (mobile) has zero automated test coverage |
| TC-4 | Medium | No cross-domain integration/E2E suite |
| TC-5 | Low | No mutation testing gate |

## 6. Recommendations
1. **(High/—/High/Nil)** Run full Jest suite + coverage on CI (`ubuntu-latest`)
   and publish the % before GA; this report's "pass" depends on that gate.
2. **(Medium/2d/High/Nil)** Add audit/employees/sales suites (at least smoke +
   RBAC tests).
3. **(High/1wk/High/Med)** Introduce React Native Testing Library suite for
   critical flows (login, sale entry, sync).
4. **(Medium/2d/Med/Nil)** Add one cross-domain integration test (sale→ledger).
