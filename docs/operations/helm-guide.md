# DeepaBMS Helm Guide

> **Status:** Production reference
> **Audience:** Platform, SRE
> **Last updated:** 2026-07-14
> **Related:** [Kubernetes Guide](kubernetes-guide.md) · [Deployment Guide](deployment-guide.md) · [Docker Guide](docker-guide.md)

## Table of Contents

1. [Chart Structure](#chart-structure)
2. [Values](#values)
3. [Install & Upgrade](#install--upgrade)
4. [Customization](#customization)
5. [Release Management](#release-management)

---

## Chart Structure

```
helm/deepa-bms/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── _helpers.tpl
    ├── configmap.yaml
    ├── secret.yaml
    ├── deployment-backend.yaml
    ├── deployment-postgres.yaml
    ├── deployment-redis.yaml
    ├── deployment-web.yaml
    ├── service-*.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── pvc.yaml
    └── NOTES.txt
```

> **Note:** The chart mirrors `k8s/base` manifests but parameterizes them via `values.yaml`.

---

## Values

Key `values.yaml` knobs:

```yaml
backend:
  image: { repository: deepa-bms-backend, tag: "1.0.0" }
  replicaCount: 3
  resources: { requests: {cpu: 250m, memory: 256Mi}, limits: {cpu: 500m, memory: 512Mi} }
postgres:
  auth: { database: deepa_bms, username: deepa_admin }
  primary: { persistence: { size: 20Gi } }
redis:
  auth: { enabled: true }
ingress:
  host: bms.example.com
  tls: true
```

> **Warning:** Never commit real secrets to `values.yaml`. Use `--set` / sealed secrets / external secrets.

---

## Install & Upgrade

```bash
# Lint
helm lint helm/deepa-bms

# Install
helm upgrade --install deepa-bms helm/deepa-bms \
  --namespace deepa-bms --create-namespace \
  --set backend.image.tag=1.0.0 \
  -f helm/deepa-bms/values.yaml

# Upgrade (new version)
helm upgrade deepa-bms helm/deepa-bms -n deepa-bms \
  --set backend.image.tag=1.1.0

# Dry run
helm upgrade deepa-bms helm/deepa-bms -n deepa-bms --dry-run --debug
```

---

## Customization

- Override per env: `-f values-staging.yaml -f values-prod.yaml`.
- Inline: `--set postgres.primary.persistence.size=50Gi`.
- Templates use `_helpers.tpl` for name/labels — keep consistent.

> **Note:** Keep chart version in `Chart.yaml` synced with app semver ([Release Engineering](release-engineering-guide.md#versioning-semver)).

---

## Release Management

```bash
helm list -n deepa-bms                 # current releases
helm history deepa-bms -n deepa-bms    # revisions
helm rollback deepa-bms <rev> -n deepa-bms   # rollback
helm get values deepa-bms -n deepa-bms       # inspect applied values
helm uninstall deepa-bms -n deepa-bms        # remove (keeps PVC unless --keep-history)
```

> **Warning:** `helm uninstall` removes workloads but PVCs persist by default. To fully wipe data, delete PVCs explicitly (after backup!).

---

*Cross-references: [Kubernetes Guide](kubernetes-guide.md) · [Deployment Guide](deployment-guide.md) · [Release Engineering](release-engineering-guide.md)*
