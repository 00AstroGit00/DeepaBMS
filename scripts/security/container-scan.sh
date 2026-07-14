#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — Container image vulnerability scan (Trivy)
# Scans the built image, emits a JSON + HTML report, and exits non-zero when
# CRITICAL vulnerabilities are present (CI gate).

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

REPORT_DIR="${PROJECT_DIR}/security-reports"
mkdir -p "${REPORT_DIR}"

IMAGE="${1:-${IMAGE_NAME:-deepabms/api:latest}}"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"

verify_dependency trivy

log_info "Scanning image: ${IMAGE}"

# JSON report (machine readable)
trivy image --format json --severity CRITICAL,HIGH,MEDIUM \
  --output "${REPORT_DIR}/trivy-${TIMESTAMP}.json" \
  "${IMAGE}"

# HTML report (human readable)
if command -v trivy &>/dev/null && trivy image --help | grep -q 'template'; then
  trivy image --format template --template '@html.tpl' \
    --output "${REPORT_DIR}/trivy-${TIMESTAMP}.html" \
    "${IMAGE}" 2>/dev/null || \
    trivy image --severity CRITICAL,HIGH,MEDIUM \
      --list-all-pkgs "${IMAGE}" > "${REPORT_DIR}/trivy-${TIMESTAMP}.txt"
fi

# Count CRITICAL findings
CRITICAL_COUNT="$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' \
  "${REPORT_DIR}/trivy-${TIMESTAMP}.json" 2>/dev/null || echo 0)"

log_info "CRITICAL vulnerabilities: ${CRITICAL_COUNT}"

if [ "${CRITICAL_COUNT}" -gt 0 ]; then
  log_error "Image contains ${CRITICAL_COUNT} CRITICAL vulnerabilities. Failing build."
  exit 1
fi

log_info "Container scan passed. Reports in ${REPORT_DIR}/"
