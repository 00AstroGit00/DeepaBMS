# ADR-0011: Hotel Property Management Architecture

**Status**: Accepted (2026-07-13)

**Domain**: Hotel Operations

**Applies to**: Backend (apps/backend)

---

## Context

The Hotel module is the fourth operational pillar of DeepaBMS. It manages room inventory, reservations, guest profiles, check-in/check-out, housekeeping, maintenance, and unified billing. Every charge from Restaurant, Bar, or Room Service must flow through the Folio system.

The organization needs:
- Complete reservation lifecycle (inquiry → reserved → confirmed → checked-in → checked-out → completed)
- Individual room tracking with status management (vacant, occupied, cleaning, maintenance, blocked, out-of-service, reserved)
- Guest profile management with identity documents, corporate accounts, and stay history
- Unified folio billing with charges from multiple departments
- Housekeeping scheduling with inspection workflow
- Maintenance request tracking with assignment and resolution
- Night audit for end-of-day financial reconciliation
- Future OTA integration and channel manager support

## Decision

### Aggregate Design

The Hotel aggregate comprises 11 entities:

1. **RoomType** — Room category catalog (Standard, Deluxe, Suite, etc.) with base rate, capacity, amenities
2. **Room** — Individual room with number, floor, view, status, assignment tracking
3. **Guest** — Guest profile with identity documents, corporate info, preferences, stay history
4. **Reservation** — Booking record with full lifecycle state machine
5. **Stay** — Active checked-in period linking guest to room
6. **RoomAssignment** — Room allocation record during a stay (supports room transfers)
7. **Folio** — Unified billing account for a stay
8. **FolioCharge** — Individual charge line (room tariff, restaurant, bar, room service, laundry, etc.)
9. **FolioPayment** — Payment against the folio
10. **HousekeepingTask** — Cleaning schedule with inspection workflow
11. **MaintenanceRequest** — Maintenance tracking with assignment and resolution
12. **NightAudit** — End-of-day financial reconciliation

### Reservation State Machine

```
Inquiry → Reserved → Confirmed → Checked-In → Checked-Out → Completed
           │            │            │
           └────── Cancelled ←──────┘
           │            │
           └── No-Show ─┘
```

Each transition has explicit role-based permissions and fires domain events.

### Check-In Flow

1. Find reservation (status must be 'confirmed')
2. Find or create guest profile
3. Update reservation to 'checked_in'
4. Create Stay record linking guest to room
5. Create Folio with opening balance (advance amount)
6. Assign room to stay (RoomAssignment record)
7. Update room status to 'occupied', set current_stay_id
8. Post room_tariff charge for first night if advance was collected
9. Record GUEST_CHECKED_IN and ROOM_OCCUPIED events

### Check-Out Flow

1. Find active stay
2. Post any outstanding room_tariff charges (final night(s))
3. Calculate total balance
4. Process payment
5. Close folio
6. Update stay with check_out timestamp and operator
7. Update reservation to 'checked_out'
8. Release room assignment
9. Update room status to 'cleaning', clear current_stay_id
10. Increment guest stats (total_stays, total_revenue)
11. Record GUEST_CHECKED_OUT and ROOM_VACANT events

### Unified Folio Model

The Folio is the single source of truth for all guest charges during a stay:

| Category | Description | Source |
|----------|-------------|--------|
| room_tariff | Room nightly rate | Auto-posted by night audit or check-in |
| restaurant | Restaurant dining charges | Posted by Restaurant module (future) |
| bar | Bar charges | Posted by Bar module (future) |
| room_service | In-room dining | Posted by Room Service |
| laundry | Laundry service | Posted by Housekeeping |
| extra_bed | Extra bed charges | Posted at check-in/change |
| amenities | Mini-bar, toiletries, etc. | Posted by Housekeeping |
| service_charge | Service charge % | Calculated on bill |
| tax | GST/TOT | Calculated on bill |
| deposit | Advance payments | Posted at check-in |
| other | Misc charges | Manual post |

