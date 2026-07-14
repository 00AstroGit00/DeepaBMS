# ADR-0003: Centralized Validation Framework

## Status
Accepted (2026-07-13).

## Context
Every POST endpoint in the backend accepted raw `req.body` without schema validation. A single `if (!pin)` check existed in the login route. No protection against:
- Missing/invalid fields
- Type confusion
- Mass assignment
- Oversized payloads
- Injection through unchecked string fields

## Decision
Build a zero-dependency validation framework at `apps/backend/src/middleware/validate.ts` with:

1. **`validate(schema)`** — Express middleware factory applying a `SchemaDefinition`
2. **`SchemaDefinition`** — declarative field rules: type, required, min/max, pattern, enum, strip
3. **`ValidationErrorResponse`** — standardized error format with correlation ID, timestamp, per-field errors
4. **`stripUnknown()`** — mass assignment protection (removes fields not in schema)
5. **Pre-built schemas**: `LOGIN_SCHEMA`, `CREATE_SALE_SCHEMA`, `SYNC_SCHEMA`

## Architecture
```
Request → authenticate → authorize(...) → validate(schema) → Route Handler
                                          ↓
                                   400 on failure (standardized error)
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "correlationId": "vld-abc123-1",
    "timestamp": "2026-07-13T12:00:00.000Z",
    "fields": [
      { "field": "amount", "reason": "required", "message": "amount is required", "suggestion": "Provide a numeric value for amount" }
    ]
  }
}
```

### Supported Types
`string`, `number`, `integer`, `boolean`, `array`, `object`, `date`, `uuid`, `enum`, `currency`, `percentage`, `any`

## Alternatives Considered
1. **Zod** — Best-in-class validation but adds a dependency. 0-dependency approach preferred for a lightweight backend.
2. **Joi** — Similar to Zod, well-known but heavy (70KB+).
3. **express-validator** — Middleware-based but couples validation to Express.
4. **TypeScript types only** — No runtime enforcement.

## Trade-offs
- **+** Zero new dependencies
- **+** Standardized error format across all endpoints
- **+** Mass assignment protection built in
- **+** Schema definitions are co-located with validation logic
- **-** Custom engine means no ecosystem of validators
- **-** Sync endpoint gets structural validation only (state shape is too large for field-level rules)
- **-** No TypeScript type inference from schemas (unlike Zod)

## Migration
- Add `validate(schema)` middleware to each POST/PUT route
- Remove inline validation checks (e.g., `if (!pin)`)
- Existing clients sending extra fields will have them silently stripped (no breakage)

## Rollback
- Remove `validate(...)` calls from route definitions
- Delete `apps/backend/src/middleware/validate.ts`
- Re-add inline validation checks

## Future Improvements
- Add TypeScript type inference from schema definitions
- Add nested object/array validation (for deeply nested sync state)
- Add async validation rules (database uniqueness checks)
- Add OpenAPI schema generation from validation rules
