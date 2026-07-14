> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Performance Guide

> **Status:** Production reference
> **Audience:** Backend, SRE, Platform
> **Last updated:** 2026-07-14
> **Related:** [Scaling Guide](scaling-guide.md) · [SRE Runbook: High Latency](sre-runbook.md#high-latency) · [Operations Manual](operations-manual.md)

## Table of Contents

1. [Performance Principles](#performance-principles)
2. [Database Optimization](#database-optimization)
3. [Caching](#caching)
4. [Connection Pool Tuning](#connection-pool-tuning)
5. [Memory & CPU](#memory--cpu)
6. [Network](#network)
7. [Load Testing](#load-testing)
8. [Benchmark Reference](#benchmark-reference)

---

## Performance Principles

- Backend is **stateless** — scale horizontally first.
- Every request should touch Postgres ≤ 1–2 times; everything else from Redis.
- Measure before tuning (Prometheus histograms, `pg_stat_statements`).
- Targets: p95 < 300 ms, p99 < 800 ms, error rate < 0.1%.

> **Note:** Premature optimization wastes effort. Start from the [Benchmark Reference](#benchmark-reference) baseline.

---

## Database Optimization

Enable `pg_stat_statements`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```
```sql
-- Find hot queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

Tuning levers:
- Add indexes on FK and filter columns (`EXPLAIN (ANALYZE, BUFFERS)`).
- Set `shared_buffers` ≈ 25% RAM, `effective_cache_size` ≈ 50–75% RAM.
- `work_mem` 16–64 MB for sort/hash-heavy queries.
- `max_connections` matched to pool size, not brute-forced up.
- Routine `VACUUM ANALYZE` (autovacuum tuned for write-heavy tables).

---

## Caching

Redis (`:6379`) caches computed reports and session/token state.

```ts
// pseudocode pattern
const cached = await redis.get(`report:${tenant}:${id}`);
if (cached) return JSON.parse(cached);
const data = await computeReport();
await redis.setex(`report:${tenant}:${id}`, 300, JSON.stringify(data));
```

- Use namespaced keys with TTL; never cache per-user secrets.
- Set `maxmemory-policy allkeys-lru` to bound memory.
- Invalidate on write (write-through or explicit del).

> **Warning:** Stale cache can show wrong financials. Keep report TTLs short (60–300s) and invalidate on mutations.

---

## Connection Pool Tuning

Backend uses a Postgres pool. Size it by formula:

```
pool_size = ((core_count * 2) + effective_spindle_count)  per instance
```

- Keep `max_connections` in Postgres ≥ `pool_size × replica_count + headroom`.
- Acquire with timeout; never block the event loop on DB waits.
- Monitor `pg_stat_activity` for idle-in-transaction (> 30s = leak).

See [Scaling Guide](scaling-guide.md#database-scaling) for read replicas to offload reads.

---

## Memory & CPU

- Node single-thread bound: CPU headroom matters more than core count per pod.
- Set container limits (backend 0.5 CPU / 512 MB in prod compose).
- Watch event-loop lag; OOMKills indicate leaks — see [SRE: Memory Leak](sre-runbook.md#memory-leak).
- Enable `--max-old-space-size` appropriate to limit.

---

## Network

- Keep backend close to Postgres/Redis (same AZ / node-local for compose).
- Enable HTTP keep-alive and gzip in nginx.
- TLS termination at nginx; backend speaks plain HTTP internally.
- Rate limit at edge (see [API Deployment](api-deployment-guide.md#rate-limiting)).

---

## Load Testing

Use `k6` or `artillery` against a staging clone:

```bash
k6 run -e BASE_URL=https://staging.bms.example.com scripts/load.js
```

Scenarios: baseline, soak (2h), spike, break-point. Capture p95/p99 and error rate; compare to baseline.

> **Note:** Never load-test production during business hours. Use staging with production-like data volume.

---

## Benchmark Reference

| Scenario | Concurrency | p95 | p99 | Throughput |
|----------|-------------|-----|-----|------------|
| Health check | 100 | 4 ms | 9 ms | 8k rps |
| Auth login | 100 | 45 ms | 90 ms | 1.2k rps |
| Report query (cached) | 100 | 22 ms | 55 ms | 3k rps |
| Report query (DB) | 100 | 180 ms | 420 ms | 800 rps |
| Transaction write | 100 | 60 ms | 140 ms | 900 rps |

*Baseline on: 3× backend (0.5 CPU/512 MB), Postgres 2 vCPU/4 GB, Redis 1 vCPU/1 GB, same AZ.*

---

*Cross-references: [Scaling Guide](scaling-guide.md) · [SRE Runbook](sre-runbook.md) · [Operations Manual](operations-manual.md)*
