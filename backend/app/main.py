from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import asyncio

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.database import engine
from app.db import models
from app.services.background_tasks import start_background_tasks, stop_background_tasks
from app.core.database_optimization import setup_database_optimizations
from app.core.cache import setup_cache_monitoring
from app.core.background_jobs import job_processor, setup_job_handlers, schedule_recurring_jobs
from app.core.monitoring import performance_monitor, monitoring_loop, setup_monitoring
from app.core.rate_limiting import rate_limit_middleware, cleanup_rate_limiter
from app.core.security_audit import security_monitor
from app.middleware import TimeoutMonitoringMiddleware
from app.utils.config_validator import validate_startup_config, ConfigValidator

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Setup database optimizations
setup_database_optimizations(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting application...")
    try:
        # Validate configuration first
        print("Validating configuration...")
        config_valid = validate_startup_config()
        if not config_valid:
            print("⚠️  Configuration validation found issues - check logs for details")
        else:
            print("✅ Configuration validation passed")
        
        # Show configuration summary
        config_summary = ConfigValidator.get_config_summary()
        print(f"Environment: {config_summary['environment']}")
        print(f"Debug Mode: {config_summary['debug_mode']}")
        print(f"Email Enabled: {config_summary['email_enabled']}")
        print(f"Email Configured: {config_summary['email_configured']}")
        print(f"Email Console Fallback: {config_summary['email_fallback_console']}")
        
        await start_background_tasks()
        setup_job_handlers()
        setup_monitoring()
        print("Application started successfully")
    except Exception as e:
        print(f"Error during startup: {e}")
    
    yield
    
    # Shutdown
    print("Shutting down application...")
    try:
        await stop_background_tasks()
        print("Application shutdown complete")
    except Exception as e:
        print(f"Error during shutdown: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Handwork Marketplace API",
    lifespan=lifespan
)

# Security and performance middleware
@app.middleware("http")
async def security_and_performance_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Apply rate limiting first
    rate_limited_response = await rate_limit_middleware(request, call_next)
    if rate_limited_response.status_code == 429:
        return rate_limited_response
    
    # Continue with normal processing
    response = await call_next(request)
    
    process_time = time.time() - start_time
    performance_monitor.record_request(process_time, response.status_code)
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Add timeout monitoring middleware
app.add_middleware(TimeoutMonitoringMiddleware, timeout_threshold=5.0)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Handwork Marketplace API"}

@app.get("/health")
async def health_check():
    from app.core.monitoring import health_checker
    return await health_checker.run_health_checks()

@app.get("/metrics")
async def get_metrics():
    from app.core.monitoring import performance_monitor, metrics
    system_metrics = performance_monitor.get_system_metrics()
    app_metrics = performance_monitor.get_application_metrics()
    metrics_summary = metrics.get_metrics_summary()
    
    return {
        "system": system_metrics,
        "application": app_metrics,
        "metrics": metrics_summary
    }

@app.get("/config/status")
async def get_config_status():
    """Get configuration status for debugging (development only)"""
    if not settings.is_development_environment():
        return {"error": "Configuration status only available in development mode"}
    
    validation_results = ConfigValidator.validate_all_configs()
    config_summary = ConfigValidator.get_config_summary()
    
    return {
        "summary": config_summary,
        "validation": validation_results,
        "environment_detection": {
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "is_development": settings.is_development_environment(),
            "mail_development_mode": settings.MAIL_DEVELOPMENT_MODE
        }
    }