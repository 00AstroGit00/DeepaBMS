# Entity Catalogue

## 1. User (Auth / Identity)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | `u-xxx` prefix |
| name | string | Display name |
| role | enum | owner, manager, cashier, reception, fnb, barstaff, accountant, auditor |
| pin_hash | string | bcrypt hash |
| active | boolean | Soft-delete flag |
| created_at | timestamp | Auto-set |

- **Natural Key**: name (unique per business)
- **Relationships**: Owns AuditEvent; operator of Sale, Txn
- **Lifecycle**: Created → Active → Inactive (soft delete)
- **Validation**: PIN ≥4 chars, role in enum
- **Audit**: CREATE_USER, UPDATE_USER, DEACTIVATE_USER, LOGIN_SUCCESS, LOGIN_FAILURE
- **Soft Delete**: `active = false`
- **Versioning**: Not versioned (overwrite)

---

## 2. Sale (Sales Register)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Transaction timestamp |
| dept | enum | restaurant, bar, takeaway, online, rooms |
| description | string | Bill description |
| amount | decimal(12,2) | Net amount before tax |
| gst_rate | decimal(5,2) | GST percentage |
| gst_amount | decimal(12,2) | Computed GST |
| total | decimal(12,2) | amount + gst_amount |
| mode | enum | cash, upi, card, bank |
| bill_no | string? | Optional bill number |
| operator_id | string (FK→User) | Who created the sale |

- **Natural Key**: bill_no (unique per dept)
- **Relationships**: Optionally linked to Txn (contra entry), Room checkout
- **Lifecycle**: Created → (contra Txn) → Archived (by date)
- **Validation**: total ≥ 0, dept in enum, mode in enum
- **Audit**: CREATE_SALE
- **Soft Delete**: No (immutable after creation)
- **Versioning**: No

---

## 3. Txn (DayBook Transaction)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Transaction timestamp |
| kind | enum | income, expense, purchase |
| category | string | Expense category (Provisions, Meat, LPG, etc.) |
| description | string | Description |
| amount | decimal(12,2) | Amount (>0) |
| mode | enum | cash, upi, card, bank |
| bank_id | string (FK→BankAccount)? | If bank mode |
| has_bill | boolean? | Whether bill is attached |
| attachments | AttachmentMeta[]? | File references |

- **Natural Key**: None
- **Relationships**: Optionally linked to Sale (contra), BankAccount, Payroll batch, Advance, CreditEntry
- **Lifecycle**: Created → (contra matched) → Archived
- **Validation**: amount > 0, kind in enum
- **Audit**: CREATE_TXN
- **Soft Delete**: No
- **Versioning**: No

---

## 4. Room (Hotel)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | `rxxx` pattern |
| no | string (UK) | Room number (unique) |
| category | string | Standard Non-AC, Deluxe AC, Suite AC |
| rate | decimal(10,2) | Per-night rate |
| status | enum | vacant, occupied, cleaning |
| guest_name | string? | Current guest |
| guest_phone | string? | Current guest phone |
| guest_id_proof | string? | ID proof |
| guest_adults | int? | Number of adults |
| guest_check_in | timestamp? | Check-in time |
| guest_advance | decimal(10,2)? | Advance paid |
| guest_advance_mode | enum? | Mode of advance payment |

- **Natural Key**: no (room number)
- **Relationships**: Stay (archive), Sale (checkout billing)
- **Lifecycle**: Setup → Vacant → Occupied → Cleaning → Vacant
- **Validation**: rate ≥ 0, no unique
- **Audit**: CHECK_IN, CHECK_OUT, SET_ROOM_STATUS
- **Soft Delete**: No
- **Versioning**: No (in-place updates)

---

## 5. Stay (Stay Archive)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| room_no | string | Room number at time of stay |
| category | string | Room category at time of stay |
| guest_name | string | Guest name |
| phone | string | Guest phone |
| check_in | timestamp | Check-in |
| check_out | timestamp | Check-out |
| nights | int | Computed |
| amount | decimal(12,2) | Total billed |
| mode | enum | Payment mode |

