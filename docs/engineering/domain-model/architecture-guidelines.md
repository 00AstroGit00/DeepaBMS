# Architecture Guidelines

---

## 1. Module Structure

Every new feature module follows this structure:

```
domains/<name>/
├── <name>.routes.ts          # Route handlers (Express)
├── <name>.repository.ts      # Persistence implementation
├── <name>.schema.ts          # Validation schemas (if >1 route)
├── <name>.service.ts         # Business logic (if complex)
├── <name>.seed.ts            # Seed data (deterministic, idempotent)
└── <name>.test.ts            # Tests
```

### When to add a service layer

| Condition | Example | Action |
|-----------|---------|--------|
| Route handler >50 lines | Payroll computation | Extract to `.service.ts` |
| Logic spans multiple aggregates | GST return | Extract to `.service.ts` |
| Complex calculation | Cost averaging | Extract to `.service.ts` |
| External API integration | BEVCO order | Extract to `.service.ts` |
| Simple CRUD | Announcements | Keep in `.routes.ts` |

---

## 2. Dependency Rules

```
routes → service → repository
routes → repository (simple cases)
repository → db (SQLite)

services → other services (via injection)
services → repositories (via injection)

NO:  routes → routes
NO:  repository → service
NO:  service → service → service (chain max 2)
```

### Import Boundaries

```
src/middleware/  ← can import by any domain
src/seed/        ← can import from any domain
src/domains/     ← can NOT import from sibling domains
src/domains/X/   ← can import from src/db, src/middleware/*
```

Cross-domain calls go through the **Event Bus** (future) or are injected as service dependencies.

---

## 3. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Domain directory | kebab-case | `liquor-management` |
| Route file | `<domain>.routes.ts` | `liquor.routes.ts` |
| Repository | `<domain>.repository.ts` | `liquor.repository.ts` |
| Service | `<domain>.service.ts` | `liquor.service.ts` |
| Validation schema | `<domain>.schema.ts` | `liquor.schema.ts` |
| Seed file | `<domain>.seed.ts` | `liquor.seed.ts` |
| Interface | `I<Name>` | `ILiquorRepository` |
| DTO | `Create<Name>Dto`, `Update<Name>Dto` | `CreateLiquorItemDto` |
| Route prefix | `/api/<plural>` | `/api/liquor` |

---

## 4. Validation Rules

- **All inputs** validated at route level (via `validate()` middleware)
- **Business rules** enforced at service/repository level
- **Database constraints** as last line of defense (unique, check, FK)

### Validation Order

```
HTTP Request → Schema Validation → Authentication → Authorization → Business Logic → Persistence
```

---

## 5. Audit Requirements

| Operation | Audit Event | Async |
|-----------|-------------|-------|
| CREATE | `<ENTITY>_CREATED` | Yes (on sync) |
| UPDATE | `<ENTITY>_UPDATED` with changed fields | Yes |
| DELETE | `<ENTITY>_DELETED` | Yes |
| STATUS CHANGE | `<ENTITY>_STATUS_CHANGED` | Yes |
| LOGIN | `LOGIN_SUCCESS` / `LOGIN_FAILURE` | Yes |
| SETTINGS | `SETTINGS_UPDATED` | Yes |

All audit events include: `user_id`, `user_name`, `action`, `ip_address` (backend), `timestamp`.

---

## 6. Error Handling

```typescript
// Standard error types
class DomainError extends Error {
  constructor(
    message: string,
    public code: string,         // e.g., 'STOCK_INSUFFICIENT'
    public statusCode: number,   // e.g., 400
    public details?: unknown,     // e.g., { available: 5, requested: 10 }
  ) {
    super(message);
  }
}

class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

class ValidationError extends DomainError {
  constructor(errors: FieldError[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400, { errors });
  }
}

class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

class ForbiddenError extends DomainError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}
```

### Error Response Format
```json
{
  "message": "Human-readable description",
  "code": "STOCK_INSUFFICIENT",
  "details": { "available": 5, "requested": 10 },
  "correlationId": "abc123"
}
```

---

## 7. Testing Strategy

| Layer | Test Type | What to Test |
|-------|-----------|-------------|
| Routes | Integration (supertest) | HTTP status, response shape, auth |
| Validation schemas | Unit | Each field: valid, invalid, missing, boundary |
| Services | Unit | Business rules, edge cases, error states |
| Repositories | Integration (test DB) | SQL queries, constraints, transactions |
| Seed modules | Integration | Determinism, idempotency, rollback |
| State machines | Unit | All transitions, invalid transitions, permissions |

### Coverage Targets
- Services: 90%+
- Repositories: 80%+
- Routes: 70%+
- Seeds: 100% (determinism verified)

---

## 8. Seed Data Standards

- **Deterministic**: Same seed input → same output every time
- **Idempotent**: Running twice produces same result (no duplicates)
- **Independent**: Each seed module runs standalone with `onlySeeds: ['<name>']`
- **Testable**: `verify()` method confirms seed was applied correctly
- **Demo vs Production**: Demo seed creates rich sample data; production seed creates only required configuration

---

## 9. Performance Guidelines

| Operation | Target | Monitoring |
|-----------|--------|------------|
| API response (p50) | <100ms | Request logger |
| API response (p99) | <500ms | Request logger |
| Sync merge | <1000ms | Sync logger |
| Report generation | <3000ms | Per-report timing |
| Seed execution | <5000ms total | Bootstrap logger |

### N+1 Prevention
- Use JOINs for aggregate reads
- Batch stock moves by day/item
- Preload attendance for payroll run

---

## 10. Security Guidelines

- All state-mutating endpoints require authentication
- Read-only endpoints (GET) require minimum authorization
- PINs: bcrypt hashed (cost factor ≥ 10)
- JWT: HS256, 24h expiry, blacklist on logout (future)
- SQL: Parameterized queries only (no string interpolation)
- IDs: UUID-style (`uid()`) for production, human-readable for seed
- Secrets: Environment variables only, validated at startup
