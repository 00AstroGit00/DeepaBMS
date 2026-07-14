# ADR-0008: Purchasing & Goods Receipt Architecture

**Status**: Accepted (2026-07-13)

**Domain**: Purchasing & Procurement

**Applies to**: Backend (apps/backend)

---

## Context

P3-1 established Inventory as the system of record with a ledger-based movement engine. Stock increases were possible through direct API calls (`POST /api/inventory/:id/movements` with kind `purchase`), bypassing procurement controls.

The organization needs:
- A single approved entry point for all stock increases
- Full purchasing lifecycle management (requisition → order → receive → invoice → pay)
- Supplier management with performance tracking
- Audit trail for all procurement decisions
- Cost tracking (landed cost, freight, tax distribution)
- GST input credit tracking for compliance
- Kerala Excise hooks for liquor procurement
- Future approval workflow support (multi-level)

## Decision

Implement a **Purchasing Domain** as the exclusive mechanism for introducing stock into inventory.

### Aggregate Design

The Purchasing aggregate comprises six entities:

1. **PurchaseOrder** (root aggregate) — PO header with status lifecycle, supplier, costs
2. **PurchaseOrderLine** — Individual line items referencing inventory items
3. **GoodsReceipt** — Receiving event that triggers inventory ledger movements
4. **SupplierInvoice** — Invoice tracking linked to POs and receipts
5. **PurchaseReturn** — Return to supplier with inventory ledger reversal
6. **ReceivingDiscrepancy** — Short/over/damaged/rejected tracking

### State Machine

```
Draft → Submitted → Approved → Ordered → Partially Received → Received → Invoiced → Closed
                                                     ↓                           ↓
                                                 Cancelled                   Returned
```

Each transition has explicit role-based permissions:

| Transition | Required Role |
|---|---|
| Draft → Submitted | manager, owner, fnb |
| Submitted → Approved | owner, manager |
| Approved → Ordered | owner, manager |
| Ordered → Received | fnb, manager, owner |
| Received → Invoiced | accountant, manager, owner |
| Received → Returned | fnb, manager, owner |
| Invoiced → Closed | owner, manager |
| Any → Cancelled | varies (owner for later stages) |
| Rejected → Draft | owner, manager |

### Inventory Integration

Goods receipt is the **only** mechanism that creates purchase-type inventory ledger movements:

1. `POST /api/purchasing/:id/receive` validates the PO is in 'ordered' or 'partially_received' status
2. Creates `goods_receipts` and `goods_receipt_lines` records
3. For each line with good quantity > 0, calls `InventoryRepository.adjustStock()` with the purchase quantity
4. Records `purchase` movement in the inventory ledger with reference to the receipt number
5. Publishes `INVENTORY_INCREASED` event
6. PO status auto-updates based on received vs ordered quantities

### Supplier Management

Suppliers are first-class entities with:
- Profile (name, contact, GSTIN, address)
- Payment terms and credit limits
- Performance metrics (on-time delivery, quality rating, return rate)
- Preferred supplier flagging
- Lead time tracking

### Costing Architecture

Three cost levels:
1. **Line total**: quantity × unit cost
2. **Landed cost**: line total + freight + tax + other charges − discount
3. **Allocated cost**: proportional distribution of charges across all lines

`PurchaseCostService.distributeCharges()` allocates costs proportionally by line value ratio, ensuring fair landed cost per item.

### GST & Excise Hooks

Extension points designed for future implementation:
- `GstExciseHooks.calculateGstInputCredit()` — CGST+SGST input credit calculation
- `GstExciseHooks.validateGstin()` — GSTIN format validation
- `GstExciseHooks.getGstSlab()` — Category-based GST rate lookup
- `GstExciseHooks.getGstComplianceReport()` — Aggregate GST input credit report
- `GstExciseHooks.validateExcisePermit()` — Kerala Excise permit validation (mock)
- `GstExciseHooks.getExciseComplianceReport()` — Liquor procurement summary

### Events

Domain events published to `purchase_events` table:
- PURCHASE_CREATED, PURCHASE_SUBMITTED, PURCHASE_APPROVED, PURCHASE_REJECTED
- PURCHASE_ORDERED, GOODS_RECEIVED, INVENTORY_INCREASED
- INVOICE_RECEIVED, PURCHASE_RETURNED, PURCHASE_CANCELLED
- PURCHASE_CLOSED, PURCHASE_DISCREPANCY_REPORTED
- LOW_STOCK_PURCHASE_SUGGESTED

## Consequences

### Positive
- **Single entry point**: All stock enters through purchasing, enabling full audit trail
- **Complete lifecycle**: From draft order to closed invoice, every step is tracked
- **Cost accuracy**: Landed cost calculation ensures proper inventory valuation
- **Supplier accountability**: Performance metrics drive better procurement decisions
- **Compliance ready**: GST input credit and excise hooks satisfy regulatory requirements
- **Discrepancy tracking**: Short/over/damaged/rejected items are captured for supplier claims

### Negative
- **Mandatory workflow**: Kitchen staff cannot directly add stock — must go through purchasing
- **Increased data entry**: Each receipt requires explicit line-by-line confirmation
- **State machine complexity**: 11 statuses with 18 possible transitions

### Trade-offs
- **Table count**: 11 new tables vs keeping logic in inventory — justified by audit requirements
- **Approval model**: Single-level (not multi-level) — multi-level approval framework is ready for future extension
- **Supplier performance**: Compute-intensive (queries per supplier) — acceptable at current scale; materialize for scale

## Future Roadmap

1. **Multi-level approval** — Chain of approval (supervisor → manager → owner) per PO value
2. **Auto-PO generation** — ReorderService triggers PO creation from inventory low-stock alerts
3. **EDI/API integration** — Direct supplier system integration for automated ordering
4. **Barcode receiving** — Scan items on receipt for faster processing
5. **Dynamic discounting** — Early payment discount capture
6. **Multi-currency** — Foreign supplier support with exchange rate handling
7. **Contract pricing** — Pre-negotiated rates with volume-based tiered pricing
8. **Procurement analytics** — Spend analysis, supplier consolidation, negotiation insights
