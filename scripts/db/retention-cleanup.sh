#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Retention & Cleanup
# Deletes / archives old audit and metrics data beyond the retention window,
# archives the purged rows to S3 (or local archive dir) for compliance, and
# reports freed space. Designed to be run on a schedule (e.g. monthly).
#
# Usage: retention-cleanup.sh [--retention-days N] [--dry-run]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, S3_BUCKET, RETENTION_DAYS

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql

LOG_DIR="$PROJECT_DIR/logs/db"
mkdir -p "$LOG_DIR"
ARCHIVE_DIR="$BACKUP_ROOT/retention-archive"
mkdir -p "$ARCHIVE_DIR"
LOG_FILE="$LOG_DIR/retention-$(date +%Y%m%d).log"

RETENTION_DAYS="${RETENTION_DAYS:-365}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
[[ "${2:-}" == "--retention-days" ]] && RETENTION_DAYS="${3:-$RETENTION_DAYS}"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

# table:date_column[:archive]
TABLES=(
    "security_audit_log:date:1"
    "db_health_log:checked_at:1"
    "inventory_ledger:timestamp:0"
    "liquor_movements:timestamp:0"
    "order_events:timestamp:0"
    "room_events:timestamp:0"
    "bar_events:timestamp:0"
    "purchase_events:timestamp:0"
)

freed_bytes=0

clean_table() {
    local t="$1" col="$2" archive="$3"
    local cutoff; cutoff="$(date -d "-$RETENTION_DAYS days" +%Y-%m-%d 2>/dev/null || date -v"-${RETENTION_DAYS}d" +%Y-%m-%d)"
    local before
    before="$(psql -t -A -c "SELECT pg_total_relation_size('$t');" 2>/dev/null || echo 0)"
    local rows
    rows="$(psql -t -A -c "SELECT COUNT(*) FROM $t WHERE $col < '$cutoff';" 2>/dev/null || echo 0)"
    if [ "${rows:-0}" -eq 0 ]; then
        log "$t: nothing to purge (cutoff $cutoff)."
        return
    fi
    if [ "$archive" = "1" ] && [ -n "${S3_BUCKET:-}" ]; then
        local dump="$ARCHIVE_DIR/${t}-$(date +%Y%m%d).dump"
        pg_dump -t "$t" --where="$col < '$cutoff'" -F c -f "$dump" >>"$LOG_FILE" 2>&1 \
            && aws s3 cp "$dump" "s3://$S3_BUCKET/$S3_PREFIX/retention/$t-$(date +%Y%m%d).dump" >>"$LOG_FILE" 2>&1 \
            && log "Archived $rows row(s) from $t to S3" \
            || err "Archive failed for $t"
        rm -f "$dump"
    fi
    if [ "$DRY_RUN" -eq 1 ]; then
        log "[dry-run] Would delete $rows row(s) from $t (before $cutoff)."
        return
    fi
    log "Purging $rows row(s) from $t older than $cutoff..."
    psql -v ON_ERROR_STOP=1 -q -c "DELETE FROM $t WHERE $col < '$cutoff';" >>"$LOG_FILE" 2>&1 \
        || err "Purge failed for $t"
    psql -v ON_ERROR_STOP=1 -q -c "VACUUM ($t);" >>"$LOG_FILE" 2>&1 || true
    local after
    after="$(psql -t -A -c "SELECT pg_total_relation_size('$t');" 2>/dev/null || echo 0)"
    local diff=$(( ${before:-0} - ${after:-0} ))
    freed_bytes=$(( freed_bytes + diff ))
    log "$t: freed $(( diff / 1024 )) KB."
}

main() {
    log "Retention cleanup start (retention=${RETENTION_DAYS}d, dry-run=${DRY_RUN})..."
    for entry in "${TABLES[@]}"; do
        IFS=':' read -r t col archive <<<"$entry"
        clean_table "$t" "$col" "$archive"
    done
    log "Total space freed: $(( freed_bytes / 1024 / 1024 )) MB."
    syslog_event "info" "deepabms retention cleanup freed $(( freed_bytes / 1024 / 1024 )) MB"
}

main "$@"
