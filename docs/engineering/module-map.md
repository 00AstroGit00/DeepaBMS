# DeepaBMS Module Map

## Screen Modules (14)

| Screen | File | Lines | Status | Description |
|---|---|---|---|---|
| Dashboard | Dashboard.tsx | 386 | Complete | Executive dashboard with KPIs, charts, alerts |
| DayBook | DayBook.tsx | 883 | Complete | Double-column cash/bank journal, expense/income entry |
| Sales | Sales.tsx | ~500 | Complete | Sales register, department filtering |
| Hotel | Hotel.tsx | ~400 | Complete | Room management, check-in/out, guest register |
| Bar | Bar.tsx | 888 | Complete | Liquor stock, peg sales, purchases, audits |
| Inventory | Inventory.tsx | ~500 | Complete | F&B inventory tracking, stock moves |
| Credits | Credits.tsx | ~400 | Complete | Customer/vendor credit accounts |
| Banking | Banking.tsx | 1071 | Complete | Bank accounts, moves, statement import |
| Employees | Employees.tsx | 1138 | Partial | Staff mgmt, attendance, advances, reviews, docs |
| Reports | Reports.tsx | 784 | Complete | 8 report types, PDF/Excel/CSV export |
| Users | Users.tsx | ~300 | Complete | User CRUD, role assignment |
| Settings | Settings.tsx | 761 | Complete | Business config, sync config, theme, backup |
| Analytics | Analytics.tsx | ~300 | Complete | Revenue trends, dept performance, charts |
| EmployeeDashboard | EmployeeDashboard.tsx | ~500 | Complete | Employee self-service: profile, attendance, leave, payslips |

## Reducer Modules (10)

| Reducer | File | Lines | Domain |
|---|---|---|---|
| salesReducer | reducers/salesReducer.ts | 18 | Sales, checkout liquor sales |
| txnReducer | reducers/txnReducer.ts | ~20 | DayBook transactions |
| bankReducer | reducers/bankReducer.ts | ~50 | Bank moves, statements |
| hotelReducer | reducers/hotelReducer.ts | ~50 | Rooms, check-in/out |
| inventoryReducer | reducers/inventoryReducer.ts | ~40 | Inv items, stock moves |
| liquorReducer | reducers/liquorReducer.ts | ~50 | Liquor items, audits |
| creditsReducer | reducers/creditsReducer.ts | ~30 | Credit accounts, entries |
| employeesReducer | reducers/employeesReducer.ts | ~60 | Employees, leaves, reviews, docs |
| miscReducer | reducers/miscReducer.ts | 87 | Announcements, banks, users, audit, settings |
| rootReducer | store/rootReducer.ts | 104 | Combines all reducers + HYDRATE/RESET_DEMO |

## Utility Modules (13)

| Utility | File | Lines | Purpose |
|---|---|---|---|
| helpers | helpers.ts | 100 | inr, dateKey, uid, parseNum, pegStr, etc. |
| security | security.ts | 12 | constantTimeEqual |
| biometrics | biometrics.ts | 37 | Biometric auth wrappers |
| ThermalPrinter | ThermalPrinter.ts | 143 | Print receipts, checkout bills |
| fileExporter | fileExporter.ts | 81 | CSV/PDF export, file save |
| ledgerBuilders | ledgerBuilders.ts | 675 | 8 report generators |
| templateRenderers | templateRenderers.ts | 348 | PDF, Excel, CSV renderers |
| bankStatementParser | bankStatementParser.ts | 343 | Parse bank CSV files |
| payroll | payroll.ts | 98 | Salary computation |
| mediaPicker | mediaPicker.ts | 125 | Image/document pickers |
| useElectron | useElectron.ts | 115 | Electron IPC bridge |
| useLayout | useLayout.ts | 16 | Responsive layout hook |

## Component Modules (4)

| Component | File | Lines | Elements |
|---|---|---|---|
| Primitives | Primitives.tsx | 652 | 14 reusable components |
| Charts | Charts.tsx | 224 | BarChart, HBarChart, DonutLegend |
| ErrorBoundary | ErrorBoundary.tsx | 69 | Error boundary (class-based) |

