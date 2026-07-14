# DeepaBMS Engineering Roadmap

## Phase 2 — Foundation Hardening (Complete)

### Objective
Security hardening, technical debt reduction, testing foundation, domain modeling all complete.

### Completed Tasks

| # | Task | Priority | Effort | Status |
|---|---|---|---|---|
| P2-1 – P2-6A | All security + structural items | Critical–High | Cumulative | ✅ **Complete** |
| P3-0 | Enterprise domain model (13 aggregates, 53 events, 38 contracts, 12 services) | High | 8h | ✅ **Complete** |

### Remaining P2 Items (Deferred)

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| P2-6B | Split frontend buildSeed.ts into domain seeds | High | 4h | Backend seeds done; frontend deferred |
| P2-7 | Remove inline reducer from StoreContext | High | 2h | |
| P2-8 | Deduplicate user definitions | High | 1h | |
| P2-9 – P2-14 | Testing & cleanup | Medium | Cumulative | All medium priority |

### Key Deliverables (Phase 2)
- Secure authentication pipeline
- Cleaned-up backend configuration
- Domain-oriented backend with 9 route modules + seed framework (index.ts: 433 → ~170 lines)
- Enterprise domain model documentation (11 files + ADR-0006)
- Technical debt score improvement: 6/10 → 9.0/10 (overall)

---

## Phase 3 — Feature Completion (Complete)

### Objective
All business features implemented: Inventory, Purchasing, Restaurant, Bar.

### Completed Tasks

| # | Task | Priority | Effort | Dependencies | Notes |
|---|---|---|---|---|---|
| P3-1 | Inventory Domain Engine | High | 8h | P2-6A, P3-0 | Ledger-based: 84 seeded items, 14 movement types, FIFO/WA costing, 5 services, 16 API endpoints, 59 test cases, ADR-0007 |
| P3-2 | Purchasing & Procurement Domain | High | 12h | P3-1, P3-0 | 12 suppliers, 11 status state machine, goods receipt → inventory ledger, landed cost, supplier performance, 30 API endpoints, 61 test cases, ADR-0008 |
| P3-3 | Restaurant Order Management & Kitchen KOT Engine | High | 14h | P3-1, P3-0 | 12 tables, 26 menu items, 11-status order lifecycle, KOT queue with station routing, recipe-based inventory consumption, billing, 35 endpoints, 72 test cases, ADR-0009 |
| P3-4 | Enterprise Bar & Peg Management Engine | High | 14h | P3-1, P3-0 | 15 brands, 30 bottles, 6 peg sizes, 5 pricing tiers, 12-status bottle lifecycle, fixed-point peg engine, excise compliance, 45 endpoints, 171 test cases, ADR-0010 |

## Phase 4 — Platform Enhancement (Current)

### Objective
Implement Financial Core (accounting), payroll, GST, and reporting enhancements.

### Completed

| # | Task | Priority | Effort | Dependencies | Notes |
|---|---|---|---|---|---|
| P4-1 | Hotel Property Management System | High | 16h | P3-0, P3-1 | Full PMS: 6 room types, 20 rooms, 5 guests, 8-status reservation lifecycle (inquiry→reserved→confirmed→checked_in→checked_out→completed + cancelled/no_show), unified folio billing with 11 charge categories, housekeeping workflow, maintenance tracking, night audit with ADR/RevPAR metrics, 70+ API endpoints, 251 test cases, ADR-0011 |
| P4-2 | Financial Core Accounting System | High | 12h | P3-0, P4-1 | Full double-entry accounting engine: hierarchical chart of accounts (46 accounts, 5-root hierarchy, Indian accounting codes 1–5), double-entry journal posting with balanced invariant, auto-posting from 5 operational domains (restaurant, bar, hotel, purchasing, inventory), GST input/output tracking with 0/5/12/18/28 rates + Kerala TOT, banking operations (deposit/withdraw/transfer/reconciliation), 8 financial reports (trial balance, P&L, balance sheet, cash flow, day book, cash book, bank book, account statement), financial period management, month-end/year-end closing, 65+ API endpoints with per-route RBAC, 163 test cases, ADR-0012 |
| P4-3 | Enterprise Business Intelligence & Executive Analytics | High | 10h | P3-0, P4-2 | Production-grade BI layer: materialized summary architecture (daily/weekly/monthly/yearly summaries), 50+ KPIs across 11 categories (revenue, occupancy, restaurant, bar, inventory, purchasing, finance, gst, excise, hotel, employee), 9 role-specific executive dashboards (owner, manager, accountant, restaurant, bar, hotel, inventory, purchasing, finance), trend analysis + anomaly detection + forecasting, TTL-based caching layer, exportable reports (CSV/Excel/PDF-ready), cross-module KPI validation reconciling with accounting ledger, 74 API endpoints with per-route RBAC, 153 test cases, ADR-0013 |
| P4-4 | Enterprise HRMS & Payroll Automation Platform | High | 16h | P3-0, P4-2, P4-3 | Complete HR lifecycle: 24 database tables, 20 entity aggregates (departments, designations, employees, shifts, attendance, leave types, leave balances, leave applications, salary structures, payroll runs, employee payrolls, loans, advances, reimbursements, performance reviews, training, disciplinary, exit), payroll engine with PF (12% capped 1800), ESI (0.75%/3.25% ≤21000), PT (200 ≥15000), OT (2× hourly), attendance engine with multi-shift/night-shift/split-shift support, grace periods, late/early detection, overtime tracking, corrections workflow, leave management with 8 configurable types (CL/SL/EL/CO/ML/PL/LOP/BR) with carry-forward and encashment, loan/advance with EMI/recovery tracking, reimbursement workflow, performance reviews, training records, disciplinary actions, exit process with clearance pipeline, accounting integration stubs (auto-journal generation for payroll), analytics integration stubs (payroll cost/headcount KPIs), 84 REST endpoints with per-route RBAC, 217 test cases across 20 categories, ADR-0014 |

