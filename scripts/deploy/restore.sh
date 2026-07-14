#!/data/data/com.termux/files/usr/bin/env bash
# =============================================================================
# DeepaBMS — Production Database Restore
# =============================================================================
# Lists available backups and restores a selected PostgreSQL dump.
# Supports restoring from local files or S3.
#
# Usage:
#   ./scripts/deploy/restore.sh                           # interactive
#   ./scripts/deploy/restore.sh /path/to/backup.dump.gz   # direct restore
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ───────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-deepa_bms}"
DB_USER="${PGUSER:-deepa_admin}"
DB_PASSWORD="${PGPASSWORD:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# ── Prerequisites ────────────────────────────────────────────────────────────
if ! command -v pg_restore &>/dev/null; then
  err "pg_restore is not installed. Install postgresql-client."
  exit 1
fi

# ── Functions ────────────────────────────────────────────────────────────────
confirm() {
  echo ""
  warn "WARNING: This will OVERWRITE the database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}"
  echo ""
  read -r -p "Are you sure you want to proceed? [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY])
      return 0
      ;;
    *)
      err "Restore cancelled"
      exit 1
      ;;
  esac
}

restore_dump() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    err "File not found: $file"
    exit 1
  fi

  log "Restoring from: $file"
  log "Target: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

  confirm

  # Determine if compressed
  local pg_restore_args=()
  if [[ "$file" == *.gz ]]; then
    log "Detected gzip compressed dump — decompressing on the fly"
    pg_restore_args+=(--file=<(gunzip -c "$file"))
  else
    pg_restore_args+=(--file="$file")
  fi

  export PGPASSWORD="$DB_PASSWORD"

  # Terminate existing connections and drop/recreate
  log "Terminating existing connections to ${DB_NAME}..."

  psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    --quiet 2>/dev/null || true

  log "Dropping and recreating database ${DB_NAME}..."

  psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="postgres" \
    --command="DROP DATABASE IF EXISTS ${DB_NAME};" \
    --quiet

  psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="postgres" \
    --command="CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" \
    --quiet

  log "Running pg_restore..."

  pg_restore \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "${pg_restore_args[@]}" 2>&1 | while IFS= read -r line; do log "  pg_restore: $line"; done

  log "Restore complete"
}

# ── Direct File Restore ──────────────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  restore_dump "$1"
  exit 0
fi

# ── Interactive Restore ──────────────────────────────────────────────────────
echo "============================================"
echo "  DeepaBMS — Database Restore"
echo "============================================"
echo ""

# Collect local backups
LOCAL_BACKUPS=()
while IFS= read -r -d '' f; do
  LOCAL_BACKUPS+=("$f")
done < <(find "$BACKUP_DIR" -name "deepa-bms_*.dump.gz" -print0 2>/dev/null | sort -r -z)

if [[ ${#LOCAL_BACKUPS[@]} -eq 0 ]]; then
  warn "No local backups found in $BACKUP_DIR"
  RESTORE_MODE="s3"
else
  echo "Available local backups:"
  echo ""
  for i in "${!LOCAL_BACKUPS[@]}"; do
    size=$(du -h "${LOCAL_BACKUPS[$i]}" | cut -f1)
    printf "  %2d) %s  (%s)\n" $((i + 1)) "$(basename "${LOCAL_BACKUPS[$i]}")" "$size"
  done

  if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
    echo ""
    printf "  %2d) List backups from S3 (s3://%s/%s/)\n" $(( ${#LOCAL_BACKUPS[@]} + 1 )) "$S3_BUCKET" "backups/postgres"
    RESTORE_MODE="local_or_s3"
  else
    RESTORE_MODE="local"
  fi
fi

echo ""
read -r -p "Select backup to restore [1-${#LOCAL_BACKUPS[@]}]: " selection

if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#LOCAL_BACKUPS[@]} ]]; then
  restore_dump "${LOCAL_BACKUPS[$((selection - 1))]}"
elif [[ "$RESTORE_MODE" == "local_or_s3" ]] && [[ "$selection" -eq $(( ${#LOCAL_BACKUPS[@]} + 1 )) ]]; then
  # S3 listing
  echo ""
  info "Fetching backups from S3..."
  S3_BACKUPS=$(aws s3api list-objects \
    --bucket "$S3_BUCKET" \
    --prefix "backups/postgres/" \
    --query "Contents[].Key" \
    --output text 2>/dev/null || echo "")

  if [[ -z "$S3_BACKUPS" ]]; then
    err "No backups found in S3"
    exit 1
  fi

  echo ""
  echo "Available S3 backups:"
  echo ""

  S3_KEYS=()
  while IFS= read -r key; do
    if [[ -n "$key" ]]; then
      S3_KEYS+=("$key")
    fi
  done <<< "$(echo "$S3_BACKUPS" | tr '\t' '\n')"

  for i in "${!S3_KEYS[@]}"; do
    printf "  %2d) s3://%s/%s\n" $((i + 1)) "$S3_BUCKET" "${S3_KEYS[$i]}"
  done

  echo ""
  read -r -p "Select S3 backup to restore [1-${#S3_KEYS[@]}]: " s3_sel

  if [[ "$s3_sel" =~ ^[0-9]+$ ]] && [[ "$s3_sel" -ge 1 ]] && [[ "$s3_sel" -le ${#S3_KEYS[@]} ]]; then
    S3_KEY="${S3_KEYS[$((s3_sel - 1))]}"
    LOCAL_TMP="$BACKUP_DIR/$(basename "${S3_KEY}")"

    log "Downloading s3://${S3_BUCKET}/${S3_KEY} ..."
    mkdir -p "$BACKUP_DIR"
    aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "$LOCAL_TMP" --only-show-errors
    log "Downloaded to $LOCAL_TMP"

    restore_dump "$LOCAL_TMP"
  else
    err "Invalid selection"
    exit 1
  fi
else
  err "Invalid selection"
  exit 1
fi
