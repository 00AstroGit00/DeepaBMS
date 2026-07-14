# DeepaBMS API Inventory

## Backend Server
- **Base URL**: `http://<host>:3000`
- **Auth**: JWT Bearer token
- **Rate Limits**: 500 req/15min (general), 20 req/15min (auth)

## Authentication

### POST /api/auth/login
Authenticate with PIN. Returns JWT token (8h expiry).

**Request:**
```json
{ "pin": "1234" }
```

**Response (200):**
```json
{
  "token": "eyJ...",
  "user": { "id": "u-owner", "name": "Deepa (Owner)", "role": "owner" }
}
```

**Rate Limited**: 20 req/15min

## Sales

### GET /api/sales
Fetch all sales (requires auth).

### POST /api/sales
Create a new sale record.

## Rooms

### GET /api/rooms
Fetch all rooms with guest details.

## Inventory

### GET /api/inventory
Fetch F&B kitchen inventory.

## Liquor

### GET /api/liquor
Fetch bar liquor stock.

## Employees

### GET /api/employees
Fetch employee records.

## Sync

### POST /api/sync
Centralized state synchronization endpoint.

**Request:**
```json
{
  "state": {
    "users": [...],
    "sales": [...],
    // ... full GlobalState
  }
}
```

**Response (200):**
```json
{
  "ready": true,
  "users": [...],
  "sales": [...],
  // ... merged state
}
```

**Sync Algorithm:**
1. Serialized via in-memory promise queue
2. Read master state from JSON file (with backup recovery)
3. Merge each collection using LWW by date fields
4. Rooms merged by priority (occupied > cleaning > vacant)
5. Settings merged with local serverUrl preserved
6. Write crash-safe (backup → primary)

## API Coverage

| Endpoint | Method | Auth | Rate Limit | Status |
|---|---|---|---|---|
| /api/auth/login | POST | No | 20/15m | ✅ Implemented |
| /api/sales | GET | JWT | 500/15m | ✅ Implemented |
| /api/sales | POST | JWT | 500/15m | ✅ Implemented |
| /api/rooms | GET | JWT | 500/15m | ✅ Implemented |
| /api/inventory | GET | JWT | 500/15m | ✅ Implemented |
| /api/liquor | GET | JWT | 500/15m | ✅ Implemented |
| /api/employees | GET | JWT | 500/15m | ✅ Implemented |
| /api/sync | POST | No | 500/15m | ✅ Implemented |

## Missing Endpoints
- **No user management API** (CRUD users via frontend only, synced via /api/sync)
- **No employee management API** (CRUD employees via sync only)
- **No hotel/room management API** (CRUD rooms, check-in/out via sync only)
- **No bank statement import API** (client-side parsing only)
- **No report generation API** (reports generated client-side)
- **No backup/restore API** (backup is file-level only)
- **No OpenAPI/Swagger documentation**

## Error Responses
All endpoints return:
```json
{ "message": "Error description" }
```
- 400: Bad request (missing fields)
- 401: Token required
- 403: Invalid/expired token
- 429: Rate limited
- 500: Internal server error
