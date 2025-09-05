"""
Health check and monitoring endpoints
Provides comprehensive system health information
"""

import os
import time
import psutil
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import asyncio
import aiohttp

router = APIRouter()

class HealthStatus(BaseModel):
    status: str
    timestamp: datetime
    version: str
    environment: str
    uptime: float
    checks: Dict[str, Any]

class SystemMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    active_connections: int
    response_time_ms: float

class DatabaseHealth(BaseModel):
    status: str
    connection_time_ms: float
    total_tables: int
    total_records: int
    last_backup: str = None

class ExternalServiceHealth(BaseModel):
    service: str
    status: str
    response_time_ms: float
    last_check: datetime

# Global variables for tracking
app_start_time = time.time()
health_checks_cache = {}
cache_ttl = 60  # Cache health checks for 60 seconds

async def check_database_health() -> DatabaseHealth:
    """Check database connectivity and basic metrics"""
    start_time = time.time()
    
    try:
        db_path = os.getenv('DATABASE_URL', 'sqlite:///./handwork_marketplace.db').replace('sqlite:///', '')
        
        with sqlite3.connect(db_path) as conn:
            # Test connection
            cursor = conn.execute("SELECT 1")
            cursor.fetchone()
            
            # Get table count
            cursor = conn.execute("""
                SELECT COUNT(*) FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """)
            table_count = cursor.fetchone()[0]
            
            # Get approximate record count (from main tables)
            total_records = 0
            main_tables = ['users', 'jobs', 'bookings', 'messages', 'reviews']
            for table in main_tables:
                try:
                    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                    total_records += cursor.fetchone()[0]
                except sqlite3.OperationalError:
                    # Table might not exist yet
                    pass
            
            # Check for recent backups
            backup_dir = "./backups"
            last_backup = None
            if os.path.exists(backup_dir):
                backup_files = [f for f in os.listdir(backup_dir) if f.startswith('handwork_marketplace_backup_')]
                if backup_files:
                    latest_backup = max(backup_files, key=lambda x: os.path.getctime(os.path.join(backup_dir, x)))
                    backup_time = datetime.fromtimestamp(os.path.getctime(os.path.join(backup_dir, latest_backup)))
                    last_backup = backup_time.isoformat()
        
        connection_time = (time.time() - start_time) * 1000
        
        return DatabaseHealth(
            status="healthy",
            connection_time_ms=round(connection_time, 2),
            total_tables=table_count,
            total_records=total_records,
            last_backup=last_backup
        )
        
    except Exception as e:
        connection_time = (time.time() - start_time) * 1000
        return DatabaseHealth(
            status=f"unhealthy: {str(e)}",
            connection_time_ms=round(connection_time, 2),
            total_tables=0,
            total_records=0
        )

async def check_external_service(service_name: str, url: str, timeout: int = 5) -> ExternalServiceHealth:
    """Check external service health"""
    start_time = time.time()
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(url) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    status = "healthy"
                else:
                    status = f"unhealthy: HTTP {response.status}"
                
                return ExternalServiceHealth(
                    service=service_name,
                    status=status,
                    response_time_ms=round(response_time, 2),
                    last_check=datetime.now()
                )
                
    except asyncio.TimeoutError:
        response_time = timeout * 1000
        return ExternalServiceHealth(
            service=service_name,
            status="unhealthy: timeout",
            response_time_ms=response_time,
            last_check=datetime.now()
        )
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        return ExternalServiceHealth(
            service=service_name,
            status=f"unhealthy: {str(e)}",
            response_time_ms=round(response_time, 2),
            last_check=datetime.now()
        )

def get_system_metrics() -> SystemMetrics:
    """Get current system metrics"""
    start_time = time.time()
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=0.1)
    
    # Memory usage
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    # Disk usage
    disk = psutil.disk_usage('/')
    disk_percent = (disk.used / disk.total) * 100
    
    # Network connections (approximate active connections)
    connections = psutil.net_connections()
    active_connections = len([c for c in connections if c.status == 'ESTABLISHED'])
    
    # Response time for this check
    response_time = (time.time() - start_time) * 1000
    
    return SystemMetrics(
        cpu_percent=round(cpu_percent, 2),
        memory_percent=round(memory_percent, 2),
        disk_percent=round(disk_percent, 2),
        active_connections=active_connections,
        response_time_ms=round(response_time, 2)
    )

