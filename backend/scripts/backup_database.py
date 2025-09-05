#!/usr/bin/env python3
"""
Database backup script for SQLite database
Supports local backups and cloud storage uploads
"""

import os
import shutil
import sqlite3
import gzip
import boto3
from datetime import datetime, timedelta
from pathlib import Path
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseBackup:
    def __init__(self, db_path: str, backup_dir: str = "./backups"):
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        
        # AWS S3 configuration (optional)
        self.s3_bucket = os.getenv('BACKUP_S3_BUCKET')
        self.s3_client = None
        if self.s3_bucket:
            self.s3_client = boto3.client('s3')
    
    def create_backup(self, compress: bool = True) -> str:
        """Create a backup of the SQLite database"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"handwork_marketplace_backup_{timestamp}.db"
        backup_path = self.backup_dir / backup_filename
        
        try:
            # Create backup using SQLite backup API
            source_conn = sqlite3.connect(str(self.db_path))
            backup_conn = sqlite3.connect(str(backup_path))
            
            source_conn.backup(backup_conn)
            
            source_conn.close()
            backup_conn.close()
            
            logger.info(f"Database backup created: {backup_path}")
            
            # Compress backup if requested
            if compress:
                compressed_path = self._compress_backup(backup_path)
                os.remove(backup_path)  # Remove uncompressed version
                backup_path = compressed_path
            
            # Upload to S3 if configured
            if self.s3_client:
                self._upload_to_s3(backup_path)
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise
    
    def _compress_backup(self, backup_path: Path) -> Path:
        """Compress backup file using gzip"""
        compressed_path = backup_path.with_suffix('.db.gz')
        
        with open(backup_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        logger.info(f"Backup compressed: {compressed_path}")
        return compressed_path
    
    def _upload_to_s3(self, backup_path: Path) -> None:
        """Upload backup to AWS S3"""
        try:
            s3_key = f"database-backups/{backup_path.name}"
            self.s3_client.upload_file(
                str(backup_path), 
                self.s3_bucket, 
                s3_key
            )
            logger.info(f"Backup uploaded to S3: s3://{self.s3_bucket}/{s3_key}")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
    
    def restore_backup(self, backup_path: str) -> None:
        """Restore database from backup"""
        backup_file = Path(backup_path)
        
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
        
        # Create backup of current database before restore
        current_backup = self.create_backup()
        logger.info(f"Current database backed up to: {current_backup}")
        
        try:
            # Handle compressed backups
            if backup_file.suffix == '.gz':
                temp_path = backup_file.with_suffix('')
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(temp_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                backup_file = temp_path
            
            # Restore database
            shutil.copy2(backup_file, self.db_path)
            logger.info(f"Database restored from: {backup_path}")
            
            # Clean up temporary file if created
            if backup_file.suffix != '.gz' and str(backup_file) != backup_path:
                os.remove(backup_file)
                
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise
    
    def cleanup_old_backups(self, days_to_keep: int = 30) -> None:
        """Remove backup files older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        for backup_file in self.backup_dir.glob("handwork_marketplace_backup_*.db*"):
            if backup_file.stat().st_mtime < cutoff_date.timestamp():
                os.remove(backup_file)
                logger.info(f"Removed old backup: {backup_file}")
    
    def list_backups(self) -> list:
        """List available backup files"""
        backups = []
        for backup_file in sorted(self.backup_dir.glob("handwork_marketplace_backup_*.db*")):
            stat = backup_file.stat()
            backups.append({
                'filename': backup_file.name,
                'path': str(backup_file),
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_mtime)
            })
        return backups

def main():
    """Main backup script entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Database backup utility')
    parser.add_argument('--db-path', default='./handwork_marketplace.db', 
                       help='Path to SQLite database')
    parser.add_argument('--backup-dir', default='./backups', 
                       help='Backup directory')
    parser.add_argument('--action', choices=['backup', 'restore', 'list', 'cleanup'], 
                       default='backup', help='Action to perform')
    parser.add_argument('--restore-file', help='Backup file to restore from')
    parser.add_argument('--days-to-keep', type=int, default=30, 
                       help='Days of backups to keep during cleanup')
    parser.add_argument('--compress', action='store_true', default=True,
                       help='Compress backup files')
    
    args = parser.parse_args()
    
    backup_manager = DatabaseBackup(args.db_path, args.backup_dir)
    
    if args.action == 'backup':
        backup_path = backup_manager.create_backup(compress=args.compress)
        print(f"Backup created: {backup_path}")
        
    elif args.action == 'restore':
        if not args.restore_file:
            print("Error: --restore-file is required for restore action")
            return 1
        backup_manager.restore_backup(args.restore_file)
        print(f"Database restored from: {args.restore_file}")
        
    elif args.action == 'list':
        backups = backup_manager.list_backups()
        print("Available backups:")
        for backup in backups:
            print(f"  {backup['filename']} - {backup['created']} ({backup['size']} bytes)")
            
    elif args.action == 'cleanup':
        backup_manager.cleanup_old_backups(args.days_to_keep)
        print(f"Cleaned up backups older than {args.days_to_keep} days")
    
    return 0

if __name__ == '__main__':
    exit(main())