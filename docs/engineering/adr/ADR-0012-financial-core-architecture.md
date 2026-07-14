# ADR-0012: Financial Core Architecture

**Status**: Accepted (2026-07-13)

**Domain**: Accounting

**Applies to**: Backend (apps/backend)

---

## Context

The Financial Core is the canonical accounting subsystem for DeepaBMS. Every financial transaction from the five operational domains (Inventory, Purchasing, Restaurant, Bar, Hotel) must flow through the double-entry accounting engine.

The organization needs:
- Double-entry accounting with guaranteed balance (debits = credits)
- Chart of Accounts with hierarchical grouping
- Automatic posting from operational module events
- GST input/output tracking with multiple rates (5%, 12%, 18%, 28%)
- Kerala Excise (TOT) accounting for liquor transactions
- Banking operations (cash, bank, UPI, card, transfers, reconciliation)
- Financial reporting (Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book)
- Financial period management with month-end/year-end closing
- Future budgeting, fixed assets, and multi-company support

## Decision

### Aggregate Design

The Financial aggregate comprises 10 entities:

1. **ChartOfAccount** — Account master with hierarchical code, type classification, and tax rate
2. **FinancialPeriod** — Accounting period (monthly/quarterly/yearly) with open/close state
3. **JournalEntry** — Voucher header with type, date, reference, balanced totals
4. **JournalLine** — Individual debit/credit line tied to a Chart of Account
5. **AccountBalance** — Period balance snapshot (opening, period activity, closing)
6. **GstRegister** — Input/output GST tracking per transaction with rate classification
7. **AutoPostingConfig** — Configuration mapping operational events to journal accounts
8. **BankReconciliation** — Bank statement reconciliation tracking

### Chart of Accounts Design

The CoA uses a hierarchical numbering system compatible with Indian accounting standards:

| Range | Category | Examples |
|-------|----------|---------|
| 1.x.x | Assets | Cash, Bank, Receivables, Inventory, GST Input Credit |
| 2.x.x | Liabilities | Payables, GST Payable, TOT Payable, Loans |
| 3.x.x | Equity | Capital, Retained Earnings, Drawings |
| 4.x.x | Income | Room Revenue, Restaurant Revenue, Bar Revenue |
| 5.x.x | Expenses | COGS, Salaries, Rent, Utilities |

Each account has a 20-character code with dot-separated hierarchy (e.g., `1.1.1` for Cash in Hand). Group accounts (isGroup=true) serve as parent nodes and cannot receive journal postings directly.

### Double-Entry Engine

Every journal entry must satisfy:
- `debitTotal === creditTotal` (strictly balanced)
- All line accounts must exist and be active, non-group accounts
- Lines may reference external transactions via `referenceType`/`referenceId`
- On posting, `account_balances` are updated atomically
- Reversal creates a new journal with opposite debits/credits linked via `reversalOf`

### Auto-Posting Architecture

Operational domains trigger auto-posting through the Accounting API:

| Source Event | Debit | Credit | GST |
|-------------|-------|--------|-----|
| restaurant_sale | Cash/Bank | Restaurant Revenue | GST Payable |
| bar_sale | Cash/Bank | Bar Revenue | GST Payable + TOT Payable |
| hotel_check_out | Cash/Bank | Room Revenue | GST Payable |
| supplier_invoice | Inventory | Accounts Payable | GST Input Credit |
| purchase_order | Purchases | Accounts Payable | GST Input Credit |
| inventory_adjustment | Inventory (diff) | Adjustment Account | — |

Auto-posting configuration is stored in `auto_posting_config` and is extensible without code changes.

### GST Architecture

Kerala's GST structure:
- **Food (Restaurant)**: 5% GST (2.5% CGST + 2.5% SGST)
- **Rooms** (≤ ₹7,500): 5% GST
- **Rooms** (> ₹7,500): 12% GST (6% CGST + 6% SGST)
- **Liquor**: No GST (outside GST regime), replaced by Kerala TOT (Turnover Tax) at 10%
- **Other goods**: 12%, 18%, or 28% as applicable

GST is tracked in `gst_registers` with type (input/output), rate, taxable amount, and GST amount.

### Kerala Excise (TOT) Integration

Liquor transactions have special tax treatment:
- Bar sales post with TOT (Kerala Turnover Tax) at the configured rate from settings (default 10%)
- TOT is tracked as a separate liability account (`TOT Payable`)
- Excise registers are generated for daily/brand/bottle compliance
- Excise duties and permit fees are recorded as expense journals

### Banking Architecture

Bank operations create dual entries:
- **Deposit**: Receipt journal (debit Bank, credit Cash/Income) + bank_move record
- **Withdrawal**: Payment journal (debit Expense/Payable, credit Bank) + bank_move record
- **Transfer**: Contra journal (debit To-Bank, credit From-Bank) + 2 bank_move records
- **Reconciliation**: Compare system balance vs statement balance, flag discrepancies

### Period Closing

End-of-period workflow:
1. Verify all journals in period are posted (no drafts)
2. Calculate final period balances for all accounts
3. Close period (set isClosed=true, isOpen=false)
4. Year-end: Create closing entries (transfer income/expense balances to Retained Earnings)
5. Create opening entries for the next period with closing balances as opening

## Consequences

### Positive
- **Canonical accounting**: Every financial transaction flows through one system
- **Guaranteed accuracy**: Double-entry balance check prevents errors
- **Audit trail**: Every journal is reversible and traceable to source
- **GST compliance**: Built-in input/output tracking with rate classification
- **Tax-ready**: Architecture supports GSTR-1 and GSTR-3B data extraction
- **Extensible**: Auto-posting config can be extended for new operational modules

### Negative
- **Commitment to double-entry**: Every operational event now generates at least one journal entry
- **Performance**: Each sale creates a journal entry + GST record + balance update
- **Complexity**: Year-end closing involves multiple steps and validation

### Trade-offs
- **Auto-posting config vs code**: Config-driven auto-posting is flexible but limited to simple debit/credit pairs; complex multi-line journals require code
- **Balance snapshot vs real-time**: Period-based balance snapshots (account_balances) are efficient for reporting but may diverge if journals are posted to closed periods
- **Single vs multi-company**: Current design supports one legal entity; multi-company would require tenant isolation

## Future Roadmap

1. **Budgeting**: Department and account-level budget tracking vs actuals
2. **Fixed Assets**: Depreciation schedules, asset registers
3. **Multi-Company**: Tenant-isolated chart of accounts and journals
4. **E-Invoicing**: Invoice Registration Portal (IRP) integration for B2B GST invoices
5. **Tax Filing Automation**: Auto-populate GSTR-1/GSTR-3B for filing
6. **Cost Centers**: Department-level profit and loss analysis
7. **Consolidation**: Multi-branch financial consolidation
