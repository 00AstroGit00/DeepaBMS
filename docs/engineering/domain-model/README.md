# DeepaBMS Enterprise Domain Model

## Business Domain Map

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DEEPA BMS DOMAINS                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   CORE OPERATIONS   │  │  BACK OFFICE      │  │  COMPLIANCE      │  │  INFRASTRUCTURE  │ │
│  ├─────────────────────┤  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤ │
│  │ Restaurant (F&B)    │  │ Inventory Mgmt   │  │ GST              │  │ Auth / Users     │ │
│  │ Bar / Liquor        │  │ Purchasing        │  │ Kerala Excise    │  │ Sync Engine      │ │
│  │ Hotel / Rooms       │  │ Suppliers         │  │ Tax Calculation  │  │ Audit Log        │ │
│  │ POS / Sales         │  │ Customers/Credits │  │ Audit Trail      │  │ Configuration    │ │
│  │ Kitchen             │  │ Banking           │  │                  │  │ Backup           │ │
│  │ Reservations        │  │ Cash Management   │  │                  │  │ Notifications    │ │
│  └─────────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                                            │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │
│  │   HR & PAYROLL      │  │   FINANCE         │  │   ANALYTICS      │                       │
│  ├─────────────────────┤  ├──────────────────┤  ├──────────────────┤                       │
│  │ Employees           │  │ DayBook / Txns   │  │ Dashboard        │                       │
│  │ Attendance          │  │ Accounting        │  │ Reports          │                       │
│  │ Payroll             │  │ Ledger            │  │ Analytics        │                       │
│  │ Leaves              │  │ P&L / Balance     │  │ Export Engine    │                       │
│  │ Advances            │  │ Bank Reconcile    │  │ Templates        │                       │
│  │ Performance Reviews │  │                  │  │                  │                       │
│  └─────────────────────┘  └──────────────────┘  └──────────────────┘                       │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [Entity Catalogue](./entity-catalogue.md) | Every business entity with attributes, keys, relationships, lifecycle |
| 2 | [Aggregate Catalogue](./aggregate-catalogue.md) | Aggregate roots, boundaries, invariants |
| 3 | [Event Catalogue](./event-catalogue.md) | All business events that change system state |
| 4 | [State Machines](./state-machines.md) | Lifecycle diagrams with transitions, permissions, validation |
| 5 | [Transaction Boundaries](./transaction-boundaries.md) | Consistency, concurrency, rollback, compensation |
| 6 | [Domain Services](./domain-services.md) | Services outside entities (calculators, engines) |
| 7 | [Repository Contracts](./repository-contracts.md) | Read/write interfaces separated from persistence |
| 8 | [Event Integration](./event-integration.md) | Publishers, subscribers, integration architecture |
| 9 | [Architecture Guidelines](./architecture-guidelines.md) | Standards, patterns, conventions for all modules |
| 10 | [ADR-0006](../adr/ADR-0006-enterprise-domain-model.md) | Architecture Decision Record |

## Domain Dependency Graph

```
auth ──┬── sales ──┬── reporting
       │           └── accounting
       ├── hotel ──┼── reservations
       │           └── stays
       ├── inventory ──┬── purchasing
       │               └── suppliers
       ├── liquor ──┬── excise
       │            └── audit
       ├── employees ──┬── payroll
       │               ├── attendance
       │               └── leaves
       ├── banking ──┬── reconciliation
       │             └── cash management
       ├── credits ──┬── customers
       │             └── vendors
       ├── configuration
       ├── sync
       └── audit
```

No circular dependencies. Lower domains (auth, configuration) have zero dependencies.
