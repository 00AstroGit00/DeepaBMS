# ADR-0016: Enterprise Offline Synchronization Architecture

**Status**: Accepted (2026-07-14)

**Domain**: Infrastructure / Synchronization

**Applies to**: Frontend (src/), Backend (apps/backend), Windows (apps/windows/)

---

## Context

DeepaBMS currently uses a primitive full-state JSON file sync with no device identity, no incremental sync, no conflict resolution, and no offline queue. The existing implementation (see `apps/backend/src/domains/sync/sync.routes.ts` and `src/context/StoreContext.tsx`) has the following characteristics:

### Existing Sync Architecture

```
┌──────────────────────┐     POST /api/sync { full GlobalState }     ┌──────────────────────┐
│  Client (React)       │ ──────────────────────────────────────────> │  Server (Express)     │
│  AsyncStorage          │                                             │  deepa-bms-master     │
│  (full JSON document)  │ <──────────────────────────────────────────│  -state.json          │
│                        │     merged full state                       │  + .bak crash recovery│
└──────────────────────┘                                             └──────────────────────┘
```

### Limitations of Current System

| Aspect | Current Behavior | Problem |
|--------|-----------------|---------|
| **Sync payload** | Full GlobalState JSON (~50KB+) | Bandwidth waste, no delta |
| **Device identity** | None | Server cannot distinguish devices |
| **Conflict resolution** | LWW by date fields | Overwrites legitimate changes |
| **Offline queue** | None — optimistic writes only | Changes lost if sync fails silently |
| **Audit trail** | Client-side auditLog (500 cap) | No immutable event history |
| **Server state** | Single JSON file | No query capability, corruption risk |
| **Authentication** | JWT only (user-level) | No device-level auth |
| **Concurrency** | In-process promise queue | No horizontal scaling |

### Required Capabilities

The organization now operates across multiple devices (phones, tablets, POS terminals, desktop) and requires:

1. **True offline-first**: Full business operation without network, automatic sync on reconnect
2. **Multi-device**: 10+ device types (POS, bar terminal, kitchen display, manager tablet, etc.)
3. **No data loss**: Every business event captured immutably, never silently dropped
4. **Bandwidth efficiency**: Incremental sync of only changed events, not full state
5. **Conflict safety**: Predictable merge outcomes with audit trail for manual resolution
6. **Device security**: Each device identified, authenticated, and authorized independently
7. **Audit compliance**: Regulatory requirement for tamper-proof transaction history

## Decision

Replace the existing JSON-file-based sync with a database-backed event-sourcing synchronization engine.

### Sync Topology: Star Topology

The network uses a star topology with the server as the central hub. Every device maintains a local SQLite database. Synchronization is event-driven with checkpoint-based change tracking.

```
                                        ┌──────────────────────┐
                                        │   SERVER (HUB)       │
                                        │   SQLite event_store │
                                        │   + master tables    │
                                        └──────┬───┬───┬──────┘
                                               │   │   │
              ┌────────────────────────────────┼───┼───┼────────────────────────────────┐
              │              │                 │   │   │                 │              │
              ▼              ▼                 ▼   ▼   ▼                 ▼              ▼
      ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐
      │  POS-01    │ │  POS-02    │ │ Bar-01   │ │ KDS-01   │ │ Mgmt-01   │ │ Mobile-01  │
      │ (Tablet)   │ │ (Tablet)   │ │ (Tablet)  │ │(Display) │ │(Desktop)  │ │ (Phone)    │
      └────────────┘ └────────────┘ └──────────┘ └──────────┘ └────────────┘ └────────────┘

      ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐
      │ Mobile-02  │ │ Mobile-03  │ │ Web-01   │ │ Web-02     │
      │ (Phone)    │ │ (Phone)    │ │ (Browser)│ │ (Browser)  │
      └────────────┘ └────────────┘ └──────────┘ └────────────┘
```

### Device Model

Each device is registered with the server before it can synchronize. The device registry table `devices` stores:

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID v4, globally unique device identifier |
| type | VARCHAR(20) | Device type: `pos`, `bar`, `kds`, `manager`, `mobile`, `web`, `windows` |
| name | VARCHAR(100) | Human-readable label (e.g., "Front Desk POS") |
| public_key | TEXT | Ed25519 public key for event signing |
| secret_hash | VARCHAR(100) | Bcrypt hash of device secret (used for token derivation) |
| capabilities | JSON | Feature flags: `{canWriteSales: true, canWriteInventory: false}` |
| registered_by | VARCHAR(50) | FK → users.id (admin who approved registration) |
| is_active | BOOLEAN | Device can be remotely disabled |
| last_seen_at | TIMESTAMP | Last successful sync timestamp |
| created_at | TIMESTAMP | Registration timestamp |
| checkpoint | BIGINT | Last processed event sequence number (per device) |

