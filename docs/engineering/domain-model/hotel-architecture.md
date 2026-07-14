# Hotel Property Management Architecture

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         HOTEL PMS DOMAIN (P4-1)                                       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────┐    ┌──────────────────────────────┐    ┌──────────────────────┐   │
│  │   Routes       │───→│         Services             │───→│     Repository       │   │
│  │   70+ endpoints│    │  ReservationService           │    │  13 tables           │   │
│  └───────────────┘    │  CheckInOutService            │    │  80+ methods         │   │
│                       │  FolioService                 │    └──────────┬───────────┘   │
│  ┌───────────────┐    │  RoomService                  │               │               │
│  │  Middleware    │    │  HousekeepingService          │    ┌─────────┴──────────┐   │
│  │  auth + RBAC  │    │  MaintenanceService           │    │ room_types         │   │
│  └───────────────┘    │  NightAuditService            │    │ rooms              │   │
│                       │  ValidationService            │    │ guests             │   │
│                       │  ReportingService             │    │ reservations       │   │
│                       └───────────────────────────────┘   │ stays              │   │
│                                          │                │ room_assignments   │   │
│                                          ▼                │ folios             │   │
│                              ┌──────────────────────┐    │ folio_charges      │   │
│                              │   Folio Integration   │    │ folio_payments     │   │
│                              │   Restaurant / Bar    │    │ housekeeping_tasks │   │
│                              │   Room Service        │    │ maintenance_req    │   │
│                              └──────────────────────┘    │ night_audit        │   │
│                                                          │ room_events        │   │
│  ┌───────────────┐                                       └─────────────────────┘   │
│  │  Seed Module  │                                                                 │
│  │  6 room types │                                                                 │
│  │  20 rooms     │                                                                 │
│  │  5 guests     │                                                                 │
│  │  5 reserv.    │                                                                 │
│  └───────────────┘                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
room_types (1) ──→ rooms (N) ──→ room_assignments (N) ──→ stays (N)
                  │                    │
                  │              reservations (N)
                  │
                  ├── housekeeping_tasks (N)
                  │
                  └── maintenance_requests (N)

guests (1) ──→ reservations (N) ──→ stays (N) ──→ folios (1)
                                                     │
                                        ┌────────────┴────────────┐
                                   folio_charges (N)      folio_payments (N)
```

## Reservation State Machine

```
                  ┌──────────┐
                  │ INQUIRY  │
                  └────┬─────┘
                       │ reserve
                  ┌────▼───────┐
                  │  RESERVED  │
                  └────┬───────┘
                       │ confirm
                  ┌────▼────────┐
                  │ CONFIRMED   │
                  └────┬────────┘
                       │ check-in
                  ┌────▼──────────┐
                  │ CHECKED_IN    │
                  └────┬──────────┘
                       │ check-out
                  ┌────▼───────────┐
                  │ CHECKED_OUT    │
                  └────┬───────────┘
                       │ complete
                  ┌────▼─────────┐
                  │  COMPLETED   │
                  └──────────────┘

  Cancelled: from inquiry, reserved, confirmed, checked_in
  No-Show: from reserved, confirmed
```

## API Endpoints (70+ total)

### Room Types (5)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/room-types` | owner, manager, reception, fnb, auditor |
| POST | `/api/rooms/room-types` | owner, manager |
| PUT | `/api/rooms/room-types/:id` | owner, manager |
| DELETE | `/api/rooms/room-types/:id` | owner, manager |

### Rooms (10)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms` | owner, manager, reception, housekeeping, fnb, auditor |
| GET | `/api/rooms/available` | owner, manager, reception |
| GET | `/api/rooms/occupancy` | owner, manager, auditor |
| GET | `/api/rooms/:id` | owner, manager, reception, housekeeping |
| POST | `/api/rooms` | owner, manager |
| PUT | `/api/rooms/:id/status` | owner, manager, reception, housekeeping |
| PUT | `/api/rooms/:id/block` | owner, manager |
| PUT | `/api/rooms/:id/unblock` | owner, manager |
| PUT | `/api/rooms/:id/out-of-service` | owner, manager |

### Guests (8)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/guests` | owner, manager, reception, auditor |
| GET | `/api/rooms/guests/search` | owner, manager, reception |
| GET | `/api/rooms/guests/corporate` | owner, manager, accountant |
| GET | `/api/rooms/guests/:id` | owner, manager, reception |
| GET | `/api/rooms/guests/:id/history` | owner, manager, reception, auditor |
| POST | `/api/rooms/guests` | owner, manager, reception |
| PUT | `/api/rooms/guests/:id` | owner, manager, reception |

