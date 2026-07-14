# DeepaBMS API Deployment Guide

> **Status:** Production reference
> **Audience:** Backend, Platform, API Consumers
> **Last updated:** 2026-07-14
> **Related:** [Deployment Guide](deployment-guide.md) · [CI/CD Guide](ci-cd-guide.md) · [Release Engineering](release-engineering-guide.md)

## Table of Contents

1. [API Surface](#api-surface)
2. [API Versioning](#api-versioning)
3. [Rate Limiting](#rate-limiting)
4. [CORS](#cors)
5. [Documentation](#documentation)
6. [Monitoring](#monitoring)
7. [Deprecation Policy](#deprecation-policy)

---

## API Surface

The Express backend serves REST at `/api/*` on port `3000`, behind nginx (`:80/443`). Auth via `Authorization: Bearer <jwt>`. See [Administrator Guide – Security](administrator-guide.md#security).

---

## API Versioning

- URL-prefixed: `/api/v1/...`, `/api/v2/...`.
- New incompatible changes → new `vN` prefix; old versions kept until deprecated.
- Version declared in OpenAPI `info.version`; image tag independent.

```ts
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

> **Note:** Never break a live `vN` in place. Add `vN+1` and run both during deprecation window.

---

## Rate Limiting

Uses `express-rate-limit`; per-IP and per-token windows.

```ts
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
```

Tune by route: auth stricter (e.g. 10/min), reads looser. Expose `Retry-After` header.

> **Warning:** Rate limits are enforced at the backend; also apply at nginx edge for defense in depth (see [Docker Guide](docker-guide.md)).

---

## CORS

Allowlist only known web/mobile origins; never `*` with credentials.

```ts
import cors from 'cors';
app.use(cors({
  origin: process.env.CORS_ORIGINS!.split(','),
  credentials: true,
}));
```

> **Note:** Mobile app uses a pinned origin; add it to `CORS_ORIGINS` in `.env.production`.

---

## Documentation

- OpenAPI 3 spec served at `/api/docs` (Swagger UI) in non-prod.
- Published static spec in repo `docs/api/openapi.yaml`.
- Keep spec in sync via CI contract test ([CI/CD](ci-cd-guide.md)).

---

## Monitoring

- Metrics: `http_requests_total`, `http_request_duration_seconds` at `/metrics`.
- Alert on 5xx rate > 1% and p99 > 800 ms (see [SRE: High Error Rate](sre-runbook.md#high-error-rate)).
- Trace auth failures; feed security detections.

---

## Deprecation Policy

1. Announce deprecation in release notes + `Sunset` header on responses.
2. Minimum **90-day** notice for `vN` removal.
3. During window: log usage; nag consumers via `Warning` header.
4. After window: return `410 Gone`; keep docs archived 1 year.

> **Warning:** Removing an API version without notice breaks integrators and mobile clients. Enforce the 90-day rule.

---

*Cross-references: [Deployment Guide](deployment-guide.md) · [CI/CD Guide](ci-cd-guide.md) · [Release Engineering](release-engineering-guide.md) · [SRE Runbook](sre-runbook.md)*
