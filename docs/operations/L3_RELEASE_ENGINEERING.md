# DeepaBMS L3 — Release Engineering
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Release Assets

| Asset | Status | Location/Command |
|:------|:------:|:-----------------|
| Backend Docker Image | ⚠️ NOT BUILT | `docker build -t ghcr.io/deepabms/deepa-bms-backend:2.0.0 -f apps/backend/Dockerfile.prod ./apps/backend` |
| Android APK | ⚠️ NOT BUILT | CI: `./gradlew assembleRelease` (requires Android SDK) |
| Windows Installer | ⚠️ NOT BUILT | CI: `npm run package` (requires windows-latest runner) |
| Helm Chart | ✅ CONFIGURED | `helm/deepa-bms/` (Chart.yaml: 2.0.0) |
| Release Manifest | ✅ CREATED | `RELEASE_MANIFEST.md` |

## SBOM Generation

```bash
# Requires Docker image built first
syft ghcr.io/deepabms/deepa-bms-backend:2.0.0 -o spdx-json > sbom.spdx.json
syft ghcr.io/deepabms/deepa-bms-backend:2.0.0 -o cyclonedx-json > sbom.cyclonedx.json
```

**Status**: ⚠️ NOT GENERATED (requires built Docker image)

## Checksums

```bash
# Generate checksums for release artifacts
cd /path/to/release/artifacts
sha256sum deepa-bms-backend-2.0.0.tar.gz > deepa-bms-2.0.0.checksums.txt
sha256sum deepa-bms.apk >> deepa-bms-2.0.0.checksums.txt
sha256sum "DeepaBMS-Setup-2.0.0.exe" >> deepa-bms-2.0.0.checksums.txt
```

**Status**: ⚠️ NOT GENERATED (requires built artifacts)

## Cosign Signing

```bash
# Requires Cosign + OIDC (GitHub Actions)
cosign sign --yes ghcr.io/deepabms/deepa-bms-backend:2.0.0
cosign attach sbom --sbom sbom.spdx.json ghcr.io/deepabms/deepa-bms-backend:2.0.0
```

**Status**: ⚠️ NOT SIGNED (requires CI execution)

## CI Build Automation

All assets are buildable via GitHub Actions:

| Workflow | Artifact | Trigger |
|:---------|:---------|:--------|
| `build.yml` (build-backend) | Docker image + SBOM | Push tag `v*` |
| `build.yml` (build-android) | APK | Push tag `v*` |
| `build.yml` (build-windows) | EXE installer | Push tag `v*` |
| `build.yml` (release) | GitHub Release | Push tag `v*` |

**CI Command to trigger full release**:
```bash
git tag -a v2.0.0 -m "DeepaBMS v2.0.0"
git push origin v2.0.0
```
