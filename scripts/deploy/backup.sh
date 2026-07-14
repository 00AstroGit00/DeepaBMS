#!/data/data/com.termux/files/usr/bin/env bash
# =============================================================================
# DeepaBMS — Production Database Backup
# =============================================================================
# Dumps PostgreSQL, compresses with gzip, optionally uploads to S3, and
# rotates old backups.
#
# Usage:
#   ./scripts/deploy/backup.sh                          # local backup only
#   AWS_PROFILE=deepa-bms ./scripts/deploy/backup.sh    # with S3 upload
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ───────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-deepa_bms}"
DB_USER="${PGUSER:-deepa_admin}"
DB_PASSWORD="${PGPASSWORD:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/postgres}"
TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/deepa-bms_${TIMESTAMP}.dump"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# ── Functions ────────────────────────────────────────────────────────────────
log()  { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [INFO] $*"; }
err()  { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [ERROR] $*" >&2; }
cleanup() {
  if [[ -f "$BACKUP_FILE" ]]; then
    rm -f "$BACKUP_FILE"
  fi
}
trap cleanup EXIT INT TERM

# ── Prerequisites ────────────────────────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
  err "pg_dump is not installed. Install postgresql-client."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ── Dump Database ────────────────────────────────────────────────────────────
log "Starting backup: $DB_NAME@$DB_HOST:$DB_PORT"

export PGPASSWORD="$DB_PASSWORD"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE" 2>&1 | while IFS= read -r line; do log "  pg_dump: $line"; done

log "Database dump completed: $BACKUP_FILE"

# ── Compress ─────────────────────────────────────────────────────────────────
gzip -9 "$BACKUP_FILE"
log "Compressed: $COMPRESSED_FILE ($(du -h "$COMPRESSED_FILE" | cut -f1))"

# ── Upload to S3 ─────────────────────────────────────────────────────────────
if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
  S3_KEY="${S3_PREFIX}/$(basename "$COMPRESSED_FILE")"
  log "Uploading to s3://${S3_BUCKET}/${S3_KEY} ..."

  aws s3 cp "$COMPRESSED_FILE" "s3://${S3_BUCKET}/${S3_KEY}" --only-show-errors

  log "Upload complete"

  # ── Clean Old S3 Backups ─────────────────────────────────────────────────
  CUTOFF=$(date -u -d "${RETENTION_DAYS} days ago" '+%Y-%m-%dT%H:%M:%SZ')
  log "Cleaning S3 backups older than ${RETENTION_DAYS} days (before ${CUTOFF})..."

  aws s3api list-objects \
    --bucket "$S3_BUCKET" \
    --prefix "$S3_PREFIX/" \
    --query "Contents[?LastModified<=\`${CUTOFF}\`].Key" \
    --output text 2>/dev/null | while IFS= read -r key; do
      if [[ -n "$key" ]]; then
        aws s3 rm "s3://${S3_BUCKET}/${key}" --only-show-errors
        log "  Removed s3://${S3_BUCKET}/${key}"
      fi
    done
else
  log "S3 upload skipped (BACKUP_S3_BUCKET not set or aws CLI not available)"
fi

# ── Rotate Local Backups ─────────────────────────────────────────────────────
log "Cleaning local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "deepa-bms_*.dump.gz" -mtime "+${RETENTION_DAYS}" -delete

# ── Summary ──────────────────────────────────────────────────────────────────
log "Backup complete: $COMPRESSED_FILE"
log "Size: $(du -h "$COMPRESSED_FILE" | cut -f1)"
log "Retention: ${RETENTION_DAYS} days"