**Registration flow:**
1. Device generates Ed25519 key pair on first launch
2. Device sends public key + device info to `/api/devices/register`
3. Admin approves registration via `/api/devices/approve/:id`
4. Server issues device token (JWT with `device_id` claim, 30-day expiry)
5. Device stores token securely (Keychain/Keystore)

### Data Ownership

Data is classified into three ownership zones:

```
                    DATA OWNERSHIP MATRIX
┌──────────────────────┬──────────────────┬──────────────────────┬────────────────────┐
│   Data Category      │   Authority      │   Conflict Rule      │   Examples         │
├──────────────────────┼──────────────────┼──────────────────────┼────────────────────┤
│   Master Data        │ Server-authoritative │ LWW (server TS wins) │ Users, products, │
│                      │                  │                      │ settings, tax rates │
├──────────────────────┼──────────────────┼──────────────────────┼────────────────────┤
│   Transactional Data │ Origin-device    │ First-writer-wins    │ Sales, attendance, │
│                      │ authoritative    │                      │ journal entries    │
├──────────────────────┼──────────────────┼──────────────────────┼────────────────────┤
│   Inventory Data     │ Server-authoritative │ Delta-merge      │ Stock levels,      │
│                      │                  │ (sum adjustments)    │ bottle quantities  │
├──────────────────────┼──────────────────┼──────────────────────┼────────────────────┤
│   Device-Local Data  │ Device only      │ Never synced         │ Offline queue,     │
│                      │                  │                      │ UI state, drafts   │
└──────────────────────┴──────────────────┴──────────────────────┴────────────────────┘
```

**Master data** (accounts, products, inventory items, users, settings) is server-authoritative. When a conflict occurs, the version with the later server timestamp wins. Devices propagate master data changes from server → device.

**Transactional data** (sales, attendance, journal entries, KOT records) is origin-device-authoritative. The first device to write a given event wins. This prevents duplicate charge scenarios (e.g., two POS terminals cannot both record the same sale).

**Inventory data** uses delta-merge: adjustments are summed rather than overwritten. If device A adjusts stock by -5 and device B adjusts by -3 concurrently, the result is -8, not whichever arrived last.

**Device-local data** (offline queue, pending operations, UI preferences, draft documents) never leaves the device.

### Event Sourcing Architecture

Every business action produces an immutable event stored in the `event_store` table. The event store is the single source of truth for all synchronized data.

#### event_store Schema

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID v4, globally unique |
| seq | BIGINT | Monotonically increasing sequence number (server- assigned) |
| aggregate_type | VARCHAR(50) | Domain aggregate (e.g., `sale`, `attendance`, `journal_entry`) |
| aggregate_id | VARCHAR(36) | ID of the aggregate instance |
| event_type | VARCHAR(50) | Type within aggregate (e.g., `sale_created`, `sale_cancelled`) |
| version | INTEGER | Aggregate version (monotonically increasing per aggregate) |
| data | JSON | Event payload (schema-validated) |
| metadata | JSON | Context: `{user_id, device_id, ip_address, user_agent}` |
| device_id | VARCHAR(36) | FK → devices.id (originating device) |
| user_id | VARCHAR(50) | FK → users.id (operating user) |
| signed_payload | TEXT | Ed25519 signature of `event_type + version + data` |
| server_timestamp | TIMESTAMP | Server clock when event was persisted |
| device_timestamp | TIMESTAMP | Device clock when event was created |
| created_at | TIMESTAMP | Row insertion timestamp |

#### Event Types

Events are organized by aggregate type. Each aggregate defines its own event types:

