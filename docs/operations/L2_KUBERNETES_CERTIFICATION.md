# DeepaBMS L2 — Kubernetes Certification
**Phase**: L2 Production Infrastructure Certification  
**Date**: July 15, 2026  
**Standard**: Static analysis of Kustomize and Helm manifests. Runtime deployment is NOT VERIFIED (no cluster).

---

## Kustomize Base Inventory

| Manifest | File | Verified |
|:---------|:-----|:--------:|
| Namespace | `k8s/base/namespace.yaml` | ✅ |
| ConfigMap (backend) | `k8s/base/configmap.yaml` | ✅ |
| ConfigMap (nginx) | `k8s/base/configmap-nginx.yaml` | ✅ |
| Secret | `k8s/base/secret.yaml` | ✅ |
| PVC | `k8s/base/pvc.yaml` | ✅ |
| Deployment (backend) | `k8s/base/deployment-backend.yaml` | ✅ |
| Deployment (web) | `k8s/base/deployment-web.yaml` | ✅ |
| Service (backend) | `k8s/base/service-backend.yaml` | ✅ |
| Service (web) | `k8s/base/service-web.yaml` | ✅ |
| Ingress | `k8s/base/ingress.yaml` | ✅ |
| Kustomization | `k8s/base/kustomization.yaml` | ✅ |

## Kustomize Overlays

| Overlay | File | Verified |
|:--------|:-----|:--------:|
| Staging | `k8s/overlays/staging/kustomization.yaml` | ✅ |
| Production | `k8s/overlays/production/kustomization.yaml` | ✅ |

## Helm Chart Inventory

| Template | File | Verified |
|:---------|:-----|:--------:|
| Helpers | `helm/deepa-bms/templates/_helpers.tpl` | ✅ |
| Backend Deployment | `helm/deepa-bms/templates/deployment-backend.yaml` | ✅ |
| Web Deployment | `helm/deepa-bms/templates/deployment-web.yaml` | ✅ |
| Backend Service | `helm/deepa-bms/templates/service-backend.yaml` | ✅ |
| Web Service | `helm/deepa-bms/templates/service-web.yaml` | ✅ |
| Ingress | `helm/deepa-bms/templates/ingress.yaml` | ✅ |
| HPA | `helm/deepa-bms/templates/hpa.yaml` | ✅ (disabled by default) |
| ConfigMap | `helm/deepa-bms/templates/configmap.yaml` | ✅ |
| Secret | `helm/deepa-bms/templates/secret.yaml` | ✅ |
| PVC | `helm/deepa-bms/templates/pvc.yaml` | ✅ |
| NOTES | `helm/deepa-bms/templates/NOTES.txt` | ✅ |

---

## Certification Checks

### 1. Namespace

| Check | Result | Evidence |
|:------|:------:|:---------|
| Namespace defined | ✅ | `k8s/base/namespace.yaml` — `name: deepa-bms` |
| Labels | ✅ | `app.kubernetes.io/part-of: deepa-bms` |
| Applied | ❌ NOT VERIFIED | No cluster access |

### 2. Deployments

| Check | Backend | Web (nginx) |
|:------|:-------:|:-----------:|
| Replicas | 1 (SQLite constraint) | 1 |
| Image | `ghcr.io/deepabms/backend:latest` | `nginx:stable-alpine` |
| Pull Policy | IfNotPresent | IfNotPresent |
| Liveness Probe | ✅ GET /health/live | ❌ None |
| Readiness Probe | ✅ GET /health/ready | ❌ None |
| Resource Requests | 256Mi / 250m | — |
| Resource Limits | 512Mi / 500m | — |
| Env From | configMapRef + secretRef | — |
| Volume Mount | /app/data (PVC) | — |
| Labels | app.kubernetes.io/part-of + component | — |

**Finding**: Backend has liveness + readiness probes. Web deployment has no probes.
**Finding**: Backend uses `latest` tag — should pin to specific version for production.

### 3. Services

| Check | Backend | Web |
|:------|:-------:|:---:|
| Type | ClusterIP | LoadBalancer |
| Port | 3000 | 80 |
| Selector | component: backend | component: web |

