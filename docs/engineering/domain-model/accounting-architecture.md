# Financial Core Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        FINANCIAL CORE DOMAIN (P4-2)                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────┐    ┌──────────────────────┐   │
│  │   Routes      │───→│         Services             │───→│     Repository       │   │
│  │   65+ endpoints│   │  JournalService              │    │  7 tables            │   │
│  └──────────────┘    │  AutoPostService              │    │  60+ methods         │   │
│                      │  GstService                   │    └──────────┬───────────┘   │
│  ┌──────────────┐    │  PeriodService                │               │               │
│  │  Middleware   │    │  BankingService               │    ┌─────────┴──────────┐   │
│  │  auth + RBAC │    │  ReportService                │    │ chart_of_accounts  │   │
│  └──────────────┘    │  DayBookService               │    │ financial_periods  │   │
│                      │  ValidationService            │    │ journal_entries    │   │
│                      │  PeriodClosingService         │    │ journal_lines      │   │
│                      └───────────────────────────────┘   │ account_balances   │   │
│                                         │                │ gst_registers      │   │
│                                         ▼                │ auto_posting_config│   │
│                              ┌──────────────────────┐    │ bank_reconciliation│   │
│                              │  Operational Domains  │    └─────────────────────┘   │
│                              │  (auto-posting)       │                             │
│                              │  Purchasing           │                             │
│                              │  Restaurant           │                             │
│                              │  Bar                  │    ┌─────────────────────┐   │
│                              │  Hotel                │    │  Existing Tables    │   │
│                              │  Inventory            │    │  bank_accounts      │   │
│                              └──────────────────────┘    │  bank_moves          │   │
│                                                          │  sales               │   │
│                                                          │  txns                │   │
│  ┌──────────────┐                                        │  credit_accounts     │   │
│  │  Seed Module  │                                       │  credit_ledger       │   │
│  │  46 accounts  │                                       └─────────────────────┘   │
│  │  12 periods   │                                                                 │
│  │  5 configs    │                                                                 │
│  └──────────────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
chart_of_accounts (1) ──┐
                        │
financial_periods (1) ──┤
                        ├── journal_entries (N) ── journal_lines (N) ── chart_of_accounts (1)
                        │         │
                        │    account_balances (N) ── chart_of_accounts (1)
                        │         │
                        │    gst_registers (N)
                        │
                   auto_posting_config (N) ── chart_of_accounts (2+)

bank_accounts (1) ── bank_reconciliation (N)
                └── bank_moves (N)
```

## Double-Entry Invariant

```
Every journal entry MUST satisfy:
  Σ(debits) === Σ(credits)

Asset/Debit-balance accounts:  balance = Σ(debits) - Σ(credits)
Liability/Credit-balance accounts:  balance = Σ(credits) - Σ(debits)

Trial Balance MUST satisfy:
  Σ(all debit balances) === Σ(all credit balances)

Balance Sheet MUST satisfy:
  Σ(Assets) === Σ(Liabilities) + Σ(Equity)
```

## Auto-Posting Flow

```
Operational Event
  │
  ├─► POST /api/accounting/auto-post/{source}
  │
  ├─► Look up auto_posting_config for source
  │
  ├─► Create JournalEntry
  │     Debit: config.debitAccountId  → amount
  │     Credit: config.creditAccountId → amount
  │
  ├─► If gstAccountId and gstAmount > 0:
  │     Debit: config.debitAccountId  → gstAmount  (for input GST)
  │     Credit: config.gstAccountId   → gstAmount  (for output GST)
  │     Record GstRegister entry
  │
  ├─► Post journal (set status='posted')
  │
  └─► Update account_balances
```

## API Endpoints (65+ total)

### Accounts (8)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/accounts` | owner, manager, accountant, auditor |
| GET | `/api/accounting/accounts/tree` | owner, manager, accountant, auditor |
| POST | `/api/accounting/accounts` | owner, manager, accountant |

### Journals (10)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/journals` | owner, manager, accountant, auditor |
| POST | `/api/accounting/journals` | owner, manager, accountant |
| POST | `/api/accounting/journals/:id/post` | owner, manager, accountant |
| POST | `/api/accounting/journals/:id/reverse` | owner, manager, accountant |

### Auto-Posting (8)
| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/accounting/auto-post/purchase` | owner, manager, accountant |
| POST | `/api/accounting/auto-post/restaurant-sale` | owner, manager, accountant |
| POST | `/api/accounting/auto-post/bar-sale` | owner, manager, accountant |
| POST | `/api/accounting/auto-post/hotel-charge` | owner, manager, accountant |

### GST (6)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/gst/summary` | owner, manager, accountant, auditor |
| GET | `/api/accounting/gst/return` | owner, manager, accountant |
| POST | `/api/accounting/gst/record` | owner, manager, accountant |

### Periods (6)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/periods` | owner, manager, accountant, auditor |
| POST | `/api/accounting/periods` | owner, manager, accountant |
| POST | `/api/accounting/periods/:id/close` | owner, manager, accountant |

### Banking (8)
| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/accounting/banking/deposit` | owner, manager, accountant, cashier |
| POST | `/api/accounting/banking/withdraw` | owner, manager, accountant, cashier |
| POST | `/api/accounting/banking/transfer` | owner, manager, accountant |
| POST | `/api/accounting/banking/reconcile` | owner, manager, accountant |

### Reports (6)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/reports/trial-balance` | owner, manager, accountant, auditor |
| GET | `/api/accounting/reports/profit-loss` | owner, manager, accountant, auditor |
| GET | `/api/accounting/reports/balance-sheet` | owner, manager, accountant, auditor |
| GET | `/api/accounting/reports/cash-flow` | owner, manager, accountant, auditor |
| GET | `/api/accounting/reports/day-book` | owner, manager, accountant, auditor |

### Day Book (4)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/accounting/day-book` | owner, manager, accountant, auditor |
| GET | `/api/accounting/day-book/cash-book` | owner, manager, accountant, auditor |
| GET | `/api/accounting/day-book/bank-book` | owner, manager, accountant, auditor |

## File Structure

```
src/domains/accounting/
├── accounting.types.ts        # All domain types, enums, DTOs (60+ interfaces)
├── accounting.repository.ts   # SQLite implementation (60+ methods, 7 + 6 existing tables)
├── accounting.service.ts      # Business logic (9 service modules)
├── accounting.routes.ts       # REST API (65+ endpoints)
└── accounting.seed.ts         # Deterministic seed (46 accounts, 12 periods, 5 configs)

tests/accounting.test.ts       # 150+ test cases
```

## Financial Period Lifecycle

```
January 2026 (open) → February 2026 (open) → ... → December 2026 (open)
                                                          │
                                                    Year-End Close
                                                          │
                                          ┌───────────────┴───────────────┐
                                          │                               │
                                   Create Closing                Create Opening
                                   Entries:                      Entries:
                                   Dr Revenue 4.x                Dr Assets 1.x
                                   Cr P&L Summary                Cr Equity 3.x
                                   Dr P&L Summary
                                   Cr Expenses 5.x
                                   Dr P&L Summary (profit)
                                   Cr Retained Earnings
                                                          │
                                                   January 2027 (open)
```