Integration points:
- Restaurant posts charges via `/api/folios/:id/charges` with category 'restaurant'
- Bar posts charges via same endpoint with category 'bar'
- Room Service posts with category 'room_service'
- Night Audit auto-posts room_tariff for active stays

### Night Audit Architecture

The night audit runs at end of day (typically 00:00-03:00) and performs:

1. **Room count**: Tally rooms by status (occupied, vacant, out-of-service, blocked, cleaning)
2. **Auto-post room charges**: For each active stay, post room_tariff charge for that night
3. **Revenue aggregation**: Sum all folio charges posted today by category
4. **Payment aggregation**: Sum all payments processed today
5. **Key metrics calculation**:
   - Occupancy % = occupiedRooms / totalRooms × 100
   - ADR (Average Daily Rate) = roomRevenue / occupiedRooms
   - RevPAR (Revenue Per Available Room) = roomRevenue / totalRooms
6. **Record NIGHT_AUDIT_COMPLETED event**

### Room Status Lifecycle

```
                    ┌──────────┐
                    │  VACANT  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────────┐
              │          │              │
         ┌────▼────┐ ┌──▼───┐   ┌──────▼──────┐
         │RESERVED │ │CLEANING│  │OUT_OF_SERVICE│
         └────┬────┘ └──┬───┘   └──────┬──────┘
              │          │              │
         ┌────▼────┐ ┌──▼────┐   ┌─────▼─────┐
         │OCCUPIED │ │VACANT │   │MAINTENANCE │
         └────┬────┘ └───────┘   └─────┬─────┘
              │                        │
              └─── CLEANING ←──────────┘
              │
         ┌────▼────┐
         │ BLOCKED │
         └─────────┘
```

## Consequences

### Positive
- **Complete guest profile**: Identity documents, preferences, corporate info, blacklist
- **Unified billing**: Every charge from every department flows through one folio
- **Room accountability**: Full room history with assignments, transfers, upgrades
- **Revenue management**: ADR, RevPAR, occupancy analytics built-in
- **Department integration**: Restaurant, Bar, and Room Service can post charges
- **Night audit automation**: End-of-day reconciliation is automated
- **Future-ready**: Architecture supports OTA integration, channel manager, online booking

### Negative
- **Table count**: 13 new tables added (significant schema expansion)
- **Check-in/out complexity**: Multi-step flow with many side effects
- **Night audit timing**: Must run after midnight but before next day's operations
- **Seed data volume**: 20 rooms, 5 guests, 5 reservations, folios, tasks, maintenance requests

### Trade-offs
- **Folio per stay vs per guest per stay**: Current design has one folio per stay; multi-folio (for groups sharing rooms) would need enhancement
- **Synchronous vs async night audit**: Current synchronous design is simpler; async would prevent blocking if auto-posting many charges
- **Room status vs housekeeping integration**: Room cleaning status is managed by housekeeping tasks; room is set to 'cleaning' on check-out and back to 'vacant' on housekeeping completion
- **Guest deduplication**: Phone-based matching is used; no fuzzy matching or merge capability yet

## Future Roadmap

1. **OTA Integration** (Booking.com, Expedia, Agoda): API-based reservation import
2. **Channel Manager**: Centralized inventory management across OTAs
3. **Online Booking Engine**: Direct website reservation widget
4. **Group Bookings**: Block room inventory for groups with master folio
5. **Dynamic Pricing**: Rate adjustments based on occupancy and demand
6. **Mobile Check-In**: Guest self-check-in via mobile app
7. **Keyless Entry**: Integration with electronic door locks
8. **Housekeeping Mobile App**: Real-time status updates from tablets
9. **Laundry Module**: Full laundry tracking with charges
10. **Mini-Bar Integration**: Automated mini-bar consumption posting
