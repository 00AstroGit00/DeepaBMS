# Aggregate Catalogue

## Aggregate Root Identification

An aggregate root is the consistency boundary for a set of domain entities. All external references go through the root.

---

## AR-01: Sales Aggregate

**Root Entity**: Sale
**Owned Entities**: None (flat)

**Invariants**:
- `total = amount + gst_amount`
- `total ≥ 0`
- `gst_amount = round(amount * gst_rate / 100)`
- Contra `Txn` exists if `mode = 'credit'` (future)

**Persistence**: Single table (`sales`)

**Consistency Boundary**: Single document — all sale fields are written atomically.

---

## AR-02: DayBook Aggregate

**Root Entity**: Txn
**Owned Entities**: AttachmentMeta (embedded)

**Invariants**:
- `amount > 0`
- `bank_id` required when `mode = 'bank'`
- Contra transaction (income/expense pairing) must balance to zero

**Persistence**: Single table (`txns`)

**Consistency Boundary**: Single document.

---

## AR-03: Hotel Aggregate

**Root Entity**: Room
**Owned Entities**: Guest (embedded value object)

**Invariants**:
- Only one guest per room at a time
- Room cannot be occupied if status is `cleaning`
- Check-out creates: `Stay` archive + `Sale` room bill + sets room to `cleaning`
- `rate` is per-night; total computed from `nights * rate`

**Persistence**: `rooms` table (current state) + `stays_archive` table (historical)

**Consistency Boundary**: A check-out must atomically: archive stay → create sale → clear guest → set status cleaning.

---

## AR-04: Inventory Aggregate

**Root Entity**: InvItem
**Owned Entities**: StockMove (child references via FK)

**Invariants**:
- `stock ≥ 0` at all times
- Stock move `'out'` or `'wastage'` must not exceed available stock
- `stock = sum(in_qty) - sum(out_qty) - sum(wastage_qty)`

**Persistence**: `inventory` table + `inventory_moves` table

**Consistency Boundary**: Stock move must atomically: create StockMove record → update InvItem.stock.

---

## AR-05: Liquor Aggregate

**Root Entity**: LiquorItem
**Owned Entities**: None (LiquorAudit references by brand/size, not FK)

**Invariants**:
- `full_bottles ≥ 0` and `loose_ml ≥ 0`
- Each bottle = `size_ml` of loose stock
- Total stock (ml) = `full_bottles * size_ml + loose_ml`
- Peg sale reduces loose_ml; bottle sale reduces full_bottles
- Purchase increases full_bottles

**Persistence**: `liquor` table + `liquor_audits` table (audit is separate aggregate)

**Consistency Boundary**: Sell/purchase must atomically: update LiquorItem stock → create Sale record (optional).

---

## AR-06: LiquorAudit Aggregate

**Root Entity**: LiquorAudit
**Owned Entities**: None

**Invariants**:
- `difference_ml = actual_loose_ml - expected_loose_ml + (actual_bottles - expected_bottles) * size_ml`
- Audit is a snapshot; does not modify LiquorItem stock
- Positive difference = surplus; negative = shortage

**Persistence**: `liquor_audits` table

**Consistency Boundary**: Single record (append-only).

---

## AR-07: Credit Aggregate

**Root Entity**: CreditAccount
**Owned Entities**: CreditHistoryItem (embedded)

**Invariants**:
- `balance = sum(credit) - sum(payment)` (credit increases balance, payment decreases)
- `balance ≥ 0` (debt cannot exceed credit given)
- Credit entry can optionally create a contra `Txn`

**Persistence**: `credit_accounts` table + `credit_ledger` table

**Consistency Boundary**: Credit entry must atomically: create CreditHistoryItem → update CreditAccount.balance → (optionally) create Txn.

---

## AR-08: Banking Aggregate

**Root Entity**: BankAccount
**Owned Entities**: BankMove (child references via FK)

