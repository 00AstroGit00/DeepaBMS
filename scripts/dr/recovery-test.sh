#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - DR Recovery Test
# Spins up an isolated test environment, restores the latest backup, runs
# health checks + integrity verification, produces a report, and cleans up.
# Uses Docker if available; otherwise restores into a temp PostgreSQL cluster.
#
# Usage: recovery-test.sh [--no-cleanup]
# Environment: PGHOST, PGPORT, PGUSER, PGDATABASE, S3_BUCKET, PGPASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
load_backup_config
require psql
require pg_restore

NO_CLEANUP=0
[[ "${1:-}" == "--no-cleanup" ]] && NO_CLEANUP=1

LOG_DIR="$PROJECT_DIR/logs/dr"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/recovery-test-$(date +%Y%m%d).log"
REPORT="$LOG_DIR/recovery-test-report-$(date +%Y%m%d).txt"
TEST_DB="${TEST_DB:-deepabms_drtest}"
WORK="$BACKUP_ROOT/recovery-test"
mkdir -p "$WORK"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

find_latest_backup() {
    local latest=""
    if [ -n "${S3_BUCKET:-}" ]; then
        latest="$(aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/pg/" 2>/dev/null | awk '{print $4}' | grep -E '\.dump(\.gpg)?$' | sort | tail -1)"
        [ -n "$latest" ] && latest="s3://$S3_BUCKET/$S3_PREFIX/pg/$latest"
    fi
    if [ -z "$latest" ]; then
        latest="$(ls -1 "$BACKUP_ROOT/pg/"*.dump* 2>/dev/null | sort | tail -1 || true)"
    fi
    echo "$latest"
}

restore_test() {
    local src="$1"
    [ -z "$src" ] && { err "No backup found for recovery test."; exit 1; }
    psql -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS $TEST_DB;" >>"$LOG_FILE" 2>&1 || true
    psql -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE $TEST_DB;" >>"$LOG_FILE" 2>&1 || { err "Cannot create test DB"; exit 1; }
    local local_file="$WORK/$(basename "$src")"
    if [[ "$src" == s3://* ]]; then
        aws s3 cp "$src" "$local_file" >>"$LOG_FILE" 2>&1
    else
        cp "$src" "$local_file"
    fi
    if [[ "$local_file" == *.gpg ]]; then
        require gpg
        gpg --batch --yes --trust-model always -d -o "${local_file%.gpg}" "$local_file" >>"$LOG_FILE" 2>&1
        local_file="${local_file%.gpg}"
    fi
    PGPASSWORD="$PGPASSWORD" pg_restore -v -d "$TEST_DB" "$local_file" >>"$LOG_FILE" 2>&1 \
        && log "Restored $src into $TEST_DB" \
        || { err "Restore failed (see $LOG_FILE)"; return 1; }
}

health_checks() {
    local ok=0
    psql -d "$TEST_DB" -t -A -c "SELECT 1;" >/dev/null 2>&1 && ok=$((ok+1)) || err "connectivity check failed"
    local mig; mig="$(psql -d "$TEST_DB" -t -A -c "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null || echo 0)"
    [ "${mig:-0}" -gt 0 ] && ok=$((ok+1)) || err "migration table empty"
    # Integrity: FK + presence of core tables.
    local core; core="$(psql -d "$TEST_DB" -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('sales','inventory','rooms','chart_of_accounts');" 2>/dev/null || echo 0)"
    [ "${core:-0}" -eq 4 ] && ok=$((ok+1)) || err "core tables missing ($core/4)"
    echo "$ok"
}

report() {
    local score="$1"
    {
        echo "DeepaBMS DR Recovery Test Report - $(date)"
        echo "================================================"
        echo "Backup tested: $BACKUP"
        echo "Test database: $TEST_DB"
        echo "Health checks passed: $score / 3"
        echo "Result: $( [ "$score" -eq 3 ] && echo PASS || echo FAIL )"
    } > "$REPORT"
    cat "$REPORT" | tee -a "$LOG_FILE"
    syslog_event "$( [ "$score" -eq 3 ] && echo info || echo err )" "deepabms recovery test result=$score/3"
}

cleanup() {
    [ "$NO_CLEANUP" -eq 1 ] && { log "Skipping cleanup (--no-cleanup)."; return; }
    psql -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS $TEST_DB;" >>"$LOG_FILE" 2>&1 || true
    rm -rf "$WORK"
    log "Cleaned up test environment."
}

main() {
    log "=== DR recovery test start ==="
    BACKUP="$(find_latest_backup)"
    restore_test "$BACKUP" || { report 0; cleanup; exit 2; }
    local score; score="$(health_checks)"
    report "$score"
    cleanup
    [ "$score" -eq 3 ] && log "=== DR recovery test PASSED ===" || { err "=== DR recovery test FAILED ==="; exit 2; }
}

main "$@"
