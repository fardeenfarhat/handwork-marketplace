"""
Rate limiting and DDoS protection middleware
"""
import time
import asyncio
from typing import Dict, Optional, Tuple
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import hashlib
import ipaddress
from datetime import datetime, timedelta

class RateLimiter:
    """Advanced rate limiting with multiple strategies"""
    
    def __init__(self):
        # Token bucket for each IP
        self.token_buckets: Dict[str, Dict] = defaultdict(lambda: {
            'tokens': 100,  # Initial tokens
            'last_update': time.time(),
            'capacity': 100,  # Max tokens
            'refill_rate': 10  # Tokens per second
        })
        
        # Request history for sliding window
        self.request_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        
        # Blocked IPs with expiration
        self.blocked_ips: Dict[str, float] = {}
        
        # Suspicious activity tracking
        self.suspicious_activity: Dict[str, Dict] = defaultdict(lambda: {
            'failed_attempts': 0,
            'last_attempt': 0,
            'endpoints_hit': set(),
            'user_agents': set()
        })
        
        # Rate limit rules for different endpoints
        self.endpoint_limits = {
            '/api/v1/auth/login': {'requests': 5, 'window': 300},  # 5 per 5 minutes
            '/api/v1/auth/register': {'requests': 3, 'window': 3600},  # 3 per hour
            '/api/v1/auth/reset-password': {'requests': 3, 'window': 3600},
            '/api/v1/jobs': {'requests': 100, 'window': 3600},  # 100 per hour
            '/api/v1/messages': {'requests': 200, 'window': 3600},  # 200 per hour
            'default': {'requests': 1000, 'window': 3600}  # Default: 1000 per hour
        }
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers (behind proxy)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else '127.0.0.1'
    
    def is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/internal"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False
    
    def update_token_bucket(self, ip: str) -> bool:
        """Update token bucket and check if request is allowed"""
        bucket = self.token_buckets[ip]
        now = time.time()
        
        # Calculate tokens to add based on time elapsed
        time_elapsed = now - bucket['last_update']
        tokens_to_add = time_elapsed * bucket['refill_rate']
        
        # Update bucket
        bucket['tokens'] = min(bucket['capacity'], bucket['tokens'] + tokens_to_add)
        bucket['last_update'] = now
        
        # Check if request can be processed
        if bucket['tokens'] >= 1:
            bucket['tokens'] -= 1
            return True
        
        return False
    
    def check_sliding_window(self, ip: str, endpoint: str) -> bool:
        """Check sliding window rate limit for specific endpoint"""
        now = time.time()
        
        # Get rate limit for endpoint
        limit_config = self.endpoint_limits.get(endpoint, self.endpoint_limits['default'])
        window_size = limit_config['window']
        max_requests = limit_config['requests']
        
        # Clean old requests outside window
        history = self.request_history[f"{ip}:{endpoint}"]
        while history and history[0] < now - window_size:
            history.popleft()
        
        # Check if limit exceeded
        if len(history) >= max_requests:
            return False
        
        # Add current request
        history.append(now)
        return True
    
    def detect_suspicious_activity(self, request: Request, ip: str) -> bool:
        """Detect suspicious activity patterns"""
        now = time.time()
        activity = self.suspicious_activity[ip]
        
        # Track endpoints hit
        activity['endpoints_hit'].add(request.url.path)
        
        # Track user agents
        user_agent = request.headers.get('User-Agent', '')
        activity['user_agents'].add(user_agent)
        
        # Check for suspicious patterns
        suspicious_indicators = 0
        
        # Too many different endpoints in short time
        if len(activity['endpoints_hit']) > 20:
            suspicious_indicators += 1
        
        # Too many different user agents
        if len(activity['user_agents']) > 5:
            suspicious_indicators += 1
        
        # No user agent or suspicious user agent
        if not user_agent or 'bot' in user_agent.lower() or 'crawler' in user_agent.lower():
            suspicious_indicators += 1
        
        # Rapid requests (checked elsewhere but contributes to score)
        if hasattr(request.state, 'rapid_requests'):
            suspicious_indicators += 1
        
        return suspicious_indicators >= 2
    
    def block_ip(self, ip: str, duration: int = 3600):
        """Block IP for specified duration (seconds)"""
        self.blocked_ips[ip] = time.time() + duration
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is currently blocked"""
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            else:
                # Remove expired block
                del self.blocked_ips[ip]
        return False
    
    def cleanup_expired_data(self):
        """Clean up expired data to prevent memory leaks"""
        now = time.time()
        
        # Clean expired IP blocks
        expired_blocks = [ip for ip, expiry in self.blocked_ips.items() if now > expiry]
        for ip in expired_blocks:
            del self.blocked_ips[ip]
        
        # Clean old suspicious activity data (older than 24 hours)
        expired_activity = []
        for ip, activity in self.suspicious_activity.items():
            if now - activity.get('last_attempt', 0) > 86400:  # 24 hours
                expired_activity.append(ip)
        
        for ip in expired_activity:
            del self.suspicious_activity[ip]

# Global rate limiter instance
rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    ip = rate_limiter.get_client_ip(request)
    endpoint = request.url.path
    
    # Skip rate limiting for private IPs in development
    if rate_limiter.is_private_ip(ip) and endpoint.startswith('/docs'):
        response = await call_next(request)
        return response
    
    # Check if IP is blocked
    if rate_limiter.is_ip_blocked(ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "IP temporarily blocked due to suspicious activity",
                "retry_after": 3600
            }
        )
    
    # Check token bucket (general rate limiting)
    if not rate_limiter.update_token_bucket(ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded - too many requests",
                "retry_after": 60
            }
        )
    
    # Check sliding window for specific endpoint
    if not rate_limiter.check_sliding_window(ip, endpoint):
        # Get retry after time
        limit_config = rate_limiter.endpoint_limits.get(endpoint, rate_limiter.endpoint_limits['default'])
        retry_after = limit_config['window']
        
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": f"Rate limit exceeded for {endpoint}",
                "retry_after": retry_after
            }
        )
    
    # Detect suspicious activity
    if rate_limiter.detect_suspicious_activity(request, ip):
        rate_limiter.block_ip(ip, 3600)  # Block for 1 hour
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Suspicious activity detected - IP blocked",
                "retry_after": 3600
            }
        )
    
    # Process request
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(int(rate_limiter.token_buckets[ip]['tokens']))
    response.headers["X-RateLimit-Reset"] = str(int(time.time() + 60))
    
    return response

# Background task to clean up expired data
async def cleanup_rate_limiter():
    """Background task to clean up rate limiter data"""
    while True:
        try:
            rate_limiter.cleanup_expired_data()
            await asyncio.sleep(300)  # Clean up every 5 minutes
        except Exception as e:
            print(f"Error in rate limiter cleanup: {e}")
            await asyncio.sleep(60)

class DDoSProtection:
    """Advanced DDoS protection mechanisms"""
    
    def __init__(self):
        self.connection_counts = defaultdict(int)
        self.request_patterns = defaultdict(list)
        self.challenge_responses = {}
    
    def check_connection_flood(self, ip: str) -> bool:
        """Check for connection flooding"""
        self.connection_counts[ip] += 1
        
        # If too many connections from same IP
        if self.connection_counts[ip] > 50:  # Threshold
            return False
        
        return True
    
    def analyze_request_pattern(self, request: Request, ip: str) -> bool:
        """Analyze request patterns for bot-like behavior"""
        now = time.time()
        pattern_key = f"{ip}:{request.method}:{request.url.path}"
        
        self.request_patterns[pattern_key].append(now)
        
        # Keep only recent requests (last 60 seconds)
        self.request_patterns[pattern_key] = [
            t for t in self.request_patterns[pattern_key] 
            if now - t < 60
        ]
        
        # Check for rapid identical requests (bot-like)
        if len(self.request_patterns[pattern_key]) > 10:  # 10 identical requests in 60 seconds
            return False
        
        return True
    
    def generate_challenge(self, ip: str) -> str:
        """Generate a simple challenge for suspicious requests"""
        import random
        import string
        
        challenge = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        self.challenge_responses[ip] = {
            'challenge': challenge,
            'expires': time.time() + 300  # 5 minutes
        }
        
        return challenge
    
    def verify_challenge(self, ip: str, response: str) -> bool:
        """Verify challenge response"""
        if ip not in self.challenge_responses:
            return False
        
        challenge_data = self.challenge_responses[ip]
        
        # Check if expired
        if time.time() > challenge_data['expires']:
            del self.challenge_responses[ip]
            return False
        
        # Verify response
        if response == challenge_data['challenge']:
            del self.challenge_responses[ip]
            return True
        
        return False

# Global DDoS protection instance
ddos_protection = DDoSProtection()