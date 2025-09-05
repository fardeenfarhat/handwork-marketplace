"""
Monitoring and logging system for performance tracking.
"""
import time
import logging
import psutil
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json
import threading
from functools import wraps

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

class MetricsCollector:
    """Collect and store performance metrics."""
    
    def __init__(self, max_metrics: int = 10000):
        self.metrics: deque = deque(maxlen=max_metrics)
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = {}
        self.timers: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()
    
    def record_metric(self, name: str, value: float, unit: str = "", tags: Dict[str, str] = None):
        """Record a performance metric."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            tags=tags or {}
        )
        
        with self._lock:
            self.metrics.append(metric)
    
    def increment_counter(self, name: str, value: int = 1, tags: Dict[str, str] = None):
        """Increment a counter metric."""
        with self._lock:
            self.counters[name] += value
        
        self.record_metric(name, self.counters[name], "count", tags)
    
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric."""
        with self._lock:
            self.gauges[name] = value
        
        self.record_metric(name, value, "gauge", tags)
    
    def record_timer(self, name: str, duration: float, tags: Dict[str, str] = None):
        """Record a timer metric."""
        with self._lock:
            self.timers[name].append(duration)
            # Keep only last 1000 measurements
            if len(self.timers[name]) > 1000:
                self.timers[name] = self.timers[name][-1000:]
        
        self.record_metric(name, duration, "seconds", tags)
    
    def get_metrics_summary(self, minutes: int = 5) -> Dict[str, Any]:
        """Get metrics summary for the last N minutes."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        with self._lock:
            recent_metrics = [
                m for m in self.metrics
                if m.timestamp >= cutoff_time
            ]
        
        # Group metrics by name
        grouped_metrics = defaultdict(list)
        for metric in recent_metrics:
            grouped_metrics[metric.name].append(metric.value)
        
        # Calculate statistics
        summary = {}
        for name, values in grouped_metrics.items():
            if values:
                summary[name] = {
                    'count': len(values),
                    'avg': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values),
                    'latest': values[-1]
                }
        
        return summary

# Global metrics collector
metrics = MetricsCollector()

class PerformanceMonitor:
    """Monitor system and application performance."""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.response_times = deque(maxlen=1000)
    
    def record_request(self, response_time: float, status_code: int):
        """Record API request metrics."""
        self.request_count += 1
        self.response_times.append(response_time)
        
        if status_code >= 400:
            self.error_count += 1
        
        # Record metrics
        metrics.increment_counter("api_requests_total")
        metrics.record_timer("api_response_time", response_time)
        
        if status_code >= 400:
            metrics.increment_counter("api_errors_total", tags={"status_code": str(status_code)})
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used = memory.used
            memory_total = memory.total
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used = disk.used
            disk_total = disk.total
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_sent = network.bytes_sent
                network_recv = network.bytes_recv
            except:
                network_sent = network_recv = 0
            
            system_metrics = {
                'cpu_percent': cpu_percent,
                'cpu_count': cpu_count,
                'memory_percent': memory_percent,
                'memory_used_mb': memory_used / 1024 / 1024,
                'memory_total_mb': memory_total / 1024 / 1024,
                'disk_percent': disk_percent,
                'disk_used_gb': disk_used / 1024 / 1024 / 1024,
                'disk_total_gb': disk_total / 1024 / 1024 / 1024,
                'network_sent_mb': network_sent / 1024 / 1024,
                'network_recv_mb': network_recv / 1024 / 1024,
                'uptime_seconds': time.time() - self.start_time
            }
            
            # Record as metrics
            for key, value in system_metrics.items():
                metrics.set_gauge(f"system_{key}", value)
            
            return system_metrics
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}
    
    def get_application_metrics(self) -> Dict[str, Any]:
        """Get application-specific metrics."""
        avg_response_time = (
            sum(self.response_times) / len(self.response_times)
            if self.response_times else 0
        )
        
        error_rate = (
            self.error_count / self.request_count * 100
            if self.request_count > 0 else 0
        )
        
        app_metrics = {
            'total_requests': self.request_count,
            'total_errors': self.error_count,
            'error_rate_percent': error_rate,
            'avg_response_time_ms': avg_response_time * 1000,
            'uptime_seconds': time.time() - self.start_time
        }
        
        return app_metrics

# Global performance monitor
performance_monitor = PerformanceMonitor()

def performance_timer(metric_name: str):
    """Decorator to time function execution."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                metrics.record_timer(metric_name, execution_time)
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                metrics.record_timer(f"{metric_name}_error", execution_time)
                metrics.increment_counter(f"{metric_name}_errors")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                metrics.record_timer(metric_name, execution_time)
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                metrics.record_timer(f"{metric_name}_error", execution_time)
                metrics.increment_counter(f"{metric_name}_errors")
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

