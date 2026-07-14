# P8 Phase 3 — Financial Integrity Audit

**Auditor:** Independent Financial Systems Auditor
**Verdict:** ❌ NOT FINANCIALLY SOUND for production. 14 defects, 2 Critical.

> Verification note: FIN-01 and FIN-02 were re-confirmed by the lead auditor by
> reading `accounting.routes.ts` (autoPost call sites) and `liquor.service.ts`
> (`recalcSaleTotals`). All other items cite verbatim code from the agents' read.

## FIN-01 — Operating revenue never posts to the GL (Critical)
**Evidence:** `accounting.routes.ts:451,467,481`
```ts
const journal = await accountingService.autoPost.postRestaurantSale(req.body);
const journal = await accountingService.autoPost.postBarSale(req.body);
const journal = await accountingService.autoPost.postHotelCharge(req.body);
```
Grep confirms these methods are invoked **only** from `accounting.routes.ts`.
`BillingService.recordPayment` (restaurant), `BarSaleService.completeSale`
(liquor), `CheckInOutService.checkOut/postCharge` (rooms) do **not** call
`accountingService`. **Root cause:** the double-entry layer is decoupled from
operational services and reachable only via explicit manual endpoints.
**Business impact:** trial balance excludes all bar/restaurant/room revenue and
cash; GST, P&L, balance sheet, and day book are materially wrong.
**Technical impact:** GL ↔ folio/bill desync. **Risk:** High (wrong tax filings,
misstated financials). **Effort:** 5–8d. **Benefit:** blocks all financial use.
**Priority:** P0.

## FIN-02 — Bar sales omit GST/TOT (Critical)
**Evidence:** `liquor.service.ts:359`
```ts
const subtotal = lines.reduce((sum, l) => sum + Number(l.line_total), 0);
await run(`UPDATE bar_sales SET subtotal = ?, total_amount = ?, ...`,
  [subtotal, subtotal, now(), saleId]);
```
`total_amount = subtotal`; `gst_amount`/`tot_amount` columns default 0 and are
never populated. Kerala 10% TOT/liquor tax never computed or collected.
**Root cause:** pricing calc incomplete. **Impact:** understated revenue + unpaid
excise → legal exposure. **Effort:** 1–2d. **Priority:** P0.

## FIN-03 — Deposit posted as folio charge, not payment (High)
**Evidence:** `rooms.service.ts:144`
```ts
await R.RoomsRepository.postFolioCharge({ folioId: folio.id, category: 'deposit',
  description: 'Advance payment', amount: dto.advanceAmount, ... });
```
`recalculateFolio` adds deposits into `totalCharges` → deposit re-billed at
checkout; cash taken at check-in unrecorded. **Impact:** cash leakage / folio
desync. **Effort:** 1d. **Priority:** P1.

## FIN-04 — Payroll never amortizes loans (High)
**Evidence:** `hr.service.ts:1006`
```ts
const loanRecovery = loans.reduce((sum, l) => sum + l.emiAmount, 0);
```
`recordLoanEmi` (which increments `paid_emis`/`remaining_amount`) is never
called during payroll → same EMI deducted forever; loans never close.
**Effort:** 1d. **Priority:** P1.

## FIN-05 — GST auto-post fails when GST present (High)
**Evidence:** `accounting.service.ts:206`
```ts
lines.push({ accountId: config.gstAccountId,
  debit: entry.gstAmount > 0 ? entry.gstAmount : 0,
  credit: entry.gstAmount < 0 ? Math.abs(entry.gstAmount) : 0, ... });
```
When `gstAmount` set, GST line carries only debit or only credit; total debit =
amount+gst vs credit = amount → `createJournal` throws (imbalance at
`accounting.repository.ts:650`). **Impact:** GRN/PO/hotel/folio auto-posts with
GST fail silently (no journal). **Effort:** 0.5d. **Priority:** P1.

## FIN-06 — Bank deposit/withdraw journals have 1 line (High)
**Evidence:** `accounting.service.ts:702`
```ts
lines: [{ accountId: bankAccountId, debit: amount, credit: 0, description }], ...
```
`validateCreateJournal` requires ≥2 lines → always throws; deposits/withdrawals
never post. **Effort:** 0.5d. **Priority:** P1.

## FIN-07 — GST inclusive vs exclusive mismatch (High)
**Evidence:** `accounting.service.ts:494` vs `purchasing.service.ts:441`
```ts
// accounting (inclusive)
const gstAmount = Math.round(((amount * rate) / (100 + rate)) * 100) / 100;
// purchasing (exclusive)
return Math.round(((amount * gstRate) / 100) * 100) / 100;
```
GST register and GL journal will not reconcile for the same amount.
**Effort:** 1d. **Priority:** P1.

## FIN-08 — Multi-category PO taxed at single slab (Medium)
**Evidence:** `purchasing.service.ts:481`
```ts
const gstRate = po.lines.length > 0
  ? GstExciseHooks.getGstSlab(po.lines[0].category || 'food') : 5;
```
One slab from `lines[0]` applied to whole PO. **Effort:** 1d. **Priority:** P2.

## FIN-09 — Excise closing bottle count never decrements (Medium)
**Evidence:** `liquor.service.ts:1309`
```ts
const closingBottles = Number(openingBottles[0]?.count || 0);
```
Bottle count held constant while ML decrements → bottle/volume mismatch in
excise register. **Effort:** 0.5d. **Priority:** P2.

## FIN-10 — Float money + ₹0.01 drift tolerance (Medium)
**Evidence:** `accounting.service.ts:14`
```ts
function balancesAreEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}
```
JS float REAL storage + 0.01 tolerance allows permanent drift; rounding
accumulates. **Recommend:** integer paise. **Effort:** 3–5d. **Priority:** P2.

## FIN-11 — Restaurant payment not journaled (Medium)
**Evidence:** `restaurant.service.ts:570` — `recordPayment` writes only
`bills`/`payments`, no auto-post. Same root cause as FIN-01. **Priority:** P1.

## FIN-12 — Room tariff/payment not journaled (Medium)
**Evidence:** `rooms.service.ts:175` — `checkOut` updates folio only; no ledger
entry. Same root cause as FIN-01. **Priority:** P1.

## FIN-13 — Bank txn updates account_balances not chart_of_accounts (Low)
**Evidence:** `accounting.service.ts:33` — `JournalService.postJournal` via
repository updates `account_balances` not `chart_of_accounts.balance` → balance
sheet diverges from trial balance for bank accounts. **Priority:** P2.

## FIN-14 — Salary structure sums to CTC + ₹1250 (Low)
**Evidence:** `hr.service.ts:85` — `medicalAllowance: 1250` added on top of
100% CTC split → gross inflated by ₹1250; PF/ESI bases off inflated gross.
**Priority:** P2.

## Verified CORRECT (no defect)
Bar peg-volume math (`calculatePegConsumption`/`consumeFromBottle` use
`pegSizeMl * quantity`), balanced three-line auto-post journals when GST
provided, and period-close roll-forward math.

## Reproducible break-scenario (FIN-01)
1. Open a restaurant table, order items, settle bill via `BillingService.recordPayment`.
2. Query `txns` / `journal_entries` → **0 rows** for that sale.
3. Run trial balance → omits the revenue. Confirmed by code path (no auto-post
   call from restaurant service).
