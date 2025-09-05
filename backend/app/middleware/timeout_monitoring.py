"""
Request timeout monitoring middleware for performance tracking
"""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class TimeoutMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor request timeouts and performance"""
    
    def __init__(self, app, timeout_threshold: float = 5.0):
        super().__init__(app)
        self.timeout_threshold = timeout_threshold
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Add request start time to request state
        request.state.start_time = start_time
        
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            
            # Log slow requests
            if duration > self.timeout_threshold:
                logger.warning(
                    f"Slow request detected: {request.method} {request.url.path} "
                    f"took {duration:.3f}s (threshold: {self.timeout_threshold}s)"
                )
            
            # Log authentication endpoint performance specifically
            if "/auth/" in str(request.url.path):
                if duration > 2.0:  # Lower threshold for auth endpoints
                    logger.warning(
                        f"Slow auth request: {request.method} {request.url.path} "
                        f"took {duration:.3f}s"
                    )
                else:
                    logger.info(
                        f"Auth request: {request.method} {request.url.path} "
                        f"completed in {duration:.3f}s"
                    )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"after {duration:.3f}s with error: {str(e)}"
            )
            raise

def get_request_duration(request: Request) -> float:
    """Get the current request duration"""
    if hasattr(request.state, 'start_time'):
        return time.time() - request.state.start_time
    return 0.0