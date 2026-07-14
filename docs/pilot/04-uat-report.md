# 04 — User Acceptance Testing (UAT) Report (P7 Phase 4)

**Status:** SCENARIO MATRIX TEST READY + on-site execution template.

## 1. Automated Precondition
`tests/uat/uat.scenarios.test.ts` verifies the schema supports all 18
scenarios and runs in CI (`npm test -- tests/uat/uat.scenarios.test.ts`).
It must pass before involving real users.

## 2. UAT Scenarios — Pass/Fail Evidence
Each scenario is executed by a real operator. Record the transaction reference
and result. **PASS** requires: correct data persisted, correct financial
impact, and printed/output produced.

| # | Scenario | Operator | Date | Ref | Result | Notes |
|---|----------|----------|------|-----|--------|-------|
| U01 | Hotel booking | ____ | ____ | ____ | ☐ P / ☐ F | |
| U02 | Check-in | ____ | ____ | ____ | ☐ P / ☐ F | |
| U03 | Restaurant ordering | ____ | ____ | ____ | ☐ P / ☐ F | |
| U04 | Kitchen workflow (KOT) | ____ | ____ | ____ | ☐ P / ☐ F | |
| U05 | Bar billing | ____ | ____ | ____ | ☐ P / ☐ F | |
| U06 | Inventory deduction | ____ | ____ | ____ | ☐ P / ☐ F | |
| U07 | Purchase receipt (GRN) | ____ | ____ | ____ | ☐ P / ☐ F | |
| U08 | Supplier payment | ____ | ____ | ____ | ☐ P / ☐ F | |
| U09 | Payroll | ____ | ____ | ____ | ☐ P / ☐ F | |
| U10 | GST computation | ____ | ____ | ____ | ☐ P / ☐ F | |
| U11 | Accounting (ledger) | ____ | ____ | ____ | ☐ P / ☐ F | |
| U12 | Analytics dashboard | ____ | ____ | ____ | ☐ P / ☐ F | |
| U13 | AI Copilot query | ____ | ____ | ____ | ☐ P / ☐ F | |
| U14 | Workflow approval | ____ | ____ | ____ | ☐ P / ☐ F | |
| U15 | Offline sync | ____ | ____ | ____ | ☐ P / ☐ F | |
| U16 | Backup | ____ | ____ | ____ | ☐ P / ☐ F | |
| U17 | Restore | ____ | ____ | ____ | ☐ P / ☐ F | |
| U18 | Night audit | ____ | ____ | ____ | ☐ P / ☐ F | |

## 3. Evidence Artifacts (attach)
- Screenshots / printed receipts per scenario: ____
- UAT sign-off sheet per role: ____
- Defects raised (see 08-defect-log.md): ____

## 4. UAT Result
Scenarios passed: ____ / 18. Critical failures: ____.
UAT accepted: ☐ YES / ☐ NO — **UAT Coordinator: ____  Date: ____**
