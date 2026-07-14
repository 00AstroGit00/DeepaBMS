# DeepaBMS Kubernetes Deployment

Kustomize-based manifests and a Helm chart for deploying DeepaBMS
(SQLite, Express backend, Nginx web client) to Kubernetes.

## Architecture

DeepaBMS uses **SQLite** with WAL mode as its production database.
A single backend replica is required (SQLite does not support concurrent
writers). Data is persisted via a PersistentVolumeClaim mounted at `/app/data`.

## Prerequisites

- A Kubernetes cluster (v1.25+) with:
  - [cert-manager](https://cert-manager.io) for TLS certificates
  - An NGINX Ingress Controller
- `kubectl` and `kustomize` (or `kubectl kustomize`)
- `helm` (for the Helm chart variant)
- A `ClusterIssuer` named `letsencrypt-prod` (or change the annotation in `base/ingress.yaml`)

## 1. Kustomize

### Secrets

The base `secret.yaml` contains placeholders. Replace them before applying,
or generate real secrets with SOPS/SealedSecrets. At minimum set:

- `JWT_SECRET`

```bash
kubectl apply -k k8s/base
```

### Overlays

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
```

| Overlay     | Namespace          | Backend replicas | Notes                    |
|-------------|--------------------|------------------|--------------------------|
| base        | `deepa-bms`        | 1                | Baseline resources       |
| staging     | `deepa-bms-staging`| 1                | Reduced resources        |
| production  | `deepa-bms-prod`   | 1                | Increased resources      |

**Note:** Backend replicas is always 1 due to the SQLite single-writer
constraint. The web (nginx) deployment can be scaled independently.

## 2. Helm

```bash
helm install deepa-bms ./helm/deepa-bms \
  --namespace deepa-bms --create-namespace \
  --set secrets.jwtSecret=CHANGE_ME
```

Override values via `values.yaml` or `-f custom-values.yaml`. See
`helm/deepa-bms/values.yaml` for the full option list.

## Notes

- The backend exposes `/health/live` and `/health/ready` for probes.
- Web client is served by Nginx (port 80) and routed via the Ingress at
  `bms.example.com` (`/` -> web, `/api/*` -> backend:3000).
- Data persistence: the SQLite database is stored in a PVC at
  `/app/data/deepa-bms.db`. Back up this volume regularly.
- Autoscaling is disabled for the backend (SQLite requires exactly 1 replica).