| Aggregate | Event Types |
|-----------|-------------|
| `sale` | `sale_created`, `sale_updated`, `sale_cancelled`, `sale_refunded` |
| `attendance` | `attendance_marked`, `attendance_corrected`, `attendance_approved` |
| `journal_entry` | `journal_posted`, `journal_reversed`, `journal_approved` |
| `inventory` | `stock_added`, `stock_removed`, `stock_adjusted`, `stock_transferred` |
| `bar_sale` | `pour_logged`, `bottle_opened`, `bottle_closed`, `bottle_transferred` |
| `room` | `room_checked_in`, `room_checked_out`, `room_cleaned`, `room_maintained` |
| `credit` | `credit_issued`, `credit_paid`, `credit_adjusted` |
| `employee` | `employee_created`, `employee_updated`, `employee_deactivated` |
| `device` | `device_registered`, `device_approved`, `device_deactivated` |

#### Event Reconstruction

Local state is reconstructed by replaying events from the event store:

```
                        ┌─────────────────────┐
                        │   event_store        │
                        │   (immutable log)    │
                        └──────┬──────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │  Projection Engine            │
               │  ┌─────────────────────────┐  │
               │  │ aggregate_type = 'sale'  │  │
               │  │ → rebuild sales table   │  │
               │  └─────────────────────────┘  │
               │  ┌─────────────────────────┐  │
               │  │ aggregate_type = 'room'  │  │
               │  │ → rebuild rooms table   │  │
               │  └─────────────────────────┘  │
               └──────────────┬────────────────┘
                              │
                              ▼
               ┌───────────────────────────────┐
               │   Local Application Tables    │
               │   (SQLite read-model)         │
               └───────────────────────────────┘
```

Each device maintains two local SQLite databases:

1. **event_store.db** — Immutable event log (append-only)
2. **application.db** — Projected read-model tables (derived from events)

### Sync Flow

The synchronization protocol is a bidirectional event exchange using checkpoint-based tracking.

```
                     ┌──────────────┐              ┌──────────────┐
                     │   Device      │              │   Server     │
                     │  (SQLite)     │              │  (SQLite)    │
                     └──────┬───────┘              └──────┬───────┘
                            │                             │
                            │  1. Offline operation       │
                            │     events accumulate       │
                            │     in local event_store    │
                            │                             │
                            │  2. POST /api/sync/push     │
                            │     { device_id,            │
                            │       checkpoint: 42,       │
                            │       events: [E43, E44] }  │
                            │ ───────────────────────────>│
                            │                             │  3. Validate events
                            │                             │     - Verify signatures
                            │                             │     - Check version monotonicity
                            │                             │     - Validate payload schema
                            │                             │
                            │                             │  4. Assign server seq
                            │                             │     Persist to event_store
                            │                             │     Apply to master tables
                            │                             │
                            │  5. 200 OK {                │
                            │     accepted: [E43, E44],   │
                            │     new_checkpoint: 44,     │
                            │     rejected: [] }          │
                            │ <───────────────────────────│
                            │                             │
                            │  6. GET /api/sync/pull      │
                            │     { device_id,            │
                            │       checkpoint: 44 }       │
                            │ ───────────────────────────>│
                            │                             │  7. Query events > 44
                            │                             │     Filter by device
                            │                             │     capabilities
                            │                             │
                            │  8. 200 OK {                │
                            │     events: [E45...E50],    │
                            │     new_checkpoint: 50 }    │
                            │ <───────────────────────────│
                            │                             │
                            │  9. Apply remote events     │
                            │     to local projection     │
                            │     Update checkpoint → 50  │
                            │                             │
```

**Step-by-step:**

1. **Offline accumulation**: Device operates normally, producing events stored in local `event_store`. Events are signed with the device's Ed25519 private key.

2. **Push (device → server)**: Device reads all local events with `seq > last_push_checkpoint` and POSTs them to `/api/sync/push`. The checkpoint is the last event sequence successfully pushed to server.

3. **Server validation**: Server validates each event:
   - Signature verification against device's registered public key
   - Version monotonicity (no gaps or duplicates per aggregate)
   - Schema validation per event_type
   - Authorization check (device capabilities allow this event_type)

4. **Server persistence**: Server assigns a global `seq` (monotonically increasing), persists to `event_store`, updates master projection tables.

5. **Push response**: Server returns accepted event IDs, new checkpoint, and any rejected events with reasons.

6. **Pull (device → server)**: Device GETs `/api/sync/pull` with its `last_pull_checkpoint`. The server returns all events this device is authorized to see with `seq > checkpoint`.

7. **Device projection**: Device applies remote events to local application tables, advances `last_pull_checkpoint`.

#### Sync Triggers

