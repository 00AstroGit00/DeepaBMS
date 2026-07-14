# Migration Toolkit (P7 Phase 2)

Self-contained, dependency-free (uses only `sqlite3`) migration + validation
tooling. Run on the pilot server or in CI (`ubuntu-latest`, `node:20`).

## Files
- `migrate.ts` — loads legacy CSV exports → DeepaBMS tables (transactional,
  `INSERT OR IGNORE`), writes `migration-manifest.json` (counts + checksums).
- `validate.ts` — re-checks counts, checksums, double-entry balance, bank
  trial-balance, and referential integrity. Exits 1 on any failure (CI gate).
- `rollback.sql` — clears migrated tables in a transaction (legacy untouched).

## Expected values
Create `expected.json` next to these scripts with legacy source counts and the
trial balance. Example:

```json
{
  "employees":  { "rows": 24,  "checksum": "" },
  "credit_accounts": { "rows": 180, "checksum": "" },
  "suppliers": { "rows": 42, "checksum": "" },
  "inventory": { "rows": 540, "checksum": "" },
  "liquor":    { "rows": 96,  "checksum": "" },
  "rooms":     { "rows": 30,  "checksum": "" },
  "stays_archive": { "rows": 410, "checksum": "" },
  "bank_accounts": { "rows": 3, "checksum": "" },
  "supplier_invoices": { "rows": 1280, "checksum": "" },
  "trialBalance": 1250000.00
}
```
`checksum` may be left empty; `validate.ts` then only checks counts. Fill
checksums after a known-good dry run for stronger integrity.

## Run
```bash
SQLITE_DB_PATH=/data/deepa/deepa-bms.db \
LEGACY_DIR=./scripts/migration/legacy \
ts-node scripts/migration/migrate.ts
SQLITE_DB_PATH=/data/deepa/deepa-bms.db \
ts-node scripts/migration/validate.ts   # must exit 0
```
