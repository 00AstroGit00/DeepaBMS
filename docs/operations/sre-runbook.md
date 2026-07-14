> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS SRE Runbook

> **Status:** Production reference
> **Audience:** SRE, On-call, Incident Commanders
> **Last updated:** 2026-07-14
> **Related:** [Incident Response](incident-response-guide.md) · [Operations Manual](operations-manual.md) · [Disaster Recovery](disaster-recovery-guide.md) · [Performance Guide](performance-guide.md)

## Table of Contents

1. [How to Use This Runbook](#how-to-use-this-runbook)
2. [Service Outage](#service-outage)
3. [Database Failure](#database-failure)
4. [High Latency](#high-latency)
5. [High Error Rate](#high-error-rate)
6. [Memory Leak](#memory-leak)
7. [Disk Full](#disk-full)
8. [Certificate Expiry](#certificate-expiry)
9. [Security Incident](#security-incident)
10. [Backup Failure](#backup-failure)
11. [Replication Lag](#replication-lag)
12. [Post-Mortem Template](#post-mortem-template)

---

## How to Use This Runbook

Each playbook follows the same structure: **Symptoms → Diagnosis → Resolution → Verification → Post-Mortem follow-ups**. During a live incident, declare it in the incident channel first (see [Incident Response](incident-response-guide.md)), then follow the steps. When in doubt, escalate — do not guess with production data.

> **Note:** Every playbook assumes you have `kubectl`/`docker` access and the Grafana/Prometheus URLs bookmarked.

---

## Service Outage

**Symptoms**
- `/health/live` returns non-200; all requests 502/503.
- Grafana "Backend Up" panel red; alerts firing.

**Diagnosis**
```bash
kubectl -n deepa-bms get pods -l app=backend
kubectl -n deepa-bms describe pod <backend-pod>
kubectl -n deepa-bms logs -l app=backend --tail=100
docker compose -f docker-compose.prod.yml ps   # compose variant
```

**Resolution**
- If CrashLoopBackOff: check env/secret mismatch, fix, redeploy.
- If node NotReady: cordon/drain, reschedule (`kubectl rollout restart deployment/backend`).
- For Compose: `docker compose -f docker-compose.prod.yml restart backend`.

**Verification**
```bash
curl -f http://localhost:3000/health/live && echo OK
kubectl -n deepa-bms rollout status deployment/backend
```

**Post-Mortem**
- Was the root cause config, resource, or dependency? Add a guardrail test.

---

## Database Failure

**Symptoms**
- Backend logs `ECONNREFUSED` to Postgres; readiness fails.
- `pg_stat_activity` empty or connection refused.

**Diagnosis**
```bash
docker exec deepa-bms-postgres pg_isready -U deepa_admin
kubectl -n deepa-bms logs deploy/postgres
kubectl -n deepa-bms get pvc   # confirm volume bound
```

**Resolution**
- Restart Postgres container/pod if process died.
- If volume corrupt: restore latest backup (see [DR](disaster-recovery-guide.md#database-crash-recovery)).
- Promote standby if using streaming replication.

**Verification**
```bash
curl -f http://localhost:3000/health/ready
psql -c "SELECT 1;"
```

**Post-Mortem**
- Review WAL/archiving; add replica; validate backup restore time vs RTO.

---

## High Latency

**Symptoms**
- p99 request duration > 800 ms sustained 5m.
- User complaints of slow screens.

**Diagnosis**
```bash
# Backend latency histogram
curl -s localhost:9090/api/v1/query?query=histogram_quantile%280.99,...%29
# Postgres slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY 2 DESC LIMIT 10;"
```

**Resolution**
- Add missing index; tune query.
- Scale backend horizontally (see [Scaling](scaling-guide.md)).
- Increase Postgres `work_mem` / connection pool (see [Performance](performance-guide.md)).

**Verification**
- p99 back under threshold for 10m; slow-query list shrinks.

**Post-Mortem**
- Add the query to performance regression tests.

---

## High Error Rate

**Symptoms**
- 5xx rate > 1% for 5m; error-budget burn alert.

**Diagnosis**
```bash
kubectl -n deepa-bms logs -l app=backend | grep -i error | tail -50
curl -s localhost:9090/api/v1/query?query=rate%28http_requests_total%7Bcode%3D~%225..%22%7D%5B5m%5D%29
```

**Resolution**
- Identify offending release; **rollback** (see [Release Engineering](release-engineering-guide.md#rollback)).
- If dependency (Redis/PG) down, follow that playbook.
- Apply circuit breaker / rate limit if upstream overwhelmed.

**Verification**
- 5xx rate < 0.1% for 10m.

**Post-Mortem**
- Why did CI not catch it? Add contract/integration test.

---

## Memory Leak

**Symptoms**
- RSS grows monotonically; OOMKilled events; restart loops.

**Diagnosis**
```bash
kubectl -n deepa-bms top pod -l app=backend
kubectl -n deepa-bms describe pod <pod> | grep -i oom
docker stats deepa-bms-backend
```

**Resolution**
- Short-term: restart/redeploy to reclaim.
- Long-term: profile with `--inspect`; check caches, listeners, closures.
- Raise limit temporarily while patching.

**Verification**
- RSS stable over 24h; no OOMKills.

**Post-Mortem**
- File bug with heap snapshot; add memory regression check.

---

## Disk Full

**Symptoms**
- Postgres/Redis write failures; "No space left on device".
- Log volume exceeds `max-size`/`max-file` unexpectedly.

**Diagnosis**
```bash
df -h
du -sh /var/lib/docker/volumes/* 2>/dev/null
kubectl -n deepa-bms exec deploy/postgres -- df -h /var/lib/postgresql/data
```

**Resolution**
- Delete old backups not off-site yet (verify copy first!).
- Rotate/truncate logs; force `docker system prune` (safe volumes only).
- Expand PVC / add node disk.

**Verification**
- `df -h` shows > 20% free; writes succeed.

**Post-Mortem**
- Why did log rotation fail? Tighten `json-file` limits; add disk alert at 75%.

---

## Certificate Expiry

**Symptoms**
- TLS handshake errors; browser "cert expired".
- Alert `ssl_cert_expiry < 14d`.

**Diagnosis**
```bash
echo | openssl s_client -servername bms.example.com -connect bms.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Resolution**
- Renew via certbot / ACME; reload nginx (`nginx -s reload`).
- For K8s cert-manager: `kubectl -n deepa-bms describe certificate deepa-bms-tls`.
- Replace secret and roll ingress.

**Verification**
```bash
curl -vI https://bms.example.com/ 2>&1 | grep -i "expire\|SSL certificate"
```

**Post-Mortem**
- Ensure auto-renew cron + expiry alert always on.

---

## Security Incident

**Symptoms**
- Anomalous admin logins; unusual data export; `JWT_SECRET` suspected leaked.

**Diagnosis**
```bash
# Audit recent admin actions
psql -c "SELECT * FROM audit_log WHERE action='login' ORDER BY ts DESC LIMIT 50;"
# Token abuse signature
kubectl -n deepa-bms logs -l app=backend | grep -i "invalid token\|brute"
```

**Resolution**
1. Rotate `JWT_SECRET` (force global logout).
2. Rotate `POSTGRES_PASSWORD`, `REDIS_PASSWORD`.
3. Disable compromised accounts.
4. Snapshot volumes for forensics (do not wipe).
5. Engage [Incident Response](incident-response-guide.md) SEV1.

**Verification**
- No further anomalous logins; new tokens validate; old rejected.

**Post-Mortem**
- Timeline, blast radius, detection gap, hardening actions.

---

## Backup Failure

**Symptoms**
- Nightly backup job exits non-zero; no new dump file; alert fired.

**Diagnosis**
```bash
docker logs deepa-bms-postgres | tail
cat apps/backend/backups/*.log | tail
kubectl -n deepa-bms logs job/backup-$(date +%F)
```

**Resolution**
- Check disk space (see Disk Full).
- Verify credentials / object-storage connectivity.
- Re-run manually; confirm off-site copy.

**Verification**
```bash
ls -lh apps/backend/backups/$(date +%F)*
sha256sum apps/backend/backups/$(date +%F).dump
```

**Post-Mortem**
- Add backup-success metric; alert on missing backup > 26h.

---

## Replication Lag

**Symptoms**
- Read replicas return stale data; `pg_stat_replication.replay_lag` high.

**Diagnosis**
```bash
psql -c "SELECT client_addr, replay_lag FROM pg_stat_replication;"
kubectl -n deepa-bms exec deploy/postgres-replica -- psql -c "SELECT now()-pg_last_xact_replay_timestamp();"
```

**Resolution**
- Check replica CPU/IO; network between primary/replica.
- Reduce long-running write transactions on primary.
- If lag unacceptable, route reads to primary temporarily.

**Verification**
- `replay_lag` < 5s sustained; read consistency restored.

**Post-Mortem**
- Capacity of replica; consider another replica or connection policy.

---

## Post-Mortem Template

```markdown
## Incident: <title>
- Date / Duration / SEV
- Impact (users, requests, $)
- Root cause (5 whys)
- Timeline (detect → mitigate → resolve)
- Detection gap
- Action items (owner, due)
```

> **Note:** All SEV1/SEV2 require a written post-mortem within 5 business days — see [Incident Response](incident-response-guide.md#post-incident-review).

---

*Cross-references: [Incident Response](incident-response-guide.md) · [Disaster Recovery](disaster-recovery-guide.md) · [Performance Guide](performance-guide.md) · [Scaling Guide](scaling-guide.md)*