| Trigger | Mechanism | Behavior |
|---------|-----------|----------|
| After write actions | Event published → sync scheduled | 500ms debounce, coalesces multiple writes |
| Periodic poll | Background timer | Every 30 seconds when online |
| App foreground | Lifecycle event | Immediate full push+pull cycle |
| Online event | Network state change | Immediate full push+pull cycle |
| Manual | User action | Immediate full push+pull cycle |
| Server notification | WebSocket (future) | Real-time push when server has new events |

### Conflict Resolution

Conflict resolution follows a multi-strategy approach:

```
                      ┌──────────────────────────┐
                      │  EVENT CONFLICT DETECTED  │
                      └──────────┬───────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
            ┌──────▼──────┐            ┌───────▼───────┐
            │  Same        │            │  Different    │
            │  aggregate   │            │  aggregates   │
            │  same event  │            │  (no conflict)│
            │  type?       │            │               │
            └──────┬──────┘            │  → Apply both  │
                   │                   └───────────────┘
         ┌─────────┴─────────┐
         │                   │
   ┌─────▼──────┐     ┌──────▼──────┐
   │ Master Data │     │ Transaction │
   │ (server     │     │ (origin-    │
   │  authori-   │     │  device     │
   │  tative)    │     │  authori-   │
   └─────┬──────┘     │  tative)    │
         │            └──────┬──────┘
         │                   │
   ┌─────▼──────┐     ┌──────▼──────┐
   │ LWW by     │     │ First-      │
   │ server TS  │     │ Writer-Wins │
   │ (higher TS │     │ (earliest   │
   │  wins)     │     │  event wins)│
   └─────┬──────┘     └──────┬──────┘
         │                   │
         │            ┌──────▼──────┐
         │            │ Is it       │
         │            │ inventory?  │
         │            └──────┬──────┘
         │                   │
         │            ┌──────▼──────┐
         │            │ Delta-Merge │
         │            │ (sum        │
         │            │  adjust-   │
         │            │  ments)     │
         │            └──────┬──────┘
         │                   │
         └─────────┬─────────┘
                   │
         ┌─────────▼──────────┐
         │  Unresolvable?     │
         │  (same event_type, │
         │   same aggregate,  │
         │   different data)  │
         └─────────┬──────────┘
                   │
            ┌──────▼──────┐
            │ Log to      │
            │ conflict_log│
            │ Flag for    │
            │ manual      │
            │ review      │
            └─────────────┘
```

#### conflict_log Schema

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID v4 |
| event_id_a | VARCHAR(36) | First conflicting event |
| event_id_b | VARCHAR(36) | Second conflicting event |
| aggregate_type | VARCHAR(50) | Domain aggregate |
| aggregate_id | VARCHAR(36) | Aggregate instance ID |
| conflict_type | VARCHAR(30) | `version_conflict`, `data_conflict`, `integrity_violation` |
| resolution | VARCHAR(20) | `auto_lww`, `auto_fww`, `auto_delta`, `pending`, `manual_override` |
| resolved_by | VARCHAR(50) | FK → users.id (null if auto-resolved) |
| resolved_at | TIMESTAMP | Resolution timestamp |
| notes | TEXT | Human-readable explanation |

**Resolution strategies in priority order:**

1. **Last-Writer-Wins (server timestamp)**: Default for master data. Event with later `server_timestamp` wins. Simple and predictable.

2. **First-Writer-Wins**: Default for transactional data. Earliest event (by `device_timestamp`) wins. Prevents duplicate charges.

3. **Delta-merge**: For inventory movements. Adjustments are summed. `new_quantity = a.quantity + b.quantity - original`.

4. **Manual review**: When auto-resolution cannot determine a winner (same timestamp, incompatible data). Event logged to `conflict_log` with status `pending`. Admin dashboard shows unresolved conflicts.

### Security Architecture

```
                        ┌─────────────────────────────┐
                        │     SECURITY LAYERS         │
                        ├─────────────────────────────┤
                        │  TLS 1.3 (all endpoints)    │
                        ├─────────────────────────────┤
                        │  JWT (user auth)            │
                        │  + Device Token (device     │
                        │    auth) — dual auth        │
                        ├─────────────────────────────┤
                        │  Event Payload Signatures   │
                        │  (Ed25519 per device)       │
                        ├─────────────────────────────┤
                        │  Replay Protection          │
                        │  (monotonic versions)       │
                        ├─────────────────────────────┤
                        │  Rate Limiting              │
                        │  (per device + per user)    │
                        ├─────────────────────────────┤
                        │  Capability-Based Auth      │
                        │  (device can only write     │
                        │   permitted event types)    │
                        └─────────────────────────────┘
```

