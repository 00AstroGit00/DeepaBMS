# DeepaBMS L4 — Client Deliverables Report
**Phase**: L4 Production Deployment, Validation & GA Evidence Collection
**Date**: July 15, 2026 (revised — deliverables BUILT in CI)

---

## Deliverable Status

| Deliverable | Status | Evidence |
|:------------|:------:|:---------|
| Android APK | 🟢 BUILT | `app-release.apk` (run `29432778491`) |
| Windows Installer | 🟢 BUILT | `Deepa.BMS-Setup-2.0.0.exe` (run `29432778491`) |
| Docker Image | 🟢 BUILT | `ghcr.io/00astrogit00/deepa-bms-backend:latest` (run `29432778491`) |
| Helm Chart Package | ✅ | Chart source complete (rendered + kubeconform in CI) |
| Release ZIP | 🟢 | GitHub Release v2.0.0 with APK + EXE (run `29430359376`) |
| Checksums | ✅ | `deepa-bms-2.0.0-checksums.txt` (10 files) |
| SBOM (SPDX) | 🟢 GENERATED | run `29432778491` (artifact + registry) |
| SBOM (CycloneDX) | 🟢 GENERATED | run `29432778491` (artifact + registry) |
| Cosign Signature | 🟢 SIGNED | `cosign sign --yes` (run `29432778491`) |
| Release Notes | ✅ | `CHANGELOG.md` |
| Release Manifest | ✅ | `RELEASE_MANIFEST.md` |

## Source Code Bundle

| Component | Location | Version |
|:----------|:---------|:--------|
| Backend | `apps/backend/` | 2.0.0 |
| Mobile App | `src/`, `App.tsx` | 2.0.0 |
| Windows Desktop | `apps/windows/` | 2.0.0 |
| Helm Chart | `helm/deepa-bms/` | 2.0.0 |
| Kustomize | `k8s/base/`, `k8s/overlays/` | 2.0.0 |
| Docker Compose | `docker-compose.prod.yml` | 2.0.0 |

## Public Release Coordinates

```
GitHub Release : https://github.com/00AstroGit00/DeepaBMS/releases/tag/v2.0.0
  ├─ app-release.apk
  └─ Deepa.BMS-Setup-2.0.0.exe

Container Image: ghcr.io/00astrogit00/deepa-bms-backend:latest
                 ghcr.io/00astrogit00/deepa-bms-backend:3800cea
  └─ cosign-signed, SBOM-attached
```

## Verdict

**🟢 CLIENT DELIVERABLES PRODUCED** — All binary artifacts (APK, EXE, Docker image),
SBOMs (SPDX + CycloneDX), Cosign signature, and the GitHub Release are built and
verifiable via GitHub Actions. Source, checksums, manifest, and documentation complete.
