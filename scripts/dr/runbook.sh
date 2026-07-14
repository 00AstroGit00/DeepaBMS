#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - DR Runbook (Interactive)
# Menu-driven operator console: failover / failback / recovery test / backup
# verify / status. Logs every action and shows live status (replication lag,
# backup age, WAL archiving state).
#
# Usage: runbook.sh
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD, S3_BUCKET

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql

LOG_DIR="$PROJECT_DIR/logs/dr"
mkdir -p "$LOG_DIR"
RUN_LOG="$LOG_DIR/runbook-$(date +%Y%m%d).log"

log_action() {
    local who="${DR_OPERATOR:-$(whoami)}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $who: $*" | tee -a "$RUN_LOG"
}

status_check() {
    echo "=== DeepaBMS DR Status ==="
    local healthy; healthy="$(psql -t -A -c "SELECT 1;" >/dev/null 2>&1 && echo yes || echo NO)"
    echo "Primary reachable: $healthy"
    local lag
    lag="$(psql -t -A -c "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),0)::int;" 2>/dev/null || echo n/a)"
    echo "Replica replay lag (s): $lag"
    local wal; wal="$(psql -t -A -c "SHOW archive_mode;" 2>/dev/null | tr -d '[:space:]')"
    echo "WAL archive_mode: ${wal:-n/a}"
    local last_backup="$BACKUP_ROOT/monitoring/last_backup.json"
    if [ -f "$last_backup" ]; then
        echo "Last backup: $(grep -E '"timestamp"' "$last_backup" | awk -F'"' '{print $4}')"
    else
        echo "Last backup: (no monitoring record)"
    fi
    if [ -n "${S3_BUCKET:-}" ]; then
        echo "S3 bucket: $S3_BUCKET"
    fi
    echo "=========================="
}

menu() {
    echo
    echo "DeepaBMS DR Runbook"
    echo "1) Status check"
    echo "2) Failover (promote replica)"
    echo "3) Failback (restore old primary)"
    echo "4) Recovery test (restore latest)"
    echo "5) Backup verify (integrity)"
    echo "6) Exit"
    printf "Select [1-6]: "
}

main() {
    while true; do
        menu
        local choice; read -r choice
        case "$choice" in
            1) status_check ;;
            2)
                log_action "failover requested"
                "$SCRIPT_DIR/failover.sh" "${@}"
                log_action "failover completed"
                ;;
            3)
                log_action "failback requested"
                "$SCRIPT_DIR/failback.sh" "${@}"
                log_action "failback completed"
                ;;
            4)
                log_action "recovery test requested"
                "$SCRIPT_DIR/recovery-test.sh"
                log_action "recovery test completed"
                ;;
            5)
                log_action "backup verify requested"
                "$SCRIPT_DIR/../db/verify-integrity.sh" --json
                log_action "backup verify completed"
                ;;
            6) log_action "runbook exit"; break ;;
            *) echo "Invalid choice." ;;
        esac
    done
}

main "$@"
