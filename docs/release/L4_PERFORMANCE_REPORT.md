# DeepaBMS L4 — Performance Validation Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — k6 executed in CI)

---

## Execution Status

| Scenario | File | Status | Evidence |
|:---------|:-----|:------:|:---------|
| Smoke | `tests/load/smoke.js` | 🟢 VERIFIED | Release Gates run `29432778118` (CI) |
| Load | `tests/load/load.js` | 🔴 NOT EXECUTED | Requires staging + 5m window |
| Stress | `tests/load/stress.js` | 🔴 NOT EXECUTED | Requires staging + 6m window |
| Spike | `tests/load/spike.js` | 🔴 NOT EXECUTED | Requires staging |
| Soak | `tests/load/soak.js` | 🔴 NOT EXECUTED | Requires 4h — staging only |
| Recovery | `tests/load/recovery.js` | 🔴 NOT EXECUTED | Requires container restart |

## Smoke Result (CI, run `29432778118`)

| Metric | Result | Target | Status |
|:-------|:------:|:------:|:------:|
| P50 Latency | < 1ms | < 100ms | ✅ |
| P95 Latency | 2.39ms | < 500ms | ✅ |
| P99 Latency | 7.43ms | < 1000ms | ✅ |
| Error Rate | 0% | < 1% | ✅ |
| Throughput | 2400 reqs / 30s | > 100 rpm | ✅ |

> Smoke executed against the backend container built in CI (F-3) with
> `NODE_ENV` unset so the HTTPS redirect does not corrupt status assertions
> (see commit `975eda3`).

## KPI Targets (from `thresholds.js`)

| Metric | Target |
|:-------|:------:|
| P50 Latency | < 100ms |
| P95 Latency | < 500ms |
| P99 Latency | < 1000ms |
| Error Rate | < 1% |
| Min Throughput | > 100 rpm |

## Verdict

**🟢 SMOKE VERIFIED** — The k6 smoke gate passes in CI with large headroom against all
KPI targets. Load/stress/spike/soak/recovery scenarios remain to be executed against a
provisioned staging environment (Tier 3 #15). Performance baseline cannot be fully
certified until those runs complete, but the smoke evidence removes the prior "0% / NOT
VERIFIED" status.
