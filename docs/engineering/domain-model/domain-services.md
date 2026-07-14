# Domain Service Catalogue

Services encapsulate stateless operations that don't naturally belong to a single entity or aggregate.

---

## DS-01: Cost Calculation Service

**Purpose**: Computes weighted-average cost of inventory items after each purchase.

**Why a service**: Cost calculation spans `StockMove` and `InvItem` aggregates. It requires reading historical purchase prices and computing a running average.

**Operations**:
- `calculateAverageCost(itemId: string, newQty: number, newCost: number): number`
- `getCurrentCost(itemId: string): number`

---

## DS-02: GST Calculator

**Purpose**: Computes GST amounts, maintains tax slabs, generates GSTR-1 export data.

**Why a service**: GST rules are external to business entities. Tax rates change by government notification and apply uniformly across domains.

**Operations**:
- `computeGST(amount: number, rate: number): { gstAmount: number, total: number }`
- `getGSTR1Data(fromDate: string, toDate: string): GSTR1Export`
- `validateGSTIN(gstin: string): boolean`
- `getActiveTaxSlab(dept: string): number`

**Tax Slabs**:

| Department | Rate | HSN/SAC | Notes |
|------------|------|---------|-------|
| Restaurant | 5% | 9963 | Food (≤₹1000: 0% GST, >₹1000: 5%) |
| Bar | 0% | — | Kerala Turnover Tax applies instead |
| Takeaway | 5% | 9963 | Same as restaurant |
| Online | 5% | 9963 | Swiggy/Zomato bills |
| Rooms | 5% | 9963 | Tariff < ₹7500/night (12% if >₹7500) |

---

## DS-03: Kerala Excise Calculator

**Purpose**: Computes liquor turnover tax (KGST), generates excise returns for Kerala ABK department.

**Why a service**: Kerala has unique excise regulations. IMFL, Beer, Wine, and Foreign liquor have different tax treatments.

**Operations**:
- `computeExciseDuty(brand: string, quantity: number, sizeML: number): number`
- `getExciseReturnData(fromDate: string, toDate: string): ExciseReport`
- `validateExciseCompliance(liquorAudit: LiquorAudit): ComplianceResult`

**Tax Structure**:

| Category | Turnover Tax | Additional |
|----------|-------------|------------|
| IMFL | 10% | VAT applicable |
| Beer | 5% | — |
| Wine | 5% | — |
| Foreign | 15% | Customs duty already included |

---

## DS-04: Pricing Engine

**Purpose**: Computes selling prices for inventory items and liquor based on cost + margin.

**Why a service**: Pricing logic (margin calculation, bulk discounts, dynamic pricing) is a cross-cutting concern that changes independently of inventory or sales.

**Operations**:
- `calculateSellingPrice(cost: number, marginPercent: number): number`
- `calculatePegPrice(bottleCost: number, sizeML: number, pegTarget: number): number`
- `applyBulkDiscount(unitPrice: number, quantity: number): number`

---

## DS-05: Discount Engine

**Purpose**: Applies business rules for discounts (festival, staff, loyalty).

**Why a service**: Discount rules are business policies, not entity behavior. They change seasonally and per-owner discretion.

**Operations**:
- `isEligibleForDiscount(user: User, saleAmount: number): boolean`
- `computeDiscount(saleAmount: number, discountType: string): number`
- `validateDiscountLimit(discountPercent: number): boolean`

---

## DS-06: Payroll Engine

**Purpose**: Computes monthly payroll for all employees.

**Why a service**: Payroll computation spans Employee, Attendance, Leave, and Advance aggregates. It requires complex business logic (pro-rata, deductions, bonus).

**Operations**:
- `computeMonthlyPayroll(month: string, year: number): PayrollRun[]`
- `calculateGrossPay(emp: Employee, month: string, year: number): number`
- `calculateDeductions(emp: Employee, grossPay: number): Deductions`
- `calculateNetPay(emp: Employee, month: string, year: number): number`
- `getPayslip(empId: string, month: string, year: string): Payslip`

**Payroll Formula**:
```
basePay = monthlySalary
attendanceDeduction = (absentDays / workingDays) * basePay
leaveDeduction = (unpaidLeaveDays / workingDays) * basePay
advanceRecovery = sum(advances given in month)
grossPay = basePay - attendanceDeduction - leaveDeduction
netPay = grossPay - advanceRecovery
```

---

## DS-07: Reservation Engine

