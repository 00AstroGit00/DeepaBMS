# ADR-0007: Inventory Ledger Architecture

## Status
Accepted (2026-07-13).

## Context
The existing inventory system used a flat `inventory` table with an `inventory_moves` table supporting only 3 movement types (`in`, `out`, `wastage`). It lacked before/after quantity snapshots, cost tracking per movement, 14 movement types required for full ERP coverage, negative stock prevention, optimistic locking, FIFO costing foundation, and multi-warehouse compatibility hooks.

## Decision
Implement a ledger-based inventory architecture. Stock is never mutated directly — all changes flow through the movement ledger.

### Why Ledger-Based
- **Audit trail**: Every stock change has a permanent record with before/after quantities, operator, timestamp, reason
- **Reconstructability**: Current stock can always be derived by replaying the ledger
- **Immutability**: Ledger entries are append-only — no edits, no deletes
- **Cost tracking**: Each movement records unit cost and total cost, enabling FIFO/weighted-average costing
- **Compliance**: Kerala Excise requires complete movement history for liquor-adjacent items

### Core Tables

**`inventory`** — Current state (single row per item)
- Stock, reserved stock, min/max, reorder, cost, version (optimistic lock)
- `is_active` for soft delete; `version` incremented on each stock change

**`inventory_ledger`** — Append-only movement history
- `quantity_before`, `quantity_after` for full audit
- `unit_cost`, `total_cost` for valuation
- `kind` restricted to 14 movement types via CHECK constraint
- `batch_id` for grouping related movements (transfers, batch purchases)

### Movement Strategy

Every stock change follows: validate kind + quantity → read current state (with version) → compute new stock → validate >= 0 → UPDATE inventory (SET stock, version = version + 1 WHERE id = ? AND version = ?) → INSERT ledger (with before/after quantities) → return.

Steps are sequential within a single request handler. If UPDATE fails (version mismatch), the operation is rejected (concurrent modification detection).

### Movement Types

| Movement | Sign | Description |
|----------|------|-------------|
| `purchase` | +1 | Stock received from supplier |
| `sale` | -1 | Stock sold to customer |
| `consumption` | -1 | Used in kitchen/operations |
| `transfer_in` | +1 | Received from another location |
| `transfer_out` | -1 | Sent to another location |
| `adjustment` | +/-1 | Manual stock correction |
| `physical_count` | +/-1 | Count difference |
| `damage` | -1 | Damaged/spoiled goods |
| `expiry` | -1 | Expired goods removed |
| `supplier_return` | -1 | Returned to supplier |
| `customer_return` | +1 | Returned by customer |
| `complimentary` | -1 | Given free of charge |
| `opening_balance` | +1 | Initial stock on item creation |
| `closing_adjustment` | +/-1 | End-of-period adjustment |

### Costing Strategy

**Primary**: FIFO (First-In-First-Out). `CostService.getFifoLayers()` returns purchase history sorted by date.

**Architecture-ready**: Weighted-Average. `cost_method` column per item. Weighted-average: `newCost = (existingStock * existingCost + qty * purchaseCost) / (existingStock + qty)`.

### Negative Stock Prevention
Every movement computes `quantityAfter = quantityBefore + sign * quantity`. If < 0, operation is rejected with `StockUnderflowError`. Enforced at both service and repository layers.

### Concurrency Control
Optimistic locking via `version` column. `UPDATE ... WHERE id = ? AND version = ?`. If no rows affected, retry or reject.

## Trade-offs

### Pros
- Complete audit trail with before/after quantities
- Stock cannot become negative; version locks prevent concurrent corruption
- Future-proof: multi-warehouse by adding `warehouse_id`; batch/lot by extending ledger
- Compliance-ready for Excise audit requirements
- Replayable stock state from ledger at any point in time

### Cons
- Each stock change requires 2 SQL operations (UPDATE + INSERT)
- Sequential per-item for stock adjustments (acceptable for SMB scale)
- Ledger grows unboundedly — future archival policy needed for >5 years
- 14 movement types versus original 3 — more validation surface area

## Future Extensions
- **Multi-Warehouse**: Add `warehouse_id` to inventory and ledger
- **Batch/Lot Tracking**: Add `lot_number`, `expiry_date` to inventory; compute FIFO per batch
- **Serial Number Tracking**: New `inventory_serials` table
- **Barcode Support**: Add `barcode` column; scanner integration
- **Supplier/Vendor Integration**: Link purchase movements to PurchaseOrder aggregate
