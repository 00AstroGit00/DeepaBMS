# Enterprise Bar & Peg Management Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           BAR LIQUOR DOMAIN (P3-4)                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────┐    ┌──────────────────────┐   │
│  │   Routes      │───→│         Services            │───→│     Repository       │   │
│  │   45 endpoints│    │  PegEngineService            │    │  14 tables           │   │
│  └──────────────┘    │  BottleLifecycleService       │    │  55+ methods         │   │
│                      │  BarSaleService               │    └──────────┬───────────┘   │
│  ┌──────────────┐    │  BarInventoryService          │               │               │
│  │  Middleware   │    │  ExciseService                │    ┌─────────┴──────────┐   │
│  │  auth + RBAC │    │  PricingService               │    │ liquor_categories  │   │
│  └──────────────┘    │  ReportingService             │    │ liquor_brands      │   │
│                      │  ValidationService            │    │ liquor_bottles     │   │
│                      └───────────────────────────────┘   │ peg_definitions     │   │
│                                         │                │ peg_prices          │   │
│                                         ▼                │ bar_sales           │   │
│                                ┌────────────────────┐    │ bar_sale_lines      │   │
│                                │   Inventory Ledger  │    │ bottle_openings     │   │
│                                │   (consumption)     │    │ bottle_closings     │   │
│                                └────────────────────┘    │ bottle_transfers    │   │
│                                                          │ liquor_movements    │   │
│  ┌──────────────┐                                        │ excise_register     │   │
│  │  Seed Module  │                                       │ pour_log            │   │
│  │  15 brands    │                                       │ bar_events          │   │
│  │  30 bottles   │                                       └─────────────────────┘   │
│  │  6 peg sizes  │                                                                 │
│  └──────────────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
liquor_categories (1) ──→ liquor_brands (N) ──→ liquor_bottles (N) ──→ liquor_movements (N)
                              │                                              │
                              │                                    pour_log (N) ──→ bar_sale_lines (N)
                              │                                              │
                              │                                     bar_sales (1)
                              │
                              ├── peg_prices (N) ──→ peg_definitions (1)
                              │
                              └── excise_register (N)

bottle_openings (N) ──→ liquor_bottles (1) ←── bottle_closings (N)
                                                  bottle_transfers (N)
```

## Bottle State Machine

```
                    ┌──────────┐
                    │PURCHASED │
                    └────┬─────┘
                         │ receive (barstaff/manager)
                    ┌────▼─────┐
                    │ RECEIVED │
                    └────┬─────┘
                         │ store (barstaff/manager)
                    ┌────▼─────┐
                    │  STORED  │
                    └────┬─────┘
                    ┌────┴────────────┐
                    │                 │
               ┌────▼──────┐   ┌─────▼──────┐
               │  OPENED   │   │TRANSFERRED │
               └────┬──────┘   └─────┬──────┘
                    │                │ (to another location)
               ┌────▼──────┐         │
               │  ACTIVE   │◄────────┘
               └────┬──────┘
                    │
          ┌─────────┴──────────┐
          │                    │
   ┌──────▼──────────┐   ┌────▼───────┐
   │PARTIALLY_CONSUMED│   │  BROKEN    │
   └──────┬──────────┘   └────┬────────┘
          │                   │
     ┌────▼──────┐      ┌────▼───────────┐
     │   EMPTY   │      │  WRITTEN_OFF   │
     └────┬──────┘      └────┬───────────┘
          │                   │
     ┌────▼─────────┐   ┌────▼───────────┐
     │   RETURNED   │   │                │
     └────┬─────────┘   │                │
          │             │                │
     ┌────▼─────────────▼────────────────▼──┐
     │              ARCHIVED                │
     └──────────────────────────────────────┘
```

## API Endpoints (45 total)

### Categories
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/categories` | owner, manager, barstaff, accountant, auditor |
| POST | `/api/liquor/categories` | owner, manager |
| PUT | `/api/liquor/categories/:id` | owner, manager |
| DELETE | `/api/liquor/categories/:id` | owner, manager |