- **Natural Key**: None
- **Relationships**: Created on Room CHECK_OUT
- **Lifecycle**: Created → Archived
- **Validation**: nights ≥ 0
- **Audit**: CHECK_OUT
- **Soft Delete**: No
- **Versioning**: No

---

## 6. InvItem (Inventory Item)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| name | string (UK) | Item name (unique) |
| category | enum | food, softdrink, kitchen, housekeeping, consumables |
| unit | string | kg, L, pc, btl, cyl, etc. |
| stock | decimal(10,2) | Current stock quantity |
| reorder | decimal(10,2) | Reorder level |
| cost | decimal(10,2) | Cost per unit |

- **Natural Key**: name
- **Relationships**: StockMove (many), PurchaseOrder item
- **Lifecycle**: Created → Stocked → Reordered → Depleted → Discontinued
- **Validation**: stock ≥ 0, cost ≥ 0, reorder ≥ 0
- **Audit**: ADD_INV_ITEM, STOCK_MOVE
- **Soft Delete**: Future: `discontinued` flag
- **Versioning**: No

---

## 7. StockMove (Inventory Movement)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | When movement occurred |
| item_id | string (FK→InvItem) | Item reference |
| item_name | string | Denormalized name |
| kind | enum | in, out, wastage |
| qty | decimal(10,2) | Quantity moved (>0) |
| operator | string | Who performed the move |
| note | string? | Reason / reference |

- **Natural Key**: None
- **Relationships**: InvItem (parent)
- **Lifecycle**: Created (immutable)
- **Validation**: qty > 0, kind in enum
- **Audit**: STOCK_MOVE
- **Soft Delete**: No
- **Versioning**: No

---

## 8. LiquorItem (Bar Stock)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| brand | string | Brand name |
| category | enum | IMFL, Beer, Wine, Foreign |
| size_ml | int | Bottle size in ml |
| price_peg | decimal(10,2) | Price per peg (60ml) |
| price_bottle | decimal(10,2) | Price per full bottle |
| cost_bottle | decimal(10,2) | Cost per bottle |
| full_bottles | int | Current full bottle count |
| loose_ml | int | Current loose stock in ml |

- **Natural Key**: brand + size_ml
- **Relationships**: LiquorAudit (many), Sale (peg/bottle sales)
- **Lifecycle**: Created → Stocked → Sold → Audited → Restocked
- **Validation**: cost_bottle ≥ 0, full_bottles ≥ 0, loose_ml ≥ 0
- **Audit**: ADD_LIQUOR_ITEM, SELL_LIQUOR, LIQUOR_PURCHASE, LIQUOR_AUDIT
- **Soft Delete**: Future: `discontinued` flag
- **Versioning**: No

---

## 9. LiquorAudit (Excise Audit)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Audit timestamp |
| brand | string | Brand name |
| size_ml | int | Bottle size |
| expected_bottles | int | Expected from stock calc |
| expected_loose_ml | int | Expected loose from calc |
| actual_bottles | int | Physical count |
| actual_loose_ml | int | Physical loose measured |
| difference_ml | int | actual - expected |
| auditor | string | Who performed audit |

- **Natural Key**: None
- **Relationships**: LiquorItem (computed from)
- **Lifecycle**: Created (immutable audit record)
- **Validation**: All counts ≥ 0
- **Audit**: The record itself is an audit
- **Soft Delete**: No
- **Versioning**: No

---

## 10. CreditAccount (Customer/Vendor Ledger)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| name | string (UK) | Account name (unique) |
| phone | string | Contact number |
| gstin | string? | GSTIN if registered |
| type | enum | customer, vendor |
| balance | decimal(15,2) | Current balance |
| history | CreditHistoryItem[] | Embedded ledger entries |

