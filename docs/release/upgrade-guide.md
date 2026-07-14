# DeepaBMS v1.0.0 — Upgrade Guide

DeepaBMS v1.0.0 standardises on **SQLite** as the single production datastore.
PostgreSQL and Redis are removed from every deployment artifact.

## Before you upgrade

1. Stop the old stack and **back up the SQLite database file** (`deepa-bms.db`)
   and its WAL/`*-wal`/`*-shm` siblings.
   ```bash
   docker compose exec backend sqlite3 /app/data/deepa-bms.db ".backup '/app/data/backup-pre-upgrade.db'"
   docker compose cp backend:/app/data ./backup-$(date +%F)
   ```
2. Capture the current image digests / Helm revision:
   ```bash
   docker images --digests | grep deepa-bms
   helm list -n deepa-bms-prod
   ```

## Docker Compose upgrade

```bash
git fetch && git checkout v1.0.0
docker compose pull
docker compose down
docker compose up -d
docker compose exec backend curl -fs http://localhost:3000/health/live
```

The volume `bms-sqlite` (mounted at `/app/data`) is preserved across the
`down`/`up` cycle, so the database is retained.

## Kubernetes (kustomize) upgrade

```bash
kubectl apply -k k8s/overlays/production -n deepa-bms-prod
kubectl rollout status deployment/backend -n deepa-bms-prod
kubectl exec deploy/backend -n deepa-bms-prod -- curl -fs http://localhost:3000/health/live
```

The `sqlite-pvc` (mounted at `/app/data`) is untouched by the rollout.

## Helm upgrade

```bash
helm upgrade --install deepa-bms ./helm/deepa-bms \
  -n deepa-bms-prod --create-namespace \
  -f ./helm/deepa-bms/values.yaml
```

## Post-upgrade verification

- `/health/live` returns `200`.
- `/health/ready` reports DB status `healthy`.
- Run a representative transaction (sale / purchase) and confirm it persists
  after a container/rollout restart.

## Breaking changes vs pre-1.0

- **PostgreSQL / Redis removed.** Any deployment still referencing
  `POSTGRES_*` or `REDIS_URL` must be updated to `SQLITE_DB_PATH`.
- Backend runs as a **single replica** (SQLite single-writer constraint).
  Horizontal scaling of the backend is not supported; scale the mobile/web
  tier instead.
