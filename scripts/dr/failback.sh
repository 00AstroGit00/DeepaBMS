#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - DR Failback
# After a failover, rebuild the former primary as a replica of the current
# primary, let it catch up, then promote it back to primary and update config.
#
# Usage: failback.sh [--old-primary user@host] [--current-primary user@host]
# Environment: PGHOST (current primary), OLD_PRIMARY_HOST

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
require psql
require pg_basebackup

OLD_PRIMARY_HOST="${OLD_PRIMARY_HOST:-}"
CURRENT_PRIMARY_HOST="${CURRENT_PRIMARY_HOST:-${PGHOST:-}}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --old-primary) OLD_PRIMARY_HOST="${2:-}"; shift 2 || true ;;
        --current-primary) CURRENT_PRIMARY_HOST="${2:-}"; shift 2 || true ;;
        *) shift || true ;;
    esac
done

LOG_DIR="$PROJECT_DIR/logs/dr"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/failback-$(date +%Y%m%d).log"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

rebuild_as_replica() {
    [ -z "$OLD_PRIMARY_HOST" ] && { err "OLD_PRIMARY_HOST required."; exit 1; }
    log "Rebuilding $OLD_PRIMARY_HOST as replica of $CURRENT_PRIMARY_HOST ..."
    ssh "$OLD_PRIMARY_HOST" "pg_ctl stop -D \$(psql -t -A -c 'SHOW data_directory') -m fast" >>"$LOG_FILE" 2>&1 || true
    ssh "$OLD_PRIMARY_HOST" "rm -rf /tmp/old_pgdata && mv \$(psql -t -A -c 'SHOW data_directory') /tmp/old_pgdata" >>"$LOG_FILE" 2>&1 || true
    pg_basebackup -h "$CURRENT_PRIMARY_HOST" -D "/tmp/new_pgdata" -Fp -Xs -P -R \
        --host="$CURRENT_PRIMARY_HOST" >>"$LOG_FILE" 2>&1 \
        && ssh "$OLD_PRIMARY_HOST" "mv /tmp/new_pgdata \$(psql -t -A -c 'SHOW data_directory')" \
        && log "Base backup from current primary applied to old primary." \
        || { err "Rebuild failed"; exit 1; }
    ssh "$OLD_PRIMARY_HOST" "pg_ctl start -D \$(psql -t -A -c 'SHOW data_directory')" >>"$LOG_FILE" 2>&1 \
        && log "Old primary restarted as replica." \
        || err "Restart failed"
}

wait_for_sync() {
    log "Waiting for replica to catch up with primary..."
    local attempts=0
    while [ "$attempts" -lt 60 ]; do
        local lag
        lag="$(psql -h "$CURRENT_PRIMARY_HOST" -t -A -c \
            "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),0)::int;" 2>/dev/null || echo 999)"
        if [ "${lag:-999}" -lt 5 ]; then
            log "Replica in sync (lag ${lag}s)."; return 0
        fi
        sleep 10; attempts=$((attempts+1))
    done
    err "Replica did not sync within timeout."
    return 1
}

promote_back() {
    log "Promoting $OLD_PRIMARY_HOST back to primary..."
    ssh "$OLD_PRIMARY_HOST" "pg_ctl promote -D \$(psql -t -A -c 'SHOW data_directory')" >>"$LOG_FILE" 2>&1 \
        && log "Promoted back to primary." \
        || { err "Promotion failed"; exit 1; }
    echo "${OLD_PRIMARY_HOST##*@}" > "$BACKUP_ROOT/.db-primary"
    if [ -f "$PROJECT_DIR/apps/backend/.env" ]; then
        sed -i.bak -E "s/^(DB_HOST|PGHOST)=.*/\1=${OLD_PRIMARY_HOST##*@}/" "$PROJECT_DIR/apps/backend/.env" 2>/dev/null || true
    fi
    syslog_event "info" "deepabms DR failback complete; primary restored to ${OLD_PRIMARY_HOST##*@}"
}

main() {
    log "=== DR failback start ==="
    rebuild_as_replica
    wait_for_sync
    promote_back
    log "=== DR failback complete ==="
}

main "$@"
