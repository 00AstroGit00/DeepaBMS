# P8 Phase 7 — Technical Debt Elimination & Phase 8 — Version 1.1 Roadmap

## Phase 7 — Debt Register (categorized)
Format: `ID | Cause | Impact | Risk | Effort | Solution | Priority | ROI`

| ID | Category | Cause | Impact | Risk | Effort | Solution | Pri | ROI |
|----|----------|-------|--------|------|--------|----------|-----|-----|
| D-01 | Critical | GL decoupled from ops | Wrong financials | High | 5–8d | Wire auto-post into operational services | P0 | Very High |
| D-02 | Critical | Bar GST not computed | Excise/rev understated | High | 1–2d | Add TOT/GST to bar pricing | P0 | High |
| D-03 | Security | Default PINs | Admin compromise | High | 0.5d | Force PIN rotation | P0 | High |
| D-04 | Security | Tenant header trust | Tenant escape | High | 1d | Bind tenant to JWT | P0 | High |
| D-05 | Observability | JSON metrics | No alerts | High | 1d | Prometheus exposition | P0 | High |
| D-06 | Observability | PG/Redis alerts | False ±/neg | High | 1d | SQLite-scoped rules | P0 | High |
| D-07 | Perf | No WAL/busy_timeout | Event-loop block | Med | 2h | PRAGMA WAL | P1 | High |
| D-08 | Perf | Workflow scheduler dead | Automation dead | Med | 0.5d | Start on boot | P1 | High |
| D-09 | Perf | N+1 year-end | Slow close | Med | 1d | Grouped SQL | P1 | Med |
| D-10 | Financial | GST inc/exc mismatch | Non-recon | Med | 1d | Standardize basis | P1 | High |
| D-11 | Financial | Loan EMI not amortized | Payroll wrong | Med | 1d | Call recordLoanEmi | P1 | High |
| D-12 | Financial | Deposit as charge | Cash leak | Med | 1d | Post as payment | P1 | High |
| D-13 | Financial | Bank 1-line journal | No bank post | Med | 0.5d | 2-line journal | P1 | Med |
| D-14 | Security | Backup key fallback | Backup crypto weak | Med | 0.5d | Fail without env | P1 | High |
| D-15 | Security | Prompt-inj bypass | AI abuse | Med | 2–3d | Semantic + real RBAC | P1 | Med |
| D-16 | Security | Device secret in URL | Secret leak | Med | 1d | Header/body | P1 | Med |
| D-17 | Security | Weak JWT only warned | Forgery | Med | 0.5d | Enforce ≥32 | P1 | High |
| D-18 | Security | No acct lockout | Brute force | Med | 1d | Lockout + const-time | P1 | Med |
| D-19 | Arch | Routes→repo direct | Logic in transport | Med | 5–8d | Extract services | P2 | Med |
| D-20 | Arch | sales raw SQL | Layering break | Med | 2d | Create repo/service | P2 | Med |
| D-21 | Debt | 12× handleError | Duplication | Med | 0.5d | Shared module | P2 | Med |
| D-22 | Debt | 1,367 `any` | Type unsafety | Med | ongoing | no-explicit-any | P2 | Med |
| D-23 | Debt | 100+ console.* | Log noise | Med | 2d | Central logger | P2 | Med |
| D-24 | Debt | Dual error contract | Inconsistent API | Med | 1d | Error middleware | P2 | Med |
| D-25 | Debt | Float money + drift | Rounding errors | Med | 3–5d | Integer paise | P2 | Med |
| D-26 | Debt | dist/ in VCS | Repro risk | Low | 1h | gitignore | P3 | Low |
| D-27 | Tooling | No backend lint | Unchecked debt | Med | 0.5d | Add lint + rule | P2 | High |
| D-28 | Tooling | Root tsc excludes apps | Invisible errors | Med | 0.5d | Fix include | P2 | High |
| D-29 | Perf | SELECT * hot paths | Mem/CPU waste | Low | 1d | Column lists | P3 | Low |
| D-30 | Perf | AI history unbounded | Mem growth | Med | 0.5d | Turn window | P2 | Med |

## Phase 8 — Version 1.1 Roadmap (evidence-only, no speculative features)
Each item traces to a verified finding above.

### UI / Workflow Improvements
- **W-1** Folio deposit flow fix (D-12/FIN-03): correct deposit posting + checkout netting. [P1]
- **W-2** Restaurant/Bar/Rooms payment → ledger posting (D-01/FIN-01,11,12): close the GL gap so users *see* posted revenue. [P0]
- **W-3** Payroll loan amortization UI reflects `recordLoanEmi` (D-11/FIN-04). [P1]
- **W-4** Bar bill shows GST/TOT line (D-02/FIN-02). [P0]

### Performance Improvements
- **P-1** SQLite WAL + busy_timeout (D-07). [P1]
- **P-2** Wire workflow scheduler (D-08). [P1]
- **P-3** Collapse N+1 year-end (D-09). [P1]
- **P-4** Analytics caching + sargable predicates + `gst_registers(created_at)` index (D-29, PERF-06/07). [P2]
- **P-5** Cap AI history (D-30). [P2]

### Reporting Improvements
- **R-1** GST register ↔ GL reconciliation report (D-10/FIN-07). [P1]
- **R-2** Bank balance-sheet vs trial-balance reconciliation (FIN-13). [P2]
- **R-3** Excise bottle/ML consistency report (FIN-09). [P2]

### Developer Tooling / Automation
- **T-1** Backend ESLint with `no-explicit-any` (D-22, D-27). [P2]
- **T-2** Fix root tsconfig to include `apps/` (D-28). [P2]
- **T-3** Shared error middleware + `handleError` consolidation (D-21, D-24). [P2]
- **T-4** Central structured logger replacing 100+ console.* (D-23). [P2]
- **T-5** CI gate: `tsc` + `eslint` + `jest --coverage` on backend. [P2]

### Documentation / Testing / Maintainability
- **M-1** Add 1,693-case backend suite + on-site UAT already in P7; add **financial integrity tests** (post-sale ledger assertion) blocking FIN-01. [P0]
- **M-2** Integer-paise money refactor + tests (D-25). [P2]
- **M-3** Extract services from routes (D-19, D-20) — gradual, per domain. [P2/P3]
- **M-4** Security test suite: tenant-escape, default-PIN, prompt-injection (SEC-01..04). [P1]

**Explicitly NOT recommended (no evidence / speculative):** new business modules,
multi-currency, new report types, AI model swap, GraphQL, microservice split.
