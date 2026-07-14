# ADR-0010: Enterprise Bar & Peg Architecture

**Status**: Accepted (2026-07-13)

**Domain**: Bar & Liquor Management

**Applies to**: Backend (apps/backend)

---

## Context

The Bar module is the canonical consumer of liquor inventory. Every milliliter of liquor that leaves inventory must be traced to a specific bottle, sale, and pour event. No other module may directly modify liquor stock.

The organization needs:
- Individual bottle lifecycle tracking (purchased → received → stored → opened → consumed → empty → archived)
- Configurable peg sizes with fixed-point milliliter precision
- Peg-level sales with pour type classification (regular, short pour, over pour, complimentary, promotion, staff issue, internal, waste, spillage)
- Kerala Excise compliance (daily register, brand register, bottle register, breakage register, wastage register)
- Pricing with multiple tiers (MRP, bar price, happy hour, promotional, member)
- Integration with inventory ledger for consumption tracking
- Future support for handheld POS, barcode scanning, RFID, and automated pour systems

## Decision

### Aggregate Design

The Bar aggregate comprises 11 entities:

1. **LiquorBrand** — Brand catalog with category, manufacturer, proof, country
2. **LiquorCategory** — Classification (IMFL, Beer, Wine, Foreign, Country, Liqueur)
3. **LiquorBottle** — Individual bottle with full lifecycle state machine
4. **PegDefinition** — Configurable peg sizes (30, 45, 60, 90, 120, 180 ml)
5. **PegPrice** — Price per brand per peg size per pricing tier
6. **BarSale** — Sale transaction header
7. **BarSaleLine** — Individual line item (brand, peg size, quantity, pour type)
8. **BottleOpening** — Bottle opening event record
9. **BottleClosing** — Bottle closing/disposal event record
10. **BottleTransfer** — Bottle movement between locations
11. **LiquorMovement** — Append-only ledger for all liquor inventory changes
12. **ExciseRegister** — Daily compliance record per brand
13. **PourLog** — Individual pour event for bartender tracking

### Bottle State Machine

```
Purchased → Received → Stored → Opened → Active ↔ Partially Consumed → Empty → Archived
                                  │         │
                                  └── Broken ──→ Written Off ──→ Archived
                                  │
                                  └── Returned ──→ Archived
                                  │
                                  └── Transferred → Stored (at destination)
```

Each transition has RBAC permissions and fires domain events.

### Peg Engine Design

Peg calculations use **fixed-point arithmetic** (integer milliliters, integer paise):

1. **Consumption**: `totalMl = pegSizeMl × quantity` — always an integer
2. **Validation**: `availableMl >= requestedMl` — prevents over-pouring
3. **Pricing**: Lookup by `(brandId, pegSizeId, tier)` with fallback chain: requested tier → bar_price → mrp → proportional from bottle selling price
4. **Pour Cost**: `cost = bottlePurchaseCost × (pegSizeMl / bottleSizeMl)` — exact rational arithmetic
5. **Variance**: `variance = expectedMl - actualSoldMl` — detects spillage, theft, or measurement errors

### Inventory Integration

When a bar sale is completed:

1. For each non-cancelled line:
2. Find an active bottle of the brand (status IN 'opened', 'active', 'partially_consumed')
3. Deduct `pegSizeMl × quantity` from the bottle's `currentMl`
4. If insufficient in current bottle, consume remainder from next available bottle (bottle switching)
5. Record `liquor_movements` entry with kind='sale'
6. Create `pour_log` entries for each pour
7. If the general inventory ledger has a liquor item for this brand, also record consumption there
8. Update bottle status: if currentMl === 0 → 'empty'; if currentMl < initialMl → 'partially_consumed' or 'active'

### Excise Architecture

The Kerala Excise compliance system generates daily registers:

1. For each brand with activity on a given date:
2. **Opening stock**: computed from bottle statuses at start of day (stored + opened + active + partially_consumed)
3. **Received**: bottles with status transition to 'received' on that date
4. **Sold**: SUM of liquor_movements with kind='sale' for that date
5. **Complimentary, breakage, wastage, staff**: SUM of movements by pour_type
6. **Closing stock**: physical bottle count at end of day
7. **Variance**: opening + received - sold - complimentary - breakage - wastage - staff - closing

### Pricing Tiers

| Tier | Description | Access |
|------|-------------|--------|
| MRP | Maximum Retail Price (statutory) | Fixed |
| Bar Price | Standard selling price | Default |
| Happy Hour | Time-based discount (e.g., 15% off bar price) | Manager |
| Promotional | Event/seasonal pricing | Manager/Owner |
| Member | Loyalty program discount (e.g., 10% off) | Member customers |

Fallback chain: requested tier → bar_price → mrp → proportional

## Consequences

### Positive
- **Full traceability**: Every milliliter is tracked from purchase to consumption
- **Excise compliance**: Built-in daily register generation meets regulatory requirements
- **Variance detection**: Peg-level analytics identify spillage, theft, or measurement drift
- **Pricing flexibility**: Multi-tier pricing supports happy hours, memberships, promotions
- **Bottle lifecycle**: Complete audit trail for every bottle
- **Fixed-point safety**: No floating-point rounding errors in peg calculations

### Negative
- **Table count**: 14 new tables added to the schema (significant schema expansion)
- **Bottle switching complexity**: When a bottle runs out mid-pour, the system must seamlessly switch to another bottle
- **Seed data volume**: 15 brands, 30 bottles, 5 sample sales, excise entries increase bootstrap time

### Trade-offs
- **Individual bottle tracking vs aggregate stock**: Bottle-level tracking provides full traceability but increases complexity; aggregate stock (original `liquor` table) remains for quick overview
- **Synchronous consumption vs async**: Current synchronous design is simpler; async event queue would be needed at scale for the inventory ledger updates
- **Pour log granularity**: Individual pour logging provides maximum audit capability; could be simplified to batch recording if performance becomes an issue

## Future Roadmap

1. **Handheld POS**: Mobile ordering and payment at the table
2. **Barcode scanning**: Quick bottle lookup and stock-taking
3. **RFID tags**: Automated bottle tracking and inventory reconciliation
4. **Automated pour systems**: Electronic pour spouts that auto-record consumption
5. **Cocktail recipe engine**: Multi-ingredient cocktails with cost and ml tracking
6. **Mixer and soda tracking**: Integration with inventory for non-alcoholic items
7. **Ice usage tracking**: Optional ice consumption recording
8. **Electronic excise filing**: Automated submission to Kerala Excise portal
