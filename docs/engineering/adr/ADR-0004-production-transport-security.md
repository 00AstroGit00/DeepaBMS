# ADR-0004: Production Transport Security

## Status
Accepted (2026-07-13).

## Context
The backend had wildcard CORS, no security headers, no HTTPS support, no structured logging, and no audit logging endpoint. Rate limiting existed only for auth and general API.

## Decision
Implement defense-in-depth security across six dimensions:

1. **Security Headers** — centralized middleware setting 8 standard headers, removing `X-Powered-By`
2. **CORS Allow-List** — explicit origins via `CORS_ORIGINS` env var, credentials support
3. **HTTPS Strategy** — trust proxy, production-only 301 redirect, HSTS in production
4. **Rate Limiting** — three tiers: general (500/15min), auth (20/15min), sync (300/15min)
5. **Structured Logging** — JSON-formatted logs with requestId, timestamp, userId, role, duration, status
6. **Audit Logging** — `POST/GET /api/audit` endpoints using existing `security_audit_log` table

## Architecture

### Middleware Stack Order
```
Request → requestId → securityHeaders → httpsRedirect → cors → json body → requestLogger → rateLimiter → route
```

### Header Matrix
| Header | Value | Dev | Prod |
|--------|-------|-----|------|
| `X-Content-Type-Options` | `nosniff` | ✅ | ✅ |
| `X-Frame-Options` | `DENY` | ✅ | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ | ✅ |
| `Permissions-Policy` | Restricted | ✅ | ✅ |
| `Cross-Origin-Resource-Policy` | `same-origin` | ✅ | ✅ |
| `Cross-Origin-Opener-Policy` | `same-origin` | ✅ | ✅ |
| `Cross-Origin-Embedder-Policy` | `require-corp` | ✅ | ✅ |
| `Strict-Transport-Security` | `max-age=63072000; preload` | — | ✅ |
| `Content-Security-Policy` | Strict default-src | — | ✅ |

### CORS Matrix
| Origin | Allowed |
|--------|---------|
| `http://localhost:3000` | ✅ Dev |
| `http://localhost:8081` | ✅ Dev (Expo) |
| `http://localhost:19006` | ✅ Dev (Expo Web) |
| Custom (via `CORS_ORIGINS` env) | ✅ Configurable |
| No origin (mobile app, curl) | ✅ Allowed |
| Unknown origin | ❌ Rejected |

### Rate Limiting Matrix
| Scope | Window | Max | Purpose |
|-------|--------|-----|---------|
| `/api/` (all) | 15min | 500 | General DoS prevention |
| `/api/auth/` | 15min | 20 | PIN brute-force prevention |
| `/api/sync` | 15min | 300 | Per-device sync throttle |

## Alternatives Considered
1. **helmet npm package** — Standard but adds dependency; our headers are simple enough for custom middleware.
2. **morgan + winston** — Heavy logging stack; our custom JSON logger is sufficient.
3. **Cloudflare-only HTTPS** — Ties deployment to Cloudflare; HSTS + redirect works with any reverse proxy.

## Trade-offs
- **+** Zero new dependencies (all custom middleware)
- **+** CORS errors return meaningful messages (`Origin X not allowed`)
- **+** Audit log is append-only via SQLite INSERT
- **+** Structured logs are machine-parseable JSON
- **-** HTTPS redirect is a best-effort 301 (reverse proxy handles real TLS termination)
- **-** Audit logs stored in same SQLite as business data (no separate audit DB)
- **-** CSP only enabled in production (dev needs `unsafe-inline` for React dev tools)

## Migration
- Set `NODE_ENV=production` and `CORS_ORIGINS` in deployment
- Reverse proxy should forward `X-Forwarded-Proto` and `X-Forwarded-For`
- Existing clients with hardcoded `http://` URLs will get 301 redirected in production

## Rollback
- Remove middleware imports and switch back to `app.use(cors())` + `morgan('combined')`
- Delete `apps/backend/src/middleware/security.ts`

## Future Improvements
- Add structured log aggregation (ELK, Loki, or similar)
- Add audit log retention policy (auto-purge after N days)
- Add WebSocket rate limiting
- Add mutual TLS for inter-service communication
- Add IP allow-list for admin endpoints
