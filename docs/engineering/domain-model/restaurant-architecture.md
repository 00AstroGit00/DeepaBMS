# Restaurant Order Management & Kitchen Architecture

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           RESTAURANT DOMAIN                                       │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌──────────────┐    ┌───────────────────────┐    ┌───────────────────────────┐   │
│  │   Routes      │───→│      Services         │───→│      Repository           │   │
│  │   35 endpoints│    │  OrderWorkflowService │    │  14 tables + 30 indexes   │   │
│  └──────────────┘    │  KitchenEngineService │    └───────────┬───────────────┘   │
│                      │  RecipeService        │                │                    │
│  ┌──────────────┐    │  PricingService       │    ┌──────────┴──────────────┐    │
│  │  Middleware   │    │  TableService         │    │  dining_tables         │    │
│  │  auth + RBAC │    │  BillingService       │    │  menu_items            │    │
│  └──────────────┘    │  InventoryConsumption │    │  recipes               │    │
│                      └───────────────────────┘   │  restaurant_orders     │    │
│  ┌──────────────┐                    │            │  kot                   │    │
│  │  Seed Module │                    ▼            │  bills/payments        │    │
│  │  12 tables   │           ┌───────────────┐    │  dining_sessions       │    │
│  │  26 menu     │           │  Inventory     │    │  order_events          │    │
│  │  6 recipes   │           │  Ledger        │    └────────────────────────┘    │
│  └──────────────┘           │  (consumption) │                                  │
│                             └───────────────┘                                   │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
dining_tables (1) ──→ dining_sessions (N) ──→ restaurant_orders (N) ──→ order_events (N)
                      │                            │
                      │                     order_lines (N) ──→ menu_items (1)
                      │                            │
                      │                            └── kot_items (N) ──→ kot (1)
                      │                                              │
                      │                                      kitchen_stations (1)
                      │
               bills (N) ──→ payments (N)

menu_categories (1) ──→ menu_items (N) ──→ recipes (1) ──→ recipe_ingredients (N)
                                                     │
                                              inventory (N)
```

## Order State Machine

```
                  ┌──────────┐
                  │  DRAFT   │
                  └────┬─────┘
                       │ open (cashier/manager/owner/fnb/reception)
                  ┌────▼──────┐
                  │   OPEN    │
                  └────┬──────┘
                       │ confirm (cashier/manager/owner/fnb)
                  ┌────▼─────────┐
                  │  CONFIRMED   │ ← KOT generated here
                  └────┬─────────┘
                       │ prepare (fnb/manager/owner/kitchen)
                  ┌────▼──────────┐
                  │  PREPARING    │
                  └────┬──────────┘
                       │ ready (fnb/kitchen/manager)
                  ┌────▼──────┐
                  │   READY   │
                  └────┬──────┘
                       │ serve (fnb/manager/owner)
                  ┌────▼───────┐
                  │   SERVED   │
                  └────┬───────┘
                       │ complete (cashier/manager/owner/fnb)
                  ┌────▼─────────┐
                  │  COMPLETED   │ ← Inventory consumed here
                  └────┬─────────┘
                       │ pay (cashier/manager/owner)
                  ┌────▼────┐
                  │  PAID   │ ← Table released
                  └─────────┘

  Cancelled: from any state (manager/owner)
  Voided: from open/confirmed/preparing (manager/owner — fraud prevention)
  Refunded: from served (manager/owner)
```

## KOT Lifecycle

```
Pending → Acknowledged → Preparing → Ready → Served
   │          │              │          │        │
   └── Recall ┴──── Recall ─┴─ Refire ─┴────────┘
   │
   └── Cancelled (manager/owner)
```

## API Endpoints (35 total)

### Tables
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/tables` | owner, manager, fnb, reception, cashier |
| GET | `/api/restaurant/tables/:id` | owner, manager, fnb, reception |
| POST | `/api/restaurant/tables` | owner, manager |
| PUT | `/api/restaurant/tables/:id` | owner, manager |
| GET | `/api/restaurant/tables/occupancy` | owner, manager, fnb, reception |

### Menu
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/menu/categories` | owner, manager, fnb, cashier, kitchen |
| POST | `/api/restaurant/menu/categories` | owner, manager |
| GET | `/api/restaurant/menu/items` | owner, manager, fnb, cashier, kitchen |
| GET | `/api/restaurant/menu/items/:id` | owner, manager, fnb, cashier, kitchen |
| POST | `/api/restaurant/menu/items` | owner, manager |
| PUT | `/api/restaurant/menu/items/:id` | owner, manager |

### Recipes
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/menu/items/:menuItemId/recipe` | owner, manager, fnb, kitchen |
| POST | `/api/restaurant/menu/items/:menuItemId/recipe` | owner, manager |
| GET | `/api/restaurant/menu/ingredient-check` | owner, manager, fnb |