**Verdict**: ✅ Correct. Backend is internal (ClusterIP). Web is external (LoadBalancer).

### 4. Ingress

| Check | Result |
|:------|:------:|
| API Version | networking.k8s.io/v1 ✅ |
| Ingress Class | nginx ✅ |
| TLS | ✅ cert-manager + letsencrypt-prod |
| TLS Host | bms.example.com |
| TLS Secret | deepa-bms-tls |
| Rules | /api → backend:3000, / → web:80 |
| SSL Redirect | ✅ annotation |
| Proxy Body Size | 10m ✅ |

**Finding**: Host `bms.example.com` is a placeholder — must be replaced with actual domain before deployment.
**Finding**: TLS secret `deepa-bms-tls` does not exist — will be created by cert-manager.

### 5. Secrets

| Check | Result |
|:------|:------:|
| Kind | Opaque ✅ |
| JWT_SECRET | `CHANGE_ME_JWT_SECRET` (placeholder) ⚠️ |
| JWT_ISSUER | deepa-bms ✅ |
| JWT_AUDIENCE | deepa-bms-clients ✅ |

**Finding**: JWT_SECRET is a placeholder — must be set to a strong random value before deployment.

### 6. PVC

| Check | Result |
|:------|:------:|
| Access Mode | ReadWriteOnce ✅ |
| Storage Request | 2Gi ✅ |
| Storage Class | (default) ✅ |

**Verdict**: ✅ Appropriate for SQLite single-writer.

### 7. Helm Chart Quality

| Check | Result |
|:------|:------:|
| Chart.yaml | ✅ version + appVersion at 1.0.1 |
| Values documentation | ✅ Fully commented |
| Helper templates | ✅ `_helpers.tpl` with name/label templates |
| Autoscaling | ✅ Disabled by default (`enabled: false`) |
| config.nodeEnv | `production` ✅ |
| config.corsOrigins | `https://bms.example.com` ⚠️ placeholder |
| Image tag | `latest` ⚠️ should be version-pinned |
| NOTES.txt | ✅ Post-install instructions |
| HPA disabled by default | ✅ (SQLite single-writer) |

### 8. Network Policies

| Check | Result |
|:------|:------:|
| NetworkPolicy defined | ❌ **MISSING** — no network isolation manifests |

**Finding**: No NetworkPolicy resources exist in k8s/base or helm templates. All pods can communicate freely. This is a security gap for production.

---

## Kubernetes Certification Score

| Category | Max | Score | Status |
|:---------|:---:|:-----:|:-------|
| Namespace | 10 | 10 | ✅ |
| Deployments | 10 | 8 | ⚠️ Web has no probes |
| Services | 10 | 10 | ✅ |
| Ingress | 10 | 7 | ⚠️ Placeholder domain |
| Secrets | 10 | 6 | ⚠️ Placeholder JWT_SECRET |
| PVC | 10 | 10 | ✅ |
| Helm Chart | 10 | 9 | ✅ Good structure |
| Resource Limits | 10 | 9 | ✅ Backend defined, web partial |
| Autoscaling Strategy | 10 | 10 | ✅ Correctly disabled |
| Network Policies | 10 | 0 | ❌ Missing |
| **TOTAL** | **100** | **79** | **⚠️ CONDITIONAL** |

---

## Conclusion

**Kubernetes Status**: ⚠️ **CONFIGURED — NOT DEPLOYED**

Kustomize and Helm manifests are well-structured with correct architecture for SQLite single-writer (replicas: 1, autoscaling: disabled, PVC: ReadWriteOnce).

**Blockers for Certification:**
1. Replace placeholder domain `bms.example.com` with actual domain in ingress + helm values
2. Set strong JWT_SECRET in secrets
3. Add readiness/liveness probes to web deployment
4. ❌ Add NetworkPolicy resources for pod isolation (security gap)
5. Pin image tags to version (not `latest`)
6. 🔴 Execute `helm template` + `kubeconform` validation (requires CI)
7. 🔴 Deploy to cluster and verify health checks (requires infrastructure)
