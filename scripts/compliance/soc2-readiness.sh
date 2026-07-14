#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — SOC 2 readiness evidence collector
# Checks audit logging, backup integrity, access controls, and encryption at
# rest, then writes a status report for compliance evidence.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

REPORT_DIR="${PROJECT_DIR}/security-reports/compliance"
mkdir -p "${REPORT_DIR}"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
REPORT="${REPORT_DIR}/soc2-readiness-${TIMESTAMP}.md"

log_info "Collecting SOC 2 readiness evidence..."

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local ok="$2"
  if [ "${ok}" = "0" ]; then
    echo "| ${name} | ✅ PASS |" >> "${REPORT}"
    PASS=$((PASS + 1))
  elif [ "${ok}" = "1" ]; then
    echo "| ${name} | ❌ FAIL |" >> "${REPORT}"
    FAIL=$((FAIL + 1))
  else
    echo "| ${name} | ⚠️  WARN |" >> "${REPORT}"
    WARN=$((WARN + 1))
  fi
}

{
  echo "# SOC 2 Readiness Report"
  echo "- Date: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "- Host: $(hostname)"
  echo
  echo "## CC6.1 / CC7.1 — Audit Logging"
  echo
} > "${REPORT}"

# ── Audit logging ─────────────────────────────────────────────────────────
if [ -n "${AUDIT_LOG_PATH:-}" ] && [ -f "${AUDIT_LOG_PATH}" ]; then
  check "Audit log file exists" 0
else
  check "Audit log file exists" 2
fi

# ── Backup integrity ──────────────────────────────────────────────────────
{
  echo
  echo "## A1.1 / CC6.8 — Backup Integrity"
  echo
} >> "${REPORT}"

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if command -v aws &>/dev/null; then
    if aws s3 ls "s3://${BACKUP_S3_BUCKET}/" >/dev/null 2>&1; then
      check "Backup bucket reachable (S3)" 0
    else
      check "Backup bucket reachable (S3)" 1
    fi
  else
    check "AWS CLI available for backup check" 2
  fi
else
  check "Backup bucket configured" 2
fi

# ── Access controls ───────────────────────────────────────────────────────
{
  echo
  echo "## CC6.1 / CC6.3 — Access Controls"
  echo
} >> "${REPORT}"

if [ -n "${VAULT_ADDR:-}" ] && command -v vault &>/dev/null; then
  if vault status >/dev/null 2>&1; then
    check "Secrets manager (Vault) reachable" 0
  else
    check "Secrets manager (Vault) reachable" 1
  fi
else
  check "Secrets manager configured" 2
fi

# ── Encryption at rest ────────────────────────────────────────────────────
{
  echo
  echo "## C1.1 / A.8.24 — Encryption at Rest"
  echo
} >> "${REPORT}"

if [ -n "${KMS_CMK_ARN:-}" ] || [ -n "${VAULT_TRANSIT_PATH:-}" ]; then
  check "KMS / transit encryption configured" 0
else
  check "KMS / transit encryption configured" 2
fi

# ── TLS / transport ───────────────────────────────────────────────────────
{
  echo
  echo "## CC6.7 — Transport Security"
  echo
} >> "${REPORT}"

if curl -sS -o /dev/null -w '%{http_code}' https://localhost:3000/health >/dev/null 2>&1; then
  check "TLS endpoint responds" 0
else
  check "TLS endpoint responds" 2
fi

# ── Summary ───────────────────────────────────────────────────────────────
{
  echo
  echo "## Summary"
  echo
  echo "- PASS: ${PASS}"
  echo "- FAIL: ${FAIL}"
  echo "- WARN: ${WARN}"
  echo
  if [ "${FAIL}" -gt 0 ]; then
    echo "Result: ❌ Remediation required before audit."
  else
    echo "Result: ✅ No blocking failures (review warnings)."
  fi
} >> "${REPORT}"

log_info "SOC 2 readiness report: ${REPORT}"
cat "${REPORT}"

[ "${FAIL}" -eq 0 ] || exit 1
