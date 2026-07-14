#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Database Migration Runner
# Tracks applied migrations in schema_migrations, applies pending migrations
# from scripts/db/migrations/ transactionally, and supports up/down/status.
#
# Usage:
#   migrate.sh up              Apply all pending migrations
#   migrate.sh down [version]  Roll back one (or to a specific version)
#   migrate.sh status          Show applied / pending migrations
#   migrate.sh create <name>   Scaffold a new migration file
#
# Environment overrides: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD, PGSSLMODE

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
require psql

MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
LOG_DIR="$PROJECT_DIR/logs/db"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/migrate-$(date +%Y%m%d).log"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

ensure_migrations_table() {
    psql -v ON_ERROR_STOP=1 -q -c \
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            checksum VARCHAR(64) NOT NULL,
            duration_ms INTEGER NOT NULL DEFAULT 0
        );"
}

applied_versions() {
    psql -t -A -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null || true
}

all_migration_files() {
    ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort
}

version_of() {
    basename "$1" | sed -E 's/^([0-9]+)-.*/\1/'
}

name_of() {
    basename "$1" | sed -E 's/^[0-9]+-(.*)\.sql$/\1/'
}

cmd_status() {
    ensure_migrations_table
    local applied
    applied="$(applied_versions)"
    log "Migration status:"
    for f in $(all_migration_files); do
        local v; v="$(version_of "$f")"
        if echo "$applied" | grep -qx "$v"; then
            echo -e "  ${GREEN}APPLIED${NC}  $v  $(name_of "$f")"
        else
            echo -e "  ${YELLOW}PENDING${NC}  $v  $(name_of "$f")"
        fi
    done
}

cmd_up() {
    ensure_migrations_table
    local applied; applied="$(applied_versions)"
    local count=0
    for f in $(all_migration_files); do
        local v; v="$(version_of "$f")"
        if echo "$applied" | grep -qx "$v"; then
            continue
        fi
        local name; name="$(name_of "$f")"
        local chk; chk="$(sha256_of "$f")"
        log "Applying migration $v ($name)..."
        local start; start=$(date +%s%3N)
        # Run each migration inside its own transaction; ON_ERROR_STOP aborts.
        if ! psql -v ON_ERROR_STOP=1 -q -f "$f" >>"$LOG_FILE" 2>&1; then
            err "Migration $v failed. See $LOG_FILE"
            exit 1
        fi
        local dur; dur=$(( $(date +%s%3N) - start ))
        psql -v ON_ERROR_STOP=1 -q -c \
            "INSERT INTO schema_migrations(version,name,checksum,duration_ms)
             VALUES('$v','$name','$chk',$dur);" >>"$LOG_FILE" 2>&1
        log "Applied $v in ${dur}ms"
        count=$((count + 1))
    done
    if [ "$count" -eq 0 ]; then
        log "No pending migrations."
    else
        log "Applied $count migration(s)."
    fi
}

cmd_down() {
    ensure_migrations_table
    local target="${1:-}"
    local latest
    latest="$(psql -t -A -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null || true)"
    if [ -z "$latest" ]; then
        err "No migrations to roll back."
        exit 1
    fi
    if [ -n "$target" ] && [ "$target" != "$latest" ]; then
        err "Targeted rollback is not supported (only last-applied rollback). Use down with no version."
        exit 1
    fi
    local f
    f="$(ls -1 "$MIGRATIONS_DIR"/"$latest"-*.sql 2>/dev/null | head -1 || true)"
    if [ -z "$f" ]; then
        err "Migration file for $latest not found locally."
        exit 1
    fi
    local name; name="$(name_of "$f")"
    log "Rolling back migration $latest ($name)..."
    # Look for a corresponding down section marked with '-- DOWN' then SQL.
    if grep -q -- '-- DOWN' "$f"; then
        sed -n '/-- DOWN/,$p' "$f" | sed '1d' | psql -v ON_ERROR_STOP=1 -q -f - >>"$LOG_FILE" 2>&1
    else
        log_warn "No -- DOWN section in $f; removing tracking row only."
    fi
    psql -v ON_ERROR_STOP=1 -q -c "DELETE FROM schema_migrations WHERE version='$latest';" >>"$LOG_FILE" 2>&1
    log "Rolled back $latest."
}

cmd_create() {
    local name="${1:-}"; [ -z "$name" ] && { err "Usage: migrate.sh create <name>"; exit 1; }
    local ts; ts="$(printf '%03d' "$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | awk '{print $1+1}')")"
    local file="$MIGRATIONS_DIR/${ts}-${name}.sql"
    cat >"$file" <<EOF
-- DeepaBMS Migration ${ts}: ${name}
-- Version: ${ts}
-- Description: <describe the change>

-- UP
BEGIN;
-- TODO: write forward migration
COMMIT;

-- DOWN
-- TODO: write rollback
EOF
    log "Created $file"
}

main() {
    local cmd="${1:-up}"; shift || true
    case "$cmd" in
        up) cmd_up "$@" ;;
        down) cmd_down "$@" ;;
        status) cmd_status ;;
        create) cmd_create "$@" ;;
        *) err "Unknown command: $cmd"; echo "Usage: migrate.sh {up|down|status|create}"; exit 1 ;;
    esac
}

main "$@"