- **Natural Key**: name
- **Relationships**: CreditHistoryItem (1:N), Sale (customer credits)
- **Lifecycle**: Created → Active → Credit extended → Payment received → Settled
- **Validation**: type in enum
- **Audit**: ADD_CREDIT_ACCOUNT, CREDIT_ENTRY
- **Soft Delete**: Future: `archived` flag
- **Versioning**: No

---

## 11. CreditHistoryItem (Credit Ledger Entry)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Entry date |
| kind | enum | credit, payment |
| amount | decimal(12,2) | Positive = credit extended, negative (schema) = payment received |
| note | string | Description |

- **Natural Key**: None
- **Relationships**: CreditAccount (parent)
- **Lifecycle**: Created (immutable)
- **Validation**: amount > 0
- **Audit**: CREDIT_ENTRY
- **Soft Delete**: No

---

## 12. BankAccount

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| name | string (UK) | Bank account name |
| account_no | string | Masked account number |
| balance | decimal(15,2) | Current register balance |

- **Natural Key**: account_no (in practice, name)
- **Relationships**: BankMove (1:N), BankStatement (1:N), Txn (optionally)
- **Lifecycle**: Created → Active → Closed (future)
- **Validation**: balance ≥ 0
- **Audit**: ADD_BANK_MOVE
- **Soft Delete**: Future: `closed` flag
- **Versioning**: No

---

## 13. BankMove (Bank Transaction)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Transaction date |
| kind | enum | deposit, withdraw, transfer |
| amount | decimal(15,2) | Amount (>0) |
| bank_id | string (FK→BankAccount) | Source/destination account |
| to_bank_id | string (FK→BankAccount)? | Destination for transfers |
| note | string? | Description |

- **Natural Key**: None
- **Relationships**: BankAccount (source), BankAccount (destination for transfers)
- **Lifecycle**: Created (immutable)
- **Validation**: amount > 0, kind in enum
- **Audit**: ADD_BANK_MOVE
- **Soft Delete**: No

---

## 14. BankStatement (Imported Statement)

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| imported_at | timestamp | Import time |
| bank_id | string (FK→BankAccount) | Bank account |
| bank_guess | string | Auto-detected bank name |
| file_name | string | CSV file name |
| from_date | string | Statement start |
| to_date | string | Statement end |
| total_credit | decimal | Computed |
| total_debit | decimal | Computed |
| opening_balance | decimal | From statement |
| closing_balance | decimal | From statement |
| rows | BankStatementRow[] | Embedded rows |

- **Natural Key**: file_name + bank_id
- **Relationships**: BankAccount, BankStatementRow
- **Lifecycle**: Imported → Verified → Reconciled (future)
- **Validation**: opening_balance + total_credit - total_debit = closing_balance
- **Audit**: ADD_BANK_STATEMENT, REMOVE_BANK_STATEMENT
- **Soft Delete**: REMOVE deletes permanently

---

## 15. Employee

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | `e-xxx` pattern |
| name | string | Full name |
| role | string | Job title |
| phone | string | Contact |
| salary | decimal(12,2) | Monthly salary |
| status | enum | active, inactive |
| join_date | date | Date joined |
| access | enum | staff, manager, owner |
| attendance | Record<date, status> | Attendance map (embedded, or from EmployeeAttendance table) |
| advances | EmployeeAdvance[] | Advances given |
| leave_balance | { casual, sick } | Current leave balances |
| reviews | EmployeeReview[] | Performance reviews |
| documents | EmployeeDocument[] | HR documents |

- **Natural Key**: name (in practice, id)
- **Relationships**: EmployeeAttendance (1:N), LeaveRequest (1:N), EmployeeAdvance (1:N), EmployeeReview (1:N), EmployeeDocument (1:N)
- **Lifecycle**: Hired → Active → (Leave) → Resigned/Terminated
- **Validation**: salary ≥ 0, status in enum, access in enum
- **Audit**: ADD_EMPLOYEE, UPDATE_EMPLOYEE, MARK_ATTENDANCE, ADD_ADVANCE
- **Soft Delete**: status = 'inactive'
- **Versioning**: No

