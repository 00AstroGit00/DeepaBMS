# Repository Contracts

Repository interfaces separate persistence logic from business logic. All repositories follow the same pattern.

---

## Repository Pattern

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Business Logic  │────→│  Repository Contract  │────→│  Persistence  │
│  (Domain)       │     │  (Interface)          │     │  (SQLite/SQL) │
└─────────────────┘     └──────────────────────┘     └──────────────┘
```

### Conventions
- **Reads**: Return domain types (never raw rows)
- **Writes**: Accept domain types, return written entity
- **Queries**: Method names describe intent, not SQL
- **Commands**: Method names describe action
- **Pagination**: All list queries accept `{ offset, limit }` or cursor

---

## Contract: IUserRepository

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  findAllActive(): Promise<User[]>;
  findByRole(role: Role): Promise<User[]>;
  create(user: CreateUserDto): Promise<User>;
  update(id: string, changes: Partial<User>): Promise<User>;
  deactivate(id: string): Promise<void>;
  count(): Promise<number>;
}
```

---

## Contract: ISaleRepository

```typescript
interface ISaleRepository {
  findById(id: string): Promise<Sale | null>;
  findByDateRange(from: string, to: string): Promise<Sale[]>;
  findByDept(dept: Dept): Promise<Sale[]>;
  findByBillNo(billNo: string): Promise<Sale | null>;
  findAll(options: { offset?: number; limit?: number; orderBy?: string; orderDir?: 'ASC' | 'DESC' }): Promise<Sale[]>;
  create(sale: CreateSaleDto): Promise<Sale>;
  getTotalByDate(date: string): Promise<{ total: number; count: number }>;
  getSummaryByDept(from: string, to: string): Promise<DeptSummary[]>;
}
```

---

## Contract: ITxnRepository

```typescript
interface ITxnRepository {
  findById(id: string): Promise<Txn | null>;
  findByDateRange(from: string, to: string): Promise<Txn[]>;
  findByKind(kind: TxnKind): Promise<Txn[]>;
  findByCategory(category: string): Promise<Txn[]>;
  findByBankId(bankId: string): Promise<Txn[]>;
  findAll(options: QueryOptions): Promise<Txn[]>;
  create(txn: CreateTxnDto): Promise<Txn>;
  getTotalExpensesByCategory(from: string, to: string): Promise<CategoryTotal[]>;
  getTotalIncomeByCategory(from: string, to: string): Promise<CategoryTotal[]>;
}
```

---

## Contract: IRoomRepository

```typescript
interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  findByRoomNo(roomNo: string): Promise<Room | null>;
  findByStatus(status: RoomStatus): Promise<Room[]>;
  findAll(): Promise<Room[]>;
  update(id: string, changes: Partial<Room>): Promise<Room>;
  checkIn(id: string, guest: Guest): Promise<Room>;
  checkOut(id: string): Promise<{ room: Room; stay: Stay }>;
  setStatus(id: string, status: RoomStatus): Promise<Room>;
}
```

---

## Contract: IStayRepository

```typescript
interface IStayRepository {
  findById(id: string): Promise<Stay | null>;
  findByRoomNo(roomNo: string): Promise<Stay[]>;
  findByGuestName(name: string): Promise<Stay[]>;
  findByDateRange(from: string, to: string): Promise<Stay[]>;
  findAll(options: QueryOptions): Promise<Stay[]>;
  create(stay: CreateStayDto): Promise<Stay>;
  getOccupancyReport(from: string, to: string): Promise<OccupancyReport>;
}
```

---

## Contract: IInventoryRepository

```typescript
interface IInventoryRepository {
  findById(id: string): Promise<InvItem | null>;
  findByName(name: string): Promise<InvItem | null>;
  findByCategory(category: InvCategory): Promise<InvItem[]>;
  findAll(): Promise<InvItem[]>;
  findBelowReorder(): Promise<InvItem[]>;
  create(item: CreateInvItemDto): Promise<InvItem>;
  update(id: string, changes: Partial<InvItem>): Promise<InvItem>;
  adjustStock(id: string, delta: number): Promise<InvItem>;
}
```