class AlertManager:
    """Manage performance alerts and notifications."""
    
    def __init__(self):
        self.alert_thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'disk_percent': 90.0,
            'error_rate_percent': 5.0,
            'avg_response_time_ms': 2000.0
        }
        self.active_alerts = set()
    
    def check_alerts(self, system_metrics: Dict[str, Any], app_metrics: Dict[str, Any]):
        """Check for alert conditions."""
        all_metrics = {**system_metrics, **app_metrics}
        
        for metric_name, threshold in self.alert_thresholds.items():
            if metric_name in all_metrics:
                value = all_metrics[metric_name]
                
                if value > threshold:
                    if metric_name not in self.active_alerts:
                        self.trigger_alert(metric_name, value, threshold)
                        self.active_alerts.add(metric_name)
                else:
                    if metric_name in self.active_alerts:
                        self.resolve_alert(metric_name, value)
                        self.active_alerts.remove(metric_name)
    
    def trigger_alert(self, metric_name: str, value: float, threshold: float):
        """Trigger an alert."""
        alert_message = f"ALERT: {metric_name} is {value:.2f}, exceeding threshold of {threshold:.2f}"
        logger.warning(alert_message)
        
        # Record alert metric
        metrics.increment_counter("alerts_triggered", tags={"metric": metric_name})
        
        # Here you could send notifications, emails, etc.
    
    def resolve_alert(self, metric_name: str, value: float):
        """Resolve an alert."""
        resolve_message = f"RESOLVED: {metric_name} is now {value:.2f}"
        logger.info(resolve_message)
        
        # Record resolution metric
        metrics.increment_counter("alerts_resolved", tags={"metric": metric_name})

# Global alert manager
alert_manager = AlertManager()

async def monitoring_loop():
    """Main monitoring loop."""
    while True:
        try:
            # Collect system metrics
            system_metrics = performance_monitor.get_system_metrics()
            app_metrics = performance_monitor.get_application_metrics()
            
            # Check for alerts
            alert_manager.check_alerts(system_metrics, app_metrics)
            
            # Log metrics summary
            metrics_summary = metrics.get_metrics_summary(minutes=1)
            if metrics_summary:
                logger.info(f"Metrics summary: {json.dumps(metrics_summary, indent=2)}")
            
            # Wait before next collection
            await asyncio.sleep(60)  # Collect every minute
            
        except Exception as e:
            logger.error(f"Monitoring loop error: {e}")
            await asyncio.sleep(30)  # Retry after 30 seconds

class HealthChecker:
    """Application health checking."""
    
    def __init__(self):
        self.health_checks = {}
    
    def register_check(self, name: str, check_func: callable):
        """Register a health check function."""
        self.health_checks[name] = check_func
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks."""
        results = {}
        overall_healthy = True
        
        for name, check_func in self.health_checks.items():
            try:
                start_time = time.time()
                
                if asyncio.iscoroutinefunction(check_func):
                    result = await check_func()
                else:
                    result = check_func()
                
                check_time = time.time() - start_time
                
                results[name] = {
                    'healthy': result.get('healthy', True),
                    'message': result.get('message', 'OK'),
                    'check_time_ms': round(check_time * 1000, 2)
                }
                
                if not results[name]['healthy']:
                    overall_healthy = False
                    
            except Exception as e:
                results[name] = {
                    'healthy': False,
                    'message': f'Health check failed: {str(e)}',
                    'check_time_ms': 0
                }
                overall_healthy = False
        
        return {
            'healthy': overall_healthy,
            'checks': results,
            'timestamp': datetime.utcnow().isoformat()
        }

# Global health checker
health_checker = HealthChecker()

def setup_monitoring():
    """Setup monitoring system."""
    # Register basic health checks
    def database_health():
        """Check database connectivity."""
        try:
            from app.db.database import get_db
            db = next(get_db())
            db.execute("SELECT 1")
            return {'healthy': True, 'message': 'Database connection OK'}
        except Exception as e:
            return {'healthy': False, 'message': f'Database error: {str(e)}'}
    
    def cache_health():
        """Check cache system."""
        try:
            from app.core.cache import cache
            test_key = "health_check_test"
            cache.set(test_key, "test_value", ttl=10)
            value = cache.get(test_key)
            cache.delete(test_key)
            
            if value == "test_value":
                return {'healthy': True, 'message': 'Cache system OK'}
            else:
                return {'healthy': False, 'message': 'Cache test failed'}
        except Exception as e:
            return {'healthy': False, 'message': f'Cache error: {str(e)}'}
    
    health_checker.register_check('database', database_health)
    health_checker.register_check('cache', cache_health)
    
    logger.info("Monitoring system initialized")