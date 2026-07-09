#!/bin/bash
# SQLite DB daily automatic backup utility with rotation rules

DB_FILE="/data/data/com.termux/files/home/project/DeepaBMS/apps/backend/deepa-bms.db"
BACKUP_DIR="/data/data/com.termux/files/home/project/DeepaBMS/apps/backend/backups"
DATE=$(date +"%Y-%m-%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/deepa-bms_$DATE.db"
    gzip "$BACKUP_DIR/deepa-bms_$DATE.db"
    echo "SQLite backup completed successfully: deepa-bms_$DATE.db.gz"
    
    # Retention limit: Keep only last 7 daily snapshots
    find "$BACKUP_DIR" -name "*.db.gz" -mtime +7 -delete
    echo "Old backups cleaned up (retention limit: 7 days)."
else
    echo "Error: Database file not found at $DB_FILE. Backup skipped."
    exit 1
fi
