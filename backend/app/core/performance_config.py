"""
Performance optimization configuration and setup.
"""
from app.core.config import settings

# Database optimization settings
DATABASE_OPTIMIZATION = {
    'enable_query_profiling': True,
    'slow_query_threshold': 1.0,  # seconds
    'enable_connection_pooling': True,
    'pool_size': 20,
    'max_overflow': 30,
    'pool_timeout': 30,
    'pool_recycle': 3600,
}

# Cache configuration
CACHE_CONFIG = {
    'default_ttl': 300,  # 5 minutes
    'max_entries': 10000,
    'cleanup_interval': 300,  # 5 minutes
    'enable_compression': True,
}

# Background job configuration
BACKGROUND_JOBS_CONFIG = {
    'max_workers': 4,
    'max_retries': 3,
    'retry_delay_base': 10,  # seconds
    'max_retry_delay': 300,  # 5 minutes
    'job_timeout': 3600,  # 1 hour
}

# Image optimization settings
IMAGE_OPTIMIZATION = {
    'max_upload_size': 10 * 1024 * 1024,  # 10MB
    'thumbnail_size': (150, 150),
    'profile_image_size': (300, 300),
    'portfolio_image_size': (800, 600),
    'compression_quality': 85,
    'enable_progressive_jpeg': True,
}

# Monitoring configuration
MONITORING_CONFIG = {
    'metrics_retention_hours': 24,
    'alert_thresholds': {
        'cpu_percent': 80.0,
        'memory_percent': 85.0,
        'disk_percent': 90.0,
        'error_rate_percent': 5.0,
        'avg_response_time_ms': 2000.0,
    },
    'health_check_interval': 60,  # seconds
    'metrics_collection_interval': 60,  # seconds
}

# API rate limiting
RATE_LIMITING = {
    'requests_per_minute': 100,
    'burst_limit': 200,
    'enable_per_user_limits': True,
    'premium_user_multiplier': 5,
}

def get_performance_config():
    """Get complete performance configuration."""
    return {
        'database': DATABASE_OPTIMIZATION,
        'cache': CACHE_CONFIG,
        'background_jobs': BACKGROUND_JOBS_CONFIG,
        'image_optimization': IMAGE_OPTIMIZATION,
        'monitoring': MONITORING_CONFIG,
        'rate_limiting': RATE_LIMITING,
    }