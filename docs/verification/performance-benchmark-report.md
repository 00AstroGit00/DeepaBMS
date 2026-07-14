# Performance Benchmark Report — DeepaBMS v1.0 RC1

**Phase:** P6-5 (Performance & Scalability — Static Assessment)
**Date:** 2026-07-14
**Verdict:** DESIGN-ONLY (runtime benchmarks not executable on Termux)

## 1. Limitation
No load generator (k6/artillery) or database instance is available in this
environment. This report documents the **expected** performance characteristics
from architecture review and defines the benchmark methodology to be executed in
CI/staging.

## 2. Architecture Factors (Positive)
- SQLite (better-sqlite3) is synchronous and embedded → low per-query latency
  for single-node deployments.
- Domain-oriented structure keeps request handlers thin.
- `middleware/observability.ts` provides request timing instrumentation
  (the source of the 12 prettier lint errors — see code-quality-report).
- P5 added OpenTelemetry collector config for distributed tracing.

## 3. Risk Factors
- **Single large reducer** in the mobile `StoreContext.tsx` (>1100 lines)
  re-computes on every dispatch → potential UI jank on low-end Android devices.
- **`buildSeed()`** generates a substantial initial dataset → slow first-launch
  on low-RAM devices (AGENTS.md notes this).
- **`setTimeout` for sync status reset** can race with rapid successive syncs.
- No query-level indexing review performed (static only).

## 4. Benchmark Methodology (to run in staging)
| Test | Tool | Target | Pass Threshold |
|------|------|--------|----------------|
| API p95 latency | k6 | `/api/sales`, `/api/accounting` | < 200ms @ 100 RPS |
| Auth throughput | k6 | `/api/auth/login` | > 50 RPS sustained |
| DB write burst | k6 | `/api/inventory` POST | < 5% error @ 500 RPS |
| Mobile cold start | manual | Expo app launch | < 4s on mid device |
| Sync reconciliation | manual | 1k records | < 10s |

## 5. Findings Summary
| ID | Severity | Finding |
|----|----------|---------|
| PERF-1 | Medium | StoreContext reducer size → UI perf risk |
| PERF-2 | Medium | buildSeed() first-launch cost |
| PERF-3 | Low | Sync setTimeout race |
| PERF-4 | Info | No runtime benchmark executed (env limit) |

## 6. Recommendations
1. **(Medium/3d/High/Med)** Benchmark in staging with k6 using thresholds above.
2. **(Medium/2d/Med/Nil)** Memoize/split the mobile reducer to reduce re-renders.
3. **(Low/1d/Low/Nil)** Replace sync `setTimeout` reset with a ref-based guard.
