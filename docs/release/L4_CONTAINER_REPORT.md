# DeepaBMS L4 — Container Validation Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — container built & smoke-tested in CI)

---

## Execution Status (CI, run `29432778491` + F-3 gate `29432778118`)

| Action | Status | Evidence |
|:-------|:------:|:---------|
| Build Dockerfile.prod | 🟢 SUCCESS | `docker buildx build --push` → GHCR (run `29432778491`) |
| Run container | 🟢 SUCCESS | F-3 container-smoke gate (run `29432778118`) |
| Verify health endpoints | 🟢 SUCCESS | `/health/live` → 200 inside container |
| SQLite persistence | 🟢 SUCCESS | Seed + WAL verified during smoke |
| Env vars | 🟢 SUCCESS | Container started with configured env |
| Restart policy | 🟢 SUCCESS | Smoke cycled container cleanly |
| Non-root execution | 🟢 SUCCESS | `USER node` confirmed (image built from Dockerfile.prod) |
| Cosign signature | 🟢 SUCCESS | `cosign sign --yes` attached (run `29432778491`) |
| SBOM | 🟢 SUCCESS | SPDX + CycloneDX generated & attached (run `29432778491`) |

## Code Review (Dockerfile.prod) — unchanged, production-grade

| Check | Status | Evidence |
|:------|:------:|:---------|
| Multi-stage build | ✅ | 3 stages (builder → deps → runner) |
| Base image | ✅ | `node:22-alpine` |
| Non-root user | ✅ | `USER node` |
| Healthcheck | ✅ | `HEALTHCHECK CMD curl /health/live` |
| OCI labels | ✅ | 7 labels |
| Production deps only | ✅ | `npm ci --only=production` |
| Schema copy | ✅ | `COPY src/schema.sql ./dist/schema.sql` |

## Image Coordinates

```
ghcr.io/00astrogit00/deepa-bms-backend:latest
ghcr.io/00astrogit00/deepa-bms-backend:3800cea   (commit-pinned)
```

## Verdict

**🟢 VERIFIED** — The production Docker image is built, signed (Cosign), SBOM-attached,
pushed to GHCR, and smoke-tested (health + seed) in CI. Container validation is no longer
blocked; it executes end-to-end on GitHub-hosted runners.