---

## Contract: IStockMoveRepository

```typescript
interface IStockMoveRepository {
  findById(id: string): Promise<StockMove | null>;
  findByItemId(itemId: string): Promise<StockMove[]>;
  findByDateRange(from: string, to: string): Promise<StockMove[]>;
  findByKind(kind: MoveKind): Promise<StockMove[]>;
  findAll(options: QueryOptions): Promise<StockMove[]>;
  create(move: CreateStockMoveDto): Promise<StockMove>;
  getWastageByItem(from: string, to: string): Promise<WastageSummary[]>;
}
```

---

## Contract: ILiquorRepository

```typescript
interface ILiquorRepository {
  findById(id: string): Promise<LiquorItem | null>;
  findByBrand(brand: string): Promise<LiquorItem | null>;
  findByCategory(category: LiquorCategory): Promise<LiquorItem[]>;
  findAll(): Promise<LiquorItem[]>;
  create(item: CreateLiquorItemDto): Promise<LiquorItem>;
  update(id: string, changes: Partial<LiquorItem>): Promise<LiquorItem>;
  sellPeg(id: string, pegs: number): Promise<LiquorItem>;
  sellBottle(id: string): Promise<LiquorItem>;
  purchase(id: string, bottles: number, cost?: number): Promise<LiquorItem>;
}
```

---

## Contract: ILiquorAuditRepository

```typescript
interface ILiquorAuditRepository {
  findById(id: string): Promise<LiquorAudit | null>;
  findByBrand(brand: string): Promise<LiquorAudit[]>;
  findByDateRange(from: string, to: string): Promise<LiquorAudit[]>;
  findAll(options: QueryOptions): Promise<LiquorAudit[]>;
  create(audit: CreateLiquorAuditDto): Promise<LiquorAudit>;
}
```

---

## Contract: ICreditRepository

```typescript
interface ICreditRepository {
  findById(id: string): Promise<CreditAccount | null>;
  findByName(name: string): Promise<CreditAccount | null>;
  findByType(type: CreditAccountType): Promise<CreditAccount[]>;
  findAll(): Promise<CreditAccount[]>;
  create(account: CreateCreditAccountDto): Promise<CreditAccount>;
  update(id: string, changes: Partial<CreditAccount>): Promise<CreditAccount>;
  addEntry(accountId: string, entry: CreateCreditEntryDto): Promise<CreditAccount>;
  getBalance(accountId: string): Promise<number>;
}
```

---

## Contract: IBankAccountRepository

```typescript
interface IBankAccountRepository {
  findById(id: string): Promise<BankAccount | null>;
  findByName(name: string): Promise<BankAccount | null>;
  findAll(): Promise<BankAccount[]>;
  create(account: CreateBankAccountDto): Promise<BankAccount>;
  update(id: string, changes: Partial<BankAccount>): Promise<BankAccount>;
  adjustBalance(id: string, delta: number): Promise<BankAccount>;
}
```

---

## Contract: IBankMoveRepository

```typescript
interface IBankMoveRepository {
  findById(id: string): Promise<BankMove | null>;
  findByBankId(bankId: string): Promise<BankMove[]>;
  findByDateRange(from: string, to: string): Promise<BankMove[]>;
  findByKind(kind: MoveKind): Promise<BankMove[]>;
  findAll(options: QueryOptions): Promise<BankMove[]>;
  create(move: CreateBankMoveDto): Promise<BankMove>;
  createTransfer(move: CreateBankMoveDto): Promise<[BankMove, BankMove]>;
}
```

---

## Contract: IEmployeeRepository

