# DeepaBMS Database Schema

## Overview
- **Server DB**: SQLite3 (primary), PostgreSQL (optional via Docker Compose)
- **Client DB**: AsyncStorage (JSON document store)
- **Schema**: `apps/backend/src/schema.sql` — 20 tables

## Entity Relationship (Server)

```
settings ──┐
            │
users ──────┼── security_audit_log
            │
bank_accounts ── bank_moves
            │
sales ──────┼── operators → users
            │
txns ───────┼── bank → bank_accounts
            │
rooms ──────┼── stays_archive
            │
inventory ──┼── inventory_moves
            │
liquor ─────┼── liquor_audits
            │
credit_accounts ── credit_ledger
            │
employees ──┬── employee_attendance
            ├── employee_leaves
            ├── employee_advances
            ├── employee_reviews
            └── employee_documents
```

## Server Tables (SQLite3)

### 1. settings
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(30) | PK |
| business_name | VARCHAR(100) | NOT NULL |
| gstin | VARCHAR(15) | NOT NULL |
| state_code | VARCHAR(2) | DEFAULT '32' |
| tax_rate_rooms | DECIMAL(5,2) | DEFAULT 5.0 |
| tax_rate_food | DECIMAL(5,2) | DEFAULT 5.0 |
| tot_rate_liquor | DECIMAL(5,2) | DEFAULT 10.0 |

### 2. users
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| name | VARCHAR(100) | NOT NULL |
| role | VARCHAR(20) | CHECK IN (owner,manager,cashier,reception,fnb,barstaff,accountant) |
| pin_hash | VARCHAR(100) | NOT NULL |
| active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 3. security_audit_log
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| date | TIMESTAMP | NOT NULL |
| user_id | VARCHAR(50) | FK → users |
| user_name | VARCHAR(100) | NOT NULL |
| action | VARCHAR(255) | NOT NULL |
| ip_address | VARCHAR(45) | NULL |

### 4. bank_accounts
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| name | VARCHAR(100) | UNIQUE |
| balance | DECIMAL(15,2) | DEFAULT 0 |

### 5. bank_moves
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| date | TIMESTAMP | NOT NULL |
| kind | VARCHAR(10) | CHECK IN (deposit,withdraw,transfer) |
| bank_id | VARCHAR(50) | FK → bank_accounts |
| to_bank_id | VARCHAR(50) | FK → bank_accounts (nullable) |
| amount | DECIMAL(15,2) | CHECK > 0 |
| note | VARCHAR(255) | NULL |

### 6. sales
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| date | TIMESTAMP | NOT NULL |
| dept | VARCHAR(15) | CHECK IN (restaurant,bar,takeaway,online,rooms) |
| description | VARCHAR(255) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| gst_rate | DECIMAL(5,2) | DEFAULT 0 |
| gst_amount | DECIMAL(12,2) | DEFAULT 0 |
| total | DECIMAL(12,2) | CHECK >= 0 |
| mode | VARCHAR(10) | CHECK IN (cash,upi,card,bank) |
| bill_no | VARCHAR(50) | NULL |
| operator_id | VARCHAR(50) | FK → users |

### 7. txns
| Column | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK |
| date | TIMESTAMP | NOT NULL |
| kind | VARCHAR(10) | CHECK IN (income,expense,purchase) |
| category | VARCHAR(50) | NOT NULL |
| amount | DECIMAL(12,2) | CHECK > 0 |
| description | VARCHAR(255) | NOT NULL |
| bank_id | VARCHAR(50) | FK → bank_accounts |
| mode | VARCHAR(10) | CHECK IN (cash,upi,card,bank) |
| has_bill | BOOLEAN | DEFAULT FALSE |

### 8-20. Additional tables
rooms, stays_archive, inventory, inventory_moves, liquor, liquor_audits,
credit_accounts, credit_ledger, employees, employee_attendance,
employee_leaves, employee_advances, employee_reviews, employee_documents

### Indexes
- idx_sales_date, idx_sales_dept
- idx_txns_date
- idx_attendance_date
- idx_leaves_emp
- idx_moves_item
- idx_ledger_account

## Client Data Model (GlobalState - AsyncStorage)

Stored as single JSON document under key `deepa-bms-v4`:
- users, sales, txns, bankMoves, bankStatements
- rooms, stays, inventory, stockMoves
- liquor, liquorAudits, credits
- employees, leaves, announcements
- banks, auditLog, settings

## Data Flow: Client ↔ Server

```
Client (AsyncStorage) → POST /api/sync → Server (SQLite + JSON file)
                                                    ↕
                                            deepa-bms-master-state.json
                                                    ↕
                                            deepa-bms-master-state.json.bak
```

The server sync endpoint uses:
1. **Merge by LWW** (Last-Writer-Wins) using date/importedAt/createdAt fields
2. **Merge by priority** for rooms (occupied > cleaning > vacant)
3. **Serialized queue** for concurrent sync safety
4. **Crash-safe write** (backup first, then primary)