## Backend Domain Modules (16)

> Note: 16 backend domain directories exist. "Validation" below is implemented
> as `middleware/validate.ts` (shared), not a domain folder.

| Domain | Files | APIs | Tests | Status |
|---|---|---|---|---|---|---|
| Auth | 3 | Login, register, verify, profile | 14 | Complete |
| Sales | 1 | Sales register CRUD | — | Existing |
| HR | 5 | Departments, designations, employees, shifts, attendance, leaves, payroll, loans, advances, reimbursements, performance, training, disciplinary, exit, self-service portal, reports, integration | 232 | **Complete** (P4-4 + P4-5) |
| Analytics | 5 | Executive dashboards, KPIs, trends, exports, events, summaries | 153 | **Complete** (P4-3) |
| Accounting | 5 | Chart of accounts, journals, auto-posting, GST, banking, reports, day book, periods, closing | 163 | **Complete** (P4-2) |
| Rooms | 5 | Hotel PMS: reservations, check-in/out, folio, housekeeping, maintenance, night audit | 251 | **Complete** (P4-1) |
| Inventory | 4 | Stock, movements, costing, reorder | 60 | **Complete** (P3-1) |
| Purchasing | 5 | PO, goods receipt, invoices, returns, suppliers | 67 | **Complete** (P3-2) |
| Restaurant | 5 | Orders, KOT, tables, menu, billing | 72 | **Complete** (P3-3) |
| Liquor | 5 | Bar, bottle lifecycle, pegs, sales, excise | 171 | **Complete** (P3-4) |
| Employees | 1 | Staff, attendance, advances | — | Legacy |
| Sync | 4 | Event-sourcing sync engine, device registry, checkpoint-based push/pull/full sync, conflict resolution, queue/retry, audit logging, heartbeat monitoring | 47 | **Complete** (P4-6) |
| Audit | 1 | Event log queries | — | Existing |
| Validation (middleware) | 1 | 12 validators (shared) | 26 | Complete |
| Workflow | 4 | Workflow engine (16 step types), business rules engine (8 categories), approval chains (10 categories, multi-level/delegation/expiry), notification platform (6 channels/8 categories/templates), scheduler (cron/interval/DLQ/calendar), event automation (20+ domain events), cross-domain pipelines (15), admin designer (CRUD/versioning/publish/simulation), audit | 109 | **Complete** (P4-7) |
| Platform | 4 | Health system (8 checks), monitoring & alerting (ring-buffer metrics, slow query detection, alert lifecycle), backup/restore (AES-256-GCM encryption, SHA-256 verification, TTL retention), deployment lifecycle, DR runbook & recovery simulation, ops dashboard, observability middleware (structured JSON logging, request ID tracing, audit events), monitoring middleware | 114 | **Complete** (P4-8) |
| AI | 11 | AI gateway (model routing, prompt library, context builder, conversation memory, tool invocation), business knowledge graph (17 domains with relationships), executive copilot (14 query types with data citations), forecasting engine (SMA/linear regression/exponential smoothing with confidence intervals), anomaly detection (10 categories with z-score/IQR/percentage change + severity ranking), recommendation engine (10 categories with rationale/benefit/confidence/approval), natural language query engine (9 intents with entity extraction), AI safety (prompt injection protection, RBAC-aware, tool permissions, audit logging, destructive action confirmation) | 173 | **Complete** (P4-9) |

## Infrastructure & Operations Modules (P5)

