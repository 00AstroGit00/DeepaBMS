# ADR-0005: Domain-Oriented Backend Structure

## Status
Accepted (2026-07-13).

## Context
The backend `src/index.ts` had grown to 433 lines containing all route handlers, middleware setup, seed logic, merge utilities, tunnel startup, and configuration validation — 8 business domains mixed into a single file. There was no routing separation, no domain boundaries, and the seed function was embedded inline. This made:
- Adding new endpoints risky (merged with unrelated logic)
- Testing routes in isolation impossible
- Onboarding new developers slow
- Code reviews overly dense

## Decision
Flatten the backend into a domain-oriented architecture with six structural changes:

1. **Extract all route handlers** into `domains/<name>/<name>.routes.ts` files. Each file owns one API domain, self-contained with its own middleware chain.
2. **Rewrite `index.ts`** as a thin orchestration layer: middleware stack + rate limiters + domain route mounting + error handler + startup bootstrap. No business logic.
3. **Create `bootstrap.ts`** as a centralized startup orchestrator that runs seed modules in dependency order.
4. **Create `seed/` modules** (`seed/types.ts`, `seed/auth.seed.ts`) following a `SeedModule` interface for deterministic, idempotent, independently executable seeding.
5. **Provide `BootstrapOptions`** for selective seeding (`skipSeeds`, `onlySeeds`, `dryRun`).
6. **No functional changes.** Every existing API endpoint preserves its path, middleware chain, and response shape.

## Architecture

### Target Structure
```
src/
├── index.ts                 # Bootstrap + middleware stack + domain mount (was 433 lines, now ~100)
├── bootstrap.ts             # Seed orchestrator (topo-sort, dependency resolution)
├── db.ts                    # Database connection (unchanged)
├── schema.sql               # Schema (unchanged)
├── middleware/
│   ├── auth.ts              # JWT auth + RBAC (unchanged)
│   ├── validate.ts          # Schema validation (unchanged)
│   └── security.ts          # Security headers (unchanged)
├── domains/
│   ├── auth/       auth.routes.ts       # POST /api/auth/login
│   ├── sales/      sales.routes.ts      # GET/POST /api/sales
│   ├── rooms/      rooms.routes.ts      # GET /api/rooms
│   ├── inventory/  inventory.routes.ts   # GET /api/inventory
│   ├── liquor/     liquor.routes.ts      # GET /api/liquor
│   ├── employees/  employees.routes.ts   # GET /api/employees
│   ├── sync/       sync.routes.ts        # POST /api/sync
│   └── audit/      audit.routes.ts       # GET/POST /api/audit
├── seed/
│   ├── types.ts              # SeedModule interface, BootstrapOptions
│   └── auth.seed.ts          # User account seeding (previously inline in index.ts)
└── tests/                    # Integration tests (unchanged)
```

### Route Mounting
| Old Path | New Route File | Mount Point |
|----------|---------------|-------------|
| `POST /api/auth/login` | `domains/auth/auth.routes.ts` (`router.post('/login')`) | `app.use('/api/auth', authRoutes)` |
| `GET /api/sales` | `domains/sales/sales.routes.ts` (`router.get('/')`) | `app.use('/api/sales', salesRoutes)` |
| `POST /api/sales` | `domains/sales/sales.routes.ts` (`router.post('/')`) | `app.use('/api/sales', salesRoutes)` |
| `GET /api/rooms` | `domains/rooms/rooms.routes.ts` | `app.use('/api/rooms', roomsRoutes)` |
| `GET /api/inventory` | `domains/inventory/inventory.routes.ts` | `app.use('/api/inventory', inventoryRoutes)` |
| `GET /api/liquor` | `domains/liquor/liquor.routes.ts` | `app.use('/api/liquor', liquorRoutes)` |
| `GET /api/employees` | `domains/employees/employees.routes.ts` | `app.use('/api/employees', employeesRoutes)` |
| `POST /api/sync` | `domains/sync/sync.routes.ts` | `app.use('/api/sync', syncRoutes)` |
| `GET/POST /api/audit` | `domains/audit/audit.routes.ts` | `app.use('/api/audit', auditRoutes)` |

### Seed Framework
```typescript
interface SeedModule {
  name: string;           // unique identifier
  dependsOn: string[];    // dependencies by name (topo-sorted)
  run: () => Promise<void>;
  verify?: () => Promise<boolean>;
}

interface BootstrapOptions {
  skipSeeds?: string[];
  onlySeeds?: string[];
  dryRun?: boolean;       // log what would be seeded without modifying data
}
```

### Middleware Stack (unchanged)
```
Request → requestId → securityHeaders → httpsRedirect → cors → json body → requestLogger → apiLimiter → route
  authLimiter → /api/auth/*
  syncLimiter → /api/sync
```

## Migration Strategy
1. Extract all route handlers from `index.ts` into domain route files — only the route handler functions, no changes to middleware chains or response shapes.
2. Create `seed/types.ts` and `seed/auth.seed.ts` — move `seedUsersTable()` into the auth seed module.
3. Create `bootstrap.ts` — import all seed modules, run in dependency order.
4. Rewrite `index.ts` — remove route handler bodies, import domain routers, call `bootstrap()` after `initializeDatabase()`.
5. Run `npm run build` — TypeScript compilation must pass with zero changes.
6. Verify all existing test files import paths remain valid (tests use `supertest` hitting the running server at `localhost:3000`).

## Trade-offs

### Pros
- **Discoverability**: New developer opens `index.ts` and immediately sees all 8 domain mounts + middleware stack in 100 lines.
- **Isolation**: A bug in sync logic doesn't affect auth. A change to sales routes is a single file diff.
- **Testability**: Domain files can be imported and tested independently.
- **Onboarding**: Domain structure mirrors business concerns (auth, sales, inventory, liquor, etc.).
- **Seed framework**: Adding a new domain seed is a single import in the registry — no changes to `index.ts`.
- **Future-ready**: New domains (payroll, attendance, suppliers) are just new files in `domains/` + `seed/`.

### Cons
- **More files**: 10 new files added. However, 433-line `index.ts` is now ~100 lines — net reduction in complexity.
- **Cross-reference**: Reading a route's full middleware chain now requires checking both `index.ts` (rate limiters) and the domain file (auth middleware). This is mitigated by keeping rate limiters in `index.ts` (app-level concern) and auth in domain files (route-level concern).
- **State file path**: `sync.routes.ts` now resolves `deepa-bms-master-state.json` from 3 levels up instead of 2, because the file moved from `src/` to `src/domains/sync/`. Path is verified equivalent.

## Rollback
Replace `src/` with the previous commit's version. The database schema and `deepa-bms-master-state.json` are unchanged. All existing data is preserved.

## Future Extensions
- **Controllers layer**: When route handlers grow beyond 50 lines, extract into `domains/<name>/<name>.controller.ts`.
- **Repository layer**: When SQL queries grow complex, extract into `domains/<name>/<name>.repository.ts`.
- **Domain-specific validators**: When validation schemas grow complex, co-locate in `domains/<name>/<name>.schema.ts`.
- **New domains**: Payroll, attendance, suppliers, customers, purchasing — each gets its own `domains/` directory.