```typescript
interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByName(name: string): Promise<Employee | null>;
  findByStatus(status: EmpStatus): Promise<Employee[]>;
  findByAccess(access: EmpAccess): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(emp: CreateEmployeeDto): Promise<Employee>;
  update(id: string, changes: Partial<Employee>): Promise<Employee>;
  deactivate(id: string): Promise<void>;
  
  // Sub-entities
  getAttendance(empId: string, from: string, to: string): Promise<AttendanceRecord[]>;
  upsertAttendance(empId: string, date: string, status: AttendStatus): Promise<void>;
  bulkUpsertAttendance(entries: { empId: string; date: string; status: AttendStatus }[]): Promise<void>;
  
  getLeaves(empId: string): Promise<LeaveRequest[]>;
  createLeave(leave: CreateLeaveDto): Promise<LeaveRequest>;
  decideLeave(id: string, status: 'approved' | 'rejected'): Promise<LeaveRequest>;
  
  getAdvances(empId: string): Promise<EmployeeAdvance[]>;
  createAdvance(advance: CreateAdvanceDto): Promise<EmployeeAdvance>;
  
  getReviews(empId: string): Promise<EmployeeReview[]>;
  createReview(review: CreateReviewDto): Promise<EmployeeReview>;
  
  getDocuments(empId: string): Promise<EmployeeDocument[]>;
  addDocument(doc: CreateDocumentDto): Promise<EmployeeDocument>;
  removeDocument(empId: string, docId: string): Promise<void>;
  
  getPayrollSummary(from: string, to: string): Promise<PayrollSummary>;
}
```

---

## Contract: IAuditRepository

```typescript
interface IAuditRepository {
  findById(id: string): Promise<AuditEvent | null>;
  findByUserId(userId: string): Promise<AuditEvent[]>;
  findByDateRange(from: string, to: string): Promise<AuditEvent[]>;
  findByAction(action: string): Promise<AuditEvent[]>;
  findAll(options: QueryOptions): Promise<AuditEvent[]>;
  create(event: CreateAuditEventDto): Promise<AuditEvent>;
  pruneOlderThan(date: string): Promise<number>; // Archives old events, returns count
}
```

---

## Contract: IConfigurationRepository

```typescript
interface IConfigurationRepository {
  get(): Promise<GeneralSettings>;
  update(changes: Partial<GeneralSettings>): Promise<GeneralSettings>;
  getTaxRate(dept: Dept): Promise<number>;
  getBusinessInfo(): Promise<{ name: string; gstin: string; place: string }>;
}
```

---

## Contract: ISyncRepository

```typescript
interface ISyncRepository {
  getMasterState(): Promise<GlobalState | null>;
  saveMasterState(state: GlobalState): Promise<void>;
  getLastSyncTime(deviceId: string): Promise<string | null>;
  recordSyncSession(session: SyncSession): Promise<void>;
}
```

---

## Reporting Repositories (Read-Only)

```typescript
interface IReportingRepository {
  getDayBookReport(date: string): Promise<DayBookReport>;
  getSalesSummary(from: string, to: string, dept?: Dept): Promise<SalesSummary>;
  getPnLReport(from: string, to: string): Promise<PnLReport>;
  getGSTSummary(from: string, to: string): Promise<GstSummary>;
  getLiquorReport(from: string, to: string): Promise<LiquorReport>;
  getOccupancyReport(from: string, to: string): Promise<OccupancyReport>;
  getEmployeeCostReport(month: string, year: number): Promise<EmployeeCostReport>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
}
```

---

## Generic QueryOptions

```typescript
interface QueryOptions {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  fromDate?: string;
  toDate?: string;
}
```

---

## Implementation Guideline

```
apps/backend/src/domains/<name>/
├── <name>.routes.ts           # Route handlers (existing)
├── <name>.repository.ts       # SQLite implementation of repository contract
└── <name>.service.ts          # Domain service (optional, for complex logic)
```

- Every repository implementation must accept the database connection in its constructor
- Repository implementations live in `src/domains/<name>/`, co-located with routes
- Cross-domain queries (reporting) live in a separate `src/domains/reporting/` module
- No raw SQL queries in route handlers — all persistence through repository methods
