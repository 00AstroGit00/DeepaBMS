#!/data/data/com.termux/files/usr/bin/env bash
# =============================================================================
# incident-response.sh — DeepaBMS incident creation & response helper.
#
# Responsibilities:
#   1. Create an incident record (auto-incrementing ID, timestamp).
#   2. Collect lightweight diagnostics (health, recent metrics, alerts).
#   3. Notify the on-call webhook.
#   4. Append a structured entry to the incident log.
#
# Environment overrides:
#   INCIDENT_LOG        path to incident log (default: scripts/observability/incidents.log)
#   INCIDENT_DIR        path to incident records dir
#   ONCALL_WEBHOOK_URL  webhook to notify on-call (optional)
#   API_BASE            base URL for the backend platform API (default: http://localhost:3000/api/platform)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

INCIDENT_DIR="${INCIDENT_DIR:-$SCRIPT_DIR/incidents}"
INCIDENT_LOG="${INCIDENT_LOG:-$SCRIPT_DIR/incidents.log}"
API_BASE="${API_BASE:-http://localhost:3000/api/platform}"
ONCALL_WEBHOOK_URL="${ONCALL_WEBHOOK_URL:-}"
ONCALL_TOKEN="${ONCALL_TOKEN:-}"

mkdir -p "$INCIDENT_DIR"

cleanup() {
  : # no temp artifacts to remove currently
}
trap cleanup EXIT INT TERM

usage() {
  cat <<USAGE
Usage: incident-response.sh [--severity <critical|high|medium|low|info>]
                            [--title <title>] [--description <text>]
                            [--notify] [--no-diag]

Creates a DeepaBMS incident, optionally collects diagnostics and notifies on-call.
USAGE
}

SEVERITY="critical"
TITLE=""
DESCRIPTION=""
NOTIFY=0
DIAG=1

while [ $# -gt 0 ]; do
  case "$1" in
    --severity)    SEVERITY="$2"; shift 2 ;;
    --title)       TITLE="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    --notify)      NOTIFY=1; shift ;;
    --no-diag)     DIAG=0; shift ;;
    -h|--help)     usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [ -z "$TITLE" ]; then
  read -r -p "Incident title: " TITLE
fi
if [ -z "$DESCRIPTION" ]; then
  read -r -p "Description: " DESCRIPTION
fi

# --- Create incident record -------------------------------------------------
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DATE_STAMP="$(date -u +%Y%m%d)"
SEQ=1
if [ -f "$INCIDENT_LOG" ]; then
  SEQ=$(( $(grep -c "^{" "$INCIDENT_LOG" 2>/dev/null || echo 0) + 1 ))
fi
INCIDENT_ID="INC-${DATE_STAMP}-$(printf '%03d' "$SEQ")"
INCIDENT_FILE="$INCIDENT_DIR/${INCIDENT_ID}.json"

# --- Collect diagnostics -----------------------------------------------------
DIAGNOSTICS="{}"
if [ "$DIAG" -eq 1 ]; then
  HEALTH="$(curl -fsS --max-time 5 "$API_BASE/health" 2>/dev/null || echo '{"status":"unreachable"}')"
  ALERTS="$(curl -fsS --max-time 5 "$API_BASE/alerts?status=open" 2>/dev/null || echo '[]')"
  METRICS="$(curl -fsS --max-time 5 "$API_BASE/dashboard" 2>/dev/null || echo '{}')"
  DIAGNOSTICS="$(cat <<JSON
{
  "health": $HEALTH,
  "openAlerts": $ALERTS,
  "dashboard": $METRICS
}
JSON
)"
fi

# --- Build incident JSON ----------------------------------------------------
RECORD="$(cat <<JSON
{
  "incidentId": "$INCIDENT_ID",
  "createdAt": "$TS",
  "severity": "$SEVERITY",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "status": "open",
  "diagnostics": $DIAGNOSTICS
}
JSON
)"

echo "$RECORD" > "$INCIDENT_FILE"

# --- Append to incident log -------------------------------------------------
{
  echo "$RECORD"
} >> "$INCIDENT_LOG"

echo "Incident created: $INCIDENT_ID ($INCIDENT_FILE)"

# --- Notify on-call ---------------------------------------------------------
if [ "$NOTIFY" -eq 1 ] && [ -n "$ONCALL_WEBHOOK_URL" ]; then
  PAYLOAD="$(cat <<JSON
{
  "incidentId": "$INCIDENT_ID",
  "severity": "$SEVERITY",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "createdAt": "$TS"
}
JSON
)"
  CURL_ARGS=(-fsS --max-time 10 -X POST "$ONCALL_WEBHOOK_URL"
    -H "Content-Type: application/json"
    -d "$PAYLOAD")
  if [ -n "$ONCALL_TOKEN" ]; then
    CURL_ARGS+=(-H "Authorization: Bearer $ONCALL_TOKEN")
  fi
  if curl "${CURL_ARGS[@]}"; then
    echo "On-call notification sent for $INCIDENT_ID"
  else
    echo "WARNING: on-call notification failed for $INCIDENT_ID" >&2
  fi
else
  if [ "$NOTIFY" -eq 1 ]; then
    echo "NOTE: --notify set but ONCALL_WEBHOOK_URL not configured; skipping notify." >&2
  fi
fi

echo "Done."
