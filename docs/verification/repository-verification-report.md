# Repository Verification Report — DeepaBMS v1.0 RC1

**Phase:** P6-1 (Repository Structure & Integrity Audit)
**Date:** 2026-07-14
**Verdict:** PASS (with documentation discrepancies — see §6)

## 1. Scope
Independently verify that the repository structure, domain module count, route
mounts, ADR coverage, and test inventory match the claims made in engineering
documentation. No runtime execution was performed; this is a static structural audit.

## 2. Methodology
- Enumerated `apps/backend/src/domains/*` directories.
- Located all `*.routes.ts` files and cross-checked against `src/index.ts` mounts.
- Counted ADR markdown files under `docs/engineering/adr/`.
- Counted test files and `it(`/`test(` cases under `apps/backend/tests/`.
- Compared findings against `engineering-dashboard.md` and `module-map.md` claims.

## 3. Domain Modules
Actual domain directories: **16**

```
accounting  ai  analytics  audit  auth  employees  hr  inventory
liquor  platform  purchasing  restaurant  rooms  sales  sync  workflow
```

Published claim (`engineering-dashboard.md`): "18 domain modules" (also states "12"
in a second location). Published claim (`module-map.md` header): "(19)".

**Discrepancy D-R1 (Medium):** Documentation overstates module count. Reality = 16.

## 4. Route Mount Verification
All 16 `*.routes.ts` files are registered 1:1 in `apps/backend/src/index.ts`
(lines 164–179). No orphan route files and no unmounted domains.

| Domain | Route File | Mounted |
|--------|-----------|---------|
| accounting | accounting.routes.ts | ✓ |
| ai | ai.routes.ts | ✓ |
| analytics | analytics.routes.ts | ✓ |
| audit | audit.routes.ts | ✓ |
| auth | auth.routes.ts | ✓ |
| employees | employees.routes.ts | ✓ |
| hr | hr.routes.ts | ✓ |
| inventory | inventory.routes.ts | ✓ |
| liquor | liquor.routes.ts | ✓ |
| platform | platform.routes.ts | ✓ |
| purchasing | purchasing.routes.ts | ✓ |
| restaurant | restaurant.routes.ts | ✓ |
| rooms | rooms.routes.ts | ✓ |
| sales | sales.routes.ts | ✓ |
| sync | sync.routes.ts | ✓ |
| workflow | workflow.routes.ts | ✓ |

**Result: 16/16 routes mounted — PASS.**

Note: `module-map.md` lists a "Validation" domain (26 tests) that does **not**
exist as a folder. Validation is implemented as `middleware/validate.ts` +
`tests/validate.test.ts`, not a domain.

## 5. ADR Coverage
Present: ADR-0002 … ADR-0014, ADR-0016 … ADR-0020 (19 files).

**Missing:** ADR-0001 (project/init ADR), ADR-0015 (number skipped).
ADR-0015 gap is undocumented; ADR-0001 was never authored.

## 6. Test Inventory
- Test files: **15** (`apps/backend/tests/*.test.ts`)
- Test cases (`it(`/`test(`): **1,693**

Published claim (`engineering-dashboard.md`): "19 suites / ~1900+ cases".

**Discrepancy D-R2 (Medium):** Reality is 15 files / 1,693 cases. Overstated.

### Test file → domain map
| Test File | Domain | Cases (approx) |
|-----------|--------|----------------|
| security.test.ts | cross-cutting | — |
| auth.test.ts | auth | — |
| validate.test.ts | validation middleware | — |
| inventory.test.ts | inventory | — |
| sync.test.ts | sync | — |
| restaurant.test.ts | restaurant | — |
| purchasing.test.ts | purchasing | — |
| analytics.test.ts | analytics | — |
| platform.test.ts | platform | — |
| workflow.test.ts | workflow | — |
| accounting.test.ts | accounting | — |
| liquor.test.ts | liquor | — |
| rooms.test.ts | rooms | — |
| ai.test.ts | ai | — |
| hr.test.ts | hr | — |

Domains with **no dedicated test suite**: `audit`, `employees`, `sales`
(route-only domains; exercised indirectly via security/auth tests at best).

## 7. Evidence
```
tsc --noEmit ........... exit 0 (0 TypeScript errors)
eslint src/ ............ 75 problems (12 errors, 63 warnings)
madge --circular ....... 1 cycle: tenant.ts > feature-flags.ts
domain dirs ............ 16
route files ............ 16 (all mounted)
test files ............. 15 | cases: 1693
ADR files .............. 19 (0002-0014, 0016-0020)
```

## 8. Findings Summary
| ID | Severity | Finding |
|----|----------|---------|
| D-R1 | Medium | Module count overstated (doc 18/19 vs actual 16) |
| D-R2 | Medium | Test count overstated (doc 19 suites/1900+ vs 15/1693) |
| D-R3 | Low | "Validation" domain listed but does not exist as folder |
| D-R4 | Low | ADR-0001 missing; ADR-0015 number skipped |

## 9. Recommendations
1. **(High/0.5h/High/Nil)** Correct `engineering-dashboard.md` and `module-map.md`
   counts to 16 domains, 15 test files, 1,693 cases.
2. **(Low/0.5h/Med/Nil)** Author ADR-0001 or explicitly note it is intentionally
   omitted; document the ADR-0015 skip reason.
3. **(Medium/1d/High/Nil)** Add dedicated test suites for `audit`, `employees`,
   `sales` to close coverage gaps (not blocking for RC1, track as post-RC).