---

## 16. EmployeeAttendance

| Attribute | Type | Notes |
|-----------|------|-------|
| emp_id | string (FK→Employee) | Composite PK |
| date | date | Composite PK |
| status | enum | P (Present), H (Holiday), A (Absent), L (Leave) |

- **Natural Key**: emp_id + date
- **Relationships**: Employee (parent)
- **Lifecycle**: Created, Updated (daily)
- **Validation**: status in {'P','H','A','L'}
- **Audit**: MARK_ATTENDANCE, BULK_ATTENDANCE

---

## 17. LeaveRequest

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| emp_id | string (FK→Employee) | Employee |
| from_date | date | Leave start |
| to_date | date | Leave end |
| days | int | Computed |
| type | enum | casual, sick, paid, unpaid |
| reason | string | Employee's reason |
| status | enum | pending, approved, rejected |
| requested_on | timestamp | Submission time |

- **Natural Key**: None
- **Relationships**: Employee (parent)
- **Lifecycle**: Requested → Approved/Rejected → (Leave consumes balance) → Archived
- **Validation**: days > 0, type in enum, no overlap with existing approved leaves
- **Audit**: REQUEST_LEAVE, DECIDE_LEAVE

---

## 18. Announcement

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | Auto-generated |
| date | timestamp | Posted date |
| title | string | Title |
| body | string | Content |
| priority | enum | normal, important |
| author | string | Who posted |

- **Natural Key**: None
- **Lifecycle**: Created → Auto-archived (age-based)
- **Validation**: priority in enum
- **Soft Delete**: Explicit removal

---

## 19. AuditEvent

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (PK) | `aud-xxx` pattern |
| date | timestamp | Auto-set |
| user_id | string (FK→User) | Who performed action |
| user_name | string | Denormalized |
| action | string | Description of action |
| ip_address | string? | Client IP (backend) |

- **Natural Key**: None
- **Relationships**: User (actor)
- **Lifecycle**: Created (immutable append-only log)
- **Validation**: action is required
- **Soft Delete**: Never

---

## 20. GeneralSettings

| Attribute | Type | Notes |
|-----------|------|-------|
| business_name | string | Business display name |
| place | string | City/location |
| gstin | string | GST registration |
| opening_cash | decimal | Daily opening cash balance |
| pin | string | Backup app PIN (bcrypt) |
| default_bank_id | string (FK→BankAccount) | Default bank |
| server_url | string? | Backend URL for sync |
| last_synced_at | timestamp? | Last sync time |
| tax_rate_rooms | decimal | Room GST rate |
| tax_rate_food | decimal | Food GST rate |
| tax_rate_liquor | decimal | Liquor turnover tax rate |

- **Natural Key**: Singleton
- **Lifecycle**: Initialized → Updated
- **Audit**: SETTINGS_UPDATE
- **Soft Delete**: N/A

---

## 21. SyncSession (Future)

| Attribute | Notes |
|-----------|-------|
| id | Session ID |
| device_id | Client identifier |
| started_at | Sync start |
| completed_at | Sync end |
| status | in_progress, completed, failed |
| collections_synced | Which collections were merged |
| conflicts | Count of conflicts resolved |

- **Versioning**: Future (not yet implemented)

---

## Entity Relationship Summary

```
User ──1:N── Sale
User ──1:N── AuditEvent
User ──1:N── Txn (operator)

Room ──1:N── Stay (archive)

InvItem ──1:N── StockMove

LiquorItem ──1:N── LiquorAudit

CreditAccount ──1:N── CreditHistoryItem

BankAccount ──1:N── BankMove
BankAccount ──1:N── BankStatement

Employee ──1:N── EmployeeAttendance
Employee ──1:N── LeaveRequest
Employee ──1:N── EmployeeAdvance
Employee ──1:N── EmployeeReview
Employee ──1:N── EmployeeDocument

Sale ──N:1── Txn (contra, optional)
Txn ──N:1── BankAccount
```
