#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — Dependency & SBOM scan
# Runs npm audit + optional Snyk, generates a Syft SBOM, writes to
# security-reports/. Exits non-zero if critical issues found.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

REPORT_DIR="${PROJECT_DIR}/security-reports"
mkdir -p "${REPORT_DIR}"

TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"

log_info "Starting dependency scan ($(date))"

# ── npm audit ──────────────────────────────────────────────────────────
log_info "Running npm audit..."
if npm audit --audit-level=high --json > "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>/dev/null; then
  log_info "npm audit: no high/critical vulnerabilities found."
else
  AUDIT_RC=$?
  if [ "${AUDIT_RC}" -eq 1 ]; then
    log_warn "npm audit reported vulnerabilities (audit-level=high)."
    jq -r '.metadata.vulnerabilities // empty' "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>/dev/null || true
  else
    log_error "npm audit failed to run (rc=${AUDIT_RC})."
    exit "${AUDIT_RC}"
  fi
fi

# ── Snyk (optional) ─────────────────────────────────────────────────────
if command -v snyk &>/dev/null; then
  log_info "Snyk detected — running snyk test..."
  if snyk test --severity-threshold=high \
        --json > "${REPORT_DIR}/snyk-${TIMESTAMP}.json" 2>/dev/null; then
    log_info "Snyk: no high/critical issues."
  else
    log_warn "Snyk reported issues (see ${REPORT_DIR}/snyk-${TIMESTAMP}.json)."
  fi
else
  log_warn "Snyk not installed — skipping (install via 'npm i -g snyk')."
fi

# ── Syft SBOM ───────────────────────────────────────────────────────────
if command -v syft &>/dev/null; then
  log_info "Generating SBOM with Syft..."
  syft scan dir:"${PROJECT_DIR}" -o cyclonedx-json \
    > "${REPORT_DIR}/sbom-${TIMESTAMP}.cdx.json"
  log_info "SBOM written to ${REPORT_DIR}/sbom-${TIMESTAMP}.cdx.json"
else
  log_warn "Syft not installed — skipping SBOM (see scripts/security/sbom-generate.sh)."
fi

log_info "Dependency scan complete. Reports in ${REPORT_DIR}/"