### Kitchen Stations
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/kitchen/stations` | owner, manager, fnb, kitchen |
| POST | `/api/restaurant/kitchen/stations` | owner, manager |

### Orders
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant` | owner, manager, fnb, cashier, kitchen, auditor |
| GET | `/api/restaurant/:id` | owner, manager, fnb, cashier, kitchen, auditor |
| POST | `/api/restaurant` | cashier, manager, owner, fnb, reception |
| POST | `/api/restaurant/:id/items` | cashier, manager, owner, fnb |
| PUT | `/api/restaurant/:id/items/:lineId` | cashier, manager, owner, fnb |
| DELETE | `/api/restaurant/:id/items/:lineId` | cashier, manager, owner |

### Order Workflow
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/restaurant/:id/confirm` | cashier, manager, owner, fnb |
| POST | `/api/restaurant/:id/prepare` | fnb, manager, owner, kitchen |
| POST | `/api/restaurant/:id/ready` | fnb, kitchen, manager |
| POST | `/api/restaurant/:id/serve` | fnb, manager, owner |
| POST | `/api/restaurant/:id/complete` | cashier, manager, owner, fnb |
| POST | `/api/restaurant/:id/cancel` | manager, owner |
| GET | `/api/restaurant/:id/transitions` | owner, manager, fnb, cashier, kitchen |

### Kitchen (KOT)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/restaurant/:id/kot` | fnb, manager, owner, cashier |
| GET | `/api/restaurant/kitchen/queue` | fnb, kitchen, manager |
| PUT | `/api/restaurant/kitchen/kot/:kotId/acknowledge` | fnb, kitchen, manager |
| PUT | `/api/restaurant/kitchen/kot/:kotId/prepare` | fnb, kitchen, manager |
| PUT | `/api/restaurant/kitchen/kot/:kotId/ready` | fnb, kitchen, manager |
| PUT | `/api/restaurant/kitchen/kot/:kotId/serve` | fnb, manager, owner |
| PUT | `/api/restaurant/kitchen/kot/:kotId/cancel` | manager, owner |
| PUT | `/api/restaurant/kitchen/kot/:kotId/recall` | fnb, manager |
| PUT | `/api/restaurant/kitchen/kot/:kotId/refire` | fnb, manager |

### Table Operations
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/restaurant/:id/transfer-table/:toTableId` | manager, owner, fnb |

### Billing
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/restaurant/:id/bill` | cashier, manager, owner |
| POST | `/api/restaurant/bills/:billId/payment` | cashier, manager, owner |
| POST | `/api/restaurant/bills/:billId/split` | cashier, manager, owner |
| GET | `/api/restaurant/bills/:id` | owner, manager, cashier, auditor |

### Events & Sessions
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/:id/events` | owner, manager, auditor |
| GET | `/api/restaurant/sessions/active` | owner, manager, fnb, reception |

### Reports
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/restaurant/reports/summary` | owner, manager, accountant, auditor |
| GET | `/api/restaurant/reports/table-turnover` | owner, manager |

## File Structure

```
src/domains/restaurant/
├── restaurant.types.ts        # All domain types, state machine, enums, DTOs
├── restaurant.repository.ts   # SQLite implementation (55+ methods, 14 tables)
├── restaurant.service.ts      # Business logic (7 service objects)
├── restaurant.routes.ts       # REST API (35 endpoints)
└── restaurant.seed.ts         # Deterministic seed (12 tables, 7 categories, 26 menu items, 6 recipes)

tests/restaurant.test.ts       # 95+ test cases across 12 suites
```

## Inventory Consumption Flow

```
Order Completed
  │
  ├─► FOR each non-cancelled order line:
  │     ├─► Look up recipe by menu_item_id
  │     ├─► FOR each ingredient in recipe:
  │     │     ├─► qty = ingredient.qty × line.qty × (1 + wasteFactor/100)
  │     │     ├─► InventoryRepository.adjustStock(itemId, -qty)
  │     │     ├─► InventoryRepository.recordMovement('consumption', ...)
  │     │     └─► Collect movement record
  │     └─► (next ingredient)
  │
  ├─► Record ORDER_INVENTORY_CONSUMED event
  │
  └─► Return all inventory movements
```
