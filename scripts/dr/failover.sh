#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - DR Failover
# Checks primary health, promotes the replica to primary (if still a replica),
# updates connection config / app pointer, and notifies stakeholders. Safe to
# run: it refuses to fail over if the primary is still healthy unless --force.
#
# Usage: failover.sh [--replica-host user@host] [--force]
# Environment: PGHOST (current primary), REPLICA_HOST, NOTIFY_HOOK

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
require psql

REPLICA_HOST="${REPLICA_HOST:-}"
FORCE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --replica-host) REPLICA_HOST="${2:-}"; shift 2 || true ;;
        --force) FORCE=1 ;;
        *) shift || true ;;
    esac
done

LOG_DIR="$PROJECT_DIR/logs/dr"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/failover-$(date +%Y%m%d).log"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

primary_healthy() {
    if psql -t -A -c "SELECT 1;" >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

replica_is_replica() {
    local ro
    ro="$(psql -h "${REPLICA_HOST##*@}" -t -A -c "SELECT pg_is_in_recovery();" 2>/dev/null | tr -d '[:space:]')"
    [ "$ro" = "t" ] || [ "$ro" = "true" ]
}

promote_replica() {
    if replica_is_replica; then
        log "Promoting replica on $REPLICA_HOST ..."
        ssh "$REPLICA_HOST" "pg_ctl promote -D \$(psql -t -A -c 'SHOW data_directory')" >>"$LOG_FILE" 2>&1 \
            && log "Replica promoted." \
            || { err "Promotion failed"; exit 1; }
    else
        log "Replica already primary (or not in recovery)."
    fi
}

update_config() {
    # Point the app's DB host to the replica (now primary).
    local new_host="${REPLICA_HOST##*@}"
    log "Updating connection config to new primary $new_host ..."
    if [ -f "$PROJECT_DIR/apps/backend/.env" ]; then
        sed -i.bak -E "s/^(DB_HOST|PGHOST)=.*/\1=$new_host/" "$PROJECT_DIR/apps/backend/.env" 2>/dev/null || true
        log "Updated apps/backend/.env (backup .bak created)."
    fi
    # Emit a marker file the app/monitoring can consume.
    echo "$new_host" > "$BACKUP_ROOT/.db-primary"
}

notify() {
    local msg="DeepaBMS DR failover executed at $(date). New primary: ${REPLICA_HOST:-unknown}."
    syslog_event "crit" "$msg"
    if [ -n "${NOTIFY_HOOK:-}" ]; then
        curl -fsS -X POST "$NOTIFY_HOOK" -d "{\"text\":\"$msg\"}" >>"$LOG_FILE" 2>&1 || err "notify hook failed"
    fi
    log "$msg"
}

main() {
    log "=== DR failover start ==="
    if primary_healthy && [ "$FORCE" -ne 1 ]; then
        err "Primary ($PGHOST) is healthy. Refusing failover (use --force to override)."
        exit 1
    fi
    [ -z "$REPLICA_HOST" ] && { err "REPLICA_HOST required."; exit 1; }
    promote_replica
    update_config
    notify
    log "=== DR failover complete ==="
}

main "$@"