**Device authentication:**
- Device token is a JWT with claims: `{device_id, type, capabilities, iat, exp}`
- Token derived from device secret (bcrypt comparison on first exchange)
- Token expiry: 30 days, auto-refreshed on sync
- Token stored in platform secure storage (Android Keystore, iOS Keychain, Windows DPAPI)

**Event signing:**
- Every event payload is signed: `sign(device_private_key, event_type + "|" + version + "|" + JSON.stringify(data))`
- Server verifies against `devices.public_key` before persistence
- Provides non-repudiation: device cannot deny producing an event

**Replay protection:**
- Each aggregate has a monotonically increasing `version` number
- Server rejects events where `version <= last_version` for that aggregate
- Prevents replay attacks even if event payloads are intercepted

### Local Database Layer (Device)

Each device runs SQLite locally with two databases:

#### event_store.db
```sql
CREATE TABLE events (
    id          VARCHAR(36) PRIMARY KEY,
    seq         BIGINT,               -- local seq (negative for unsynced)
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   VARCHAR(36) NOT NULL,
    event_type     VARCHAR(50) NOT NULL,
    version     INTEGER NOT NULL,
    data        TEXT NOT NULL,         -- JSON
    metadata    TEXT NOT NULL,         -- JSON
    device_id   VARCHAR(36) NOT NULL,
    user_id     VARCHAR(50),
    signature   TEXT NOT NULL,         -- Ed25519 sig
    device_ts   TIMESTAMP NOT NULL,
    synced      BOOLEAN DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_synced ON events(synced, seq);
CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, version);
```

#### application.db
Standard application tables (sales, rooms, etc.) projected from events. Contains the current state as a read-model.

### Server Database Layer

#### Schema Additions

New tables added to the existing SQLite database:

| Table | Purpose |
|-------|---------|
| `devices` | Device registry (detailed above) |
| `event_store` | Immutable event log (same schema as local but with server-assigned seq) |
| `conflict_log` | Conflict audit trail |
| `sync_checkpoints` | Per-device checkpoint tracking |

```sql
CREATE TABLE sync_checkpoints (
    device_id    VARCHAR(36) PRIMARY KEY REFERENCES devices(id),
    push_seq     BIGINT NOT NULL DEFAULT 0,   -- last pushed event seq processed
    pull_seq     BIGINT NOT NULL DEFAULT 0,   -- last pulled event seq sent to device
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Offline Lifecycle State Machine

Every device transitions through the following states:

```
                         ┌──────────────┐
                         │  UNREGISTERED │
                         │  (first      │
                         │   launch)    │
                         └──────┬───────┘
                                │ device registered + approved
                                ▼
                    ┌─────────────────────┐
                    │      REGISTERED      │
                    │  (device created,    │
                    │   awaiting approval) │
                    └──────────┬──────────┘
                               │ admin approves
                               ▼
                    ┌─────────────────────┐
              ┌────>│      ACTIVE         │
              │     │  (can sync)         │
              │     └──────┬───┬──────────┘
              │            │   │
              │     ┌──────┘   └──────┐
              │     │                 │
              │     ▼                 ▼
              │  ┌────────┐    ┌──────────┐
              │  │ ONLINE │    │ OFFLINE  │
              │  │(connected│   │(no network│
              │  │ to      │    │ connection│
              │  │ server) │    │ or server │
              │  └────┬───┘    │ unreach-  │
              │       │        │ able)     │
              │       │        └─────┬─────┘
              │       │              │
              │       │      ┌───────┴──────┐
              │       │      │ QUEUING      │
              │       │      │ events       │
              │       │      │ accumulating │
              │       │      │ locally with │
              │       │      │ seq = -N     │
              │       │      └───────┬──────┘
              │       │              │
              │       │     network restored
              │       │     or server back
              │       │              │
              │       └──────┬───────┘
              │              │
              │              ▼
              │     ┌──────────────────┐
              │     │   RECONNECTING   │
              │     │  push pending    │
              │     │  events →        │
              │     │  pull remote     │
              │     │  events →        │
              │     │  resolve         │
              │     │  conflicts →     │
              │     │  rebuild         │
              │     │  projection      │
              │     └────────┬─────────┘
              │              │
              │     sync complete
              └─────┘ (back to ONLINE)

                    ┌─────────────────────┐
                    │     DISABLED         │
                    │  (admin deactivated) │
                    │  → no sync allowed   │
                    └─────────────────────┘
