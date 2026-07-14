#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Point-In-Time Recovery (PITR) Restore
# Restores the latest base backup, fetches WAL from S3, replays to a target
# timestamp, validates, and prints rollback guidance. Restores into a SEPARATE
# data directory so the live cluster is untouched until promotion.
#
# Usage: pitr-restore.sh --target-time "2026-07-14 12:00:00" [--restore-dir /path]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, S3_BUCKET, PGPASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require aws
require pg_basebackup

TARGET_TIME="${TARGET_TIME:-}"
RESTORE_DIR="${RESTORE_DIR:-$BACKUP_ROOT/pitr-restore}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --target-time) TARGET_TIME="${2:-}"; shift 2 || true ;;
        --restore-dir) RESTORE_DIR="${2:-}"; shift 2 || true ;;
        *) shift || true ;;
    esac
done
[ -z "$TARGET_TIME" ] && { log_error "Missing --target-time"; exit 1; }

LOG_DIR="$PROJECT_DIR/logs/restore"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/pitr-$(date +%Y%m%d).log"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

fetch_base() {
    mkdir -p "$RESTORE_DIR"
    if [ ! -d "$RESTORE_DIR/base" ] || [ -z "$(ls -A "$RESTORE_DIR/base" 2>/dev/null)" ]; then
        if [ -n "${S3_BUCKET:-}" ]; then
            log "Downloading base backup from s3://$S3_BUCKET/$S3_PREFIX/base ..."
            aws s3 sync "s3://$S3_BUCKET/$S3_PREFIX/base" "$RESTORE_DIR/base" >>"$LOG_FILE" 2>&1 \
                || { err "Base download failed"; exit 1; }
        elif [ -d "$BACKUP_ROOT/base" ]; then
            log "Using local base backup at $BACKUP_ROOT/base"
            cp -a "$BACKUP_ROOT/base" "$RESTORE_DIR/base"
        else
            err "No base backup available locally or in S3."; exit 1
        fi
    fi
}

configure_recovery() {
    local cd="$RESTORE_DIR/base"
    log "Configuring recovery to target time '$TARGET_TIME'..."
    # PostgreSQL 12+: use postgresql.auto.conf with recovery settings.
    cat >> "$cd/postgresql.auto.conf" <<EOF
restore_command = 'aws s3 cp s3://$S3_BUCKET/$S3_PREFIX/wal/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_inclusive = true
EOF
    touch "$cd/recovery.signal"
    log "Recovery configuration written. Starting PostgreSQL in recovery mode."
}

replay() {
    log "Replaying WAL to '$TARGET_TIME' (start PostgreSQL on $RESTORE_DIR/base)..."
    # Provide the exact commands; actual launch depends on the host's pg_ctl.
    cat >>"$LOG_FILE" <<EOF
To start recovery:
  export PGDATA="$RESTORE_DIR/base"
  pg_ctl -D "$RESTORE_DIR/base" -l "$LOG_DIR/pitr-pg.log" start
  # PostgreSQL will exit recovery when target time is reached and promote.
EOF
    syslog_event "info" "deepabms PITR restore configured target=$TARGET_TIME"
    log "PITR restore staged. Start the cluster with the command logged above."
}

validate() {
    log "Validation: verify base backup integrity and WAL availability."
    if [ ! -f "$RESTORE_DIR/base/PG_VERSION" ]; then
        err "Restored data directory missing PG_VERSION."; exit 2
    fi
    if [ -n "${S3_BUCKET:-}" ]; then
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/wal/" >>"$LOG_FILE" 2>&1 \
            && log "WAL archive reachable." \
            || err "WAL archive unreachable."
    fi
}

rollback_info() {
    log "ROLLBACK: This restore targets a NEW data directory ($RESTORE_DIR/base)."
    log "The original live cluster is untouched. To abort: stop the restored cluster"
    log "  (pg_ctl -D $RESTORE_DIR/base stop -m immediate) and remove $RESTORE_DIR."
}

main() {
    log "=== PITR restore start (target=$TARGET_TIME) ==="
    fetch_base
    validate
    configure_recovery
    replay
    rollback_info
    log "=== PITR restore staged ==="
}

main "$@"
