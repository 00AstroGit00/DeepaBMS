# Business Event Catalogue

Every event that changes system state. Events are ordered by domain.

---

## Auth / Identity Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `USER_CREATED` | Admin adds user | Auth domain | Audit, Sync | user_id, role |
| `USER_UPDATED` | Admin edits user | Auth domain | Audit, Sync | user_id, changed fields |
| `USER_DEACTIVATED` | Admin deactivates user | Auth domain | Audit, Sync | user_id |
| `LOGIN_SUCCESS` | PIN validated | Auth domain | Audit | user_id, device_id |
| `LOGIN_FAILURE` | Invalid PIN | Auth domain | Audit | ip_address, attempt_count |

---

## Sales Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `SALE_CREATED` | New sale recorded | Sales domain | DayBook (contra), Analytics, Sync, Audit | sale_id, dept, amount, mode |
| `SALE_VOIDED` | Sale cancelled (future) | Sales domain | DayBook, Inventory (liquor reverse), Analytics, Audit | sale_id, reason |

---

## DayBook Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `TXN_CREATED` | Expense/income recorded | DayBook domain | Banking (if bank mode), Analytics, Sync | txn_id, kind, amount, mode |
| `TXN_VOIDED` | Transaction reversed (future) | DayBook domain | Banking, Analytics, Audit | txn_id |

---

## Hotel Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `ROOM_CHECKED_IN` | Guest checks in | Hotel domain | Sales (future room charge), Sync | room_id, guest, check_in |
| `ROOM_CHECKED_OUT` | Guest checks out | Hotel domain | Stay archive, Sales (bill created), Sync | room_id, stay_id, total |
| `ROOM_STATUS_CHANGED` | Room set to cleaning/vacant | Hotel domain | Sync | room_id, new_status |

---

## Inventory Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `INVENTORY_ITEM_ADDED` | New item created | Inventory domain | Sync | item_id, name, category |
| `STOCK_IN` | Stock received | Inventory domain | Purchasing (PO fulfillment), Sync | item_id, qty, note |
| `STOCK_OUT` | Stock issued to kitchen | Inventory domain | Cost calculation, Sync | item_id, qty, note |
| `STOCK_WASTAGE` | Spoilage recorded | Inventory domain | Cost calculation, Sync | item_id, qty, reason |
| `STOCK_REORDER_TRIGGERED` | Stock below reorder level | Inventory domain | Purchasing, Notifications | item_id, current_stock |
| `INVENTORY_COUNT_COMPLETED` | Physical count done (future) | Inventory domain | Sync | item_id, expected, actual, variance |

---

## Liquor Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `LIQUOR_ITEM_ADDED` | New brand added | Liquor domain | Sync | item_id, brand, size |
| `LIQUOR_PURCHASED` | Stock received from BEVCO | Liquor domain | DayBook (Txn), Sync, Excise compliance | item_id, bottles, cost |
| `BOTTLE_SOLD` | Full bottle sold | Liquor domain | Sales (Sale), Sync | item_id, sale_id |
| `PEG_SOLD` | Peg (60ml) sold | Liquor domain | Sales (Sale), Sync | item_id, pegs, sale_id |
| `LIQUOR_AUDIT_COMPLETED` | Physical audit done | Liquor domain | Sync, Excise compliance | audit_id, difference_ml |
| `STOCK_ADJUSTED` | Manual correction (future) | Liquor domain | Sync, Audit | item_id, bottles_before, bottles_after |

---

## Credit Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `CREDIT_ACCOUNT_CREATED` | Customer/vendor added | Credit domain | Sync | account_id, type |
| `CREDIT_EXTENDED` | Credit given (sale/advance) | Credit domain | DayBook (contra Txn), Sync | account_id, amount, balance |
| `PAYMENT_RECEIVED` | Customer/vendor pays | Credit domain | DayBook (contra Txn), Banking, Sync | account_id, amount, new_balance |

---

## Banking Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `DEPOSIT_MADE` | Cash deposited | Banking domain | DayBook (contra), Sync | bank_id, amount |
| `WITHDRAWAL_MADE` | Cash withdrawn | Banking domain | DayBook (contra), Sync | bank_id, amount |
| `TRANSFER_COMPLETED` | Between accounts | Banking domain | DayBook, Sync | source, destination, amount |
| `STATEMENT_IMPORTED` | CSV statement uploaded | Banking domain | Reconciliation (future) | statement_id, rows |
| `STATEMENT_REMOVED` | Statement deleted | Banking domain | — | statement_id |

---

## Employee Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `EMPLOYEE_HIRED` | New employee added | Employee domain | Sync | emp_id, name, role, salary |
| `EMPLOYEE_UPDATED` | Employee info changed | Employee domain | Sync, Payroll | emp_id, changed fields |
| `EMPLOYEE_TERMINATED` | Employee deactivated | Employee domain | Sync, Payroll, Attendance | emp_id, reason |
| `ATTENDANCE_MARKED` | Daily attendance | Employee domain | Payroll, Sync | emp_id, date, status |
| `BULK_ATTENDANCE_MARKED` | Bulk attendance entry | Employee domain | Payroll, Sync | emp_ids[], date, status |
| `ADVANCE_GIVEN` | Salary advance | Employee domain | DayBook (Txn), Payroll, Sync | emp_id, amount |
| `LEAVE_REQUESTED` | Leave application | Employee domain | Attendance, Sync | leave_id, emp_id, type |
| `LEAVE_DECIDED` | Leave approved/rejected | Employee domain | Attendance, Sync | leave_id, new_status |
| `REVIEW_SUBMITTED` | Performance review | Employee domain | Sync | emp_id, rating |
| `SALARY_PROCESSED` | Monthly payroll run | Payroll service | DayBook (Txn), Employee, Sync | batch_id, total_amount |

---

## Announcement Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `ANNOUNCEMENT_POSTED` | New notice | Announcement domain | Sync | announcement_id |
| `ANNOUNCEMENT_REMOVED` | Notice deleted | Announcement domain | Sync | announcement_id |

---

## Configuration Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `SETTINGS_UPDATED` | Business settings changed | Configuration domain | Sync, all domains | changed fields |
| `PIN_CHANGED` | App PIN updated | Configuration domain | Audit | user_id |

---

## Audit Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `AUDIT_EVENT_CREATED` | Any auditable action | All domains | Sync | audit_event |

---

## Sync Events

| Event | Trigger | Publisher | Subscribers | Data |
|-------|---------|-----------|-------------|------|
| `SYNC_STARTED` | Client initiates sync | Sync engine | — | device_id, timestamp |
| `SYNC_COMPLETED` | Merge successful | Sync engine | All domains (state update) | collections, conflicts |
| `SYNC_FAILED` | Merge/network error | Sync engine | Audit | error_code, message |

---

## Event Flow Diagram

```
[User Action] → [Domain Aggregate] → [Business Event] → [Publish]
                                                              │
                    ┌─────────────────────────────────────────┤
                    │                │                        │
                    ▼                ▼                        ▼
               [Audit Log]     [Sync Engine]          [Subscribers]
                                                          │
                                                     [Side Effects]
                                              (contra Txn, stock update,
                                               notification, analytics)
```

---

## Event Versioning

| Generation | Status | Description |
|------------|--------|-------------|
| Gen 1 (Current) | In-app dispatch | Events dispatched synchronously via reducer dispatch in GlobalState |
| Gen 2 (Near-term) | Internal event bus | In-process pub/sub for cross-domain side effects |
| Gen 3 (Future) | Message queue | Persistent events via Kafka/RabbitMQ for reliability + replay |