```

**State transition rules:**

| From | To | Trigger |
|------|----|---------|
| UNREGISTERED | REGISTERED | POST /api/devices/register with public key |
| REGISTERED | ACTIVE | Admin approves via /api/devices/approve/:id |
| ACTIVE (ONLINE) | ACTIVE (OFFLINE) | Network error, timeout, or server unreachable |
| ACTIVE (OFFLINE) | RECONNECTING | Network connectivity restored |
| RECONNECTING | ACTIVE (ONLINE) | Push+pull cycle completes successfully |
| ACTIVE (any) | DISABLED | Admin deactivates device |
| DISABLED | ACTIVE | Admin reactivates device |

**Offline queue behavior:**
- Events in offline mode get a negative local seq (-1, -2, -3...)
- On reconnect, events are pushed in creation order
- If server rejects an event (validation failure), it is logged locally and flagged for user attention
- Events queued while offline are never silently dropped

### New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/devices/register` | None (one-time) | Register device with public key |
| POST | `/api/devices/approve/:id` | JWT (admin) | Approve device registration |
| GET | `/api/devices` | JWT (admin) | List registered devices |
| POST | `/api/sync/push` | JWT + Device Token | Push local events to server |
| GET | `/api/sync/pull` | JWT + Device Token | Pull remote events from server |
| GET | `/api/sync/status` | JWT + Device Token | Get sync status + checkpoint info |
| GET | `/api/conflicts` | JWT (admin) | List unresolved conflicts |
| POST | `/api/conflicts/:id/resolve` | JWT (admin) | Manually resolve a conflict |

### Push Endpoint Contract

**POST /api/sync/push**
```json
{
  "device_id": "uuid-...",
  "events": [
    {
      "id": "uuid-...",
      "aggregate_type": "sale",
      "aggregate_id": "uuid-...",
      "event_type": "sale_created",
      "version": 1,
      "data": { "amount": 1500, "items": [...] },
      "metadata": { "user_id": "u-owner", "ip_address": "..." },
      "device_id": "uuid-...",
      "user_id": "u-owner",
      "signature": "base64-ed25519-sig",
      "device_timestamp": "2026-07-14T10:30:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "accepted": ["uuid-1", "uuid-2"],
  "rejected": [
    {
      "id": "uuid-3",
      "reason": "version_conflict",
      "detail": "Expected version 2, got version 1"
    }
  ],
  "new_push_checkpoint": 1042
}
```

### Pull Endpoint Contract

**GET /api/sync/pull?device_id=uuid&checkpoint=1042**

**Response:**
```json
{
  "events": [
    {
      "id": "uuid-...",
      "seq": 1043,
      "aggregate_type": "room",
      "aggregate_id": "uuid-...",
      "event_type": "room_checked_in",
      "version": 3,
      "data": { "guest_name": "...", "room_number": "101" },
      "device_id": "other-device-uuid",
      "user_id": "u-reception",
      "server_timestamp": "2026-07-14T10:32:00Z"
    }
  ],
  "new_pull_checkpoint": 1043,
  "has_more": false
}
```

## Consequences

### Positive

- **True offline-first**: Full business operation without network. Queued events auto-sync when connectivity returns. No data loss during outages of any duration.

- **Incremental bandwidth**: Only changed events transmitted (kilobytes vs megabytes). Reduces mobile data costs and improves sync speed on slow connections.

- **Full audit trail**: Every business action is an immutable event. Compliance-ready for tax audits, employee disputes, and financial reconciliation. Events are cryptographically signed — non-repudiable.

- **Multi-device safety**: Device identity prevents phantom writes. Ten device types with granular capabilities ensure each device can only perform authorized operations. A bar tablet cannot accidentally create a sales invoice.

- **Predictable conflict outcomes**: Every conflict has a documented resolution strategy. No silent overwrites. Unresolvable conflicts are surfaced for manual review, not silently dropped.

- **Horizontal scalability**: Event store is append-only. Read replicas can consume the event stream. Future migration to Kafka/RabbitMQ is architecturally prepared.

- **Delta-merge for inventory**: Stock adjustments sum correctly across devices. No phantom stock gains or losses from concurrent adjustments.

- **Device security**: Ed25519 signing prevents event forgery. TLS prevents interception. Replay protection prevents duplicate processing. Admin-controlled device activation/deactivation.