**Invariants**:
- `balance = sum(deposits) - sum(withdrawals) + sum(incoming transfers) - sum(outgoing transfers)`
- Transfer must debit source account and credit destination atomically
- Withdrawals must not exceed balance

**Persistence**: `bank_accounts` table + `bank_moves` table

**Consistency Boundary**: Bank move must atomically: create BankMove → update BankAccount.balance (and destination for transfers).

---

## AR-09: BankStatement Aggregate

**Root Entity**: BankStatement
**Owned Entities**: BankStatementRow (embedded)

**Invariants**:
- `opening_balance + total_credit - total_debit = closing_balance`
- Statement import is idempotent (same file + bank_id → skip)
- Rows are compared to BankMoves for reconciliation (future)

**Persistence**: `bank_statements` (future table, currently in-memory JSON)

**Consistency Boundary**: Single document.

---

## AR-10: Employee Aggregate

**Root Entity**: Employee
**Owned Entities**: EmployeeAttendance, LeaveRequest, EmployeeAdvance, EmployeeReview, EmployeeDocument (all child FKs)

**Invariants**:
- Salary ≥ 0
- Advance total cannot exceed 3 months' salary (business rule)
- Leave balance >= 0 (cannot overdraw)
- Attendance status must be one of {P, H, A, L}
- Leave dates cannot overlap with existing approved leaves
- Inactive employees cannot request leave or receive advances

**Persistence**: `employees` + `employee_attendance` + `employee_leaves` + `employee_advances` + `employee_reviews` + `employee_documents`

**Consistency Boundary**: Complex — each sub-entity has its own consistency boundary due to separate tables. The Employee aggregate enforces cross-entity rules (advance limit, leave balance).

---

## AR-11: Announcement Aggregate

**Root Entity**: Announcement

**Invariants**: None structural.

**Persistence**: `announcements` (future table, currently in-memory JSON)

---

## AR-12: Configuration Aggregate

**Root Entity**: GeneralSettings (singleton)

**Invariants**:
- GSTIN format: `\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}`
- opening_cash ≥ 0
- PIN must be 4+ digits

**Persistence**: `settings` table

**Consistency Boundary**: Single document.

---

## AR-13: Audit Aggregate

**Root Entity**: AuditEvent

**Invariants**: None — append-only log

**Persistence**: `security_audit_log` table

**Consistency Boundary**: Single record.

---

## Aggregate Relationship Map

```
Sales ──contra── DayBook
Hotel ──checkout── Sales (creates Sale)
Hotel ──checkout── DayBook (creates Txn contra, optional)
Liquor ──sell── Sales (creates Sale)
Credit ──entry── DayBook (optionally creates Txn)
Banking ──reconcile── BankStatement (future)
Employee ──pay── DayBook (salary payment creates Txn)

Auth ──audits──> Audit (all aggregates audit events)
```

## Aggregate Size Classification

| Aggregate | Entities | Complexity | Notes |
|-----------|----------|------------|-------|
| Sales | 1 | Low | Flat, no children |
| DayBook | 1 | Low | Flat, no children |
| Hotel | 1 + VO | Medium | Check-out spans 2 tables + Sale creation |
| Inventory | 1 + FK | Medium | Stock move + stock update must be atomic |
| Liquor | 1 | Medium | Sell/purchase affects 2+ aggregates (liquor + sales) |
| LiquorAudit | 1 | Low | Append-only snapshot |
| Credit | 1 + FK | Medium | Entry affects balance + optionally Txn |
| Banking | 1 + FK | Medium | Transfer spans 2 accounts |
| BankStatement | 1 + embedded | Low | Import/remove only |
| Employee | 1 + 5 FK | High | Largest aggregate, multiple sub-entities |
| Announcement | 1 | Low | Simple CRUD |
| Configuration | 1 | Low | Singleton |
| Audit | 1 | Low | Append-only |
