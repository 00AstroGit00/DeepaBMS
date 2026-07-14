# Transaction Boundaries

---

## Principles

1. **Atomic within a single aggregate**: All writes to an aggregate root and its owned entities must succeed or fail together.
2. **Eventual consistency across aggregates**: Cross-aggregate side-effects (e.g., Sale → contra Txn) use domain events.
3. **Local state first**: The mobile app writes to AsyncStorage immediately (optimistic), then syncs to server.
4. **Compensation over rollback**: Long-running operations (sync, payroll) use compensating transactions instead of distributed rollback.

---

## Atomic Operations (Single-Aggregate)

| Operation | Aggregate | Tables Involved | Mechanism |
|-----------|-----------|----------------|-----------|
| Create Sale | Sales | sales | Single INSERT |
| Create Txn | DayBook | txns | Single INSERT |
| Check-in | Hotel | rooms (UPDATE) | Single UPDATE |
| Check-out | Hotel | rooms (UPDATE), stays_archive (INSERT), sales (INSERT) | Sequential (event-driven) |
| Stock Move | Inventory | inventory_moves (INSERT), inventory (UPDATE stock) | Sequential in synchronous handler |
| Liquor Sell | Liquor | liquor (UPDATE), sales (INSERT) | Sequential |
| Credit Entry | Credit | credit_ledger (INSERT), credit_accounts (UPDATE balance) | Sequential |
| Bank Move | Banking | bank_moves (INSERT), bank_accounts (UPDATE balance) | Sequential |
| Mark Attendance | Employee | employee_attendance (INSERT OR REPLACE) | Single UPSERT |
| Process Payroll | Employee | employees (UPDATE balance), txns (INSERT) | Sequential batch |

All sequential operations above run within the same synchronous request handler. If the second operation fails, the first is not rolled back — manual correction is required. This is acceptable because:
- Operations are idempotent (duplicate-safety checks exist)
- Failures are rare (single-machine SQLite)
- Audit log captures partial state for recovery

---

## Eventual Consistency (Cross-Aggregate)

| Trigger | Primary Aggregate | Side Effect | Consistency Model |
|---------|------------------|-------------|-------------------|
| Sale created with `mode='credit'` | Sales | Contra Txn in DayBook | Event-driven (next tick) |
| Room check-out | Hotel | Sale record + Txn | Sequential within request |
| Liquor sale | Liquor | Sale record | Sequential within request |
| Salary processed | Employee (Payroll) | Txn in DayBook | Batch → Sequential |
| Advance given | Employee | Txn in DayBook | Sequential within request |
| Credit payment | Credit | Txn in DayBook | Sequential within request |
| Sync merge | Sync engine | All domains | LWW (Last-Writer-Wins) |

---

## Distributed Operations

Currently there are no distributed transactions. The architecture is single-SQLite-instance (backend) + single-AsyncStorage (client).

| Scenario | Current | Future |
|----------|---------|--------|
| Multi-device sync | LWW merge via master state file | Raft/CRDT for conflict-free merging |
| Bank reconciliation | Manual comparison | Two-phase verification |
| Payroll batch | Single-process computation | Saga pattern with compensation |

---

## Conflict Resolution

### Write-Write Conflicts
- **Source**: Two devices modify the same entity concurrently
- **Strategy**: Last-Writer-Wins (LWW) by timestamp
- **Implementation**: `mergeCollections()` compares `date || importedAt || createdAt` fields
- **Risk**: Data loss if two devices edit different fields of same entity simultaneously

### Read-Write Conflicts
- **Source**: User views stale data while another device syncs
- **Strategy**: Stale reads are acceptable (offline-first)
- **Mitigation**: Pull-to-refresh, periodic sync every 10s

### Constraint Violations
- **Unique keys**: Handled by SQLite unique constraints
- **Stock underflow**: Validated before write (`stock ≥ qty`)
- **Balance overdraft**: Validated before write (`balance ≥ amount`)

---

## Locking Strategy

| Granularity | Scope | Mechanism | Notes |
|-------------|-------|-----------|-------|
| Sync merge | File-level | In-memory Promise queue (`withSyncLock()`) | Serializes all sync requests |
| Stock move | Item-level | Validate-and-write in single handler | Reads stock, checks, then writes |
| Bank transfer | Account-level | Sequential writes (debit source, credit destination) | Atomic only within single process |
| Payroll | Employee-level | Processed one employee at a time | No distributed locking needed |

---

## Compensation Actions

| Operation | Compensation | Trigger | Auto/Manual |
|-----------|-------------|---------|-------------|
| Sync merge | Restore from `.bak` file | Corrupt state file detected | Automatic |
| Sale created | Create reversing sale entry | Void requested | Manual (manager approval) |
| Txn created | Create reversing Txn | Error in contra entry | Manual |
| Stock move | Create reverse stock move | Wrong qty entered | Manual |
| Payroll processed | Create reversing Txn + adjust advances | Overpayment | Manual |
| Bank move | Create reverse bank move | Wrong account/amount | Manual |

---

## Concurrency Handling

| Level | Risk | Mitigation |
|-------|------|------------|
| Single-user | None | Direct writes |
| Multi-device sync | LWW data loss | Timestamp-based conflict resolution |
| Batch operations (payroll) | Partial failure | Idempotent operations + audit trail |
| Report generation | Dirty reads | Snapshot isolation at app level (read current state) |

---

## Rollback Policy Summary

| Category | Rollback Support | Method |
|----------|-----------------|--------|
| Immutable records (Sale, Txn, Audit) | None | Append-only; create reversing entry instead |
| Stateful records (Room, InvItem, LiquorItem) | Manual | Reverse the operation (e.g., reverse stock move) |
| File-based state (Sync) | Automatic | `.bak` file recovery on corruption |
| Seed data | Idempotent | `SELECT COUNT(*)` check before insert |
| Configuration | Audit restore | Previous values logged before update |
