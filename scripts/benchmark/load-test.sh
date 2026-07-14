#!/usr/bin/env bash
# DeepaBMS — HTTP load test for critical API endpoints.
# Runs k6 (preferred) or autocannon (fallback) against the backend,
# then prints p50 / p95 / p99 latency, error rate and throughput.
#
# Usage:
#   scripts/benchmark/load-test.sh [BASE_URL] [VUS] [DURATION]
#   BASE_URL  target origin, e.g. http://localhost:3000 (default from $API_BASE_URL or localhost:3000)
#   VUS       number of concurrent virtual users (default 50)
#   DURATION  test duration, k6 format e.g. 60s / 2m (default 60s)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_DIR/scripts/lib/utils.sh"

BASE_URL="${1:-${API_BASE_URL:-http://localhost:3000}}"
VUS="${2:-50}"
DURATION="${3:-60s}"
OUT_DIR="$PROJECT_DIR/scripts/benchmark/results"
mkdir -p "$OUT_DIR"

# Optional bearer token for authenticated endpoints (set AUTH_TOKEN env to enable).
AUTH_HEADER=""
if [[ -n "${AUTH_TOKEN:-}" ]]; then
  AUTH_HEADER="\"Authorization\": \"Bearer ${AUTH_TOKEN}\","
fi

TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
REPORT="$OUT_DIR/load-test-$TIMESTAMP.md"

log_info "Target: $BASE_URL | VUs: $VUS | Duration: $DURATION"

# ── k6 path ──────────────────────────────────────────────────────────────────
if command -v k6 &>/dev/null; then
  log_info "k6 detected — running scenario."
  TEST_FILE="$OUT_DIR/k6-$TIMESTAMP.js"
  cat > "$TEST_FILE" <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = '$BASE_URL';
const ERROR_RATE = new Rate('app_errors');

export const options = {
  stages: [
    { duration: '10s', target: $VUS },
    { duration: '$DURATION', target: $VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    app_errors: ['rate<0.01'],
  },
};

const endpoints = [
  ['GET', '/health', null],
  ['GET', '/api/sales', 'auth'],
  ['GET', '/api/inventory', 'auth'],
  ['GET', '/api/restaurant/orders', 'auth'],
  ['GET', '/api/analytics/dashboard', 'auth'],
  ['GET', '/api/rooms', 'auth'],
  ['GET', '/api/hr/employees', 'auth'],
  ['POST', '/api/ai/forecast', 'auth'],
];

export default function () {
  for (const [method, path, needAuth] of endpoints) {
    const headers = { 'Content-Type': 'application/json' $AUTH_HEADER };
    let res;
    if (method === 'POST') {
      res = http.post(BASE + path, JSON.stringify({ horizon: 30 }), { headers });
    } else {
      res = http.get(BASE + path, { headers });
    }
    const ok = check(res, { 'status < 500': (r) => r.status < 500 });
    ERROR_RATE.add(!ok);
    sleep(0.5);
  }
}
EOF
  k6 run --out json="$OUT_DIR/k6-$TIMESTAMP.json" "$TEST_FILE" \
    | tee "$OUT_DIR/k6-$TIMESTAMP.log"

  {
    echo "# DeepaBMS Load Test Report (k6)"
    echo
    echo "- **Date:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    echo "- **Target:** $BASE_URL"
    echo "- **Concurrent users (VUs):** $VUS"
    echo "- **Duration:** $DURATION"
    echo
    echo "## Percentiles (latency, ms)"
    echo
    echo "| Metric | p50 | p95 | p99 |"
    echo "|--------|-----|-----|-----|"
    echo "| http_req_duration | $(grep -oP 'p50=\K[0-9.]+' "$OUT_DIR/k6-$TIMESTAMP.log" | head -1 || echo n/a) | $(grep -oP 'p95=\K[0-9.]+' "$OUT_DIR/k6-$TIMESTAMP.log" | head -1 || echo n/a) | $(grep -oP 'p99=\K[0-9.]+' "$OUT_DIR/k6-$TIMESTAMP.log" | head -1 || echo n/a) |"
    echo
    echo "## Throughput & Errors"
    echo
    echo "- **Requests/sec (avg):** $(grep -oP 'http_reqs.*?rate=\K[0-9.]+' "$OUT_DIR/k6-$TIMESTAMP.log" | head -1 || echo n/a)"
    echo "- **Error rate:** see k6 checks summary in log"
    echo
    echo "Raw JSON: \`results/k6-$TIMESTAMP.json\`"
  } > "$REPORT"
  log_info "Report written: $REPORT"
  exit 0
fi

# ── autocannon fallback ───────────────────────────────────────────────────────
if command -v npx &>/dev/null; then
  log_info "k6 not found — falling back to autocannon."
  ENDPOINTS=("/health" "/api/sales" "/api/inventory" "/api/restaurant/orders" "/api/analytics/dashboard" "/api/rooms")
  {
    echo "# DeepaBMS Load Test Report (autocannon)"
    echo
    echo "- **Date:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    echo "- **Target:** $BASE_URL"
    echo "- **Concurrent connections:** $VUS"
    echo "- **Duration:** $DURATION"
    echo
    echo "| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | RPS | Error rate |"
    echo "|----------|----------|----------|----------|-----|------------|"
    for ep in "${ENDPOINTS[@]}"; do
      RAW="$(npx --yes autocannon -c "$VUS" -d "${DURATION%s}" -j "$BASE_URL$ep" 2>/dev/null || echo '{}')"
      P50="$(echo "$RAW" | grep -oP '"p50"\s*:\s*\K[0-9.]+' || echo n/a)"
      P95="$(echo "$RAW" | grep -oP '"p95"\s*:\s*\K[0-9.]+' || echo n/a)"
      P99="$(echo "$RAW" | grep -oP '"p99"\s*:\s*\K[0-9.]+' || echo n/a)"
      RPS="$(echo "$RAW" | grep -oP '"requests"\s*:\s*\{\s*"average"\s*:\s*\K[0-9.]+' || echo n/a)"
      ERR="$(echo "$RAW" | grep -oP '"errors"\s*:\s*\{\s*"total"\s*:\s*\K[0-9]+' || echo 0)"
      echo "| $ep | $P50 | $P95 | $P99 | $RPS | $ERR |"
    done
  } > "$REPORT"
  log_info "Report written: $REPORT"
  exit 0
fi

log_error "Neither k6 nor npx/autocannon is available. Install k6 (https://k6.io/docs) or Node.js."
exit 1
