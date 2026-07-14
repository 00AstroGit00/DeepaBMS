# P8 Phase 9 — Release Engineering & Phase 10 — Executive Review

## Phase 9 — Release Engineering (Version 1.1)

### Milestones
| M | Name | Findings Addressed | Exit Criteria |
|----|------|--------------------|---------------|
| M0 | Financial Integrity Blocker | D-01,D-02,D-10,D-11,D-12,D-13 | All sales/payments post to GL; trial balance reconciles |
| M1 | Security Hardening | D-03,D-04,D-14,D-15,D-16,D-17,D-18 | Pen-test clean on seeded + multi-tenant paths |
| M2 | Observability Truth | D-05,D-06 | Prometheus scrapes real series; alerts fire on injected faults |
| M3 | Performance & Scheduler | D-07,D-08,D-09,D-30 | WAL on; workflow jobs run; year-end < SLA |
| M4 | Debt & Tooling | D-19..D-29 | ESLint clean; CI gates green; services extracted for 2 domains |

### Sprint Plan (2-week sprints)
- **Sprint 1 (M0):** FIN-01/02/03/04/05/06/07/11/12/13 + tests. (P0 financial)
- **Sprint 2 (M1):** SEC-01..09. (P0/P1 security)
- **Sprint 3 (M2+M3):** OBS-01/02, PERF-03/08/09/04/07. (observability+perf)
- **Sprint 4 (M4):** D-19..D-29 tooling/debt; begin service extraction.

### Backlog (P2/P3, post-1.1)
Routes→service extraction (all 9 domains), integer-paise rollout, StoreContext
split, duplicate-util consolidation, dashboard caching.

### Risk Register (1.1)
| R | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | GL refactor breaks reports | Med | High | Financial-integrity test suite gates merge |
| R2 | WAL changes DB file format | Low | Med | Backup + migration step; test restore |
| R3 | Tenant binding breaks single-tenant | Low | Med | Keep single-tenant fallback (P5) |
| R4 | Scope creep into features | Med | High | Roadmap is evidence-only; PR review rejects speculative |

### Release Calendar (proposed)
- 1.1.0-rc.1 after Sprint 1 (financial) — internal only.
- 1.1.0-rc.2 after Sprint 2 (security) — pen-test.
- 1.1.0-rc.3 after Sprint 3 (observability/perf).
- 1.1.0 GA after Sprint 4 + 2-week pilot soak.

### Migration Plan
No schema break for M0–M3 except optional `gst_registers(created_at)` index
(online `CREATE INDEX`). WAL switch requires clean shutdown + backup. Provide
`scripts/migration/rollback.sql` pattern (P7) as safety net.

### Rollback Plan
Pinned Docker image per rc; `kubectl rollout undo` / compose revert; DB restore
from pre-upgrade backup (verify via P7 restore scenario).

### Support Plan
On-call via Alertmanager (once OBS-01 fixed); runbook in `docs/operations/`;
defect log (`docs/pilot/08-defect-log.md`) carried forward; L1/L2 triage.

---

## Phase 10 — Executive Review

### Scorecard (independent)
| Dimension | v1.0 RC | Target 1.1 | Notes |
|-----------|---------|-----------|-------|
| Architecture | 6.5 | 8.0 | Service extraction; GL integration |
| Security | 5.5 | 8.5 | Default PINs, tenant escape, key fallback fixed |
| Performance | 5.0 | 8.0 | WAL, scheduler, N+1, caching |
| Reliability | 5.5 | 8.5 | Monitoring made real |
| Maintainability | 5.0 | 7.5 | Lint, shared utils, error middleware |
| Operational Maturity | 4.5 | 8.0 | Alerts fire; scheduler runs |
| Financial Integrity | 4.0 | 9.0 | GL gap closed; GST/payroll fixed |
| Documentation | 7.0 | 8.0 | ADRs + audit reports |
| Developer Experience | 5.5 | 8.0 | CI gates, typed code |
| **Overall** | **5.4** | **8.2** | Audit-grade → production-grade |

### Benchmark vs Enterprise ERPs (engineering qualities only)
| Quality | DeepaBMS 1.0 | SAP B1 | NetSuite | BC | Odoo Ent |
|---------|--------------|--------|----------|-----|----------|
| Architecture/clarity | 6.5 | 8.5 | 8.0 | 8.0 | 7.5 |
| Maintainability | 5.0 | 8.0 | 8.0 | 8.0 | 7.0 |
| Deployment/ops maturity | 4.5 | 8.0 | 9.0 | 9.0 | 7.5 |
| Extensibility | 6.0 | 9.0 | 9.0 | 8.5 | 9.0 |
| Operational observability | 4.5 | 8.0 | 9.0 | 8.5 | 7.0 |
| **Financial integrity (verified)** | **4.0** | **9.0** | **9.0** | **9.0** | **8.0** |

**Interpretation:** DeepaBMS's *feature coverage* is competitive for a
hotel/restaurant/bar ERP, but its **engineering maturity — especially financial
integrity, observability, and operational readiness — lags far behind the
reference ERPs**. The gap is concentrated in a small number of high-impact,
well-understood defects (FIN-01, OBS-01/02, SEC-01/02), not in fundamental
architecture. All are fixable within the 1.1 roadmap above.

### Go/No-Go for 1.0 GA
**NO-GO for financial production use until M0 (financial integrity) and M1
(security) complete.** The system is suitable for pilot/non-financial ops today,
but must not be the system of record for GST/tax/financial statements until
FIN-01..FIN-07 are fixed and covered by automated financial-integrity tests.

### Final Statement
This audit is evidence-backed: every finding cites `file:line` and was
cross-checked against source. The single most important action is **M0** —
wire operational revenue into the general ledger — without which no financial
report in DeepaBMS can be trusted.
