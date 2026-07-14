# 07 — Production Monitoring Report (P7 Phase 7)

**Status:** DAILY REPORT TOOL READY + monitoring plan.

## 1. Automated Daily Report
`scripts/monitoring/daily-report.ts` queries the live DB and writes
`reports/daily-YYYY-MM-DD.md` + `.json` (sales, revenue, failed txns, rooms
occupied, low-stock, open bottles, pending POs, audit events, alerts). Schedule
via cron:
```cron
0 23 * * * SQLITE_DB_PATH=/data/deepa/deepa-bms.db ts-node /opt/deepa/scripts/monitoring/daily-report.ts
```

## 2. Monitoring Scope & Owners
| Area | Signal | Tool | Owner | Alert Threshold |
|------|--------|------|-------|-----------------|
| Performance | API p95 | Prometheus/Grafana (P5) | DevOps | > 500ms |
| Errors | 5xx / failed txns | Grafana + daily report | DevOps | > 1% |
| Logs | error level | Loki/Promtail | DevOps | any spike |
| User feedback | complaint log | manual | Ops | — |
| Failed transactions | daily report | script | Ops | > 0 |
| Sync | last heartbeat | platform health | DevOps | > 5 min stale |
| Database | connections/size | Prometheus | DevOps | > 80% conn |
| Backups | last success | backup job | Ops | > 26h old |
| Alerts | Alertmanager | P5 stack | DevOps | any firing |

## 3. Daily Operational Report Template (auto-generated)
- Date, generatedAt
- Metrics table (see tool)
- Alerts (if any)
- Action taken / owner

## 4. Weekly Review
- Trend of failed txns, low-stock frequency, sync staleness.
- Capacity headroom vs Phase 1 baseline (01).

## 5. Sign-off (weekly)
Monitoring operational: ☐ YES / ☐ NO — **Production Support: ____  Date: ____**
