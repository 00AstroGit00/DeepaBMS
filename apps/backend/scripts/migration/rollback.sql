-- DeepaBMS — Migration Rollback (P7 Phase 2)
-- Run ONLY if the pilot migration must be reverted. Execute in a transaction
-- and verify counts before COMMIT. Restores pre-migration state by clearing
-- migrated tables; legacy source data is NEVER touched.

-- 1. Snapshot row counts first (evidence)
SELECT 'employees' AS t, COUNT(*) AS n FROM employees
UNION ALL SELECT 'credit_accounts', COUNT(*) FROM credit_accounts
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'liquor', COUNT(*) FROM liquor
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'stays_archive', COUNT(*) FROM stays_archive
UNION ALL SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
UNION ALL SELECT 'supplier_invoices', COUNT(*) FROM supplier_invoices;

-- 2. Begin rollback
BEGIN;

DELETE FROM supplier_invoices;
DELETE FROM stays_archive;
DELETE FROM rooms;
DELETE FROM liquor;
DELETE FROM inventory;
DELETE FROM suppliers;
DELETE FROM credit_accounts;
DELETE FROM employees;
DELETE FROM bank_accounts;

-- 3. Re-seed system defaults (settings row) if needed
-- INSERT OR IGNORE INTO settings (id, business_name, gstin) VALUES ('default','Deepa Restaurant & Tourist Home','');

COMMIT;

-- 4. Verify emptied
SELECT COUNT(*) AS remaining FROM (
  SELECT id FROM employees UNION ALL
  SELECT id FROM credit_accounts UNION ALL
  SELECT id FROM suppliers UNION ALL
  SELECT id FROM inventory UNION ALL
  SELECT id FROM liquor UNION ALL
  SELECT id FROM rooms UNION ALL
  SELECT id FROM stays_archive UNION ALL
  SELECT id FROM bank_accounts UNION ALL
  SELECT id FROM supplier_invoices
);
