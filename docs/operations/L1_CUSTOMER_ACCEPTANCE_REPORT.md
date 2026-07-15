# DeepaBMS L1 — Customer Acceptance Report
**Phase**: L1 Pilot Production Deployment & First Customer Rollout
**Date**: July 15, 2026
**Status**: NOT TESTED
**Classification**: CONFIDENTIAL

---

## L1-5 User Acceptance Testing

### UAT Status

| Role | UAT Executed | Result | Evidence |
|:-----|:------------:|:------:|:---------|
| Owner | ❌ NOT EXECUTED | — | No production deployment |
| Manager | ❌ NOT EXECUTED | — | No production deployment |
| Cashier | ❌ NOT EXECUTED | — | No production deployment |
| Reception | ❌ NOT EXECUTED | — | No production deployment |
| Kitchen | ❌ NOT EXECUTED | — | No production deployment |
| Store | ❌ NOT EXECUTED | — | No production deployment |
| Accountant | ❌ NOT EXECUTED | — | No production deployment |
| Auditor | ❌ NOT EXECUTED | — | No production deployment |
| Employee | ❌ NOT EXECUTED | — | No production deployment |
| Administrator | ❌ NOT EXECUTED | — | No production deployment |

**UAT Verdict**: ❌ NOT TESTED — Requires deployed system with real business data and customer participation.

---

## UAT Test Scripts (Prepared for Execution)

### Role: Owner

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Dashboard overview | Login → View dashboard | All KPIs visible, correct totals | ❌ NOT EXECUTED |
| Business reports | Navigate to Analytics → Reports | Financial, operational reports load | ❌ NOT EXECUTED |
| Multi-branch view | Switch between branches/tenants | Data isolated per branch | ❌ NOT EXECUTED |
| User management | Settings → Users → Add/Edit | CRUD operations succeed | ❌ NOT EXECUTED |

### Role: Manager

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Daily operations view | Login → View today's summary | Orders, reservations, occupancy shown | ❌ NOT EXECUTED |
| Staff scheduling | HR → Schedule → Create shift | Schedule saved, conflicts flagged | ❌ NOT EXECUTED |
| Purchase approvals | Purchasing → Pending → Approve | Approval workflow completes | ❌ NOT EXECUTED |
| Inventory alerts | Inventory → Low stock | Alerts shown, reorder suggested | ❌ NOT EXECUTED |

### Role: Cashier

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| POS transaction | Restaurant → Table → Add items → Pay | Order created, payment processed | ❌ NOT EXECUTED |
| Split bill | POS → Split → Select items → Pay | Correct split calculation | ❌ NOT EXECUTED |
| Refund | POS → Find order → Refund | Refund processed, inventory restored | ❌ NOT EXECUTED |
| Shift close | POS → Close shift → Print report | Cash count matches, shift logged | ❌ NOT EXECUTED |

### Role: Reception

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Check-in guest | Hotel → Reservation → Check-in | Room status updated, key card ready | ❌ NOT EXECUTED |
| Check-out guest | Hotel → Occupied → Check-out | Invoice generated, room cleaned | ❌ NOT EXECUTED |
| Room availability | Hotel → Calendar → View date | Available/occupied rooms shown | ❌ NOT EXECUTED |
| Walk-in booking | Hotel → New booking → Enter details | Booking created, room assigned | ❌ NOT EXECUTED |

### Role: Kitchen

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| View orders | Kitchen display → Pending orders | Orders visible with items, time | ❌ NOT EXECUTED |
| Mark order ready | Kitchen → Order → Mark complete | Status updated, server notified | ❌ NOT EXECUTED |
| Special instructions | Order detail → Notes field | Allergen/preference notes visible | ❌ NOT EXECUTED |
| Void item | Kitchen → Item → Void | Item removed, manager notified | ❌ NOT EXECUTED |

