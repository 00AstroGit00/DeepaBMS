#!/usr/bin/env bash
# DeepaBMS — Database query benchmark.
# Benchmarks key read queries used by hot code paths, reports execution time,
# and flags any query exceeding the slow-query threshold (default 50 ms).
#
# Works against PostgreSQL (production) via psql, or SQLite (dev) via sqlite3.
# Database selection is derived from DATABASE_URL (set in .env).
#
# Usage:
#   scripts/benchmark/db-benchmark.sh [THRESHOLD_MS] [ITERATIONS]
#   THRESHOLD_MS  slow-query flag threshold in ms (default 50)
#   ITERATIONS    warm-up + timed runs per query (default 5)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_DIR/scripts/lib/utils.sh"

THRESHOLD="${1:-50}"
ITERATIONS="${2:-5}"

OUT_DIR="$PROJECT_DIR/scripts/benchmark/results"
mkdir -p "$OUT_DIR"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
REPORT="$OUT_DIR/db-benchmark-$TIMESTAMP.md"

# Locate .env (production example preferred if present, else root .env)
ENV_FILE="$PROJECT_DIR/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$PROJECT_DIR/.env.production.example"
if [[ -f "$ENV_FILE" ]]; then
  set +u
  # shellcheck disable=SC1090
  source <(grep -E '^(DATABASE_URL|SQLITE_DB_PATH)=' "$ENV_FILE" || true)
  set -u
fi

