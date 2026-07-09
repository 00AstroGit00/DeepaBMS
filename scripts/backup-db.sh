#!/bin/bash
# Deepa BMS - Linux/Termux Database Backup Script
# This script copies the SQLite database file to a backup folder with a timestamp
# and removes files older than 30 days to save disk space.

DB_FILE="../apps/backend/deepa-bms.db"
BACKUP_DIR="../backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
BACKUP_FILE="$BACKUP_DIR/deepa-bms-backup-$TIMESTAMP.db"

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "[$(date)] Database backup created successfully: $BACKUP_FILE"
        
        # Delete backups older than 30 days
        find "$BACKUP_DIR" -name "deepa-bms-backup-*.db" -type f -mtime +30 -delete
    else
        echo "[ERROR] Failed to copy database file."
    fi
else
    echo "[ERROR] Database file not found at $DB_FILE. Make sure the server has run at least once."
fi
