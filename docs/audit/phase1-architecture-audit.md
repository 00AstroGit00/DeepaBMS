# P8 Phase 1 — Enterprise Architecture Audit & Phase 2 — Deep Code Review

**Auditor:** Principal Architect / QA Architect
**Verdict:** Architecturally sound intent, but layer boundaries are routinely
violated and type-safety/debt is high.

## ARC-01 — Operational services decoupled from GL (Critical, arch)
**Evidence:** `accounting.routes.ts:451/467/481` are the only `autoPost` call
sites (see FIN-01). Dependency direction is correct (accounting depends on
nothing) but the *integration* direction is missing — operational domains never
call accounting. **Impact:** financial integrity (P3). **Priority:** P0.

## ARC-02 — Routes call repositories directly (High)
**Evidence:** `rooms.routes.ts:8`
```ts
import { RoomsRepository } from './rooms.repository';
const result = await RoomsRepository.findAllRoomTypes({ ... });
```
9/17 domain route files call repositories directly, inverting the intended
routes→service→repository direction. **Impact:** business logic leaks into
transport layer; harder to test/reuse. **Effort:** 5–8d (extract services).
**Priority:** P2.

## ARC-03 — `sales` domain is raw SQL in routes (High)
**Evidence:** `sales.routes.ts:18`
```ts
const rows = await query('SELECT * FROM sales ORDER BY date DESC');
await run('INSERT INTO sales (id, date, ...) VALUES (?, ?, ...)', [...]);
```
No repository, no service. Extreme layering violation. **Effort:** 2d.
**Priority:** P2.

## ARC-04 — 4 routes-only domains (Medium)
`audit/`, `auth/`, `employees/`, `sales/` contain only `*.routes.ts` (no
types/service/repository/seed). Violates the documented domain convention and
forces logic into routes. **Priority:** P2.

## ARC-05 — No runtime circular dependency (Low, corrected)
`tenant.ts` ↔ `feature-flags.ts`: feature-flags side uses `import type`
(erased at runtime) → **compile-time only** coupling, not a runtime cycle.
P6's "circular dependency" claim is **downgraded** to a non-blocking coupling.
**Priority:** P3.

## CR-01 — O(N) bcrypt login loop (High, perf+security)
**Evidence:** `auth.routes.ts:16`
```ts
const users = await query('SELECT * FROM users WHERE active = 1');
for (const u of users) { const valid = await bcrypt.compare(pin, u.pin_hash); ... }
```
Loads all users, loops bcrypt per login. **Effort:** 0.5d (index by PIN hash /
single lookup). **Priority:** P1.

## CR-02 — `handleError` duplicated 12× (High, dead code)
**Evidence:** `ai.routes.ts:37` + 11 other domains each define a local
`handleError`. No shared error module. **Effort:** 0.5d. **Priority:** P2.

## CR-03 — 1,367 `any` across `domains/` (High)
`hr` 141, `rooms` 90, `liquor` 89, `accounting` 82, `analytics` 75, `workflow`
66, `restaurant` 56, `purchasing` 41, `platform` 29. No `no-explicit-any` lint
rule. **Effort:** ongoing. **Priority:** P2.

## CR-04 — Route god-files (Medium)
`hr.routes.ts` 2,732 lines; `rooms` 1,592; `liquor` 1,444; `workflow` 1,424;
`accounting` 1,282; `analytics` 1,274; `restaurant` 952. Business logic in
routes. **Effort:** large. **Priority:** P3.

## CR-05 — Dual logging paradigms (Medium)
`structuredLog` exists (`observability.ts:33`) but bypassed by **100+** raw
`console.log/error/warn` (seed, index, db, workflow). No log-level config.
**Effort:** 2d. **Priority:** P2.

## CR-06 — Two error-response conventions (Medium)
`sales`/`auth` return raw `err.message` as 500; 12 others use `handleError`.
No centralized error middleware → inconsistent client contract. **Effort:** 1d.
**Priority:** P2.

## CR-07 — No shared backend utils; inconsistent repo naming (Medium)
No `formatDate`/`formatCurrency`/`generateId` module (reinvented per domain).
Repo methods mix `findAll`/`list*`/`getAll*`/`get*`. **Effort:** 3d.
**Priority:** P3.

## CR-08 — StoreContext size overstated (Low, corrected)
`src/context/StoreContext.tsx` = **736 lines**, reducer ~341 lines / 38 actions
(not the AGENTS.md-claimed 1,100+). Still a large single-reducer smell.
**Priority:** P3.

## Build reproducibility
- `package-lock.json` present (root + backend) ✅.
- Backend `build` = `tsc` strict ✅, but `dist/` appears present in tree (build
  artifact in VCS — should be gitignored).
- **No backend `lint` script**; root `eslint` uses expo config (wrong for Node)
  and lacks `no-explicit-any`. **Root `tsc` excludes `apps/`** (`tsconfig.json:7`
  `exclude:["apps"]`) → backend type errors invisible at root. **Effort:** 0.5d.
  **Priority:** P2.
