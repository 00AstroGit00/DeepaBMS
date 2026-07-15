# DeepaBMS L4 — Kubernetes Validation Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — manifests validated in CI)

---

## Execution Status (CI, F-4 gate run `29432778118`)

| Action | Status | Evidence |
|:-------|:------:|:---------|
| `helm template` render | 🟢 SUCCESS | All 11 templates render cleanly |
| `kubeconform` schema validation | 🟢 SUCCESS | Manifests conform to Kubernetes schemas (incl. NetworkPolicy) |
| Ingress validation | 🟢 SUCCESS | `networking.k8s.io/v1` validated |
| NetworkPolicy validation | 🟢 SUCCESS | Egress `ports` at rule level (fix `5c1dd04`) |
| PVC / Secrets / Probes | 🟢 SUCCESS | Rendered and schema-checked |
| Deploy to staging | 🔴 NOT EXECUTED | No Kubernetes cluster available (external) |
| Helm install | 🔴 NOT EXECUTED | Requires cluster |
| Rollback test | 🔴 NOT EXECUTED | Requires cluster |

> The F-4 gate runs `helm template` + `kubeconform` against the chart. It passed on
> runs `29432778118` (main), `29430353762` (main), and `29427890301` (v2.0.0).

## Code Review — Helm Chart (unchanged, production-grade)

| Resource | Status | Notes |
|:---------|:------:|:------|
| `deployment-backend.yaml` | ✅ | Probes, resources, PVC, env, secrets |
| `deployment-web.yaml` | ✅ | Probes, resources, configmap |
| `service-backend.yaml` | ✅ | ClusterIP, port 3000 |
| `service-web.yaml` | ✅ | LoadBalancer, port 80 |
| `ingress.yaml` | ✅ | TLS, cert-manager, path routing |
| `pvc.yaml` | ✅ | 2Gi, ReadWriteOnce |
| `configmap.yaml` | ✅ | All env vars |
| `secret.yaml` | ✅ | JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE |
| `hpa.yaml` | ✅ | Disabled (SQLite single-writer) |
| `networkpolicy.yaml` | ✅ | 4 policies (egress fixed) |

## Verdict

**🟢 MANIFESTS VERIFIED** — Helm chart + Kustomize render and pass `kubeconform` schema
validation in CI (F-4 gate). Live deployment (install, rollback, scaling) remains blocked
by the absence of a Kubernetes cluster — an external-infrastructure dependency, not a
configuration defect.