@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Basic health check endpoint"""
    current_time = time.time()
    
    # Check cache first
    if 'basic_health' in health_checks_cache:
        cached_data, cache_time = health_checks_cache['basic_health']
        if current_time - cache_time < cache_ttl:
            return cached_data
    
    # Perform health checks
    uptime = current_time - app_start_time
    
    checks = {
        "database": "checking...",
        "system": "checking...",
        "external_services": "checking..."
    }
    
    # Quick database check
    try:
        db_health = await check_database_health()
        checks["database"] = {
            "status": db_health.status,
            "response_time_ms": db_health.connection_time_ms
        }
    except Exception as e:
        checks["database"] = {"status": f"error: {str(e)}"}
    
    # System metrics
    try:
        system_metrics = get_system_metrics()
        checks["system"] = {
            "status": "healthy",
            "cpu_percent": system_metrics.cpu_percent,
            "memory_percent": system_metrics.memory_percent,
            "disk_percent": system_metrics.disk_percent
        }
    except Exception as e:
        checks["system"] = {"status": f"error: {str(e)}"}
    
    # Determine overall status
    overall_status = "healthy"
    if any("unhealthy" in str(check) or "error" in str(check) for check in checks.values()):
        overall_status = "degraded"
    
    health_status = HealthStatus(
        status=overall_status,
        timestamp=datetime.now(),
        version=os.getenv('APP_VERSION', '1.0.0'),
        environment=os.getenv('ENVIRONMENT', 'development'),
        uptime=round(uptime, 2),
        checks=checks
    )
    
    # Cache the result
    health_checks_cache['basic_health'] = (health_status, current_time)
    
    return health_status

@router.get("/health/detailed", response_model=Dict[str, Any])
async def detailed_health_check():
    """Detailed health check with comprehensive metrics"""
    current_time = time.time()
    
    # Check cache first
    if 'detailed_health' in health_checks_cache:
        cached_data, cache_time = health_checks_cache['detailed_health']
        if current_time - cache_time < cache_ttl:
            return cached_data
    
    uptime = current_time - app_start_time
    
    # Database health
    db_health = await check_database_health()
    
    # System metrics
    system_metrics = get_system_metrics()
    
    # External services health
    external_services = []
    
    # Check Stripe API
    if os.getenv('STRIPE_SECRET_KEY'):
        stripe_health = await check_external_service(
            "stripe", 
            "https://api.stripe.com/v1/account",
            timeout=10
        )
        external_services.append(stripe_health)
    
    # Check PayPal API
    if os.getenv('PAYPAL_CLIENT_ID'):
        paypal_health = await check_external_service(
            "paypal", 
            "https://api.paypal.com/v1/oauth2/token",
            timeout=10
        )
        external_services.append(paypal_health)
    
    # Check Firebase FCM
    if os.getenv('FIREBASE_SERVER_KEY'):
        fcm_health = await check_external_service(
            "firebase_fcm", 
            "https://fcm.googleapis.com/fcm/send",
            timeout=10
        )
        external_services.append(fcm_health)
    
    # Application metrics
    app_metrics = {
        "uptime_seconds": round(uptime, 2),
        "uptime_human": str(timedelta(seconds=int(uptime))),
        "environment": os.getenv('ENVIRONMENT', 'development'),
        "version": os.getenv('APP_VERSION', '1.0.0'),
        "python_version": os.sys.version,
        "process_id": os.getpid()
    }
    
    # Determine overall status
    overall_status = "healthy"
    
    if db_health.status != "healthy":
        overall_status = "unhealthy"
    elif system_metrics.cpu_percent > 90 or system_metrics.memory_percent > 90:
        overall_status = "degraded"
    elif any(service.status != "healthy" for service in external_services):
        overall_status = "degraded"
    
    detailed_health = {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "application": app_metrics,
        "database": db_health.dict(),
        "system": system_metrics.dict(),
        "external_services": [service.dict() for service in external_services]
    }
    
    # Cache the result
    health_checks_cache['detailed_health'] = (detailed_health, current_time)
    
    return detailed_health

@router.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe endpoint"""
    try:
        # Check critical dependencies
        db_health = await check_database_health()
        
        if db_health.status == "healthy":
            return {"status": "ready", "timestamp": datetime.now().isoformat()}
        else:
            raise HTTPException(status_code=503, detail="Database not ready")
            
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat(),
        "uptime": round(time.time() - app_start_time, 2)
    }

@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint"""
    try:
        system_metrics = get_system_metrics()
        db_health = await check_database_health()
        uptime = time.time() - app_start_time
        
        metrics = f"""# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds {uptime}

# HELP system_cpu_percent CPU usage percentage
# TYPE system_cpu_percent gauge
system_cpu_percent {system_metrics.cpu_percent}

# HELP system_memory_percent Memory usage percentage
# TYPE system_memory_percent gauge
system_memory_percent {system_metrics.memory_percent}

# HELP system_disk_percent Disk usage percentage
# TYPE system_disk_percent gauge
system_disk_percent {system_metrics.disk_percent}

# HELP database_connection_time_ms Database connection time in milliseconds
# TYPE database_connection_time_ms gauge
database_connection_time_ms {db_health.connection_time_ms}

# HELP database_total_records Total number of records in database
# TYPE database_total_records gauge
database_total_records {db_health.total_records}

# HELP active_connections Number of active network connections
# TYPE active_connections gauge
active_connections {system_metrics.active_connections}
"""
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate metrics: {str(e)}")

# Clear cache periodically
async def clear_health_cache():
    """Clear expired cache entries"""
    current_time = time.time()
    expired_keys = []
    
    for key, (data, cache_time) in health_checks_cache.items():
        if current_time - cache_time > cache_ttl:
            expired_keys.append(key)
    
    for key in expired_keys:
        del health_checks_cache[key]