#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Incremental / Continuous WAL Backup (PITR)
# Performs a pg_basebackup (if no base exists) and continuously ships WAL
# segments to S3 for point-in-time recovery. Designed to run as a long-lived
# service (or under systemd / nohup). Uses archive_command streaming via
# pg_receivewal when available, otherwise polls the WAL archive dir.
#
# Usage: incremental-backup.sh [--foreground] [--slot name]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD, S3_BUCKET

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql
require pg_basebackup
require aws

SLOT="${SLOT:-deepabms_wal}"
FOREGROUND=0
[[ "${1:-}" == "--foreground" ]] && FOREGROUND=1
LOG_DIR="$PROJECT_DIR/logs/backup"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/incremental-$(date +%Y%m%d).log"

BASE_DIR="$BACKUP_ROOT/base"
WAL_S3="s3://$S3_BUCKET/$S3_PREFIX/wal"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

seed_base_backup() {
    if [ -d "$BASE_DIR" ] && [ "$(ls -A "$BASE_DIR" 2>/dev/null)" ]; then
        log "Base backup already present at $BASE_DIR; skipping."
        return
    fi
    mkdir -p "$BASE_DIR"
    log "Creating base backup at $BASE_DIR ..."
    pg_basebackup -D "$BASE_DIR" -Fp -X stream -P -S "$SLOT" \
        --host="$PGHOST" --port="$PGPORT" -U "$PGUSER" >>"$LOG_FILE" 2>&1 \
        && log "Base backup complete" \
        || { err "Base backup failed"; exit 1; }
    # Upload base backup to S3 for offsite PITR baseline.
    if [ -n "${S3_BUCKET:-}" ]; then
        aws s3 sync "$BASE_DIR" "s3://$S3_BUCKET/$S3_PREFIX/base" >>"$LOG_FILE" 2>&1 \
            && log "Base backup synced to S3" \
            || err "Base backup S3 sync failed"
    fi
}

create_slot() {
    local exists
    exists="$(psql -t -A -c "SELECT 1 FROM pg_replication_slots WHERE slot_name='$SLOT';" 2>/dev/null | tr -d '[:space:]')"
    if [ "$exists" != "1" ]; then
        psql -v ON_ERROR_STOP=1 -q -c "SELECT pg_create_physical_replication_slot('$SLOT');" >>"$LOG_FILE" 2>&1 \
            && log "Created replication slot $SLOT" \
            || err "Slot creation failed"
    fi
}

ship_wal() {
    # Prefer pg_receivewal streaming; fall back to polling archive_command output.
    if command -v pg_receivewal >/dev/null 2>&1; then
        log "Streaming WAL via pg_receivewal to S3 (slot=$SLOT)..."
        pg_receivewal --host="$PGHOST" --port="$PGPORT" -U "$PGUSER" \
            --slot="$SLOT" --directory="$WAL_ARCHIVE_DIR" --verbose >>"$LOG_FILE" 2>&1 &
        local pid=$!
        # Ship completed segments to S3 in a loop.
        while kill -0 "$pid" 2>/dev/null; do
            for seg in "$WAL_ARCHIVE_DIR"/*.partial; do
                [ -e "$seg" ] || continue
                local done="${seg%.partial}"
                [ -f "$done" ] && aws s3 cp "$done" "$WAL_S3/" >>"$LOG_FILE" 2>&1 && rm -f "$done"
            done
            sleep 30
        done
    else
        log "pg_receivewal unavailable; polling $WAL_ARCHIVE_DIR for archived WAL..."
        while true; do
            for seg in "$WAL_ARCHIVE_DIR"/*; do
                [ -f "$seg" ] || continue
                case "$seg" in *.partial|*.tmp) continue ;; esac
                aws s3 cp "$seg" "$WAL_S3/" >>"$LOG_FILE" 2>&1 && rm -f "$seg" \
                    || err "WAL ship failed: $seg"
            done
            sleep 15
        done
    fi
}

main() {
    log "=== Incremental/PITR WAL backup start (slot=$SLOT) ==="
    create_slot
    seed_base_backup
    if [ "$FOREGROUND" -eq 1 ]; then
        ship_wal
    else
        ship_wal &
        log "WAL shipping started in background (pid $!)."
        syslog_event "info" "deepabms incremental WAL backup started"
    fi
}

main "$@"
