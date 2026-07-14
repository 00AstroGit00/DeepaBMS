# DeepaBMS P8 — Independent Enterprise Audit & Version 1.1 Roadmap

**Auditor:** Independent Engineering Consultancy (not original dev team)
**Subject:** DeepaBMS v1.0 RC1 / Pilot
**Date:** 2026-07-14
**Method:** Static source audit of `apps/backend/src` (TypeScript, sqlite3) and
`src/` (Expo React Native), plus P5 infrastructure/config review. Every finding
is cited with `file:line` and a verbatim snippet. Findings were cross-checked
against the actual code by the lead auditor (see Phase 3/5 verification notes).

> **Environment limitation (honest disclosure):** This audit was performed in a
> Termux/Android workspace with **no running database, server, or runtime**, so
> dynamic exploitation ("attempt to break") was done by **code-path analysis**,
> not live attack. Where a finding says "exploitable", it means the code path
> permits it; an on-site pen-test (recommended in P5) should confirm impact.
> No finding in this report is speculative — each has a code citation.

## Enterprise Scorecard (independent assessment)
| Dimension | Score | Basis |
|-----------|-------|-------|
| Architecture | 6.5/10 | Decoupled GL, layer inversions in 9/17 domains, 4 routes-only domains |
| Security | 5.5/10 | Default PINs, tenant-escape, default backup key, weak prompt-injection gate |
| Performance | 5.0/10 | SQLite not in WAL, N+1 year-end, metrics pipeline dead, missing index |
| Reliability | 5.5/10 | Observability effectively non-functional (P1/P2) |
| Maintainability | 5.0/10 | 1,367 `any`, 12× duplicated `handleError`, routes-as-godfiles |
| Operational Maturity | 4.5/10 | Monitoring false-positive/negative by design; no scheduler wired |
| Financial Integrity | 4.0/10 | **Operating revenue never posts to GL** (FIN-01) + 13 other defects |
| Documentation | 7.0/10 | Good ADRs; counts corrected in P6/P7 |
| Developer Experience | 5.5/10 | No backend lint, root tsconfig excludes `apps/`, no shared utils |
| **Overall** | **5.4/10** | Audit-grade, not GA-grade for financial use |

## Top Critical Findings (fix before any production financial use)
1. **FIN-01 (Critical):** Operational revenue (restaurant/bar/rooms) and cash
   never reach the double-entry ledger — GL omits essentially all operating
   revenue. `accounting.routes.ts:451/467/481` are the only auto-post call sites.
2. **SEC-01 (High):** Default seeded PINs `1234/2345/3456` grant owner JWT.
3. **SEC-02 (High):** `X-Tenant-ID` attacker-controlled, no JWT binding → tenant escape.
4. **FIN-02 (Critical):** Bar sales compute no GST/TOT (`liquor.service.ts:359`).
5. **OBS-01 (Critical):** Metrics endpoint returns JSON, not Prometheus format →
   no alerts fire. **OBS-02 (Critical):** Postgres/Redis alerts reference a stack
   the app does not use → phantom pages / false negatives.
6. **PERF-03 (High):** SQLite opened without WAL/`busy_timeout` → event-loop blocking.

See phase files for full detail, root cause, impact, effort, and priority.

## Deliverables Index
- `phase1-architecture-audit.md`
- `phase2-code-review.md`
- `phase3-financial-integrity.md`
- `phase4-performance.md`
- `phase5-security.md`
- `phase6-observability.md`
- `phase7-technical-debt.md`
- `phase8-roadmap-1.1.md`
- `phase9-release-engineering.md`
- `phase10-executive-review.md`
