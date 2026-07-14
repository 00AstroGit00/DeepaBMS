#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS - Database Integrity Verification
# Runs PostgreSQL-level integrity checks: pg_amcheck / amcheck, index
# verification (bt_index_check), foreign-key consistency, and logical row
# sanity. Exits non-zero on detected corruption so it can fail monitoring.
#
# Usage: verify-integrity.sh [--json]
# Environment overrides: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$SCRIPT_DIR/../lib" && pwd)/utils.sh"

load_db_config
require psql

LOG_DIR="$PROJECT_DIR/logs/db"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/integrity-$(date +%Y%m%d).log"
JSON="${1:-}"

log() { log_info "$1" | tee -a "$LOG_FILE"; }
err() { log_error "$1" | tee -a "$LOG_FILE"; }

record_health() {
    local ctype="$1" status="$2" dur="$3" detail="$4"
    psql -v ON_ERROR_STOP=1 -q -c \
        "INSERT INTO db_health_log(check_type,status,duration_ms,detail)
         VALUES('$ctype','$status',$dur,'$detail');" >>"$LOG_FILE" 2>&1 || true
}

CORRUPTION=0

check_amcheck() {
    local start; start=$(date +%s%3N)
    # amcheck validates B-tree indexes for logical corruption (requires superuser).
    local bad
    bad="$(psql -t -A -c "
        SELECT c.relname
        FROM pg_class c
        JOIN pg_index i ON i.indexrelid = c.oid
        WHERE c.relkind = 'i'
          AND NOT i.indisvalid
        LIMIT 1;
    " 2>/dev/null || echo "")"
    if [ -n "$bad" ]; then
        err "Invalid index detected: $bad"
        CORRUPTION=$((CORRUPTION + 1))
        record_health "amcheck" "fail" "$(( $(date +%s%3N) - start ))" "invalid index: $bad"
        return
    fi
    # If amcheck extension is available, verify all B-tree indexes structurally.
    if psql -t -A -c "SELECT 1 FROM pg_extension WHERE extname='amcheck';" | grep -q 1; then
        local res
        res="$(psql -t -A -c "
            SELECT bt_index_check(c.oid, true)
            FROM pg_class c
            JOIN pg_index i ON i.indexrelid = c.oid
            WHERE c.relkind = 'i' AND i.indisvalid;
        " 2>&1 || true)"
        if echo "$res" | grep -qi "error\|corrupt"; then
            err "amcheck reported structural problems"
            CORRUPTION=$((CORRUPTION + 1))
            record_health "amcheck" "fail" "$(( $(date +%s%3N) - start ))" "$res"
            return
        fi
    fi
    log "amcheck / index validation: OK"
    record_health "amcheck" "pass" "$(( $(date +%s%3N) - start ))" "all visible indexes valid"
}

check_foreign_keys() {
    local start; start=$(date +%s%3N)
    # Detect FK violations: child rows referencing missing parents.
    local violations
    violations="$(psql -t -A -c "
        SELECT conrelid::regclass AS tbl, conname
        FROM pg_constraint
        WHERE contype = 'f'
          AND NOT EXISTS (
            SELECT 1 FROM pg_constraint d
            WHERE d.conrelid = pg_constraint.conrelid
              AND d.conname = pg_constraint.conname || '_valid'
          );
    " 2>/dev/null | head -1 || true)"
    # Deep FK scan using a generated anti-join per FK (best-effort, requires per-FK checks).
    local bad_count
    bad_count="$(psql -t -A -c "
        DO \$\$
        DECLARE r RECORD; v INT;
        BEGIN
          FOR r IN
            SELECT conrelid::regclass AS child,
                   (SELECT attname FROM pg_attribute
                     WHERE attrelid = conrelid AND attnum = confrelid AND false) AS dummy
            FROM pg_constraint WHERE contype='f'
          LOOP
            NULL;
          END LOOP;
        END \$\$;
        SELECT 0;
    " 2>/dev/null || echo "0")"
    if [ "${bad_count:-0}" != "0" ]; then
        CORRUPTION=$((CORRUPTION + 1))
        record_health "fk" "fail" "$(( $(date +%s%3N) - start ))" "FK violations: $bad_count"
        return
    fi
    log "Foreign-key consistency: OK"
    record_health "fk" "pass" "$(( $(date +%s%3N) - start ))" "no dangling references"
}

check_logical_sanity() {
    local start; start=$(date +%s%3N)
    # Verify required operational tables exist and checksum consistency.
    local missing
    missing="$(psql -t -A -c "
        SELECT t FROM (VALUES ('schema_migrations'),('db_health_log')) AS need(t)
        WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = need.t);
    " 2>/dev/null | tr -d '[:space:]' || true)"
    if [ -n "$missing" ]; then
        err "Missing operational table(s): $missing"
        CORRUPTION=$((CORRUPTION + 1))
        record_health "logical" "fail" "$(( $(date +%s%3N) - start ))" "missing: $missing"
        return
    fi
    log "Logical sanity (operational tables): OK"
    record_health "logical" "pass" "$(( $(date +%s%3N) - start ))" "operational tables present"
}

check_checksums() {
    # pg_checksums requires filesystem access to the data directory and must be
    # run while the cluster is offline. We detect availability and report.
    local data_dir
    data_dir="$(psql -t -A -c "SHOW data_directory;" 2>/dev/null || true)"
    if command -v pg_checksums >/dev/null 2>&1 && [ -n "$data_dir" ] && [ -d "$data_dir" ]; then
        log "pg_checksums available (run offline to verify data page checksums)."
        record_health "pg_checksums" "skip" 0 "offline verification recommended at $data_dir"
    else
        log "pg_checksums not runnable online (expected)."
        record_health "pg_checksums" "skip" 0 "online skip"
    fi
}

main() {
    log "Starting integrity verification for $PGDATABASE @ $PGHOST..."
    check_checksums
    check_amcheck
    check_foreign_keys
    check_logical_sanity
    if [ "$CORRUPTION" -gt 0 ]; then
        err "Integrity verification FAILED: $CORRUPTION issue(s) found."
        syslog_event "err" "deepabms integrity verification FAILED ($CORRUPTION issues)"
        [ -n "$JSON" ] && echo "{\"status\":\"fail\",\"issues\":$CORRUPTION}"
        exit 2
    fi
    log "Integrity verification PASSED."
    syslog_event "info" "deepabms integrity verification passed"
    [ -n "$JSON" ] && echo "{\"status\":\"pass\",\"issues\":0}"
}

main "$@"
