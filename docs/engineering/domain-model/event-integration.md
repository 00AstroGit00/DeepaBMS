# Domain Events & Integration Architecture

---

## Current State (Gen 1)

Events are dispatched synchronously through the global state reducer. When a user action triggers a state change, the reducer computes the new state immediately and React re-renders.

```
User Action → dispatch(Action) → rootReducer → new GlobalState → re-render UI
                                                    │
                                            AsyncStorage.write()
                                                    │
                                            SyncEngine.merge() (debounced)
```

**Limitations**:
- No event persistence (replayed on app start from AsyncStorage)
- No cross-domain event bus
- Side effects (contra Txn, stock updates) are coupled in the same reducer
- Sync is the only "integration" — no webhook, no external API

---

## Target State (Gen 2 — Internal Event Bus)

```
User Action → dispatch(Action) → rootReducer → new GlobalState
                                                    │
                                            Event Bus (in-process)
                                                    │
                    ┌───────────────────────────────┼─────────────────┐
                    │                               │                 │
                    ▼                               ▼                 ▼
            [Cross-domain          [Sync Engine]           [Audit Logger]
             side-effects]                                  [Notification]
            (contra Txn, stock
             update, etc.)
```

### Event Bus Contract

```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  data: Record<string, unknown>;
  correlationId?: string;
}

type EventHandler = (event: DomainEvent) => Promise<void>;

interface EventBus {
  publish(event: DomainEvent): void;
  subscribe(eventType: string, handler: EventHandler): void;
  subscribeAll(handler: EventHandler): void;  // For audit + sync
}
```

---

## Gen 3 — Message Queue (Future)

```
[React Native App] ←→ [Sync Engine] ←→ [Express API]
                                            │
                                    [Message Queue (Kafka/RabbitMQ)]
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            [Backup Service]      [Notification Service]    [Analytics Pipeline]
            [Bank Reconciliation]   [External Integrations]   [GSTR-1 Export]
```

---

## Publishers and Subscribers Matrix

| Event | Publisher | Subscribers | Triggered By |
|-------|-----------|-------------|-------------|
| `SALE_CREATED` | Sales | DayBook (contra), Analytics, Sync, Audit | Sale creation |
| `SALE_VOIDED` | Sales | DayBook (reverse contra), Inventory (reverse stock), Analytics, Sync | Void action |
| `TXN_CREATED` | DayBook | Banking (if bank mode), Analytics, Sync | Transaction creation |
| `ROOM_CHECKED_IN` | Hotel | Sales (future room charges), Sync | Check-in action |
| `ROOM_CHECKED_OUT` | Hotel | Stay archive, Sales (bill created), Sync | Check-out action |
| `STOCK_IN` | Inventory | Purchasing (PO fulfillment), Sync, Cost Calculation | Stock receipt |
| `STOCK_OUT` | Inventory | Cost Calculation, Sync | Kitchen issue |
| `STOCK_WASTAGE` | Inventory | Cost Calculation, Sync | Spoilage recording |
| `STOCK_REORDER_TRIGGERED` | Inventory | Notifications, Purchasing | Stock ≤ reorder level |
| `LIQUOR_PURCHASED` | Liquor | DayBook (Txn), Sync, Excise compliance | BEVCO purchase |
| `BOTTLE_SOLD` | Liquor | Sales (Sale), Sync | Bottle sale |
| `PEG_SOLD` | Liquor | Sales (Sale), Sync | Peg sale |
| `LIQUOR_AUDIT_COMPLETED` | Liquor | Sync, Excise compliance | Physical audit |
| `CREDIT_EXTENDED` | Credit | DayBook (contra Txn), Sync | Credit sale |
| `PAYMENT_RECEIVED` | Credit | DayBook (contra Txn), Banking, Sync | Payment |
| `DEPOSIT_MADE` | Banking | DayBook (contra), Sync | Bank deposit |
| `WITHDRAWAL_MADE` | Banking | DayBook (contra), Sync | Bank withdrawal |
| `TRANSFER_COMPLETED` | Banking | DayBook, Sync | Bank transfer |
| `EMPLOYEE_HIRED` | Employee | Sync | Employee creation |
| `EMPLOYEE_TERMINATED` | Employee | Sync, Payroll, Attendance | Deactivation |
| `ATTENDANCE_MARKED` | Employee | Payroll, Sync | Attendance entry |
| `ADVANCE_GIVEN` | Employee | DayBook (Txn), Payroll, Sync | Advance payment |
| `LEAVE_REQUESTED` | Employee | Notifications (to manager), Sync | Leave application |
| `LEAVE_DECIDED` | Employee | Notifications (to employee), Sync | Approval/rejection |
| `SALARY_PROCESSED` | Payroll | DayBook (Txn), Employee, Sync | Payroll run |
| `SETTINGS_UPDATED` | Configuration | All domains (via re-read), Sync | Settings change |
| `SYNC_COMPLETED` | Sync | All domains (state update) | Sync merge |
| `AUDIT_EVENT_CREATED` | All domains | Sync | Any auditable action |

---

## External Integrations (Future)

| Integration | Direction | Protocol | Events |
|------------|-----------|----------|--------|
| GSTR-1 Filing | Export | REST / CSV | Bulk export on demand |
| E-way Bill Generation | Export | REST | On sale creation (if applicable) |
| BEVCO Order API | Import | REST | Purchase orders |
| Bank Statement Import | Import | CSV | Statement upload |
| SMS Alerts | Export | SMS API | On critical events |
| WhatsApp Invoices | Export | WhatsApp API | On bill payment |
| Zomato/Swiggy | Import | REST API | Online orders (future) |
| POS Terminal | Bidirectional | Serial/Bluetooth | KOT printing, billing |

---

## Event Serialization

```typescript
interface StoredEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  data: string; // JSON-serialized
  correlationId: string;
  publishedAt: string;
}
```

**Storage**: Future `domain_events` table in SQLite. Events retained for 90 days.

---

## Compliance Events

Kerala Excise requires:
- Daily liquor sales register
- Monthly stock statement
- Quarterly audit reports

These are generated by the Reporting Engine using the event stream. For compliance, the following events are **permanently retained**:
- `LIQUOR_PURCHASED`
- `BOTTLE_SOLD`
- `PEG_SOLD`
- `LIQUOR_AUDIT_COMPLETED`
- All AuditEvents with action matching `*LIQUOR*` or `*EXCISE*`
