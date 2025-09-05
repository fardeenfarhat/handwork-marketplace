"""
Login endpoint optimization utilities
"""
import time
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.models import User
from app.core.config import settings

logger = logging.getLogger(__name__)

class LoginPerformanceMonitor:
    """Monitor and log login performance metrics"""
    
    def __init__(self):
        self.slow_query_threshold = 1.0  # 1 second
        self.slow_login_threshold = 3.0  # 3 seconds
    
    def log_query_performance(self, operation: str, duration: float, user_email: str = None):
        """Log database query performance"""
        if duration > self.slow_query_threshold:
            logger.warning(
                f"Slow {operation}: {duration:.3f}s for {user_email or 'unknown'}"
            )
        else:
            logger.debug(
                f"{operation} completed in {duration:.3f}s for {user_email or 'unknown'}"
            )
    
    def log_login_performance(self, total_duration: float, user_id: int = None, 
                            breakdown: dict = None):
        """Log overall login performance with breakdown"""
        if total_duration > self.slow_login_threshold:
            logger.warning(
                f"Slow login: {total_duration:.3f}s for user {user_id}. "
                f"Breakdown: {breakdown or {}}"
            )
        else:
            logger.info(
                f"Login completed in {total_duration:.3f}s for user {user_id}"
            )

def optimize_database_connection(db: Session):
    """Apply database optimizations for login queries"""
    try:
        # Set query timeout for this session
        if settings.DATABASE_URL.startswith("postgresql"):
            db.execute(text(f"SET statement_timeout = '{settings.DB_QUERY_TIMEOUT}s'"))
        elif settings.DATABASE_URL.startswith("mysql"):
            db.execute(text(f"SET SESSION max_execution_time = {settings.DB_QUERY_TIMEOUT * 1000}"))
        # SQLite doesn't support query timeouts at session level
        
    except Exception as e:
        logger.warning(f"Could not set database timeout: {e}")

def get_user_for_authentication(db: Session, email: str) -> Optional[User]:
    """Optimized user lookup for authentication with performance monitoring"""
    monitor = LoginPerformanceMonitor()
    
    start_time = time.time()
    try:
        # Apply database optimizations
        optimize_database_connection(db)
        
        # Execute optimized query
        user = db.query(User).filter(User.email == email).first()
        
        duration = time.time() - start_time
        monitor.log_query_performance("user_lookup", duration, email)
        
        return user
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Database error during user lookup for {email} after {duration:.3f}s: {e}")
        raise

# Global performance monitor instance
login_monitor = LoginPerformanceMonitor()