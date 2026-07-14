# Inventory Domain Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       INVENTORY DOMAIN                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────────┐  │
│  │  Routes       │───→│    Services      │───→│   Repository       │  │
│  │  (REST API)   │    │                  │    │   (SQLite)         │  │
│  └──────────────┘    │  StockService     │    └────────┬───────────┘  │
│                      │  CostService      │             │              │
│  ┌──────────────┐    │  ReorderService   │    ┌───────┴────────┐     │
│  │  Middleware   │    │  ValidationService │   │  inventory      │     │
│  │  (auth/authz) │    │  MovementService  │   │  (current state) │     │
│  └──────────────┘    └─────────────────┘   │  inventory_ledger │     │
│                                            │  (append-only)     │     │
│  ┌──────────────┐                           └──────────────────┘     │
│  │  Seed Module  │    ┌─────────────────┐                            │
│  │  (deterministic) │  │  Domain Events   │                          │
│  └──────────────┘    │  InventoryCreated │                           │
│                       │  MovementRecorded │                          │
│                       │  StockLow         │                          │
│                       │  StockOut         │                          │
│                       └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/domains/inventory/
├── inventory.types.ts       # Domain types, DTOs, enums, constants
├── inventory.repository.ts  # SQLite implementation (14 queries, 18 methods)
├── inventory.service.ts     # Business logic (5 service objects)
├── inventory.routes.ts      # REST API (14 endpoints)
└── inventory.seed.ts        # Deterministic seed (75 items across 6 categories)

tests/inventory.test.ts      # 59 test cases across 6 suites
```

## Data Flow

### Stock Movement Flow
```
Client → POST /api/inventory/:id/movements
  → auth.middleware (authenticate, authorize)
  → inventory.routes (validate kind + quantity)
  → StockService.recordMovement
    → repo.findById (current state)
    → validate stock >= 0
    → repo.adjustStock (UPDATE inventory WHERE id AND version)
    → repo.recordMovement (INSERT inventory_ledger)
  → Response { item, movement }
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/inventory` | owner, manager, fnb, auditor | List items (paginated, filterable) |
| GET | `/api/inventory/:id` | owner, manager, fnb, auditor | Get single item |
| POST | `/api/inventory` | owner, manager, fnb | Create item with opening stock |
| PUT | `/api/inventory/:id` | owner, manager, fnb | Update item fields |
| DELETE | `/api/inventory/:id` | owner, manager | Archive (soft delete) |
| POST | `/api/inventory/:id/movements` | owner, manager, fnb | Record movement |
| GET | `/api/inventory/:id/movements` | owner, manager, fnb, auditor | Movement history |
| POST | `/api/inventory/:id/transfer` | owner, manager, fnb | Transfer (in + out) |
| POST | `/api/inventory/:id/count` | owner, manager, fnb | Physical count |
| GET | `/api/inventory/reports/summary` | owner, manager, fnb, accountant, auditor | Summary stats |
| GET | `/api/inventory/reports/low-stock` | owner, manager, fnb | Low stock items |
| GET | `/api/inventory/reports/reorder-suggestions` | owner, manager, fnb | Reorder quantities |
| GET | `/api/inventory/reports/valuation` | owner, manager, accountant, auditor | Inventory value |
| GET | `/api/inventory/movements/all` | owner, manager, fnb, auditor | All movements (filtered) |
| GET | `/api/inventory/search/:query` | owner, manager, fnb, auditor | Search items |
| POST | `/api/inventory/bulk` | owner, manager | Bulk create |

## Movement Kinds (14)

purchase, sale, consumption, transfer_in, transfer_out, adjustment,
physical_count, damage, expiry, supplier_return, customer_return,
complimentary, opening_balance, closing_adjustment

## Current State vs Ledger

```
inventory (current state)      inventory_ledger (history)
┌────────────────────────┐     ┌─────────────────────────────────┐
│ id: "inv-abc"         │     │ id: "inv-def"                   │
│ name: "Chicken"       │     │ item_id: "inv-abc"              │
│ stock: 12              │     │ quantity: 20                    │
│ version: 5             │     │ quantity_before: -8             │
│ cost: 210              │     │ quantity_after: 12              │
└────────────────────────┘     │ kind: "purchase"                │
                               │ operator: "Rajan"               │
                               │ timestamp: "2026-07-13T..."     │
                               └─────────────────────────────────┘
```

## Key Design Decisions

1. **Ledger-based**: Stock is never mutated directly — all changes flow through the movement ledger
2. **Immutable ledger**: Once recorded, movements cannot be edited or deleted
3. **Before/after quantities**: Every movement records the exact state change
4. **Optimistic locking**: Version column prevents concurrent write conflicts
5. **Negative stock prevention**: Enforced at both service and repository layers
6. **14 movement types**: Covers all ERP scenarios (purchase, sale, consumption, transfer, adjustment, etc.)
7. **Soft delete**: `is_active` flag instead of physical deletion
8. **Category expansion**: Added `liquor`, `packaging`, `amenities` to support bar, hotel, and kitchen
