# Version 1.0 Manifest — DeepaBMS

| Component | Version | Source | Verified |
|---|---|---|---|
| Root package | 1.0.0 | `package.json` | EXECUTED (read) |
| Backend (`apps/backend`) | 1.0.0 | `apps/backend/package.json` | EXECUTED (read) |
| Helm chart | 1.0.0 / appVersion 1.0.0 | `helm/deepa-bms/Chart.yaml` | EXECUTED (read) |
| Docker images | untagged (no build run) | `apps/backend/Dockerfile`, `Dockerfile.prod` | NOT VERIFIED |
| Expo app | 1.0.0 (implied) | `package.json` | EXECUTED (read) |
| Git tag | **none** | `git tag` | EXECUTED — ABSENT (F-3) |

## Semantic version assessment
- Core versions align at `1.0.0` → consistent major.minor.patch across repo + chart.
- No pre-release suffix; appropriate for GA **once certification passes**.
- **Blocker:** no immutable `v1.0.0` git tag / clean release commit exists.

## Artifact inventory (static)
- Backend build output: `apps/backend/dist/index.js` (EXECUTED — present).
- Dockerfiles: `apps/backend/Dockerfile`, `Dockerfile.prod` (STATIC).
- Compose: `docker-compose.yml`, `docker-compose.prod.yml` (STATIC — see F-1).
- K8s: `k8s/base`, `k8s/overlays/{staging,production}` (STATIC).
- Helm: `helm/deepa-bms/` (STATIC).
- CI: `.github/workflows/*` incl. `backup.yml` (STATIC).
- SBOM / checksums / release bundle: **not generated** (F-4).