### Remaining

| # | Task | Priority | Effort | Dependencies | Notes |
|---|---|---|---|---|---|
| P4-5 | Employee self-service portal (mobile) | High | 8h | P4-4 | Attendance marking, leave apps, payslips, profile |
| P4-6 | Biometric device integration | Medium | 6h | P4-4 | Adapters for Mantra/BioMax/ZKTeco |
| P4-7 | GST return filing aid (GSTR-1 export) | High | 6h | P3-0 | Leverages accounting GST registers |
| P4-8 | Stock reconciliation reports | Medium | 4h | P3-1, P3-2 | |
| P4-9 | Automated snapshot scheduler | Medium | 4h | P4-3 | Cron-based daily/weekly/monthly summary computation |
| P4-10 | Recruitment module | Low | 8h | P4-4 | Job postings, applicant tracking |
| P4-11 | Compliance reports (PF/ESI/Form 16) | Low | 6h | P4-4 | Statutory compliance |
| P4-12 | Bar inventory barcode scanning | Medium | 6h | P3-4 | |
| P4-10 | Multi-branch support preparation | Low | 8h | | |
| P4-11 | Financial reporting dashboards | Low | 4h | P4-2 | |

### Key Deliverables (Phase 3)
- Ledger-based inventory engine with 14 movement types (purchase, sale, consumption, transfer, physical count, damage, expiry, etc.)
- FIFO primary / weighted-average architecture-ready costing
- 84 deterministic seed items across 6 categories (food, softdrink, kitchen, consumables, amenities, packaging)
- 16 REST API endpoints with per-route RBAC (owner, manager, fnb, accountant, auditor)
- 59 test cases covering repository, services, aggregate invariants, validation, and edge cases
- ADR-0007 documenting ledger architecture, movement strategy, negative stock prevention, optimistic locking, and future warehouse/batch/barcode/serial extensions
- Validation service with 12 validators (field, movement, conversion) and bulk async validation
- **Purchasing domain** with 12 suppliers, 5+ sample POs, 11-status state machine (Draft→Submitted→Approved→Ordered→Partially Received→Received→Invoiced→Closed + Cancelled/Returned/Rejected), 18 transitions with RBAC per transition
- Goods receipt is sole mechanism for stock increases — creates inventory ledger `purchase` movements automatically
- Landed cost calculation (line total + freight + tax + other − discount, proportional allocation)
- Supplier performance tracking (total POs, spend, on-time delivery, quality rating, return rate)
- 30 REST API endpoints with per-route RBAC across 6 resource types (POs, suppliers, receipts, invoices, returns, events)
- 61 test cases across 10 suites (supplier CRUD, PO lifecycle, state machine, goods receipt, invoices, returns, events, validation, cost calculation, GST/Excise hooks, discrepancies, reporting)
- GST input credit calculation + Kerala Excise compliance hooks
- ADR-0008 documenting purchasing architecture, state machine design, inventory integration, and trade-offs
- **Restaurant domain** with 12 tables, 7 categories, 26 menu items, 5 kitchen stations, 6 recipes, 11-status order state machine (Draft→Open→Confirmed→Preparing→Ready→Served→Completed→Paid + Cancelled/Voided/Refunded)
- KOT engine with station-based routing, priority queuing, full lifecycle (Pending→Acknowledged→Preparing→Ready→Served + Recall/Refire/Cancelled)
- Recipe-based inventory consumption — exclusive consumer of food inventory (no bypass)
- Table management with occupancy, transfer, status tracking
- Billing engine (subtotal, discounts, service charge, GST, rounding, split payments, change calculation)
- 35 REST API endpoints with per-route RBAC across 11 resource types (tables, menu, recipes, stations, orders, items, KOT, bills, payments, events, sessions)
- 72 test cases across 12 suites (order lifecycle, KOT queue, recipe consumption, billing, table management, ingredient checking, state machine, permissions, edge cases)
- ADR-0009 documenting restaurant architecture, KOT engine, state machine, inventory integration, and trade-offs
- **Bar domain** with 15 brands (6 categories), 30 bottles (8 sizes), 6 peg definitions (30-180ml), 12-status bottle state machine (purchased→received→stored→opened→active↔partially_consumed→empty→archived + broken/written_off/returned)
- Fixed-point peg engine with integer milliliter precision, configurable peg sizes, automatic bottle switching when a bottle runs out
- Multi-tier pricing (MRP, bar price, happy hour, promotional, member) with fallback chain
- Kerala Excise compliance with daily register, brand register, and bottle register generation
- Pour logging at individual pour granularity for bartender tracking
- 45 REST API endpoints with per-route RBAC across 13 resource types (categories, brands, bottles, pegs, prices, sales, lines, openings, closings, transfers, movements, excise, events)
- 171 test cases across 10 suites (peg engine, bottle lifecycle, bar sales, inventory integration, excise, pricing, reporting, state machine/permissions, validation, edge cases)
- 14 new database tables: liquor_categories, liquor_brands, liquor_bottles, peg_definitions, peg_prices, bar_sales, bar_sale_lines, bottle_openings, bottle_closings, bottle_transfers, liquor_movements, excise_register, pour_log, bar_events
- ADR-0010 documenting bar architecture, bottle lifecycle, peg strategy, excise model, and trade-offs
- **Financial Core**: double-entry accounting engine, hierarchical chart of accounts (46 accounts), auto-posting from 5 operational domains, GST/Kerala TOT tracking, banking (deposit/withdraw/transfer/reconciliation), 8 financial reports, financial period management, month-end/year-end closing, 65+ API endpoints with per-route RBAC, 163 test cases, ADR-0012
- **BI Layer**: materialized summary architecture with daily/weekly/monthly/yearly aggregation tables, 50+ KPIs across 11 categories (revenue, occupancy, restaurant, bar, inventory, purchasing, finance, gst, excise, hotel, employee), 9 role-specific executive dashboards, trend analysis + anomaly detection + forecasting, TTL-based caching, cross-module KPI validation reconciling with accounting ledger, 74 API endpoints with per-route RBAC, 153 test cases, ADR-0013
- 6 new analytics database tables: kpi_definitions, dashboard_configs, daily_summaries, weekly_summaries, monthly_summaries, yearly_summaries, analytics_cache, analytics_events
---

## Phase 5 — Production Readiness

### Objective
Security hardening, performance benchmarks, documentation completion.

### Tasks

| # | Task | Priority | Effort |
|---|---|---|---|
| P5-1 | Full security audit remediation | Critical | 8h |
| P5-2 | Performance profiling + optimization | High | 8h |
| P5-3 | Complete API documentation (OpenAPI) | High | 4h |
| P5-4 | Deployment guide + runbook | Medium | 4h |
| P5-5 | E2E test suite (Detox) | Medium | 16h |
| P5-6 | GDPR/data privacy review | Medium | 4h |

---

## Future Ideas (Backlog)

| Idea | Value | Effort | Notes |
|---|---|---|---|
| POS terminal integration | High | Large | Bluetooth printer + barcode |
| QR code ordering (customer) | High | Medium | Web-based menu |
| AI business insights | Medium | Large | ML on sales data |
| WhatsApp invoice sharing | Medium | Medium | Twilio/WhatsApp API |
| Kitchen Display System (KDS) | Medium | Large | Real-time order display |
| Online ordering integration | Medium | Medium | Zomato/Swiggy API |
| Cloud backup (S3/Google Drive) | Medium | Medium | Automated offsite backup |
| Multi-language support | Low | Large | i18n framework |
