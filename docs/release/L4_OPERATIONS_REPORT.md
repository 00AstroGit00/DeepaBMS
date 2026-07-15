# DeepaBMS L4 — Operations Validation Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — container smoke verified in CI)

---

## Runtime Verification (Local Backend)

| Check | Result | Evidence |
|:------|:------:|:---------|
| Startup | ✅ | Backend starts in ~3s, database initialized, 9 seeds complete |
| Health endpoint | ✅ | `GET /health/live` → 200 `{"status":"ok"}` |
| Health summary | ✅ | `GET /health` → 200 with uptime, node version, memory |
| Metrics | ✅ | `GET /api/metrics` → request tracking data |
| Structured logging | ✅ | JSON log format |
| OpenTelemetry | ✅ | Trace IDs in response headers |
| Graceful shutdown | ✅ | SIGTERM → `draining...`, scheduler stopped |
| Auth (PIN login) | ✅ | `POST /api/auth/login` → JWT with proper claims |
| GraphQL | ✅ | Schema introspection (with auth) |
| Auth gate | ✅ | GraphQL returns 401 without `Authorization` |
| Non-root execution | 🟢 VERIFIED | Container smoke confirms `USER node` (run `29432778118`) |

## Not Verified (Requires Deployed Infrastructure)

| Check | Status | Required |
|:------|:------:|:---------|
| Prometheus scraping | 🔴 | Running Prometheus instance |
| Grafana dashboards | 🔴 | Running Grafana instance |
| Alert delivery | 🔴 | Alertmanager + PagerDuty/Slack |
| Loki log aggregation | 🔴 | Running Loki + Promtail |
| Backup execution | 🔴 | Running backend (deploy) |
| Restore execution | 🔴 | Running SQLite + backup file |
| OTEL collector | 🔴 | Running OpenTelemetry collector |

## Verdict

**✅ OPERATIONS VERIFIED (runtime + container)** — Backend runtime and the production
container (health, seed, non-root, graceful behavior) are validated. Full observability
stack (Prometheus, Grafana, Loki, Alertmanager) requires a deployed environment.
