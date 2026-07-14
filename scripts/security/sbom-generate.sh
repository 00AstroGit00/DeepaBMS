#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — SBOM generation + signing (Syft + Cosign)
# Produces a CycloneDX SBOM, signs it with Cosign (keyless Sigstore in CI, or
# a local key), and uploads/attaches it to the container image + release.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

REPORT_DIR="${PROJECT_DIR}/security-reports/sbom"
mkdir -p "${REPORT_DIR}"

IMAGE="${1:-${IMAGE_NAME:-deepabms/api:latest}}"
TAG="${IMAGE##*:}"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
SBOM_FILE="${REPORT_DIR}/sbom-${TAG}-${TIMESTAMP}.cdx.json"

verify_dependency syft
verify_dependency cosign

log_info "Generating CycloneDX SBOM for ${IMAGE}"
syft scan "${IMAGE}" -o cyclonedx-json > "${SBOM_FILE}"
log_info "SBOM: ${SBOM_FILE}"

# ── Sign the SBOM ───────────────────────────────────────────────────────
# Prefer keyless signing (OIDC) in CI; fall back to a local key pair.
if [ -n "${COSIGN_KEY:-}" ]; then
  log_info "Signing SBOM with provided COSIGN_KEY (key-based)..."
  cosign sign-blob --key "${COSIGN_KEY}" "${SBOM_FILE}" \
    --bundle "${SBOM_FILE}.sig"
elif [ -n "${COSIGN_KEY_PASSWORD:-}" ] && [ -f "${PROJECT_DIR}/cosign.key" ]; then
  log_info "Signing SBOM with cosign.key..."
  cosign sign-blob --key "${PROJECT_DIR}/cosign.key" "${SBOM_FILE}" \
    --bundle "${SBOM_FILE}.sig" \
    --password "${COSIGN_KEY_PASSWORD}"
else
  log_info "No COSIGN_KEY set — attempting keyless (OIDC) signing (CI only)..."
  cosign sign-blob --yes "${SBOM_FILE}" --bundle "${SBOM_FILE}.sig"
fi

# ── Attach SBOM + scan attestation to the image ─────────────────────────
log_info "Attaching SBOM attestation to ${IMAGE}"
cosign attest --yes --type cyclonedx --predicate "${SBOM_FILE}" "${IMAGE}" \
  || log_warn "cosign attest failed (image may be remote-only)."

# ── Upload to release (if GITHUB_TOKEN + tag present) ───────────────────
if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ] && [ -n "${RELEASE_TAG:-}" ]; then
  log_info "Uploading SBOM to GitHub release ${RELEASE_TAG}"
  gh release upload "${RELEASE_TAG}" "${SBOM_FILE}" "${SBOM_FILE}.sig" \
    --repo "${GITHUB_REPOSITORY}" \
    || log_warn "gh release upload failed."
else
  log_warn "GITHUB_TOKEN/RELEASE_TAG not set — skipping release upload."
fi

log_info "SBOM generate + sign complete."
