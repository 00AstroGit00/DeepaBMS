#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Replication Setup (Streaming Physical Replication)
# Creates a replication user, configures pg_hba.conf + postgresql.conf on the
# primary, performs a base backup for the replica, and prints replica startup
# instructions. Must be run on the primary (and have access to replica host via
# ssh if --replica-host is given).
#
# Usage: replication-setup.sh [--replica-host user@host] [--replica-data-dir /path]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD, REPLICA_PASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
require psql
require pg_basebackup

REPLICA_HOST="${REPLICA_HOST:-}"
REPLICA_DATA_DIR="${REPLICA_DATA_DIR:-/var/lib/postgresql/data}"
REPL_USER="${REPL_USER:-replicator}"
REPLICA_PASSWORD="${REPLICA_PASSWORD:-${DB_PASSWORD:-changeme}}"
LOG_DIR="$PROJECT_DIR/logs/db"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/replication-$(date +%Y%m%d).log"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

conf_dir() {
    psql -t -A -c "SHOW config_file;" 2>/dev/null | xargs dirname
}

create_repl_user() {
    log "Creating replication role '$REPL_USER'..."
    psql -v ON_ERROR_STOP=1 -q <<SQL >>"$LOG_FILE" 2>&1
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$REPL_USER') THEN
        CREATE ROLE "$REPL_USER" WITH REPLICATION PASSWORD '$REPLICA_PASSWORD' LOGIN;
    ELSE
        ALTER ROLE "$REPL_USER" WITH REPLICATION PASSWORD '$REPLICA_PASSWORD';
    END IF;
END \$\$;
SQL
    log "Replication user ready."
}

configure_primary() {
    local cd; cd="$(conf_dir)"
    local hba="$cd/pg_hba.conf"
    local conf="$cd/postgresql.conf"
    log "Configuring primary ($cd)..."
    # Ensure WAL level + archiving enabled.
    psql -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET wal_level TO 'replica';" >>"$LOG_FILE" 2>&1
    psql -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET max_wal_senders TO '10';" >>"$LOG_FILE" 2>&1
    psql -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET max_replication_slots TO '10';" >>"$LOG_FILE" 2>&1
    # Allow replica host(s) to connect for replication.
    if [ -n "$REPLICA_HOST" ]; then
        local rhost="${REPLICA_HOST##*@}"
        if ! grep -q "host.*replication.*$REPL_USER" "$hba"; then
            echo "host replication $REPL_USER $rhost md5" >>"hba.tmp"
            cat "$hba" "hba.tmp" >"$hba.new" && mv "$hba.new" "$hba" && rm -f hba.tmp
            log "Added pg_hba.conf entry for $rhost."
        fi
    fi
    log "Primary configured. A restart / reload is required to apply wal_level."
    psql -v ON_ERROR_STOP=1 -q -c "SELECT pg_reload_conf();" >>"$LOG_FILE" 2>&1 || true
}

base_backup() {
    if [ -z "$REPLICA_HOST" ]; then
        log "No --replica-host given; producing base backup locally at $REPLICA_DATA_DIR."
        pg_basebackup -D "$REPLICA_DATA_DIR" -Fp -Xs -P -R -U "$REPL_USER" \
            --host="$PGHOST" --port="$PGPORT" >>"$LOG_FILE" 2>&1 \
            && log "Base backup written to $REPLICA_DATA_DIR" \
            || err "Base backup failed (see $LOG_FILE)"
        return
    fi
    local remote="$REPLICA_HOST"
    log "Streaming base backup to $remote:$REPLICA_DATA_DIR ..."
    pg_basebackup -D - -Ft -Xs -P -R -U "$REPL_USER" --host="$PGHOST" --port="$PGPORT" 2>>"$LOG_FILE" \
        | ssh "$remote" "mkdir -p $REPLICA_DATA_DIR && tar -x -C $REPLICA_DATA_DIR" \
        && log "Base backup shipped to $remote" \
        || err "Remote base backup failed"
}

main() {
    log "Replication setup start (replica=$REPLICA_HOST)..."
    create_repl_user
    configure_primary
    base_backup
    log "Replication setup complete. Start/restart the replica PostgreSQL service to begin streaming."
}

main "$@"