### Brands
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/brands` | owner, manager, barstaff, accountant, auditor |
| GET | `/api/liquor/brands/:id` | owner, manager, barstaff |
| GET | `/api/liquor/brands/by-category/:categoryId` | owner, manager, barstaff |
| POST | `/api/liquor/brands` | owner, manager |
| PUT | `/api/liquor/brands/:id` | owner, manager |
| DELETE | `/api/liquor/brands/:id` | owner, manager |

### Bottles
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/bottles` | owner, manager, barstaff, accountant, auditor |
| GET | `/api/liquor/bottles/:id` | owner, manager, barstaff |
| GET | `/api/liquor/bottles/active` | owner, manager, barstaff |
| GET | `/api/liquor/bottles/summary` | owner, manager, accountant, auditor |
| POST | `/api/liquor/bottles` | owner, manager |
| POST | `/api/liquor/bottles/bulk` | owner, manager |
| PUT | `/api/liquor/bottles/:id` | owner, manager |
| POST | `/api/liquor/bottles/:id/open` | owner, manager, barstaff |
| POST | `/api/liquor/bottles/:id/close` | owner, manager, barstaff |
| POST | `/api/liquor/bottles/:id/transfer` | owner, manager |
| POST | `/api/liquor/bottles/:id/transition` | owner, manager, barstaff |

### Peg Definitions
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/peg-definitions` | owner, manager, barstaff |
| POST | `/api/liquor/peg-definitions` | owner, manager |
| PUT | `/api/liquor/peg-definitions/:id` | owner, manager |

### Peg Prices
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/peg-prices` | owner, manager, barstaff, auditor |
| POST | `/api/liquor/peg-prices` | owner, manager |
| POST | `/api/liquor/peg-prices/bulk-update` | owner, manager |

### Sales
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/sales` | owner, manager, barstaff, accountant, auditor |
| GET | `/api/liquor/sales/:id` | owner, manager, barstaff |
| POST | `/api/liquor/sales` | owner, manager, barstaff |
| PUT | `/api/liquor/sales/:id/complete` | owner, manager, barstaff |
| PUT | `/api/liquor/sales/:id/cancel` | owner, manager |
| PUT | `/api/liquor/sales/:id/refund` | owner, manager |

### Excise
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/excise` | owner, manager, accountant, auditor |
| POST | `/api/liquor/excise/generate-daily` | owner, manager |
| PUT | `/api/liquor/excise/:id/verify` | owner, manager |
| PUT | `/api/liquor/excise/:id/approve` | owner |

### Reports
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/reports/brand-performance` | owner, manager, accountant, auditor |
| GET | `/api/liquor/reports/peg-variance` | owner, manager, accountant, auditor |
| GET | `/api/liquor/reports/bartender-performance` | owner, manager |
| GET | `/api/liquor/reports/bottle-summary` | owner, manager, accountant, auditor |

### Movements / Events
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/liquor/movements` | owner, manager, accountant, auditor |
| GET | `/api/liquor/events` | owner, manager, auditor |

## File Structure

```
src/domains/liquor/
├── liquor.types.ts        # All domain types, enums, state machines, DTOs
├── liquor.repository.ts   # SQLite implementation (55+ methods, 14 tables)
├── liquor.service.ts      # Business logic (7 service modules)
├── liquor.routes.ts       # REST API (45 endpoints)
└── liquor.seed.ts         # Deterministic seed (15 brands, 30 bottles, 6 peg sizes, sample sales)

tests/liquor.test.ts       # 169 test cases across 10 suites
```

## Inventory Consumption Flow

```
Bar Sale Completed
  │
  ├─► FOR each non-cancelled line:
  │     ├─► Look up brand
  │     ├─► Find active bottle(s) of this brand
  │     ├─► Calculate required_ml = pegSizeMl × quantity
  │     ├─► WHILE required_ml > 0:
  │     │     ├─► Get current bottle's available_ml
  │     │     ├─► consume_ml = min(required_ml, available_ml)
  │     │     ├─► Bottle.currentMl -= consume_ml
  │     │     ├─► Record liquor_movement (kind='sale')
  │     │     ├─► Record pour_log entry
  │     │     ├─► If bottle.currentMl === 0 → status = 'empty'
  │     │     ├─► If bottle.currentMl < initialMl → status = 'partially_consumed'
  │     │     ├─► required_ml -= consume_ml
  │     │     └─► If required_ml > 0 → switch to next bottle (bottle_switch)
  │     └─► (next line)
  │
  ├─► Update inventory ledger (if inventory item exists)
  ├─► Record BAR_SALE_COMPLETED event
  └─► Return completed sale
```

## Peg Pricing Fallback Chain

```
Requested Tier exists? ──Yes──→ Use it
      │
      No
      │
      ▼
   bar_price exists? ──Yes──→ Use it
      │
      No
      │
      ▼
   mrp exists? ──Yes──→ Use it
      │
      No
      │
      ▼
   Calculate proportionally:
   price = bottleSellingPrice × (pegSizeMl / bottleSizeMl)
```
