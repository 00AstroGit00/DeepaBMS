# DeepaBMS L3 — Operational Evidence
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Verification Commands

### Health Endpoints

```bash
# Liveness probe
curl -s http://localhost:3000/health/live
# Expected: {"status":"ok"}

# Readiness probe
curl -s http://localhost:3000/health/ready
# Expected: {"status":"ok","database":"connected","uptime":1234}

# Health summary
curl -s http://localhost:3000/health
# Expected: {"status":"ok","version":"2.0.0","uptime":1234,"database":"connected"}
```

### Metrics

```bash
# Prometheus metrics
curl -s http://localhost:3000/metrics
# Expected: Prometheus text format with:
#   - deepa_http_requests_total
#   - deepa_http_request_duration_seconds
#   - deepa_http_requests_errors_total
#   - active_connections
#   - process_memory_bytes
#   - db_query_duration_seconds
#   - db_errors_total
#   - sync_events_total
#   - auth_events_total
#   - deepa_http_request_duration_seconds_bucket{...,tenant_slug="default"}

# Specific metric check
curl -s http://localhost:3000/metrics | grep "deepa_http_requests_total"
# Expected: deepa_http_requests_total{method="GET",path="/health/live",status="200"} N
```

### Authentication

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
echo "$TOKEN"
# Expected: JWT string (eyJ...)

# Verify token
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"id":1,"role":"super_admin","tenant":"default"}

# Unauthenticated access
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
# Expected: 401
```

### API Key Authentication

```bash
# With valid API key + scope
curl -s http://localhost:3000/api/platform/tenants \
  -H "X-API-Key: YOUR_API_KEY"
# Expected: 200 (with valid admin-scoped key)

# Without scope
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/platform/tenants \
  -H "X-API-Key: READONLY_KEY"
# Expected: 403
```

### GraphQL

```bash
# Query with depth limit (should pass)
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ __schema { types { name } } }"}'
# Expected: 200 with schema data

# Query exceeding depth 7 (should fail)
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ a { b { c { d { e { f { g { h } } } } } } } }"}'
# Expected: error about depth limit
```

### CORS (Production)

```bash
# Request without origin (production)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: null" \
  http://localhost:3000/health/live
# Expected: 403 (if NODE_ENV=production)

# Request with valid origin
curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: https://your-domain.com" \
  http://localhost:3000/health/live
# Expected: 200
```

### Logging

```bash
# Structured JSON log format
curl -s http://localhost:3000/health/live > /dev/null
# Backend logs show:
# {"level":"info","message":"request completed","method":"GET","path":"/health/live","status":200,"duration_ms":5,...}
```

### Backup

```bash
# Backup script
bash scripts/backup/production-backup.sh
# Expected: backup file created in backups/ directory

# Verify integrity
bash scripts/db/verify-integrity.sh
# Expected: "integrity check passed"

# Restore from backup
bash scripts/restore/pitr-restore.sh /path/to/backup.db
# Expected: database restored successfully
```

### Startup / Shutdown

```bash
# Startup
cd apps/backend && JWT_SECRET=test node dist/index.js
# Expected: Server running on port 3000
#           Database connected
#           Schema initialized (if first run)

# Health check after startup
curl -s http://localhost:3000/health/live
# Expected: {"status":"ok"}
```

### Docker Healthcheck

```bash
# Docker container health
docker inspect --format='{{.State.Health.Status}}' deepa-bms-backend
# Expected: healthy

# Container logs
docker logs deepa-bms-backend --tail 20
# Expected: structured JSON log output
```

## Status Summary

| Capability | Status | Evidence Method |
|:-----------|:------:|:----------------|
| Health endpoints | ✅ VERIFIED | `curl /health/live` returns `{"status":"ok"}` |
| Metrics | ✅ VERIFIED | `curl /metrics` returns Prometheus format |
| Auth (JWT) | ✅ VERIFIED | Login returns token, me returns user |
| API key scoping | ✅ VERIFIED (code) | Middleware enforces scopes |
| GraphQL depth limit | ✅ VERIFIED (code) | `depthLimit(7)` configured |
| GraphQL complexity | ✅ VERIFIED (code) | `maxComplexity: 1000` configured |
| CORS strict mode | ✅ VERIFIED (code) | Production origin validation |
| Structured logging | ✅ VERIFIED | JSON log format in middleware |
| Backup script | ✅ CONFIGURED | `scripts/backup/production-backup.sh` |
| Restore script | ✅ CONFIGURED | `scripts/restore/pitr-restore.sh` |
| Docker healthcheck | ✅ CONFIGURED | HEALTHCHECK in Dockerfile.prod |
| Alert delivery | 🔴 NOT VERIFIED | Requires deployed Alertmanager |
