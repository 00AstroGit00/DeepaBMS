# Purchasing & Procurement Architecture

## Overview

The Purchasing domain implements the complete procurement lifecycle — from draft purchase order through goods receipt, invoicing, and closure. It is the **exclusive entry point** for all stock increases in the Inventory system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PURCHASING DOMAIN                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐   │
│  │   Routes (REST)   │───→│    Services       │───→│    Repository        │   │
│  │   30 endpoints    │    │  PurchaseWorkflow │    │    11 tables         │   │
│  └──────────────────┘    │  GoodsReceipt     │    │  + 20 indexes        │   │
│                          │  PurchaseReturn   │    └──────────┬───────────┘   │
│  ┌──────────────────┐    │  SupplierPerf     │               │               │
│  │   Middleware      │    │  PurchaseCost     │    ┌─────────┴──────────┐   │
│  │  auth + RBAC     │    │  Validation       │    │  suppliers          │   │
│  └──────────────────┘    │  GstExciseHooks   │    │  purchase_orders    │   │
│                          └──────────────────┘    │  purchase_events    │   │
│  ┌──────────────────┐                             └────────────────────┘   │
│  │   Seed Module     │    ┌──────────────────┐                             │
│  │   12 suppliers    │    │  Integration      │                             │
│  │   5+ sample POs   │    │  Inventory Ledger │                             │
│  └──────────────────┘    │  (purchase moves)  │                             │
│                          └──────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
suppliers (1) ──→ purchase_orders (N) ──→ purchase_order_lines (N)
                      │                            │
                      │                            │
               goods_receipts (N)           goods_receipt_lines (N)
                      │
               supplier_invoices (N) ──→ supplier_invoice_lines (N)
                      │
               purchase_returns (N) ──→ purchase_return_lines (N)
                      │
               receiving_discrepancies (N)
                      │
               purchase_events (N)
