# 02 — Data Migration Report (P7 Phase 2)

**Status:** PLAN + SCRIPTS READY — execute on pilot server.

## 1. Migration Plan
Legacy data is exported to CSV and loaded via `scripts/migration/migrate.ts`,
which maps each file to a DeepaBMS table (INSERT OR IGNORE, transactional).
A manifest (`migration-manifest.json`) records per-table counts + checksums.

| Source (legacy CSV) | Target Table | Key Columns |
|---------------------|--------------|-------------|
| employees.csv | employees | id, name, role, department, joined_at, active |
| customers.csv | credit_accounts | id, name, balance, credit_limit, gstin |
| suppliers.csv | suppliers | id, name, gstin, contact, outstanding |
| inventory.csv | inventory | id, sku, name, category, quantity, unit_cost, unit_price |
| liquor.csv | liquor | id, brand, category, bottles, open_bottles, unit_cost, unit_price |
| rooms.csv | rooms | id, number, type, rate, status |
| reservations.csv | stays_archive | id, room_id, guest_name, check_in, check_out, status |
| account_balances.csv | bank_accounts | id, name, balance |
| purchase_history.csv | supplier_invoices | id, supplier_id, invoice_no, date, amount, paid |

## 2. Execution Steps
```bash
# 1. Export legacy data to CSVs in scripts/migration/legacy/
# 2. Run migration (writes migration-manifest.json)
SQLITE_DB_PATH=/data/deepa/deepa-bms.db \
LEGACY_DIR=./scripts/migration/legacy \
ts-node scripts/migration/migrate.ts

# 3. Validate (counts, checksums, financial recon, RI)
SQLITE_DB_PATH=/data/deepa/deepa-bms.db \
ts-node scripts/migration/validate.ts

# 4. If validation fails, rollback
sqlite3 /data/deepa/deepa-bms.db < scripts/migration/rollback.sql
```

## 3. Validation Criteria
- **Checksums:** per-table SHA-256 recomputed in DB matches manifest.
- **Record counts:** migrated count == source row count.
- **Financial reconciliation:** `SUM(debit) == SUM(credit)` in `txns`;
  `SUM(bank_accounts.balance)` == legacy trial balance (set in `expected.json`).
- **Referential integrity:** no orphan FK rows in rooms/stays_archive,
  suppliers/supplier_invoices, users/security_audit_log.

## 4. Pre-Flight Evidence (fill on-site)
| Check | Result | EVIDENCE |
|-------|--------|----------|
| migrate.ts exit 0 | ☐ | manifest rows: ____ |
| validate.ts exit 0 | ☐ | count mismatches: ____ |
| Financial recon balanced | ☐ | delta: ____ |
| RI clean | ☐ | orphans: ____ |

## 5. Rollback
`scripts/migration/rollback.sql` clears migrated tables in a transaction and
re-verifies emptiness. Legacy source CSVs are never modified.

## 6. Sign-off
Migration verified, zero financial discrepancy: ☐ YES / ☐ NO
**Name/Role: ____  Date: ____**
