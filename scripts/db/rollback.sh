#!/data/data/com.termux/files/usr/bin/bash
# Production Deployment Rollback and Safety Recovery Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

DB_FILE="$PROJECT_DIR/apps/backend/deepa-bms.db"
BACKUP_DIR="$PROJECT_DIR/apps/backend/backups"

log_info "Starting database and deployment rollback utility..."

# Check command line arguments for a specific backup file
SELECTED_BACKUP=""
if [ $# -gt 0 ]; then
    if [ -f "$1" ]; then
        SELECTED_BACKUP="$1"
    elif [ -f "$BACKUP_DIR/$1" ]; then
        SELECTED_BACKUP="$BACKUP_DIR/$1"
    else
        log_error "Specified backup file '$1' not found."
        exit 1
    fi
else
    # Automatically pick the latest gzipped backup
    log_info "No backup file specified. Searching for the latest backup in $BACKUP_DIR..."
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "deepa-bms-backup-*.db.gz" -type f | sort | tail -n 1)
    if [ -n "$LATEST_BACKUP" ]; then
        SELECTED_BACKUP="$LATEST_BACKUP"
    fi
fi

if [ -n "$SELECTED_BACKUP" ]; then
    log_info "Found backup file: $SELECTED_BACKUP"
    log_warn "This will overwrite the current database file: $DB_FILE"
    
    # Pre-backup of the current database before rollback (just in case)
    if [ -f "$DB_FILE" ]; then
        PRE_ROLLBACK_BACKUP="$BACKUP_DIR/pre-rollback-$(date +"%Y-%m-%d-%H%M").db.gz"
        log_info "Backing up current database to $PRE_ROLLBACK_BACKUP before restoring..."
        gzip -c "$DB_FILE" > "$PRE_ROLLBACK_BACKUP"
    fi
    
    log_info "Restoring database from backup..."
    if gunzip -c "$SELECTED_BACKUP" > "$DB_FILE"; then
        log_info "✓ Database successfully restored from $SELECTED_BACKUP."
    else
        log_error "Failed to restore database from backup."
        exit 1
    fi
else
    log_warn "No backups found to automatically restore."
fi

# Print manual instructions for git/code rollback
log_info "--------------------------------------------------------"
log_info "Manual Reversion Reference for Code / Branches:"
log_info "--------------------------------------------------------"
echo "1. Revert to the last stable release tag:"
echo "   git checkout v1.0.0"
echo ""
echo "2. Revert the last merge/commit on main branch:"
echo "   git revert -m 1 HEAD"
echo ""
echo "3. Redeploy the stable build version:"
echo "   - Web hosting: deploy static dist from stable tags"
echo "   - Android APK: re-submit last compiled signed APK"
log_info "--------------------------------------------------------"