```

## State Machine

```
                ┌─────────┐
                │  DRAFT  │
                └────┬────┘
                     │ submit (manager/owner/fnb)
                ┌────▼──────┐
                │ SUBMITTED │
                └────┬──────┘
                     │ approve (owner/manager)
                ┌────▼──────┐
                │ APPROVED  │
                └────┬──────┘
                     │ order (owner/manager)
                ┌────▼──────┐
                │  ORDERED  │
                └────┬──────┘
                     │ receive (fnb/manager/owner)
           ┌─────────┴──────────┐
    ┌──────▼──────────┐  ┌──────▼──────────┐
    │ PARTIALLY       │  │    RECEIVED     │
    │  RECEIVED       │  └──────┬──────────┘
    └──────┬──────────┘         │
           │ receive            │ invoice (accountant)
           │                    │
           │              ┌─────▼──────────┐
           │              │   INVOICED     │
           │              └─────┬──────────┘
           │                    │ close (owner/manager)
           │              ┌─────▼──────────┐
           │              │    CLOSED      │
           │              └────────────────┘
           │
           │ cancel (any stage) ──→ CANCELLED
           │ return (received)   ──→ RETURNED
           │ reject (submitted)  ──→ REJECTED
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/purchasing` | owner, manager, fnb, accountant, auditor | List POs (paginated, filterable) |
| GET | `/api/purchasing/:id` | owner, manager, fnb, accountant, auditor | Get single PO |
| POST | `/api/purchasing` | manager, owner, fnb | Create PO |
| PUT | `/api/purchasing/:id` | owner, manager | Update PO (draft only) |
| POST | `/api/purchasing/:id/submit` | manager, owner, fnb | Submit for approval |
| POST | `/api/purchasing/:id/approve` | owner, manager | Approve PO |
| POST | `/api/purchasing/:id/reject` | owner, manager | Reject PO |
| POST | `/api/purchasing/:id/order` | owner, manager | Place order with supplier |
| POST | `/api/purchasing/:id/cancel` | owner, manager | Cancel PO |
| POST | `/api/purchasing/:id/close` | owner, manager | Close PO |
| POST | `/api/purchasing/:id/receive` | fnb, manager, owner | Goods receipt (creates inventory ledger) |
| GET | `/api/purchasing/:id/receipts` | owner, manager, fnb, auditor | List receipts for PO |
| POST | `/api/purchasing/:id/invoices` | accountant, manager, owner | Add invoice |
| GET | `/api/purchasing/:id/invoices` | owner, manager, accountant, auditor | List invoices for PO |
| POST | `/api/purchasing/:id/returns` | fnb, manager, owner | Process return |
| GET | `/api/purchasing/:id/returns` | owner, manager, fnb, auditor | List returns for PO |
| GET | `/api/purchasing/:id/transitions` | owner, manager, fnb, auditor | Get available transitions |
| GET | `/api/purchasing/:id/events` | owner, manager, auditor | Get event history |
| GET | `/api/purchasing/suppliers` | owner, manager, fnb, accountant, auditor | List suppliers |
| GET | `/api/purchasing/suppliers/:id` | owner, manager, fnb, accountant, auditor | Get supplier |
| POST | `/api/purchasing/suppliers` | owner, manager | Create supplier |
| PUT | `/api/purchasing/suppliers/:id` | owner, manager | Update supplier |
| DELETE | `/api/purchasing/suppliers/:id` | owner, manager | Archive supplier |
| GET | `/api/purchasing/suppliers/:id/performance` | owner, manager | Supplier metrics |
| GET | `/api/purchasing/receipts/all` | owner, manager, fnb, auditor | All receipts |
| GET | `/api/purchasing/receipts/:id` | owner, manager, fnb, auditor | Single receipt |
| GET | `/api/purchasing/invoices/all` | owner, manager, accountant, auditor | All invoices |
| GET | `/api/purchasing/invoices/:id` | owner, manager, accountant, auditor | Single invoice |
| GET | `/api/purchasing/returns/all` | owner, manager, fnb, auditor | All returns |
| GET | `/api/purchasing/returns/:id` | owner, manager, fnb, auditor | Single return |
| GET | `/api/purchasing/reports/summary` | owner, manager, accountant, auditor | Purchase statistics |
| GET | `/api/purchasing/reports/supplier-performances` | owner, manager | All supplier metrics |
| GET | `/api/purchasing/reports/gst-compliance` | accountant, owner, manager | GST input credit report |
| GET | `/api/purchasing/reports/excise-compliance` | owner, manager, barstaff | Excise compliance report |
| GET | `/api/purchasing/search/:query` | owner, manager, fnb, auditor | Search POs |

## Inventory Integration Flow

```
Goods Receipt
  │
  ├─► PurchaseOrder.validateStatus('ordered' | 'partially_received')
  │
  ├─► Create goods_receipt + goods_receipt_lines
  │
  ├─► FOR each receipt line with goodQty > 0:
  │     ├─► InventoryRepository.adjustStock(itemId, +goodQty, unitCost)
  │     ├─► InventoryRepository.recordMovement('purchase', goodQty, ...)
  │     └─► purchase_events (INVENTORY_INCREASED)
  │
  ├─► Update purchase_order_lines (received_qty, damaged_qty, rejected_qty)
  │
  ├─► Auto-update PO status:
  │     ├─► All lines fully received  → 'received'
  │     └─── Some lines received      → 'partially_received'
  │
  └─► Record discrepancies (short/over/damaged/rejected)
```

## File Structure

```
src/domains/purchasing/
├── purchasing.types.ts       # All domain types, enums, state machine, constants
├── purchasing.repository.ts  # SQLite implementation (11 tables, 30+ methods)
├── purchasing.service.ts     # Business logic (7 service objects)
├── purchasing.routes.ts      # REST API (30 endpoints)
└── purchasing.seed.ts        # Deterministic seed (12 suppliers, 5+ sample POs)

tests/purchasing.test.ts      # 50+ test cases across 10 suites
```

## Performance Considerations

- PO listing joins `purchase_orders` + `suppliers` — efficient with indexes
- Supplier performance queries N+1 per supplier — acceptable at current scale; materialize for 50+ suppliers
- Discrepancy queries filterable by receipt and resolution
- Event queries use composite index on `(aggregate_type, aggregate_id)`
