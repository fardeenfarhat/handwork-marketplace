"""
Database optimization utilities and query performance enhancements.
"""
from sqlalchemy import text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """Database query optimization utilities."""
    
    @staticmethod
    def enable_sqlite_optimizations(engine: Engine):
        """Enable SQLite-specific optimizations."""
        
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            # Enable WAL mode for better concurrency
            cursor.execute("PRAGMA journal_mode=WAL")
            # Increase cache size (in KB)
            cursor.execute("PRAGMA cache_size=10000")
            # Enable foreign key constraints
            cursor.execute("PRAGMA foreign_keys=ON")
            # Optimize synchronous mode
            cursor.execute("PRAGMA synchronous=NORMAL")
            # Set temp store to memory
            cursor.execute("PRAGMA temp_store=MEMORY")
            # Optimize page size
            cursor.execute("PRAGMA page_size=4096")
            cursor.close()
    
    @staticmethod
    def analyze_database(db: Session):
        """Run ANALYZE to update SQLite statistics."""
        try:
            db.execute(text("ANALYZE"))
            db.commit()
            logger.info("Database analysis completed")
        except Exception as e:
            logger.error(f"Database analysis failed: {e}")
            db.rollback()
    
    @staticmethod
    def vacuum_database(db: Session):
        """Vacuum database to reclaim space and optimize."""
        try:
            db.execute(text("VACUUM"))
            db.commit()
            logger.info("Database vacuum completed")
        except Exception as e:
            logger.error(f"Database vacuum failed: {e}")
            db.rollback()

class QueryProfiler:
    """Query performance profiling and monitoring."""
    
    def __init__(self):
        self.slow_queries: List[Dict[str, Any]] = []
        self.query_stats: Dict[str, Dict[str, Any]] = {}
    
    def profile_query(self, query_name: str):
        """Decorator to profile query execution time."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Track query statistics
                    if query_name not in self.query_stats:
                        self.query_stats[query_name] = {
                            'count': 0,
                            'total_time': 0,
                            'avg_time': 0,
                            'max_time': 0,
                            'min_time': float('inf')
                        }
                    
                    stats = self.query_stats[query_name]
                    stats['count'] += 1
                    stats['total_time'] += execution_time
                    stats['avg_time'] = stats['total_time'] / stats['count']
                    stats['max_time'] = max(stats['max_time'], execution_time)
                    stats['min_time'] = min(stats['min_time'], execution_time)
                    
                    # Log slow queries (> 1 second)
                    if execution_time > 1.0:
                        slow_query = {
                            'query_name': query_name,
                            'execution_time': execution_time,
                            'timestamp': time.time(),
                            'args': str(args)[:200],  # Truncate for logging
                            'kwargs': str(kwargs)[:200]
                        }
                        self.slow_queries.append(slow_query)
                        logger.warning(f"Slow query detected: {query_name} took {execution_time:.2f}s")
                    
                    return result
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(f"Query {query_name} failed after {execution_time:.2f}s: {e}")
                    raise
            return wrapper
        return decorator
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report."""
        return {
            'query_stats': self.query_stats,
            'slow_queries': self.slow_queries[-50:],  # Last 50 slow queries
            'total_queries': sum(stats['count'] for stats in self.query_stats.values()),
            'avg_query_time': sum(stats['avg_time'] for stats in self.query_stats.values()) / len(self.query_stats) if self.query_stats else 0
        }

# Global query profiler instance
query_profiler = QueryProfiler()

class OptimizedQueries:
    """Collection of optimized database queries."""
    
    @staticmethod
    @query_profiler.profile_query("get_jobs_with_filters")
    def get_jobs_with_filters(
        db: Session,
        category: Optional[str] = None,
        location: Optional[str] = None,
        budget_min: Optional[float] = None,
        budget_max: Optional[float] = None,
        status: str = "open",
        limit: int = 20,
        offset: int = 0
    ):
        """Optimized job search with filters."""
        from app.db.models import Job, ClientProfile, User
        
        query = db.query(Job).join(ClientProfile).join(User)
        
        # Apply filters with proper indexing
        if category:
            query = query.filter(Job.category == category)
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))
        if budget_min:
            query = query.filter(Job.budget_min >= budget_min)
        if budget_max:
            query = query.filter(Job.budget_max <= budget_max)
        
        query = query.filter(Job.status == status)
        
        # Order by created_at for consistent pagination
        query = query.order_by(Job.created_at.desc())
        
        # Apply pagination
        return query.offset(offset).limit(limit).all()
    
    @staticmethod
    @query_profiler.profile_query("get_worker_recommendations")
    def get_worker_recommendations(
        db: Session,
        job_category: str,
        location: Optional[str] = None,
        min_rating: float = 0.0,
        limit: int = 10
    ):
        """Optimized worker recommendation query."""
        from app.db.models import WorkerProfile, User
        
        query = db.query(WorkerProfile).join(User)
        
        # Filter by service categories (JSON contains)
        query = query.filter(WorkerProfile.service_categories.contains([job_category]))
        
        # Filter by KYC status and user verification
        query = query.filter(WorkerProfile.kyc_status == "approved")
        query = query.filter(User.is_verified == True)
        query = query.filter(User.is_active == True)
        
        # Filter by rating
        if min_rating > 0:
            query = query.filter(WorkerProfile.rating >= min_rating)
        
        # Filter by location if provided
        if location:
            query = query.filter(WorkerProfile.location.ilike(f"%{location}%"))
        
        # Order by rating and total jobs
        query = query.order_by(
            WorkerProfile.rating.desc(),
            WorkerProfile.total_jobs.desc()
        )
        
        return query.limit(limit).all()
    
    @staticmethod
    @query_profiler.profile_query("get_user_conversations")
    def get_user_conversations(db: Session, user_id: int, limit: int = 20):
        """Optimized query to get user conversations."""
        from app.db.models import Message, User
        from sqlalchemy import or_, and_, func
        
        # Subquery to get latest message for each conversation
        latest_messages = db.query(
            func.max(Message.id).label('latest_id'),
            func.case(
                (Message.sender_id == user_id, Message.receiver_id),
                else_=Message.sender_id
            ).label('other_user_id')
        ).filter(
            or_(Message.sender_id == user_id, Message.receiver_id == user_id)
        ).group_by('other_user_id').subquery()
        
        # Get conversations with latest message details
        conversations = db.query(
            Message,
            User
        ).join(
            latest_messages, Message.id == latest_messages.c.latest_id
        ).join(
            User, User.id == latest_messages.c.other_user_id
        ).order_by(
            Message.created_at.desc()
        ).limit(limit).all()
        
        return conversations

def setup_database_optimizations(engine: Engine):
    """Setup all database optimizations."""
    QueryOptimizer.enable_sqlite_optimizations(engine)
    logger.info("Database optimizations enabled")