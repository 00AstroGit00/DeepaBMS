#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Partition Maintenance
# Creates monthly range partitions for time-series tables, detaches partitions
# older than the retention window, archives detached partitions to S3, and logs
# every action. Assumes partitioned parent tables exist (e.g. inventory_ledger,
# security_audit_log, liquor_movements) partitioned by month on a date column.
#
# Usage: partition-maintenance.sh [--months-ahead N] [--retention-months M]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, S3_BUCKET, RETENTION_DAYS

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql
require aws

LOG_DIR="$PROJECT_DIR/logs/db"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/partition-$(date +%Y%m%d).log"

MONTHS_AHEAD="${1:-$(( $(date +%m) ))}"  # placeholder; parsed below
MONTHS_AHEAD=2
RETENTION_MONTHS="${RETENTION_MONTHS:-18}"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

# Tables to maintain: parent  child_partition_prefix  partition_key_column
PARTITIONED_TABLES=(
    "inventory_ledger:inventory_ledger_y:timestamp"
    "security_audit_log:security_audit_log_y:date"
    "liquor_movements:liquor_movements_y:timestamp"
    "purchase_events:purchase_events_y:timestamp"
)

month_bounds() {
    # Echo "YYYYMM startdate enddate" for a month offset from now.
    local off="$1"
    local ym; ym="$(date -d "$off months" +%Y-%m 2>/dev/null || date -v"+${off}M" +%Y-%m)"
    local y; y="${ym%-*}"; local m; m="${ym#*-}"
    local start; start="$(printf '%04d-%02d-01' "$y" "$m")"
    local end; end="$(date -d "$start +1 month" +%Y-%m-%d 2>/dev/null || date -v"+1M" -d "$start" +%Y-%m-%d)"
    echo "${y}${m} $start $end"
}

create_partitions() {
    local off
    for (( off=0; off<MONTHS_AHEAD; off++ )); do
        local info; info="$(month_bounds "$off")"
        local ym start end; read -r ym start end <<<"$info"
        for entry in "${PARTITIONED_TABLES[@]}"; do
            local parent="${entry%%:*}"; local rest="${entry#*:}"
            local pfx="${rest%%:*}"; local col="${rest#*:}"
            local pname="${pfx}${ym}"
            local exists
            exists="$(psql -t -A -c "SELECT 1 FROM pg_class WHERE relname='$pname';" 2>/dev/null | tr -d '[:space:]')"
            if [ "$exists" != "1" ]; then
                log "Creating partition $pname for $parent ($start -> $end)..."
                psql -v ON_ERROR_STOP=1 -q -c \
                    "CREATE TABLE IF NOT EXISTS $pname PARTITION OF $parent
                     FOR VALUES FROM ('$start') TO ('$end');" >>"$LOG_FILE" 2>&1 \
                    || err "Failed to create $pname"
            fi
        done
    done
}

detach_and_archive() {
    local cutoff
    cutoff="$(date -d "-$RETENTION_MONTHS months" +%Y-%m-01 2>/dev/null || date -v"-${RETENTION_MONTHS}M" +%Y-%m-01)"
    local cutoff_ym; cutoff_ym="$(echo "$cutoff" | tr -d '-' | cut -c1-6)"
    for entry in "${PARTITIONED_TABLES[@]}"; do
        local parent="${entry%%:*}"; local rest="${entry#*:}"
        local pfx="${rest%%:*}"
        # Find partitions older than cutoff.
        for pname in $(psql -t -A -c "SELECT c.relname FROM pg_class c JOIN pg_inherits i ON i.inhrelid=c.oid WHERE c.relname LIKE '${pfx}%';" 2>/dev/null); do
            local pym; pym="${pname#"$pfx"}"
            if [[ "$pym" < "$cutoff_ym" ]]; then
                log "Detaching + archiving aged partition $pname (before $cutoff)..."
                local dump="$LOG_DIR/${pname}.sql"
                if psql -v ON_ERROR_STOP=1 -q -c "ALTER TABLE $parent DETACH PARTITION $pname;" >>"$LOG_FILE" 2>&1; then
                    if [ -n "${S3_BUCKET:-}" ]; then
                        pg_dump -t "$pname" -F c -f "$dump.dump" >>"$LOG_FILE" 2>&1 || err "dump failed $pname"
                        aws s3 cp "$dump.dump" "s3://$S3_BUCKET/$S3_PREFIX/archive/$pname.dump" >>"$LOG_FILE" 2>&1 \
                            && log "Archived $pname to s3://$S3_BUCKET/$S3_PREFIX/archive/" \
                            || err "S3 upload failed for $pname"
                        rm -f "$dump.dump"
                    fi
                    # Keep detached table name as _archived for optional later drop.
                    psql -v ON_ERROR_STOP=1 -q -c "ALTER TABLE $pname RENAME TO ${pname}_archived;" >>"$LOG_FILE" 2>&1 || true
                else
                    err "Detach failed for $pname"
                fi
            fi
        done
    done
}

main() {
    log "Partition maintenance start (retention=${RETENTION_MONTHS} months)..."
    create_partitions
    detach_and_archive
    log "Partition maintenance complete."
}

main "$@"
