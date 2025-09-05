"""
API response caching system for frequently accessed data.
"""
import json
import hashlib
import time
from typing import Any, Optional, Dict, Callable
from functools import wraps
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class InMemoryCache:
    """Simple in-memory cache implementation."""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        """Check if cache entry is expired."""
        return time.time() > entry['expires_at']
    
    def _cleanup_expired(self):
        """Remove expired entries from cache."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self.cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if self._is_expired(entry):
            del self.cache[key]
            return None
        
        entry['hits'] += 1
        entry['last_accessed'] = time.time()
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache."""
        ttl = ttl or self.default_ttl
        self.cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'created_at': time.time(),
            'last_accessed': time.time(),
            'hits': 0
        }
        
        # Cleanup expired entries periodically
        if len(self.cache) % 100 == 0:
            self._cleanup_expired()
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if key in self.cache:
            del self.cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        self._cleanup_expired()
        total_hits = sum(entry['hits'] for entry in self.cache.values())
        return {
            'total_entries': len(self.cache),
            'total_hits': total_hits,
            'memory_usage_estimate': len(str(self.cache)),
            'oldest_entry': min(
                (entry['created_at'] for entry in self.cache.values()),
                default=None
            )
        }

# Global cache instance
cache = InMemoryCache()

class CacheManager:
    """Cache management utilities."""
    
    @staticmethod
    def generate_cache_key(*args, **kwargs) -> str:
        """Generate cache key from function arguments."""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @staticmethod
    def cached_response(ttl: int = 300, key_prefix: str = ""):
        """Decorator for caching API responses."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{key_prefix}:{func.__name__}:{CacheManager.generate_cache_key(*args, **kwargs)}"
                
                # Try to get from cache
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached_result
                
                # Execute function and cache result
                try:
                    result = await func(*args, **kwargs)
                    cache.set(cache_key, result, ttl)
                    logger.debug(f"Cache miss for {func.__name__}, result cached")
                    return result
                except Exception as e:
                    logger.error(f"Error in cached function {func.__name__}: {e}")
                    raise
            
            return wrapper
        return decorator
    
    @staticmethod
    def invalidate_pattern(pattern: str):
        """Invalidate cache entries matching pattern."""
        keys_to_delete = [
            key for key in cache.cache.keys()
            if pattern in key
        ]
        for key in keys_to_delete:
            cache.delete(key)
        logger.info(f"Invalidated {len(keys_to_delete)} cache entries matching pattern: {pattern}")
    
    @staticmethod
    def warm_cache():
        """Pre-populate cache with frequently accessed data."""
        # This would be called during application startup
        logger.info("Cache warming initiated")

class CacheInvalidationManager:
    """Manages cache invalidation based on data changes."""
    
    @staticmethod
    def invalidate_user_cache(user_id: int):
        """Invalidate all cache entries related to a user."""
        patterns = [
            f"user:{user_id}",
            f"profile:{user_id}",
            f"jobs:user:{user_id}",
            f"messages:user:{user_id}"
        ]
        for pattern in patterns:
            CacheManager.invalidate_pattern(pattern)
    
    @staticmethod
    def invalidate_job_cache(job_id: int):
        """Invalidate all cache entries related to a job."""
        patterns = [
            f"job:{job_id}",
            f"jobs:category:",
            f"jobs:location:",
            f"recommendations:"
        ]
        for pattern in patterns:
            CacheManager.invalidate_pattern(pattern)
    
    @staticmethod
    def invalidate_worker_cache(worker_id: int):
        """Invalidate all cache entries related to a worker."""
        patterns = [
            f"worker:{worker_id}",
            f"recommendations:",
            f"workers:category:"
        ]
        for pattern in patterns:
            CacheManager.invalidate_pattern(pattern)

# Cached query functions
class CachedQueries:
    """Cached versions of frequently accessed queries."""
    
    @staticmethod
    @CacheManager.cached_response(ttl=600, key_prefix="categories")
    async def get_job_categories():
        """Get all job categories (cached for 10 minutes)."""
        # This would typically query the database
        return [
            "plumbing", "electrical", "construction", "cleaning",
            "landscaping", "painting", "carpentry", "hvac"
        ]
    
    @staticmethod
    @CacheManager.cached_response(ttl=300, key_prefix="stats")
    async def get_platform_stats():
        """Get platform statistics (cached for 5 minutes)."""
        from app.db.database import get_db
        from app.db.models import User, Job, Booking
        
        db = next(get_db())
        try:
            stats = {
                'total_users': db.query(User).filter(User.is_active == True).count(),
                'total_jobs': db.query(Job).count(),
                'completed_bookings': db.query(Booking).filter(Booking.status == "completed").count(),
                'active_jobs': db.query(Job).filter(Job.status == "open").count()
            }
            return stats
        finally:
            db.close()
    
    @staticmethod
    @CacheManager.cached_response(ttl=1800, key_prefix="locations")
    async def get_popular_locations():
        """Get popular job locations (cached for 30 minutes)."""
        from app.db.database import get_db
        from app.db.models import Job
        from sqlalchemy import func
        
        db = next(get_db())
        try:
            locations = db.query(
                Job.location,
                func.count(Job.id).label('job_count')
            ).group_by(Job.location).order_by(
                func.count(Job.id).desc()
            ).limit(20).all()
            
            return [{'location': loc.location, 'count': loc.job_count} for loc in locations]
        finally:
            db.close()

def setup_cache_monitoring():
    """Setup cache monitoring and cleanup tasks."""
    import asyncio
    
    async def cache_cleanup_task():
        """Periodic cache cleanup task."""
        while True:
            try:
                cache._cleanup_expired()
                stats = cache.get_stats()
                logger.info(f"Cache stats: {stats}")
                await asyncio.sleep(300)  # Run every 5 minutes
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute
    
    return cache_cleanup_task