# 03 — Device Deployment Report (P7 Phase 3)

**Status:** CHECKLIST PREPARED — verify every device on-site.

## 1. Device Inventory & Verification
For each device: assign asset tag, install app/agent, perform a live transaction
test, and record the result.

| # | Device | Location | Config | Live Test | EVIDENCE (serial/result) |
|---|--------|----------|--------|-----------|--------------------------|
| 3.1 | Reception PC | Front desk | App + receipt printer | Booking + check-in | ____ |
| 3.2 | Restaurant POS | Dining | App + cash drawer + receipt | Order + bill | ____ |
| 3.3 | Bar POS | Bar | App + cash drawer + receipt | Bar sale | ____ |
| 3.4 | Kitchen Display | Kitchen | KDS view | KOT push | ____ |
| 3.5 | Office PC | Office | Manager + reports | Night audit | ____ |
| 3.6 | Inventory terminal | Store | Scanner + barcode printer | Stock-in | ____ |
| 3.7 | Mobile device | Floor | App (offline-capable) | Offline order→sync | ____ |
| 3.8 | Receipt printer | Per POS | 80mm thermal | Print test | ____ |
| 3.9 | Kitchen printer | Kitchen | 58mm impact | KOT print | ____ |
| 3.10 | Barcode printer | Store | Label | Label print | ____ |
| 3.11 | Barcode scanner | Store | HID | Scan→lookup | ____ |
| 3.12 | Cash drawer | Per POS | RJ11 kick | Open on payment | ____ |

## 2. Configuration Standard
- All POS on wired LAN (reserved IP); mobile on segregated Wi-Fi.
- Printer densities, paper sizes, and drawer kick codes set per location.
- App points to `https://<pilot-host>/api` with TLS; offline cache enabled.

## 3. Verification Script
For each location run a smoke transaction and capture the printed/displayed
reference. Record the reference number in EVIDENCE above.

## 4. Sign-off
All devices verified: ☐ YES / ☐ NO — **Name/Role: ____  Date: ____**
