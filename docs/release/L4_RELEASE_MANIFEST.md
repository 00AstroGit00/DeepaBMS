# DeepaBMS v2.0.0 — L4 Release Manifest
**Date**: July 15, 2026 (revised — artifacts built in CI)
**Classification**: PUBLIC

---

## Release Identity

| Field | Value |
|:------|:-------|
| Product | DeepaBMS |
| Version | 2.0.0 |
| Release Tag | `v2.0.0` |
| Release Commit | `3800cea` (latest main) / `0153f4f` (tagged) |
| Release Date | 2026-07-15 |
| License | MIT |
| Repository | https://github.com/00AstroGit00/DeepaBMS |

## Artifacts

### Source Code
| Component | Location | Version |
|:----------|:---------|:--------|
| Mobile App | `src/`, `App.tsx` | 2.0.0 |
| Backend API | `apps/backend/` | 2.0.0 |
| Windows Desktop | `apps/windows/` | 2.0.0 |
| Frontend Web | Expo web export | 2.0.0 |

### Infrastructure
| Component | Location |
|:----------|:---------|
| Docker Compose | `docker-compose.prod.yml` |
| Dockerfile (prod) | `apps/backend/Dockerfile.prod` |
| Dockerfile (dev) | `apps/backend/Dockerfile` |
| Helm Chart | `helm/deepa-bms/` (11 templates) |
| Kustomize Base | `k8s/base/` (11 manifests) |
| Kustomize Overlays | `k8s/overlays/production`, `k8s/overlays/staging` |

### Build Artifacts (BUILT IN CI ✅)

| Artifact | Type | Build Evidence | Coordinates |
|:---------|:-----|:--------------|:------------|
| Backend Docker Image | OCI | run `29432778491` | `ghcr.io/00astrogit00/deepa-bms-backend:latest` |
| Cosign Signature | Sig | run `29432778491` | attached to image |
| SBOM (SPDX) | JSON | run `29432778491` | `sbom.spdx.json` (artifact + registry) |
| SBOM (CycloneDX) | JSON | run `29432778491` | `sbom.cdx.json` (artifact + registry) |
| Android APK | APK | run `29432778491` | `app-release.apk` (GitHub Release) |
| Windows Installer | EXE | run `29432778491` | `Deepa.BMS-Setup-2.0.0.exe` (GitHub Release) |
| GitHub Release | — | run `29430359376` | `v2.0.0` with APK + EXE assets |

### Documentation
| Document | Location |
|:----------|:---------|
| CHANGELOG | `CHANGELOG.md` |
| RELEASE MANIFEST | `RELEASE_MANIFEST.md` |
| L1 Reports | `docs/operations/L1_*.md` (6) |
| L2 Certifications | `docs/operations/L2_*.md` (10) |
| L3 Remediation | `docs/operations/L3_*.md` (10) |
| L4 Validation | `docs/release/L4_*.md` (12) |

### CI/CD
| Workflow | File | Jobs | Latest Run | Status |
|:----------|:-----|:-----|:----------|:------|
| Test | `.github/workflows/test.yml` | 2 | `29427105463` | 🟡 backend tests fail (schema drift) |
| Build | `.github/workflows/build.yml` | 5 | `29432778491` | 🟢 artifacts; 🔴 lint-test |
| Security | `.github/workflows/security.yml` | 2 | `29432778355` | 🟢 |
| Release Gates | `.github/workflows/release-gates.yml` | 3 | `29432778118` | 🟢 |
| Backup | `.github/workflows/backup.yml` | 1 | scheduled | ⏭️ |

## Checksums (SHA-256) — source release files

```
76a9f00552a704bbf53a8e837369d88c72730832ea1e46c53c7aaad1e4a0d1a0  package.json
efbcee8318c4ce6a832eb911f8c6d5654091550c9ae040382e22a88dd8cd0cef  CHANGELOG.md
6dba258df22062d58942665bc3b149173c0e2cc2ef26a4fd56cecf99f6376ff1  RELEASE_MANIFEST.md
46d81f2949c16c2f12d072ad6ac909a9292435179e2119edf5dc19430a2b1b90  README.md
caf7cfd8353e50fcc7e3154d211b059cc143f52cca35090009013776f989815c  apps/backend/package.json
73ad62519b3bd8a1ae90b6c2f79e4c94db7aa2afbbb068c05d9057ebaddb85e6  apps/backend/Dockerfile.prod
8589383e282d09039becdb879adb2b64661bf109d93c4318c8d48b130967a86f  apps/backend/Dockerfile
9e670e1522bf3b39f4bd0dbbf7c3e91b7ee1cb4d3b69861efe79d8c8dd701117  helm/deepa-bms/Chart.yaml
66562e9c2718e2228c1d631d565166dbf5d26a7900ee0798743b1a620672827b  helm/deepa-bms/values.yaml
72b76e089908374774cc8d3d1cc5ef2d138d8b79f9f787f71b936e7cf9ce635d  apps/windows/package.json
```