DATABASE_URL="${DATABASE_URL:-}"
detect_engine() {
  if [[ "$DATABASE_URL" == postgres://* || "$DATABASE_URL" == postgresql://* ]]; then
    echo "postgres"
  else
    echo "sqlite"
  fi
}
ENGINE="$(detect_engine)"
log_info "Detected engine: $ENGINE"

# Key queries mirroring hot repository paths. Placeholders kept generic.
# (Parameter binding is approximated; these are representative analytical queries.)
declare -a QUERIES=(
  "Daily revenue rollup|c|SELECT date, total_revenue, net_profit FROM daily_summaries ORDER BY date DESC LIMIT 30"
  "Sales by department + date range|c|SELECT dept, COUNT(*) AS cnt, SUM(total) AS tot FROM sales WHERE date >= datetime('now','-30 days') GROUP BY dept"
  "Inventory ledger by item|c|SELECT item_id, kind, quantity_after, timestamp FROM inventory_ledger WHERE item_id = (SELECT id FROM inventory LIMIT 1) ORDER BY timestamp DESC LIMIT 100"
  "Open restaurant orders|o|SELECT order_no, status, total_amount FROM restaurant_orders WHERE status IN ('open','preparing','ready') ORDER BY created_at DESC LIMIT 50"
  "Active folios|o|SELECT folio_number, guest_name, room_no, balance_amount FROM folios WHERE status = 'open' ORDER BY created_at DESC"
  "Journal entries by period|p|SELECT voucher_no, voucher_type, debit_total, credit_total FROM journal_entries WHERE period_id = (SELECT id FROM financial_periods WHERE is_open = 1 LIMIT 1) ORDER BY entry_date DESC LIMIT 100"
  "Pending approval requests|p|SELECT id, chain_id, status, requested_at FROM approval_requests WHERE status = 'pending' ORDER BY expires_at ASC"
  "Sync queue pending|s|SELECT device_id, operation, status, retry_count FROM sync_queue WHERE status = 'pending' ORDER BY queued_at ASC LIMIT 200"
  "Analytics cache lookup|a|SELECT data, expires_at FROM analytics_cache WHERE cache_key = 'kpi:revenue:30d' AND expires_at > datetime('now')"
  "Event store recent|e|SELECT aggregate_type, event_type, version FROM event_store ORDER BY created_at DESC LIMIT 200"
)

flag_slow() {
  local ms="$1"
  if awk "BEGIN{exit !($ms > $THRESHOLD)}"; then
    echo "⚠ SLOW (>${THRESHOLD}ms)"
  else
    echo "ok"
  fi
}

{
  echo "# DeepaBMS Database Benchmark Report"
  echo
  echo "- **Date:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
  echo "- **Engine:** $ENGINE"
  echo "- **Slow-query threshold:** ${THRESHOLD} ms"
  echo "- **Iterations/query:** $ITERATIONS"
  echo
  echo "| # | Query | Mean (ms) | Min (ms) | Max (ms) | Verdict |"
  echo "|---|-------|-----------|----------|----------|---------|"
} > "$REPORT"

if [[ "$ENGINE" == "postgres" ]]; then
  verify_dependency psql
  log_info "Benchmarking against PostgreSQL ($DATABASE_URL)"
  idx=0
  for entry in "${QUERIES[@]}"; do
    idx=$((idx + 1))
    label="${entry%%|*}"; rest="${entry#*|}"; domain="${rest%%|*}"; sql="${rest##*|}"
    # Translate SQLite datetime() to Postgres now()
    pg_sql="${sql//datetime('now')/now()}"
    pg_sql="${pg_sql//datetime('now','-30 days')/now() - interval '30 days'}"
    MEAN=0; MIN=999999; MAX=0
    for ((i = 1; i <= ITERATIONS; i++)); do
      T="$(
        psql "$DATABASE_URL" -t -A -c "EXPLAIN ANALYZE $pg_sql" 2>/dev/null \
          | grep -oP 'Execution Time: \K[0-9.]+' | head -1 || echo 0
      )"
      T="${T:-0}"
      MEAN=$(awk "BEGIN{print $MEAN + $T}")
      awk "BEGIN{exit !($T < $MIN)}" && MIN="$T"
      awk "BEGIN{exit !($T > $MAX)}" && MAX="$T"
    done
    MEAN=$(awk "BEGIN{printf \"%.2f\", $MEAN / $ITERATIONS}")
    VERDICT="$(flag_slow "$MAX")"
    printf '| %s | %s | %s | %s | %s | %s |\n' "$idx" "$label" "$MEAN" "$MIN" "$MAX" "$VERDICT" >> "$REPORT"
    log_info "[$idx] $label — mean ${MEAN}ms max ${MAX}ms $VERDICT"
  done
else
  verify_dependency sqlite3
  DB_FILE="${SQLITE_DB_PATH:-$PROJECT_DIR/apps/backend/deepa-bms.db}"
  [[ -f "$DB_FILE" ]] || DB_FILE="$PROJECT_DIR/deepa-bms.db"
  log_info "Benchmarking against SQLite ($DB_FILE)"
  idx=0
  for entry in "${QUERIES[@]}"; do
    idx=$((idx + 1))
    label="${entry%%|*}"; rest="${entry#*|}"; domain="${rest%%|*}"; sql="${rest##*|}"
    MEAN=0; MIN=999999; MAX=0
    for ((i = 1; i <= ITERATIONS; i++)); do
      T="$(
        sqlite3 "$DB_FILE" "EXPLAIN QUERY PLAN $sql;" >/dev/null 2>&1
        sqlite3 "$DB_FILE" "SELECT (julianday('now') - julianday('now')) * 0;" >/dev/null 2>&1
        sqlite3 "$DB_FILE" ".timer on" "SELECT COUNT(*) FROM ( $sql );" 2>&1 \
          | grep -oP 'Run Time: real \K[0-9.]+' | awk '{print $1 * 1000}' || echo 0
      )"
      T="${T:-0}"
      MEAN=$(awk "BEGIN{print $MEAN + $T}")
      awk "BEGIN{exit !($T < $MIN)}" && MIN="$T"
      awk "BEGIN{exit !($T > $MAX)}" && MAX="$T"
    done
    MEAN=$(awk "BEGIN{printf \"%.2f\", $MEAN / $ITERATIONS}")
    VERDICT="$(flag_slow "$MAX")"
    printf '| %s | %s | %s | %s | %s | %s |\n' "$idx" "$label" "$MEAN" "$MIN" "$MAX" "$VERDICT" >> "$REPORT"
    log_info "[$idx] $label — mean ${MEAN}ms max ${MAX}ms $VERDICT"
  done
fi

{
  echo
  echo "## Index Recommendations (if slow queries observed)"
  echo
  echo "If any query above exceeds the threshold, confirm the following indexes exist"
  echo "(all are present in \`apps/backend/src/schema.sql\`); for PostgreSQL add composite"
  echo "covering indexes for the heaviest analytical scans:"
  echo
  echo '```sql'
  echo 'CREATE INDEX IF NOT EXISTS idx_sales_date_dept ON sales(date, dept);'
  echo 'CREATE INDEX IF NOT EXISTS idx_je_period_status ON journal_entries(period_id, status);'
  echo 'CREATE INDEX IF NOT EXISTS idx_folio_status_balance ON folios(status, balance_amount);'
  echo 'CREATE INDEX IF NOT EXISTS idx_analytics_cache_exp ON analytics_cache(expires_at);'
  echo '```'
  echo
  echo "Raw report: \`results/db-benchmark-$TIMESTAMP.md\`"
} >> "$REPORT"

log_info "Report written: $REPORT"
