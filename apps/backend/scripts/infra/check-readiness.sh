#!/usr/bin/env bash
# DeepaBMS — Infrastructure Readiness Probe (P7 Phase 1)
# Probes the pilot environment for required components and writes a
# machine-readable readiness JSON. Run on the pilot server as root or sudo.
set -euo pipefail

OUT="${1:-infra-readiness.json}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

probe() {
  local name="$1"; shift
  if command -v "$1" >/dev/null 2>&1; then
    local ver
    ver="$("$@" 2>/dev/null | head -1 || echo "present")"
    echo "{\"component\":\"$name\",\"status\":\"present\",\"detail\":\"${ver//\"/}\"}"
  else
    echo "{\"component\":\"$name\",\"status\":\"MISSING\"}"
  fi
}

components=(
  "$(probe docker docker --version)"
  "$(probe kubectl kubectl version --client)"
  "$(probe helm helm version)"
  "$(probe psql psql --version)"
  "$(probe redis-cli redis-cli --version)"
  "$(probe node node --version)"
  "$(probe npm npm --version)"
)

# Filesystem / storage probe
disk_free="$(df -h /data 2>/dev/null | awk 'NR==2{print $4}' || echo 'n/a')"
backup_mount="$(mount | grep -c '/backup' || true)"

# Compose readiness object
{
  echo "{"
  echo "  \"generatedAt\": \"$NOW\","
  echo "  \"components\": ["
  for i in "${!components[@]}"; do
    if [ "$i" -lt $((${#components[@]}-1)) ]; then
      echo "    ${components[$i]},"
    else
      echo "    ${components[$i]}"
    fi
  done
  echo "  ],"
  echo "  \"storage\": {\"dataFree\": \"$disk_free\", \"backupMounted\": $backup_mount},"
  echo "  \"notes\": \"UPS, printers, scanners, POS terminals, cash drawers, LAN and internet redundancy must be verified manually on-site (see 01-infrastructure-assessment.md).\""
  echo "}"
} > "$OUT"

echo "Infrastructure readiness written to $OUT"
missing="$(grep -c '"status":"MISSING"' "$OUT" || true)"
echo "Missing components: $missing"
