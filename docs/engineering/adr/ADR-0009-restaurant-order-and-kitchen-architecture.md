# ADR-0009: Restaurant Order & Kitchen Architecture

**Status**: Accepted (2026-07-13)

**Domain**: Restaurant Order Management

**Applies to**: Backend (apps/backend)

---

## Context

The Restaurant module is the canonical consumer of inventory for food operations. Every ingredient deduction must originate from completed kitchen production or finalized sales.

The organization needs:
- A complete order lifecycle (draft → open → confirmed → preparing → ready → served → completed → paid)
- Kitchen Order Ticket (KOT) engine with station routing and priority
- Recipe-based inventory consumption (never deduct stock directly)
- Table management (assignment, transfer, occupancy tracking)
- Billing engine (discounts, service charge, GST, split payments)
- Room charge posting for hotel guests
- Future online ordering, QR ordering, and Kitchen Display System (KDS) support

## Decision

### Aggregate Design

The Restaurant aggregate comprises eight entities:

1. **RestaurantOrder** (root aggregate) — Order header with status lifecycle, type, table assignment
2. **OrderLine** — Individual menu items with quantity, pricing, course, discount
3. **KitchenOrderTicket (KOT)** — Kitchen instruction sheet routed to stations
4. **DiningTable** — Physical table with capacity, area, position, occupancy state
5. **DiningSession** — Active dining period linking table to order
6. **Bill** — Financial summary with charges, discounts, tax
7. **Payment** — Payment records (cash, UPI, card, credit, room charge)
8. **Recipe** — Menu item recipe with ingredient list and waste factors

### Order State Machine

```
Draft → Open → Confirmed → Preparing → Ready → Served → Completed → Paid
  │       │         │          │         │        │          │
  └── Cancelled ←──┴──────────┴─────────┴────────┴──────────┘
                                                    │
                                                    └── Refunded
  Open/Voided (manager override for fraudulent orders)
```

Each transition has explicit role-based permissions and fires domain events.

### Kitchen Engine Design

The kitchen is driven by KOTs (Kitchen Order Tickets):

1. **Generation**: When an order is confirmed, KOTs are generated for each course
2. **Routing**: Each KOT is assigned to a kitchen station based on the course type (e.g., Tandoor items → Tandoor station, Beverages → Beverage station)
3. **Priority**: VIP orders and large parties get higher priority
4. **Queue**: KOTs are ordered by priority DESC, then creation time ASC
5. **Lifecycle**: Pending → Acknowledged → Preparing → Ready → Served → Cancelled
6. **Operations**: Recall (revert to pending for modifications), Refire (reset all items to pending)

### Recipe-Based Inventory Consumption

When an order reaches "completed" status:

1. For each order line with non-cancelled items:
2. Look up the recipe for the menu item
3. For each ingredient in the recipe:
4. Calculate quantity = ingredient.quantity × order_line.quantity × (1 + waste_factor / 100)
5. Call `InventoryRepository.adjustStock(itemId, -quantity)`
6. Record a `consumption` movement in the inventory ledger
7. Reference the order number and menu item name in the movement reason
8. Publish `INVENTORY_CONSUMED` event

This makes the Restaurant module the **exclusive consumer** of food inventory — no other module bypasses this pipeline.

### Billing Engine

1. Bill generation computes subtotal from order lines
2. Applies discounts (percentage or fixed)
3. Adds service charge (configurable rate)
4. Calculates GST as per registered tax rate
5. Rounding adjustment for cash payments
6. Split payment support (multiple modes per bill)
7. Change calculation for cash overpayment

### Table Management

- Tables have position coordinates (pos_x, pos_y) for visual floor plan mapping
- States: available, occupied, reserved, cleaning, maintenance
- Transfer moves an active order (and its session) to another table
- Occupancy tracking for turnover metrics

## Consequences

### Positive
- **Inventory accountability**: Every ingredient deduction is traced to a completed order
- **Kitchen visibility**: KOT queue provides real-time kitchen status
- **Complete audit trail**: Order events capture every state transition
- **Flexible pricing**: Item-level and bill-level discounts, complimentary items, split payments
- **Table turnover metrics**: Occupancy data drives operational improvements
- **Future-ready**: Architecture supports online ordering, QR ordering, KDS integration

### Negative
- **Recipe dependency**: Inventory consumption fails silently if recipes are incomplete
- **Performance**: Ingredient check queries N+1 per order line (acceptable at current scale)
- **State machine complexity**: 11 statuses with complex transition rules

### Trade-offs
- **Inventory consumption at completion vs preparation**: Consuming at "completed" ensures only served items are deducted; "confirmed" would handle cancellations better but risks over-deduction
- **Synchronous vs async consumption**: Current synchronous approach is simpler; async event queue would be needed at scale
- **Recipe engine simplicity**: No recipe versioning or yield calculations — sufficient for current needs

## Future Roadmap

1. **Online ordering**: Web-based menu with direct order creation
2. **QR ordering**: Table-side QR that opens menu and creates orders
3. **Kitchen Display System (KDS)**: Screen-based KOT display replacing printed tickets
4. **Loyalty points**: Points accumulation and redemption on bills
5. **Multi-outlet**: Branch-level menu and order management
6. **Auto-KOT generation**: Course-based routing without manual KOT creation
7. **Recipe cost engine**: Profit margin analysis per menu item
8. **Reservation system**: Pre-book tables with time slots
