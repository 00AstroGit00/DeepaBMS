# DeepaBMS Disaster Recovery Guide

> **Status:** Production reference
> **Audience:** SRE, Operations, Business Continuity
> **Last updated:** 2026-07-14
> **Related:** [SRE Runbook](sre-runbook.md) · [Operations Manual](operations-manual.md) · [Backup & Restore (Admin)](administrator-guide.md#backup--restore) · [Incident Response](incident-response-guide.md)

## Table of Contents

1. [DR Architecture](#dr-architecture)
2. [RPO / RTO Targets](#rpo--rto-targets)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Recovery Testing](#recovery-testing)
6. [DR Contacts](#dr-contacts)

---

## DR Architecture

```
Primary Region (us-east)                Secondary Region (eu-west)
┌─────────────────────┐                 ┌─────────────────────┐
│ Nginx + Backend x3  │   async WAL ──▶ │ Postgres Standby    │
│ Postgres Primary    │  (archive/     │ (promotable)        │
│ Redis (AOF)         │   replication)  │ Redis replica       │
│ Prometheus/Grafana  │                 │ Backend (scaled 0)  │
└─────────┬───────────┘                 └─────────┬───────────┘
          │ off-site backup                        │ warm standby
          ▼                                        ▼
   Object Storage (S3/GCS)  ←───────────────  restore source
```

- **Primary:** active; streaming replication to standby in secondary region.
- **Backups:** logical `pg_dump` + WAL archive copied to object storage (immutable, versioned).
- **Redis:** AOF persistence; cache is rebuildable, not critical for RPO.

> **Note:** DeepaBMS backend is stateless, so DR focuses on data (Postgres) + config/secrets recovery.

---

## RPO / RTO Targets

| Scenario | RPO | RTO |
|----------|-----|-----|
| Primary DB crash | 5 min (WAL ship) | 15 min |
| Full region loss | 15 min | 60 min |
| Data corruption | last verified backup | 30 min |
| Ransomware | last clean backup | 2 h |

> **Warning:** These are targets, not guarantees, unless backup off-site copy + standby promotion are tested quarterly.

---

## Backup Strategy

- **Frequency:** logical dump every 6h; continuous WAL archiving.
- **Retention:** 30 daily, 12 weekly, 12 monthly (GFS).
- **Off-site:** object storage cross-region, versioned, lifecycle to cold tier.
- **Integrity:** checksum + periodic restore test.
- **Redis:** AOF + hourly RDB snapshot (cache only).

```bash
# Scheduled job (cron)
0 */6 * * * /usr/bin/docker exec deepa-bms-postgres pg_dump -U deepa_admin \
  -Fc deepa_bms | aws s3 cp - s3://deepa-bms-backups/$(date +%F-%H).dump
```

> **Note:** Never rely on a single backup copy. "3-2-1": 3 copies, 2 media, 1 off-site.

---

## Recovery Procedures

### Database Crash Recovery
```bash
# Stop backend to prevent writes
kubectl -n deepa-bms scale deployment/backend --replicas=0
# Restore latest dump into a fresh DB
aws s3 cp s3://deepa-bms-backups/$(date +%F-%H).dump - | \
  pg_restore -U deepa_admin -d deepa_bms -c
kubectl -n deepa-bms scale deployment/backend --replicas=3
```

### Full System Recovery
1. Provision infrastructure (K8s cluster / compose host).
2. Restore secrets (sealed secrets / external secrets).
3. Restore Postgres from latest clean backup.
4. Deploy backend/redis/nginx via Helm/Kustomize.
5. Smoke test per [Deployment Verification](deployment-guide.md#post-deployment-verification).

### Multi-Region Failover
```bash
# Promote standby
kubectl -n deepa-bms exec deploy/postgres-standby -- pg_ctl promote
# Repoint DNS / ingress to secondary region
# Scale backend in secondary to desired replicas
helm upgrade deepa-bms helm/deepa-bms -n deepa-bms --set replicaCount=3
```

### Data Corruption Recovery
- Identify corruption time from audit; restore **pre-corruption** backup.
- If point-in-time needed: WAL replay to target LSN.
```bash
pg_waldump | grep <bad-txn>    # find LSN
pg_basebackup + replay to LSN
```

### Ransomware Recovery
1. Isolate affected systems (network policy / cordon).
2. Confirm last clean backup via checksum + restore test.
3. Wipe compromised volumes.
4. Restore from clean backup; rotate **all** secrets.
5. Audit for persistence; engage security incident flow ([SRE: Security](sre-runbook.md#security-incident)).

> **Warning:** Ransomware: do NOT pay. Restore from immutable off-site backup and rotate every credential.

---

## Recovery Testing

- **Monthly:** restore latest dump into scratch DB; run integrity queries.
- **Quarterly:** full region-failover game day (promote standby, repoint DNS).
- **Automated:** backup-success metric; alert if no new backup in 26h.

Record results in the DR test log; attach to quarterly business continuity review.

---

## DR Contacts

| Role | Name / Handle | Contact | Escalation |
|------|---------------|---------|------------|
| SRE On-call | PagerDuty `deepa-sre` | +1-xxx | 24/7 |
| DB Lead | `@db-lead` | Slack | 15m |
| Cloud Vendor | AWS/GCP Support | Console | Case SLA |
| Incident Commander | `@ic` | Slack `#incident` | Immediate SEV1 |
| Business Owner | `@biz-owner` | email | Post-incident |

> **Note:** Keep this table in sync with [Incident Response – Escalation Matrix](incident-response-guide.md#escalation-matrix). Store an offline copy.

---

*Cross-references: [SRE Runbook](sre-runbook.md) · [Operations Manual](operations-manual.md) · [Incident Response](incident-response-guide.md) · [Backup & Restore](administrator-guide.md#backup--restore)*