### Role: Store

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Receive stock | Inventory → Receive → Scan items | Stock levels updated | ❌ NOT EXECUTED |
| Transfer stock | Inventory → Transfer → Select location | Stock moved, audit trail created | ❌ NOT EXECUTED |
| Stock count | Inventory → Count → Enter actuals | Variance calculated, adjustments made | ❌ NOT EXECUTED |
| Supplier order | Purchasing → New order → Select supplier | PO created, supplier notified | ❌ NOT EXECUTED |

### Role: Accountant

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Day-end closing | Accounting → Day End → Calculate | Revenue, expenses, profit calculated | ❌ NOT EXECUTED |
| Journal entries | Accounting → Journal → New entry | Entry posted, GL updated | ❌ NOT EXECUTED |
| Financial reports | Accounting → Reports → P&L | P&L, Balance Sheet, Cash Flow accurate | ❌ NOT EXECUTED |
| Tax calculation | Accounting → Reports → Tax | Tax amounts correct per jurisdiction | ❌ NOT EXECUTED |

### Role: Auditor

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Audit log review | Admin → Audit Log → Filter by date | All actions logged with user/timestamp | ❌ NOT EXECUTED |
| Transaction trail | Any transaction → View history | Complete modification history shown | ❌ NOT EXECUTED |
| Data export | Admin → Export → Select range | CSV/PDF exported, consistent with system | ❌ NOT EXECUTED |
| Access control review | Admin → Roles → View permissions | Role-permission mapping visible | ❌ NOT EXECUTED |

### Role: Employee

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Clock in/out | Employee → Attendance → Clock In | Timestamp recorded, shift tracked | ❌ NOT EXECUTED |
| View schedule | Employee → My Schedule | Shifts displayed, swap request possible | ❌ NOT EXECUTED |
| Request leave | Employee → Leave → New request | Request submitted, manager notified | ❌ NOT EXECUTED |
| Payroll view | Employee → My Payroll | Payslip, deductions, net pay shown | ❌ NOT EXECUTED |

### Role: Administrator

| Test Case | Steps | Expected Result | Status |
|:----------|:------|:----------------|:------:|
| Tenant management | Admin → Tenants → Create/Edit | Tenant created, isolated | ❌ NOT EXECUTED |
| Role configuration | Admin → Roles → Create/Assign | Permissions enforced | ❌ NOT EXECUTED |
| System settings | Admin → Settings → Configure | Settings persist, apply globally | ❌ NOT EXECUTED |
| Backup management | Admin → Backup → Trigger/Verify | Backup complete, integrity verified | ❌ NOT EXECUTED |

---

## UAT Summary

| Category | Count | Verdict |
|----------|:-----:|:--------|
| Test Cases Defined | 40 | ✅ Complete UAT matrix prepared |
| Test Cases Executed | 0 | ❌ NOT EXECUTED |
| PASS | 0 | — |
| FAIL | 0 | — |
| NOT VERIFIED | 40 | ❌ No production deployment |

**Acceptance Verdict**: ❌ NOT ACCEPTED — UAT cannot proceed without deployed system and customer participation.

---

## Pre-UAT Readiness Checklist

| Prerequisite | Status | Notes |
|:-------------|:------:|:------|
| Production deployment complete | ❌ NOT VERIFIED | No server provisioned |
| Test data loaded | ❌ NOT VERIFIED | No customer data available |
| User accounts created | ❌ NOT VERIFIED | No tenant configuration |
| Network accessible | ❌ NOT VERIFIED | No domain/DNS configured |
| SSL valid | ❌ NOT VERIFIED | No certificates obtained |
| Support team briefed | ❌ NOT VERIFIED | No support team assigned |
| UAT schedule confirmed | ❌ NOT VERIFIED | No customer engagement |
| UAT environment stable | ❌ NOT VERIFIED | Not deployed |
| Rollback plan ready | ✅ VERIFIED | `scripts/deploy/restore.sh` exists |
| Data backup verified | ❌ NOT VERIFIED | No backup storage |
