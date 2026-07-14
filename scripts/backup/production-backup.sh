#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Production Backup
# pg_dump (custom format) of PostgreSQL, GPG encryption, SHA256 checksum,
# S3 upload, SQLite backup (file copy), WAL archiving setup, monitoring record
# and syslog emission.
#
# Usage: production-backup.sh [--no-s3] [--no-encrypt]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD,
#              S3_BUCKET, GPG_RECIPIENT, BACKUP_ROOT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql
require pg_dump
require sha256sum

NO_S3=0; NO_ENCRYPT=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-s3) NO_S3=1 ;;
        --no-encrypt) NO_ENCRYPT=1 ;;
    esac
    shift || true
done

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/pg"
mkdir -p "$BACKUP_DIR"
LOG_DIR="$PROJECT_DIR/logs/backup"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/production-$(date +%Y%m%d).log"
MONITOR_DIR="$BACKUP_ROOT/monitoring"
mkdir -p "$MONITOR_DIR"

SQLITE_SRC="$PROJECT_DIR/apps/backend/deepa-bms.db"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

DUMP="$BACKUP_DIR/deepabms-$TIMESTAMP.dump"
FINAL="$DUMP"

ensure_wal_archiving() {
    local wal_level
    wal_level="$(psql -t -A -c "SHOW wal_level;" 2>/dev/null | tr -d '[:space:]')"
    if [ "$wal_level" != "replica" ] && [ "$wal_level" != "logical" ]; then
        log "Enabling WAL archiving (wal_level=replica)..."
        psql -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET wal_level TO 'replica';" >>"$LOG_FILE" 2>&1
        psql -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET archive_mode TO 'on';" >>"$LOG_FILE" 2>&1
        psql -v ON_ERROR_STOP=1 -q -c \
            "ALTER SYSTEM SET archive_command TO 'test ! -f $WAL_ARCHIVE_DIR/%f && cp %p $WAL_ARCHIVE_DIR/%f';" >>"$LOG_FILE" 2>&1
        psql -v ON_ERROR_STOP=1 -q -c "SELECT pg_reload_conf();" >>"$LOG_FILE" 2>&1 || true
        mkdir -p "$WAL_ARCHIVE_DIR"
        log "WAL archiving enabled (restart required for wal_level to take effect)."
    else
        log "WAL archiving already enabled (wal_level=$wal_level)."
    fi
}

dump_pg() {
    log "pg_dump (custom format) of $PGDATABASE..."
    pg_dump -F c -v -f "$DUMP" >>"$LOG_FILE" 2>&1 \
        && log "Dump complete: $DUMP" \
        || { err "pg_dump failed"; exit 1; }
}

backup_sqlite() {
    if [ -f "$SQLITE_SRC" ]; then
        local sq="$BACKUP_DIR/deepabms-sqlite-$TIMESTAMP.db"
        cp "$SQLITE_SRC" "$sq"
        ( cd "$BACKUP_DIR" && sha256sum "$(basename "$sq")" >> "$sq.sha256" )
        log "SQLite backup: $sq"
    else
        log_warn "SQLite source not found at $SQLITE_SRC; skipping."
    fi
}

encrypt() {
    if [ "$NO_ENCRYPT" -eq 1 ] || [ -z "${GPG_RECIPIENT:-}" ]; then
        log "Skipping encryption (no recipient / --no-encrypt)."
        return
    fi
    require gpg
    local enc="${FINAL}.gpg"
    gpg --batch --yes --trust-model always -e -r "$GPG_RECIPIENT" -o "$enc" "$FINAL" >>"$LOG_FILE" 2>&1 \
        && { FINAL="$enc"; log "Encrypted: $enc"; } \
        || err "GPG encryption failed"
}

checksum_and_upload() {
    local chk; chk="$(sha256_of "$FINAL")"
    echo "$chk  $(basename "$FINAL")" > "$FINAL.sha256"
    log "SHA256: $chk"
    if [ "$NO_S3" -eq 0 ] && [ -n "${S3_BUCKET:-}" ]; then
        require aws
        aws s3 cp "$FINAL" "s3://$S3_BUCKET/$S3_PREFIX/pg/$(basename "$FINAL")" >>"$LOG_FILE" 2>&1 \
            && aws s3 cp "$FINAL.sha256" "s3://$S3_BUCKET/$S3_PREFIX/pg/$(basename "$FINAL.sha256")" >>"$LOG_FILE" 2>&1 \
            && log "Uploaded to s3://$S3_BUCKET/$S3_PREFIX/pg/" \
            || err "S3 upload failed"
    else
        log_warn "S3 upload skipped (NO_S3 or S3_BUCKET unset)."
    fi
}

record_monitoring() {
    local size; size="$(stat -c%s "$FINAL" 2>/dev/null || echo 0)"
    local status="ok"
    [ -f "$FINAL" ] || status="failed"
    cat > "$MONITOR_DIR/last_backup.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "database": "$PGDATABASE",
  "type": "production",
  "file": "$(basename "$FINAL")",
  "size_bytes": $size,
  "encrypted": $( [ "$FINAL" = *.gpg ] && echo true || echo false ),
  "checksum": "$(cat "$FINAL.sha256" | awk '{print $1}')",
  "status": "$status"
}
EOF
    syslog_event "info" "deepabms production backup $status ($FINAL)"
    log "Monitoring record written to $MONITOR_DIR/last_backup.json"
}

main() {
    log "=== Production backup start: $TIMESTAMP ==="
    ensure_wal_archiving
    dump_pg
    backup_sqlite
    encrypt
    checksum_and_upload
    record_monitoring
    log "=== Production backup complete ==="
}

main "$@"
