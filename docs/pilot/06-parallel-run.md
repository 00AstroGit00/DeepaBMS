# 06 — Parallel Run Reconciliation Report (P7 Phase 6)

**Status:** RECONCILIATION TOOL READY + procedure.

## 1. Procedure
Run DeepaBMS and the legacy ERP side-by-side for **7–14 days**. At end of day,
export a metrics summary from each system and compare with
`scripts/reconciliation/compare.ts`.

```bash
# Export legacy daily summary -> legacy-summary.csv  (metric,value)
# Export DeepaBMS daily summary -> deepa-summary.csv (metric,value)
ts-node scripts/reconciliation/compare.ts \
  --legacy legacy-summary.csv --deepa deepa-summary.csv \
  --out reconciliation-report.json
```
The tool exits non-zero and lists every metric with `|delta| > 0.01`.

## 2. Metrics Compared
| Metric | Source (both) | Tolerance |
|--------|---------------|-----------|
| Sales count | sales / legacy sales | 0 |
| Sales value (GST-incl) | sales.amount / legacy | ₹0.01 |
| GST payable | txns GST / legacy | ₹0.01 |
| Inventory qty (EOD) | inventory / legacy | 0 units |
| Cash tendered | payments / legacy | ₹0.01 |
| Accounts receivable | credit_accounts / legacy | ₹0.01 |
| Payroll net | employees / legacy | ₹0.01 |
| Report totals | dashboards / legacy | ₹0.01 |

## 3. Daily Reconciliation Log
| Date | Mismatch? | Max Δ | Resolved? | Note |
|------|-----------|-------|-----------|------|
| ____ | ☐ / ☐ | ____ | ☐ | ____ |
| ____ | ☐ / ☐ | ____ | ☐ | ____ |

## 4. Exit Criteria
- 0 unresolved discrepancies for the final 3 consecutive days, OR each
  discrepancy explained and accepted by Accountant + Owner.

## 5. Sign-off
Parallel run accepted: ☐ YES / ☐ NO — **Accountant: ____  Owner: ____  Date: ____**
