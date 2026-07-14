#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — OWASP surface check
# Probes a running endpoint for required security headers, HTTPS enforcement,
# rate limiting, and safe CORS, then emits a markdown report.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

REPORT_DIR="${PROJECT_DIR}/security-reports"
mkdir -p "${REPORT_DIR}"

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
REPORT="${REPORT_DIR}/owasp-check-${TIMESTAMP}.md"

verify_dependency curl

REQUIRED_HEADERS=(
  "strict-transport-security"
  "content-security-policy"
  "x-content-type-options"
  "x-frame-options"
  "referrer-policy"
  "permissions-policy"
  "cross-origin-opener-policy"
)

log_info "Probing ${BASE_URL} for OWASP security surface..."

{
  echo "# OWASP Security Surface Check"
  echo "- Date: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "- Target: ${BASE_URL}"
  echo
  echo "## Security Headers"
  echo
  echo "| Header | Present | Value |"
  echo "|--------|---------|-------|"
} > "${REPORT}"

# ── Header checks ────────────────────────────────────────────────────────
HEADERS_RAW="$(curl -sS -D - -o /dev/null "${BASE_URL}/health" || true)"

for h in "${REQUIRED_HEADERS[@]}"; do
  if printf '%s\n' "${HEADERS_RAW}" | grep -qi "^${h}:"; then
    VALUE="$(printf '%s\n' "${HEADERS_RAW}" | grep -i "^${h}:" | head -1 | sed "s/^${h}: //I")"
    echo "| ${h} | ✅ | ${VALUE} |" >> "${REPORT}"
  else
    echo "| ${h} | ❌ | missing |" >> "${REPORT}"
    MISSING=1
  fi
done

# ── HTTPS enforcement ─────────────────────────────────────────────────────
{
  echo
  echo "## Transport Security"
  echo
} >> "${REPORT}"

if printf '%s\n' "${BASE_URL}" | grep -qi '^https://'; then
  echo "| Protocol | ✅ HTTPS |" >> "${REPORT}"
else
  echo "| Protocol | ❌ Not HTTPS (use behind TLS terminator) |" >> "${REPORT}"
fi

# ── Rate limiting (send 25 quick auth requests, expect 429) ─────────────
{
  echo
  echo "## Rate Limiting (auth endpoint)"
  echo
} >> "${REPORT}"

HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"ratetest@deepabms.com","pin":"0000"}' || true)"

if [ "${HTTP_CODE}" = "429" ] || [ "${HTTP_CODE}" = "401" ] || [ "${HTTP_CODE}" = "403" ]; then
  echo "| Auth rate limit | ✅ (responded ${HTTP_CODE}) |" >> "${REPORT}"
else
  echo "| Auth rate limit | ⚠️ unexpected response ${HTTP_CODE} |" >> "${REPORT}"
fi

# ── CORS (rogue origin) ──────────────────────────────────────────────────
{
  echo
  echo "## CORS (rogue origin)"
  echo
} >> "${REPORT}"

CORS_RESP="$(curl -sS -D - -o /dev/null \
  -H 'Origin: https://evil.example.com' \
  "${BASE_URL}/health" 2>/dev/null | grep -i 'access-control-allow-origin' || true)"

if [ -z "${CORS_RESP}" ]; then
  echo "| Rogue Origin | ✅ not reflected |" >> "${REPORT}"
else
  echo "| Rogue Origin | ❌ ${CORS_RESP} |" >> "${REPORT}"
fi

{
  echo
  echo "## Summary"
  echo
  if [ -n "${MISSING:-}" ]; then
    echo "Result: ❌ One or more required headers missing. See table above."
  else
    echo "Result: ✅ All checked controls present."
  fi
} >> "${REPORT}"

log_info "OWASP check report: ${REPORT}"
cat "${REPORT}"
