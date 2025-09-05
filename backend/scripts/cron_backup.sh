#!/bin/bash
# Automated backup script for cron jobs
# Add to crontab: 0 2 * * * /path/to/cron_backup.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/handwork_marketplace.db"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/backup.log"
PYTHON_ENV="$PROJECT_DIR/.venv/bin/python"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send notification (optional)
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send to Slack if webhook URL is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Database Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Send email if configured
    if [ -n "$BACKUP_EMAIL" ]; then
        echo "$message" | mail -s "Database Backup $status" "$BACKUP_EMAIL" || true
    fi
}

# Main backup process
main() {
    log "Starting automated database backup"
    
    # Check if database exists
    if [ ! -f "$DB_PATH" ]; then
        log "ERROR: Database file not found: $DB_PATH"
        send_notification "FAILED" "Database file not found: $DB_PATH"
        exit 1
    fi
    
    # Check if Python environment exists
    if [ ! -f "$PYTHON_ENV" ]; then
        log "WARNING: Python virtual environment not found, using system python"
        PYTHON_ENV="python3"
    fi
    
    # Create backup
    if $PYTHON_ENV "$SCRIPT_DIR/backup_database.py" \
        --db-path "$DB_PATH" \
        --backup-dir "$BACKUP_DIR" \
        --action backup \
        --compress >> "$LOG_FILE" 2>&1; then
        
        log "Backup completed successfully"
        
        # Cleanup old backups (keep 30 days by default)
        if $PYTHON_ENV "$SCRIPT_DIR/backup_database.py" \
            --db-path "$DB_PATH" \
            --backup-dir "$BACKUP_DIR" \
            --action cleanup \
            --days-to-keep "${BACKUP_RETENTION_DAYS:-30}" >> "$LOG_FILE" 2>&1; then
            
            log "Old backups cleaned up successfully"
        else
            log "WARNING: Failed to cleanup old backups"
        fi
        
        # Get backup info
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "handwork_marketplace_backup_*.db*" | wc -l)
        LATEST_BACKUP=$(find "$BACKUP_DIR" -name "handwork_marketplace_backup_*.db*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        
        send_notification "SUCCESS" "Backup completed. Size: $BACKUP_SIZE, Total backups: $BACKUP_COUNT"
        
    else
        log "ERROR: Backup failed"
        send_notification "FAILED" "Backup process failed. Check logs for details."
        exit 1
    fi
    
    log "Backup process completed"
}

# Run main function
main "$@"