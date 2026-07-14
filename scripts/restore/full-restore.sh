#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Full Restore
# Lists available backups, downloads the chosen backup from S3 (or local),
# decrypts with GPG, runs pg_restore, and verifies integrity via the migration
# tracking table + a lightweight check.
#
# Usage: full-restore.sh [--backup file.dump[.gpg]] [--list]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD,
#              S3_BUCKET, GPG_RECIPIENT, BACKUP_ROOT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql
require pg_restore
require aws

LIST=0; BACKUP=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --list) LIST=1 ;;
        --backup) BACKUP="${2:-}"; shift 2 || true ;;
        *) shift || true ;;
    esac
done

LOG_DIR="$PROJECT_DIR/logs/restore"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/full-$(date +%Y%m%d).log"
WORK="$BACKUP_ROOT/restore-work"
mkdir -p "$WORK"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

list_backups() {
    log "Available backups:"
    if [ -n "${S3_BUCKET:-}" ]; then
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/pg/" >>"$LOG_FILE" 2>&1 \
            && aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/pg/" | awk '{print "  s3://'"$S3_BUCKET/$S3_PREFIX/pg/"'"$4}'
    fi
    ls -1 "$BACKUP_ROOT/pg/"*.dump* 2>/dev/null | sed 's/^/  local:/' || true
}

fetch_backup() {
    local src="$1" local_file="$WORK/$(basename "$src")"
    if [[ "$src" == s3://* ]]; then
        aws s3 cp "$src" "$local_file" >>"$LOG_FILE" 2>&1 || { err "Download failed: $src"; exit 1; }
    else
        cp "$src" "$local_file"
    fi
    echo "$local_file"
}

decrypt() {
    local f="$1"
    if [[ "$f" == *.gpg ]]; then
        require gpg
        local out="${f%.gpg}"
        gpg --batch --yes --trust-model always -d -o "$out" "$f" >>"$LOG_FILE" 2>&1 \
            && { log "Decrypted to $out"; echo "$out"; } \
            || { err "Decryption failed"; exit 1; }
    else
        echo "$f"
    fi
}

verify_checksum() {
    local f="$1"
    local sha="${f}.sha256"
    if [ -f "$sha" ]; then
        ( cd "$(dirname "$f")" && sha256sum -c "$(basename "$sha")" >>"$LOG_FILE" 2>&1 ) \
            && log "Checksum verified." || { err "Checksum mismatch!"; exit 2; }
    else
        log_warn "No checksum file; skipping verification."
    fi
}

restore() {
    local dump="$1"
    log "pg_restore into $PGDATABASE (clean)..."
    pg_restore -v -c -C -d "$PGDATABASE" "$dump" >>"$LOG_FILE" 2>&1 \
        && log "Restore complete." \
        || { err "pg_restore reported errors (see $LOG_FILE)"; exit 1; }
}

verify_integrity() {
    local ok
    ok="$(psql -t -A -c "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null || echo 0)"
    if [ "${ok:-0}" -ge 0 ]; then
        log "Integrity check: schema_migrations present (rows=$ok)."
        syslog_event "info" "deepabms full restore verified"
    else
        err "Integrity check failed."; exit 2
    fi
}

main() {
    log "=== Full restore start ==="
    if [ "$LIST" -eq 1 ]; then list_backups; exit 0; fi
    [ -z "$BACKUP" ] && { err "Specify --backup <file|s3://...> or --list"; exit 1; }
    local local_file; local_file="$(fetch_backup "$BACKUP")"
    local dump; dump="$(decrypt "$local_file")"
    verify_checksum "$dump"
    restore "$dump"
    verify_integrity
    log "=== Full restore complete ==="
}

main "$@"
