# DeepaBMS L3 — Infrastructure Remediation
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Docker Remediation

| Issue | Before | After | Evidence |
|:------|:-------|:------|:---------|
| Base image EOL | `node:18-alpine` (EOL Oct 2025) | `node:22-alpine` | `Dockerfile.prod:14,28,36` |
| Dev Dockerfile | `node:18-alpine`, no USER, no healthcheck | `node:22-alpine`, `USER node`, healthcheck | `apps/backend/Dockerfile` |
| Dev Dockerfile healthcheck | ❌ Missing | ✅ Added | `Dockerfile:15-16` |
| Dev Dockerfile non-root | ❌ Missing (`root`) | ✅ `USER node` | `Dockerfile:13` |

## Helm Chart Remediation

| Issue | Before | After | Evidence |
|:------|:-------|:------|:---------|
| Chart version | `1.0.1` | `2.0.0` | `Chart.yaml:5` |
| Placeholder domain | `bms.example.com` | FIXME comment added | `values.yaml:30-31`, `ingress.yaml` comments |
| JWT secret placeholder | `CHANGE_ME_JWT_SECRET` | FIXME comment added | `values.yaml:35-36` |

## NetworkPolicy

| Issue | Before | After |
|:------|:-------|:------|
| Pod network isolation | ❌ Missing | ✅ 4 policies created |
| Default deny | ❌ | ✅ `default-deny` (Ingress+Egress) |
| Backend ingress | ❌ | ✅ From web + monitoring |
| Backend egress | ❌ | ✅ DNS, HTTPS, HTTP |
| Web ingress | ❌ | ✅ From ingress-nginx |

## Kustomize Remediation

| Issue | Before | After | Evidence |
|:------|:-------|:------|:---------|
| Ingress placeholder | `bms.example.com` | FIXME comment added | `k8s/base/ingress.yaml:16-17,20-21` |
| JWT secret placeholder | `CHANGE_ME_JWT_SECRET` | FIXME comment added | `k8s/base/secret.yaml` |

## Volumes & Persistence

| Component | Type | Size | Status |
|:----------|:-----|:----:|:-------|
| Backend SQLite | PVC (Helm) / PVC (Kustomize) | 2Gi | ✅ CONFIGURED |
| Backend SQLite | Volume (Docker Compose) | named volume | ✅ CONFIGURED |

## Resource Limits

| Component | Request | Limit | Status |
|:----------|:--------|:------|:-------|
| Backend | 256Mi / 250m | 512Mi / 500m | ✅ CONFIGURED |
| Web (nginx) | 64Mi / 50m | 128Mi / 200m | ✅ CONFIGURED |

## Probes

| Component | Liveness | Readiness | Status |
|:----------|:--------:|:---------:|:-------|
| Backend (Helm) | ✅ `/health/live` | ✅ `/health/ready` | ✅ |
| Backend (Kustomize) | ✅ `/health/live` | ✅ `/health/ready` | ✅ |
| Web (Helm) | ✅ `/` | ✅ `/` | ✅ |
| Web (Kustomize) | ✅ `/` | ✅ `/` | ✅ |
| Docker healthcheck | ✅ `curl /health/live` | — | ✅ |