| Module | Type | Components | Status |
|---|---|---|---|
| Production Docker | Infra | Dockerfile.prod (multi-stage, distroless, non-root), .dockerignore, docker-compose.prod.yml (postgres/redis/backend/web + monitoring profile), nginx reverse proxy (gzip, security headers, rate limiting), .env.production.example | **Complete** (P5-1) |
| Kubernetes | Infra | k8s/base (namespace, configmap, secret, PVC, deployments ×4, services ×4, ingress, HPA), kustomize overlays (production/staging), 19 YAML files | **Complete** (P5-1) |
| Helm | Infra | helm/deepa-bms chart (Chart.yaml, values.yaml, 16 templates: deployments, services, ingress, hpa, configmap, secret, pvc, NOTES.txt, _helpers.tpl) | **Complete** (P5-1) |
| CI/CD | Infra | GitHub Actions (test/security/build/release/backup), GitLab CI mirror, composite setup action, CODEOWNERS, dependabot, semantic versioning + changelog scripts | **Complete** (P5-2) |
| Observability | Infra | Prometheus + Alertmanager + Grafana (2 dashboards), Loki + Promtail, OpenTelemetry collector, 9 alert rules, SLO/SLI config, incident response script | **Complete** (P5-3) |
| Database Ops | Infra | Migration framework (schema_migrations tracking), integrity verification, partition maintenance, retention cleanup, replication setup, production/incremental backup (GPG + S3), PITR + full restore | **Complete** (P5-4) |
| Multi-Tenant SaaS | Infra | tenant.ts middleware (X-Tenant-ID/subdomain, single-tenant fallback), feature-flags.ts middleware (plan-based toggles), SaaS architecture doc | **Complete** (P5-5) |
| Security Suite | Infra | dependency-scan.sh, container-scan.sh, sbom-generate.sh, owasp-check.sh, rotate-secrets.sh, soc2-readiness.sh, security hardening guide, penetration test checklist | **Complete** (P5-6) |
| Performance | Infra | Performance optimization report, load-test.sh (k6/autocannon), db-benchmark.sh | **Complete** (P5-7) |
| Disaster Recovery | Infra | failover.sh, failback.sh, recovery-test.sh, runbook.sh, DR guide | **Complete** (P5-8) |
| Documentation | Infra | ADR-0020 + 15 operations guides (deployment/operations/admin/SRE/DR/incident-response/performance/scaling/release-engineering/API/CI-CD/Helm/Docker/K8s) | **Complete** (P5-10) |
| Certification | Infra | Enterprise certification report (8.92/10), risk matrix, Go/No-Go report, release checklist | **Complete** (P5-11) |

## Feature Classification

| Feature | Status | Notes |
|---|---|---|
| Business Intelligence | **Complete** | Executive analytics, 50+ KPIs, 9 role dashboards, trends, exports (P4-3) |
| Executive Dashboard | **Complete** | 7-day trend, KPIs, expense breakdown |
| Day Book | **Complete** | Double-column cash/bank with opening/closing |
| Sales Register | **Complete** | Department-wise with GST breakdown |
| Hotel Room Management | **Complete** | Check-in/out, room status, guest register |
| Bar/Liquor Management | **Complete** | Full bar lifecycle backend with bottle tracking, peg engine, excise compliance (P3-4) |
| Inventory Management | **Complete** | Stock in/out/wastage, low-stock alerts, backend ledger engine |
| Purchasing & Procurement | **Complete** | Full procurement lifecycle backend (P3-2) |
| Restaurant Order Management | **Complete** | Full restaurant lifecycle backend with KOT engine (P3-3) |
| Hotel PMS | **Complete** | Full hotel PMS with reservations, unified folio, housekeeping, maintenance, night audit (P4-1) |
| Credit Management | **Complete** | Customer/vendor accounts, ageing |
| Banking | **Complete** | Moves, statements, reconciliation |
| Employee Management | **Complete** | Full HRMS: departments, designations, employees, shifts, attendance, leaves, payroll engine (PF/ESI/PT/OT), loans, advances, reimbursements, performance, training, disciplinary, exit (P4-4) |
| Reports & GST | **Complete** | 8 report types, PDF/Excel/CSV |
| Users & Access Control | **Complete** | 7 roles, PIN auth, audit log |
| Settings | **Complete** | Business config, theme, sync, backup |
| Analytics | **Complete** | Revenue, dept performance, charts |
| Biometric Authentication | **Complete** | Fingerprint/face login |
| Cloud Sync | **Complete** | LWW merge, polling, background |
| Thermal Printing | **Complete** | Receipt & checkout bill |
| Bank Statement Import | **Complete** | Multi-bank CSV parser |
| Payroll Computation | **Partial** | Logic is complete, UI integration partial |
| Windows Desktop | **Complete** | Electron shell with all features |
| Error Boundary | **Complete** | Global error handling |
