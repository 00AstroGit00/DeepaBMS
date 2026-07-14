> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS P7 — Pilot Deployment, UAT & GA

**Version:** 1.0 RC1 → GA
**Date:** 2026-07-14
**Owner:** Enterprise Release Manager (P7)

## Environment Constraint (READ FIRST)
This workspace is **Termux/Android (ARM64)** — it has **no** PostgreSQL/Redis
server, **no** Docker/Kubernetes runtime, **no** physical POS/printers/scanners,
and **no** live restaurant data or staff. Therefore P7 phases that require the
physical pilot environment (Phase 1 on-site verification, Phase 3 device config,
Phase 4 real-user UAT, Phase 6 parallel run with legacy ERP, Phase 7 live
monitoring) **cannot be executed here**.

What WAS delivered from this environment:
- **Runnable engineering artifacts** (execute in CI on `ubuntu-latest` / on the
  pilot server): `scripts/migration/*`, `scripts/reconciliation/*`,
  `scripts/monitoring/*`, `scripts/infra/check-readiness.sh`, and the UAT
  support-matrix test `tests/uat/uat.scenarios.test.ts`.
- **Operational deliverables** below, prepared as runbooks/checklists/templates
  with explicit **EVIDENCE** placeholders to be filled during the on-site pilot.

## Execution Status
| Phase | Artifact | Status |
|---|---|---|
| 1 | Infrastructure Assessment | PREPARED — fill EVIDENCE on-site |
| 2 | Data Migration | Scripts ready + plan; run on pilot server |
| 3 | Device Deployment | Checklist prepared |
| 4 | UAT | Scenario matrix test ready; run with users on-site |
| 5 | Training | 9 guides + SOPs prepared |
| 6 | Parallel Run | Reconciliation tool ready |
| 7 | Monitoring | Daily report tool + plan ready |
| 8 | Defect Resolution | Log template ready |
| 9 | Go-Live Readiness | Checklist ready |
| 10 | GA Certification | Template ready (conditional) |

## How to Execute On-Site
1. Provision pilot server (see 01), run `scripts/infra/check-readiness.sh`.
2. Export legacy data to CSVs in `scripts/migration/legacy/`.
3. `ts-node scripts/migration/migrate.ts` → `validate.ts` (must pass).
4. Deploy app via Docker/K8s (P5 artifacts), configure devices (03).
5. Run UAT with real users (04), fill pass/fail evidence.
6. Run parallel with legacy ERP for 7–14 days (06).
7. Daily `scripts/monitoring/daily-report.ts` (07).
8. Triage defects (08); confirm Go-Live checklist (09).
9. Issue GA Certification (10).
