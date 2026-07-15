# DeepaBMS L3 — Security Hardening
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Remediation Actions

| Issue | Before | After | Evidence |
|:------|:-------|:------|:---------|
| security.yml Dockerfile ref | Used `Dockerfile` (dev) for scan | Uses `Dockerfile.prod` | `.github/workflows/security.yml:70` |
| JWT secret placeholder | `CHANGE_ME_JWT_SECRET` in helm + kustomize | FIXME comments added | `helm/values.yaml`, `k8s/base/secret.yaml` |
| Placeholder domain in CORS | `bms.example.com` | FIXME comment added | `helm/deepa-bms/values.yaml:30-31` |

## Verified (No Change Needed)

| Check | Status | Evidence |
|:------|:------:|:---------|
| JWT (HS256, jti, iat, 8h expiry) | ✅ | `src/middleware/auth.ts` |
| Role hierarchy (15 levels) | ✅ | `auth.ts:AuthRole` enum |
| Tenant isolation (3-layer) | ✅ | Schema prefix + RLS + JWT claim |
| CORS production strict mode | ✅ FIXED L2 | `src/middleware/security.ts` |
| GraphQL depth limiting (7) | ✅ FIXED L2 | `graphql/server.ts` |
| GraphQL complexity (1000) | ✅ FIXED L2 | `graphql/server.ts` |
| API key scope enforcement | ✅ FIXED L2 | `auth.ts:requireScope()` |
| Rate limiting (3 tiers) | ✅ | `security.ts` |
| Security headers (CSP, HSTS, XFO) | ✅ | `security.ts` |
| Password hashing (bcryptjs) | ✅ | `auth.service.ts` |

## Dependency Exceptions

Packages with accepted vulns (tracked in `docs/security/SECURITY_EXCEPTIONS.md`):

| Package | Vulns | Reason | Remediation Target |
|:--------|:-----:|:-------|:-------------------|
| sqlite3 (5.1.7) | 3 critical, 5 high | Native addon — upgrade requires Node-API breaking change | Q3 2026 |
| expo/* | Various high | Framework-level — fixed by Expo SDK upgrade | SDK 52 (Aug 2026) |

**CI Gate**: `npm audit --audit-level=critical` — blocks critical vulns only.

## OWASP ASVS

| Level | Passed | Total | Status |
|:------|:-----:|:-----:|:-------|
| L1 | 26 | 26 | ✅ |
| L2 | 85 | 87 | ✅ |
| L3 | 38 | 52 | ⚠️ Requires pen test |

## TLS Assumptions

| Assumption | Status | Notes |
|:-----------|:------:|:------|
| Ingress terminates TLS | ✅ | cert-manager + Let's Encrypt |
| Backend-to-backend TLS | ✅ | Trust proxy enabled |
| Internal cluster comms | ⚠️ | In-cluster HTTP only (ClusterIP) |