### Reservations (10)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/reservations` | owner, manager, reception, auditor |
| GET | `/api/rooms/reservations/arrivals-today` | owner, manager, reception |
| GET | `/api/rooms/reservations/upcoming` | owner, manager, reception |
| GET | `/api/rooms/reservations/:id` | owner, manager, reception |
| POST | `/api/rooms/reservations` | owner, manager, reception |
| PUT | `/api/rooms/reservations/:id` | owner, manager, reception |
| PUT | `/api/rooms/reservations/:id/confirm` | owner, manager, reception |
| PUT | `/api/rooms/reservations/:id/cancel` | owner, manager |
| PUT | `/api/rooms/reservations/:id/no-show` | owner, manager, reception |

### Check-In/Out (3)
| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/rooms/check-in` | owner, manager, reception |
| POST | `/api/rooms/check-out` | owner, manager, reception |
| GET | `/api/rooms/stays/active` | owner, manager, reception, fnb |

### Folios (9)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/folios` | owner, manager, reception, accountant, auditor |
| GET | `/api/rooms/folios/:id` | owner, manager, reception, accountant |
| GET | `/api/rooms/folios/by-stay/:stayId` | owner, manager, reception, accountant |
| POST | `/api/rooms/folios/:id/charges` | owner, manager, reception |
| POST | `/api/rooms/folios/:id/payments` | owner, manager, reception, cashier |
| PUT | `/api/rooms/folios/:id/close` | owner, manager, accountant |

### Housekeeping (6)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/housekeeping` | owner, manager, housekeeping |
| GET | `/api/rooms/housekeeping/by-date/:date` | owner, manager, housekeeping |
| POST | `/api/rooms/housekeeping` | owner, manager, housekeeping |
| PUT | `/api/rooms/housekeeping/:id/complete` | owner, manager, housekeeping |

### Maintenance (5)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/maintenance` | owner, manager, housekeeping |
| POST | `/api/rooms/maintenance` | owner, manager, housekeeping |
| PUT | `/api/rooms/maintenance/:id/assign` | owner, manager |
| PUT | `/api/rooms/maintenance/:id/resolve` | owner, manager |

### Night Audit (4)
| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/rooms/night-audit` | owner, manager, accountant |
| GET | `/api/rooms/night-audit/:date` | owner, manager, accountant, auditor |
| PUT | `/api/rooms/night-audit/:id/approve` | owner |

### Reports (3)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/rooms/reports/occupancy` | owner, manager, auditor |
| GET | `/api/rooms/reports/revenue` | owner, manager, accountant, auditor |
| GET | `/api/rooms/reports/current-occupancy` | owner, manager, reception, auditor |

## File Structure

```
src/domains/rooms/
├── rooms.types.ts        # All domain types, enums, state machines, DTOs
├── rooms.repository.ts   # SQLite implementation (80+ methods, 13 tables)
├── rooms.service.ts      # Business logic (9 service modules)
├── rooms.routes.ts       # REST API (70+ endpoints)
└── rooms.seed.ts         # Deterministic seed (6 types, 20 rooms, 5 guests, 5 reservations)

tests/rooms.test.ts       # 200+ test cases
```

## Check-In/Check-Out Flow

```
CHECK-IN FLOW:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Find         │────→│ Find/Create  │────→│ Update       │
│ Reservation  │     │ Guest        │     │ Reservation  │
│ (confirmed)  │     │ Profile      │     │ → checked_in │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                    ┌──────────────────────────────┘
                    ▼
          ┌───────────────────┐
          │ Create Stay +     │
          │ Create Folio      │
          │ Assign Room       │
          │ Update Room→Occup.│
          └───────────────────┘

CHECK-OUT FLOW:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Find Active  │────→│ Post Final   │────→│ Process      │
│ Stay         │     │ Room Charges │     │ Payment      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                    ┌──────────────────────────────┘
                    ▼
          ┌───────────────────────────────────┐
          │ Close Folio                       │
          │ Update Stay→checked_out           │
          │ Release Room→cleaning             │
          │ Update Guest Stats                │
          │ Update Reservation→checked_out    │
          └───────────────────────────────────┘
```

## Night Audit Flow

```
1. Check if audit exists for date (prevent duplicates)
2. Count rooms by status
3. FOR each active stay:
     Post room_tariff charge for tonight
4. Calculate revenue by category
5. Compute metrics:
   - Occupancy % = occupied / total × 100
   - ADR = roomRevenue / occupiedRooms
   - RevPAR = roomRevenue / totalRooms
6. Create NightAudit record
7. Record NIGHT_AUDIT_COMPLETED event
```
