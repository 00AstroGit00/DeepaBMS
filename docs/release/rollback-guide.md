# DeepaBMS v1.0.0 — Rollback Guide

Rollback restores the previous application version. The **SQLite database
file is the source of truth** — never downgrade the schema underneath a newer
data file without a verified backup.

## 1. Restore the database backup (do this first)

If the upgrade wrote to the DB and you need the pre-upgrade state:

```bash
# Docker Compose
docker compose down
docker compose cp ./backup-YYYY-MM-DD/deepa-bms.db backend:/app/data/deepa-bms.db
docker compose up -d

# Kubernetes
kubectl exec -n deepa-bms-prod deploy/backend -- rm -f /app/data/deepa-bms.db
kubectl cp ./backup-YYYY-MM-DD/deepa-bms.db deepa-bms-prod/deploy/backend:/app/data/deepa-bms.db
kubectl rollout restart deployment/backend -n deepa-bms-prod
```

## 2. Roll back the application

### Docker Compose
```bash
git checkout <previous-tag>
docker compose down
docker compose up -d
```

### Kubernetes (kustomize)
```bash
kubectl rollout undo deployment/backend -n deepa-bms-prod
# or pin an older image:
kubectl set image deployment/backend backend=<registry>/deepa-bms-backend:<previous-tag> -n deepa-bms-prod
kubectl rollout status deployment/backend -n deepa-bms-prod
```

### Helm
```bash
helm rollback deepa-bms <previous-revision> -n deepa-bms-prod
```

## 3. Verify health
```bash
curl -fs http://<host>:3000/health/live && echo OK
```

## Notes

- `sqlite-pvc` / `bms-sqlite` volume is **not** deleted on rollback; only the
  application image changes.
- If a future migration is not backward-compatible, restore from the DB
  backup taken before the upgrade rather than relying on app rollback alone.