- **Backward compatible migration**: Existing data can be migrated by creating initial snapshot events from current state, then switching to event-sourced mode.

### Negative

- **Storage growth**: Event store grows unboundedly. Each sale creates at least one event record. At 500 transactions/day, the event store grows by ~50MB/year. Mitigation: event archival/purging policy for events older than 7 years (regulatory requirement).

- **Increased complexity**: The current ~200-line sync module becomes ~2000+ lines across multiple modules (device registry, event store, projection engine, conflict resolver, sync protocol, security). Requires disciplined engineering.

- **Migration effort**: All existing devices (phones, tablets, desktops) must be updated with the new sync client. Backend must run dual-mode (old and new sync) during transition period. Existing `deepa-bms-master-state.json` must be converted to initial events.

- **Projection rebuilds**: If the projection logic changes, all devices must rebuild their local read-models from the event store. For large event stores, this can take minutes on mobile devices.

- **Clock dependencies**: Device timestamps are used for FWW ordering. Clock drift between devices could affect conflict resolution. Mitigation: server timestamps are authoritative; device timestamps used only for FWW tiebreaker.

### Trade-offs

- **Event sourcing vs CRUD sync**: Event sourcing provides auditability and reliable reconstruction at the cost of storage and complexity. For DeepaBMS's regulatory environment (tax audits, excise compliance), the audit benefit outweighs the cost.

- **SQLite vs AsyncStorage**: AsyncStorage (key-value JSON) was simple but unsuitable for event queries (`SELECT * FROM events WHERE synced=0 ORDER BY seq`). SQLite provides the query capability needed for event sourcing. The migration cost is justified by the architectural requirements.

- **Star topology vs peer-to-peer**: Star is simpler to implement and reason about. P2P would reduce server load but introduces vector clocks and causal consistency challenges. For a single-business deployment with <50 devices, star is appropriate.

- **Checkpoint-based vs timestamp-based**: Checkpoints (monotonic seq numbers) are more reliable than timestamps for tracking sync progress. Timestamps can drift or collide; seq numbers are exact. The trade-off is that the server must maintain per-device checkpoint state.

- **Event signing vs transport-only security**: Event signing adds CPU overhead (~1ms per event on mobile) but provides non-repudiation. Without it, a compromised server could forge events from a device. With signing, the server cannot produce events it didn't receive.

- **Same-device multi-user**: Events carry user_id in metadata, not the device token. This allows multiple users on the same device while maintaining per-user audit trail. The device identifies the origin; the user identifies the operator.

## Implementation Plan

### Phase 1: Distributed Architecture (P5-1)
- Define device registry tables and schema
- Implement device registration flow (generate keys on client, register on server, admin approval)

### Phase 2: Device Registry (P5-2)
- Build device management UI in Settings screen
- Implement device token generation and refresh
- Add device capability configuration

### Phase 3: Local Database Layer (P5-3)
- Replace AsyncStorage with SQLite on client
- Create event_store schema for local + application tables
- Implement projection engine with event replay
- Build migration path from existing AsyncStorage state

### Phase 4: Event Sourcing (P5-4)
- Define event types for all aggregates
- Instrument business operations to produce events
- Implement event validation and signing
- Build event store query capability

### Phase 5: Sync Engine (P5-5)
- Implement push protocol (device → server)
- Implement pull protocol (server → device)
- Build checkpoint management
- Add sync triggers (debounce, poll, foreground, online)
- Implement WebSocket notification (optional enhancement)

### Phase 6: Conflict Resolution (P5-6)
- Implement LWW resolver for master data
- Implement FWW resolver for transactional data
- Implement delta-merge for inventory
- Build conflict_log with auto-resolution + manual flagging
- Build conflict resolution UI in admin dashboard

### Phase 7: Offline Business Logic (P5-7)
- Implement offline queue with negative seq
- Ensure all business operations work without network
- Add sync status indicators (pending count, last sync time)
- Handle partial sync failures gracefully

### Phase 8: Security (P5-8)
- Ed25519 key generation and storage on all platforms
- Event signing and verification pipeline
- Replay protection at aggregate version level
- Capability-based access control enforcement
- Security audit of entire sync pipeline

### Phase 9: API (P5-9)
- Complete API contracts for all sync endpoints
- OpenAPI documentation
- Backward compatibility layer during transition
- Rate limiting per device + per user

