#!/usr/bin/env python3
"""
Database migration management script
Handles schema migrations and data transformations
"""

import os
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MigrationManager:
    def __init__(self, db_path: str, migrations_dir: str = "./migrations"):
        self.db_path = Path(db_path)
        self.migrations_dir = Path(migrations_dir)
        self.migrations_dir.mkdir(exist_ok=True)
        
        # Ensure migrations table exists
        self._create_migrations_table()
    
    def _create_migrations_table(self):
        """Create migrations tracking table"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    checksum TEXT
                )
            """)
            conn.commit()
    
    def create_migration(self, name: str) -> str:
        """Create a new migration file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version = timestamp
        filename = f"{version}_{name.replace(' ', '_').lower()}.sql"
        migration_path = self.migrations_dir / filename
        
        template = f"""-- Migration: {name}
-- Version: {version}
-- Created: {datetime.now().isoformat()}

-- Up migration
-- Add your schema changes here

-- Example:
-- CREATE TABLE new_table (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     name TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE existing_table ADD COLUMN new_column TEXT;

-- Down migration (for rollback)
-- Add rollback statements here

-- Example:
-- DROP TABLE new_table;
-- ALTER TABLE existing_table DROP COLUMN new_column;
"""
        
        with open(migration_path, 'w') as f:
            f.write(template)
        
        logger.info(f"Migration created: {migration_path}")
        return str(migration_path)
    
    def get_pending_migrations(self) -> List[Dict[str, Any]]:
        """Get list of pending migrations"""
        applied_versions = set()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT version FROM schema_migrations")
            applied_versions = {row[0] for row in cursor.fetchall()}
        
        pending = []
        for migration_file in sorted(self.migrations_dir.glob("*.sql")):
            version = migration_file.stem.split('_')[0]
            if version not in applied_versions:
                pending.append({
                    'version': version,
                    'name': migration_file.stem,
                    'path': str(migration_file)
                })
        
        return pending
    
    def apply_migration(self, migration_path: str) -> None:
        """Apply a single migration"""
        migration_file = Path(migration_path)
        version = migration_file.stem.split('_')[0]
        name = migration_file.stem
        
        logger.info(f"Applying migration: {name}")
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Extract up migration (everything before "-- Down migration")
        up_sql = migration_sql.split('-- Down migration')[0]
        
        # Calculate checksum
        import hashlib
        checksum = hashlib.md5(migration_sql.encode()).hexdigest()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Execute migration
                conn.executescript(up_sql)
                
                # Record migration
                conn.execute("""
                    INSERT INTO schema_migrations (version, name, checksum)
                    VALUES (?, ?, ?)
                """, (version, name, checksum))
                
                conn.commit()
                logger.info(f"Migration applied successfully: {name}")
                
        except Exception as e:
            logger.error(f"Migration failed: {name} - {e}")
            raise
    
    def rollback_migration(self, version: str) -> None:
        """Rollback a specific migration"""
        # Find migration file
        migration_files = list(self.migrations_dir.glob(f"{version}_*.sql"))
        if not migration_files:
            raise FileNotFoundError(f"Migration file not found for version: {version}")
        
        migration_file = migration_files[0]
        name = migration_file.stem
        
        logger.info(f"Rolling back migration: {name}")
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Extract down migration
        parts = migration_sql.split('-- Down migration')
        if len(parts) < 2:
            raise ValueError(f"No rollback script found in migration: {name}")
        
        down_sql = parts[1]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Execute rollback
                conn.executescript(down_sql)
                
                # Remove migration record
                conn.execute("DELETE FROM schema_migrations WHERE version = ?", (version,))
                
                conn.commit()
                logger.info(f"Migration rolled back successfully: {name}")
                
        except Exception as e:
            logger.error(f"Rollback failed: {name} - {e}")
            raise
    
    def migrate_up(self) -> None:
        """Apply all pending migrations"""
        pending = self.get_pending_migrations()
        
        if not pending:
            logger.info("No pending migrations")
            return
        
        logger.info(f"Applying {len(pending)} pending migrations")
        
        for migration in pending:
            self.apply_migration(migration['path'])
        
        logger.info("All migrations applied successfully")
    
    def get_migration_status(self) -> Dict[str, Any]:
        """Get current migration status"""
        applied = []
        pending = self.get_pending_migrations()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT version, name, applied_at, checksum 
                FROM schema_migrations 
                ORDER BY applied_at
            """)
            applied = [
                {
                    'version': row[0],
                    'name': row[1],
                    'applied_at': row[2],
                    'checksum': row[3]
                }
                for row in cursor.fetchall()
            ]
        
        return {
            'applied': applied,
            'pending': pending,
            'total_applied': len(applied),
            'total_pending': len(pending)
        }
    
    def validate_migrations(self) -> bool:
        """Validate migration integrity"""
        logger.info("Validating migration integrity...")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT version, name, checksum FROM schema_migrations")
            applied_migrations = cursor.fetchall()
        
        valid = True
        for version, name, stored_checksum in applied_migrations:
            # Find migration file
            migration_files = list(self.migrations_dir.glob(f"{version}_*.sql"))
            if not migration_files:
                logger.error(f"Migration file missing for applied migration: {name}")
                valid = False
                continue
            
            # Calculate current checksum
            with open(migration_files[0], 'r') as f:
                content = f.read()
            
            import hashlib
            current_checksum = hashlib.md5(content.encode()).hexdigest()
            
            if current_checksum != stored_checksum:
                logger.error(f"Migration checksum mismatch: {name}")
                valid = False
        
        if valid:
            logger.info("All migrations are valid")
        
        return valid

def main():
    """Main migration script entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Database migration utility')
    parser.add_argument('--db-path', default='./handwork_marketplace.db',
                       help='Path to SQLite database')
    parser.add_argument('--migrations-dir', default='./migrations',
                       help='Migrations directory')
    parser.add_argument('--action', 
                       choices=['create', 'migrate', 'rollback', 'status', 'validate'],
                       required=True, help='Action to perform')
    parser.add_argument('--name', help='Migration name (for create action)')
    parser.add_argument('--version', help='Migration version (for rollback action)')
    
    args = parser.parse_args()
    
    manager = MigrationManager(args.db_path, args.migrations_dir)
    
    if args.action == 'create':
        if not args.name:
            print("Error: --name is required for create action")
            return 1
        migration_path = manager.create_migration(args.name)
        print(f"Migration created: {migration_path}")
        
    elif args.action == 'migrate':
        manager.migrate_up()
        
    elif args.action == 'rollback':
        if not args.version:
            print("Error: --version is required for rollback action")
            return 1
        manager.rollback_migration(args.version)
        
    elif args.action == 'status':
        status = manager.get_migration_status()
        print(f"Applied migrations: {status['total_applied']}")
        print(f"Pending migrations: {status['total_pending']}")
        
        if status['pending']:
            print("\nPending migrations:")
            for migration in status['pending']:
                print(f"  {migration['version']} - {migration['name']}")
                
    elif args.action == 'validate':
        if manager.validate_migrations():
            print("All migrations are valid")
            return 0
        else:
            print("Migration validation failed")
            return 1
    
    return 0

if __name__ == '__main__':
    exit(main())