**Purpose**: Manages room reservations, availability checks, booking conflicts.

**Why a service**: Reservation logic crosses Room and Stay aggregates. Availability checking requires querying current state + future reservations.

**Operations**:
- `checkAvailability(category: string, checkIn: Date, checkOut: Date): Room[]`
- `createReservation(guest: Guest, room: Room, dates: DateRange): Reservation`
- `cancelReservation(reservationId: string): void`
- `computeStayCost(room: Room, nights: number): number`

---

## DS-08: Reporting Engine

**Purpose**: Generates business reports from multiple aggregates.

**Why a service**: Reports aggregate data across all domains. They are read-only, complex queries that don't modify state.

**Operations**:
- `getDayBookReport(date: string): DayBookReport`
- `getSalesSummary(fromDate: string, toDate: string, dept?: string): SalesSummary`
- `getP&LReport(fromDate: string, toDate: string): PnLReport`
- `getGSTSummary(fromDate: string, toDate: string): GstSummary`
- `getLiquorReport(fromDate: string, toDate: string): LiquorReport`
- `getEmployeeCostReport(month: string, year: number): EmployeeCostReport`

---

## DS-09: Synchronization Engine

**Purpose**: Merges client and server state using LWW strategy.

**Why a service**: Sync spans ALL aggregates. Merge strategy (LWW vs CRDT) is a cross-cutting concern.

**Operations**:
- `mergeState(localState: GlobalState, remoteState: GlobalState): GlobalState`
- `resolveConflicts(localEntries: any[], remoteEntries: any[]): any[]`
- `validateSyncPayload(state: GlobalState): ValidationResult`

---

## DS-10: Notification Engine

**Purpose**: Triggers alerts for stock reorder, leave approval, announcements.

**Why a service**: Notifications span multiple domains. The trigger conditions and delivery channels change independently.

**Operations**:
- `sendAnnouncement(announcement: Announcement): void`
- `notifyStockReorder(items: InvItem[]): void`
- `notifyLeaveStatus(leave: LeaveRequest): void`
- `notifyLowBalance(bankAccount: BankAccount): void`

**Trigger Matrix**:

| Event | Notification | Channel | Recipients |
|-------|-------------|---------|------------|
| STOCK_REORDER_TRIGGERED | "Chicken below reorder level" | In-app | fnb, manager |
| LEAVE_REQUESTED | "Ajith requested sick leave" | In-app | manager |
| LEAVE_DECIDED | "Leave approved" | In-app | Employee |
| LOW_BANK_BALANCE | "HDFC balance below ₹10,000" | In-app | owner, manager |

---

## DS-11: Backup Engine

**Purpose**: Creates automated backups of SQLite database and sync state file.

**Why a service**: Backup is an infrastructure concern independent of business domains.

**Operations**:
- `createDatabaseBackup(): string` — returns backup file path
- `restoreFromBackup(backupId?: string): void`
- `cleanupOldBackups(retentionDays: number): void`

**Backup Schedule**:
- **Frequency**: Every 6 hours in production
- **Retention**: 7 daily backups, 4 weekly
- **Storage**: `apps/backend/backups/` directory
- **S3 Sync** (future): Automated upload to S3-compatible storage

---

## DS-12: Bank Reconciliation Service (Future)

**Purpose**: Matches bank statement rows against BankMoves to identify discrepancies.

**Why a service**: Reconciliation logic is complex (fuzzy date matching, amount matching, reference number matching) and spans BankMove and BankStatement aggregates.

**Operations**:
- `reconcile(statementId: string): ReconciliationResult`
- `getUnmatchedEntries(statementId: string): UnmatchedEntry[]`
- `suggestMatch(bankMove: BankMove, statementRow: BankStatementRow): number`

---

## Service Dependency Graph

```
GST Calculator ──depends on── Configuration (tax rates)
Excise Calculator ──depends on── Configuration (tax rates)
Payroll Engine ──depends on── Employee, Attendance, Leave, Advance
Reporting Engine ──depends on── ALL domains (read-only)
Sync Engine ──depends on── ALL domains (merge)
Pricing Engine ──depends on── Inventory, Liquor (cost data)
Reservation Engine ──depends on── Room, Stay
Backup Engine ──depends on── SQLite, Filesystem
Notification Engine ──depends on── Inventory, Employee, Announcement
Cost Calculation ──depends on── Inventory
Discount Engine ──depends on── User, Sale
Bank Reconciliation ──depends on── Banking, BankStatement
```