### Phase 10: Performance (P5-10)
- Benchmark event store read/write performance
- Optimize projection engine for large event stores
- Profile sync payload sizes and compression
- Measure and optimize cold start projection rebuild

### Phase 11: Testing (P5-11)
- Unit tests for event validation and signing
- Unit tests for conflict resolution strategies
- Integration tests for push/pull cycle
- Integration tests for offline → online transition
- E2E tests with multiple simulated devices
- Stress tests with large event volumes

### Phase 12: Documentation (P5-12)
- Developer guide for adding new event types
- Operator guide for device management
- User guide for offline operation
- Troubleshooting guide for sync issues
- Architecture diagram updates

## Migration Strategy

### Dual-Mode Operation

During the transition period, the backend runs both sync systems:

```
┌─────────────────────────────────────────────────────┐
│                  BACKEND                              │
│                                                       │
│  ┌─────────────────┐   ┌──────────────────────────┐  │
│  │ Legacy Sync     │   │ Event-Sourced Sync       │  │
│  │ POST /api/sync  │   │ POST /api/sync/push      │  │
│  │ JSON file merge │   │ GET  /api/sync/pull      │  │
│  └────────┬────────┘   └───────────┬──────────────┘  │
│           │                        │                  │
│           ▼                        ▼                  │
│  ┌─────────────────┐   ┌──────────────────────────┐  │
│  │ master-state    │   │ event_store              │  │
│  │ .json           │   │ + projection engine      │  │
│  └─────────────────┘   └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Phase 1 (dual-mode):**
1. Server accepts both old `/api/sync` and new `/api/sync/push` + `/api/sync/pull`
2. Old clients continue using JSON file sync
3. New clients use event-sourced sync
4. Server maintains both state representations from the same event stream

**Phase 2 (cutover):**
1. All clients updated to event-sourced sync
2. Old `/api/sync` endpoint deprecated
3. `deepa-bms-master-state.json` frozen and archived
4. Projection engine becomes the single source of truth

**Phase 3 (cleanup):**
1. Remove legacy sync endpoint
2. Remove JSON file read/write code
3. Archive `deepa-bms-master-state.json.bak`

### Data Conversion

The existing state in `deepa-bms-master-state.json` is converted to initial events:

```sql
-- For each sale record in master state, create a sale_created event
INSERT INTO event_store (id, aggregate_type, aggregate_id, event_type, version, data, ...)
SELECT
    gen_random_uuid(),
    'sale',
    sales.id,
    'sale_created',
    1,
    json_object(...),
    ...
FROM json_each(master_state->'$.sales') AS sales;
```

This one-time migration runs as part of the server bootstrap when `event_store` is empty.

## Rollback

1. Revert all code changes in `src/`, `apps/backend/src/domains/sync/`, `apps/backend/src/middleware/`
2. Restore legacy `/api/sync` endpoint as primary sync mechanism
3. Remove `devices`, `event_store`, `conflict_log`, `sync_checkpoints` tables from schema
4. Clients restored to AsyncStorage-only mode with full-state sync
5. Existing events in `event_store` are archived (not deleted) for potential future recovery

Rollback preserves all business data: the master projection tables (sales, rooms, etc.) are the same regardless of sync mechanism. Only the sync infrastructure changes.

## Monitoring & Observability

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Sync latency (push → pull) | Server metrics | > 5 seconds |
| Pending events per device | sync_checkpoints | > 1000 |
| Conflict rate | conflict_log | > 1% of events |
| Rejected events | Push response | Any rejection |
| Offline device count | last_seen_at | > 24 hours |
| Event store size | DB size | > 1GB |
| Projection rebuild time | Client metrics | > 30 seconds |

## Future Roadmap

1. **WebSocket live sync**: Real-time push of events from server to connected devices (eliminates polling)
2. **Peer-to-peer sync**: Direct device-to-device sync for LAN environments (no server dependency)
3. **Event archival**: Automatic archival of events older than 7 years with hash-chain verification
4. **CRDT migration**: If conflict rates increase with scale, migrate to Conflict-Free Replicated Data Types
5. **Multi-business isolation**: Tenant-aware event store for multi-company deployments
6. **CDC integration**: Change Data Capture feed from event_store to data warehouse
7. **Compression**: Binary event serialization (Protocol Buffers / MessagePack) for bandwidth-constrained links
8. **Selective sync**: Per-device subscription to specific aggregate types (e.g., KDS only subscribes to `kot` events)
