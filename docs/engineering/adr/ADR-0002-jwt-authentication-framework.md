> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# ADR-0002: JWT Authentication & Authorization Framework

## Status
Accepted (2026-07-13). Supersedes ad-hoc `authenticateToken` middleware.
**Amended 2026-07-14 (P8.5):** added `tenantId` claim, pinned JWT algorithm, and
bound tenant context to the token (see Security section).

## Context
DeepaBMS backend had a minimal JWT middleware (`authenticateToken`) applied to most routes but critically missing from `/api/sync`. Authorization was implicit — any authenticated user could access any endpoint. No issuer/audience validation, no role checking, no centralized auth module.

## Decision
Build a reusable authentication and authorization middleware module at `apps/backend/src/middleware/auth.ts` with:

1. **`authenticate`** — JWT verification middleware with issuer + audience validation
2. **`authorize(...roles)`** — role-based access control middleware factory
3. **`signToken(user)`** — centralized token signing with consistent claims
4. **`ROLE_HIERARCHY`** — numeric hierarchy for future `roleAtLeast()` checks

## Design

### Middleware Pipeline
```
Request → authenticate → authorize(...) → Route Handler
```

### JWT Claims
| Claim | Value | Source |
|-------|-------|--------|
| `id` | User ID | Database |
| `name` | User display name | Database |
| `role` | User role | Database |
| `iss` | `JWT_ISSUER` env var (default: `deepa-bms`) | Config |
| `aud` | `JWT_AUDIENCE` env var (default: `deepa-bms-api`) | Config |
| `exp` | 8 hours from issue time | Hardcoded |
| `tenantId` | Tenant the user belongs to (default single-tenant id) | Config / user |

### Algorithm Pinning (P8.5 — SEC-08)
`jwt.verify` now passes `algorithms: ['HS256']` to prevent `alg=none` and
key-confusion attacks.

### Tenant Binding (P8.5 — SEC-02)
For authenticated requests the tenant context is derived **strictly from the
JWT `tenantId` claim**; the `x-tenant-id` header / subdomain is ignored for
authenticated traffic and a mismatch between the resolved tenant and the token
claim returns HTTP 403. This eliminates tenant-spoofing via request headers.

### Role Matrix
| Role | Access Scope |
|------|-------------|
| `owner` | Full access — all endpoints, all operations |
| `manager` | Read/write all business data |
| `cashier` | Sales read/write |
| `reception` | Rooms read |
| `fnb` | Inventory read |
| `barstaff` | Liquor read |
| `accountant` | Sales, employees, sync read |
| `auditor` | Read-only access to all business data |

### Endpoint Security Matrix
| Route | Auth | Authorized Roles |
|-------|------|------------------|
| `POST /api/auth/login` | Public | — |
| `GET /api/sales` | Required | owner, manager, cashier, accountant, auditor |
| `POST /api/sales` | Required | owner, manager, cashier, accountant |
| `GET /api/rooms` | Required | owner, manager, reception, auditor |
| `GET /api/inventory` | Required | owner, manager, fnb, auditor |
| `GET /api/liquor` | Required | owner, manager, barstaff, auditor |
| `GET /api/employees` | Required | owner, manager, accountant, auditor |
| `POST /api/sync` | Required | owner, manager, cashier, reception, fnb, barstaff, accountant, auditor |

## Alternatives Considered

1. **Passport.js** — Standard but adds dependency. Overkill for JWT-only auth.
2. **express-jwt** — Clean but doesn't handle authorization. Would still need custom middleware.
3. **CASL/Ability** — Full permission engine. Too complex for current role count (7 roles).
4. **API keys** — Simpler but lacks expiry, role binding, and revocation.

## Trade-offs
- **+** Zero new dependencies (uses existing `jsonwebtoken`)
- **+** Type-safe with exported interfaces
- **+** Middleware is composable and testable
- **-** No token revocation (would need a blocklist/Redis)
- **-** No refresh token flow (clients re-login after 8h)
- **-** Role checks are string-matching, not hierarchical

## Migration
- Replace all `authenticateToken` imports/usage with `authenticate` from `middleware/auth`
- Add `authorize(...)` after `authenticate` on each route
- JWT tokens signed before this ADR will be rejected if they lack `iss`/`aud` claims (graceful: 403 with clear message)

## Rollback
- Revert `apps/backend/src/index.ts` route definitions to use old `authenticateToken`
- Delete `apps/backend/src/middleware/auth.ts`
- Re-add inline `AuthUser` interface and `authenticateToken` function

## Future Improvements
- Token revocation via Redis blocklist
- Refresh token rotation
- Permission-based (rather than role-based) authorization
- `roleAtLeast()` hierarchy-based access for admin escalation
