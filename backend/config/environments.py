"""
Environment-specific configuration management
Supports development, staging, and production environments
"""

import os
from typing import Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass, field
import json

@dataclass
class DatabaseConfig:
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600

@dataclass
class RedisConfig:
    url: str
    max_connections: int = 10
    socket_timeout: int = 5
    socket_connect_timeout: int = 5

@dataclass
class AuthConfig:
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    apple_client_id: Optional[str] = None
    apple_team_id: Optional[str] = None
    apple_key_id: Optional[str] = None
    apple_private_key: Optional[str] = None

@dataclass
class PaymentConfig:
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_webhook_secret: str
    paypal_client_id: str
    paypal_client_secret: str
    paypal_webhook_id: str
    platform_fee_percentage: float = 5.0
    auto_release_days: int = 14

@dataclass
class NotificationConfig:
    firebase_server_key: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    sendgrid_api_key: str
    sendgrid_from_email: str

@dataclass
class StorageConfig:
    upload_dir: str = "./uploads"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_extensions: list = field(default_factory=lambda: [
        'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'
    ])
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: Optional[str] = None
    aws_region: str = "us-east-1"

@dataclass
class AppConfig:
    environment: str
    debug: bool
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    log_level: str = "INFO"
    cors_origins: list = field(default_factory=list)
    api_prefix: str = "/api"
    docs_url: Optional[str] = "/docs"
    redoc_url: Optional[str] = "/redoc"
    
    # Component configurations
    database: DatabaseConfig = None
    redis: Optional[RedisConfig] = None
    auth: AuthConfig = None
    payment: PaymentConfig = None
    notification: NotificationConfig = None
    storage: StorageConfig = None

class ConfigManager:
    """Configuration manager for different environments"""
    
    def __init__(self, environment: Optional[str] = None):
        self.environment = environment or os.getenv('ENVIRONMENT', 'development')
        self.config_dir = Path(__file__).parent
        self._config_cache: Dict[str, AppConfig] = {}
    
    def get_config(self) -> AppConfig:
        """Get configuration for current environment"""
        if self.environment not in self._config_cache:
            self._config_cache[self.environment] = self._load_config()
        return self._config_cache[self.environment]
    
    def _load_config(self) -> AppConfig:
        """Load configuration from environment variables and files"""
        
        # Base configuration
        config = AppConfig(
            environment=self.environment,
            debug=self._get_bool('DEBUG', self.environment == 'development'),
            host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', '8000')),
            workers=int(os.getenv('WORKERS', '1' if self.environment == 'development' else '4')),
            log_level=os.getenv('LOG_LEVEL', 'DEBUG' if self.environment == 'development' else 'INFO'),
            cors_origins=self._get_list('CORS_ORIGINS', ['*'] if self.environment == 'development' else []),
            api_prefix=os.getenv('API_PREFIX', '/api'),
            docs_url=os.getenv('DOCS_URL', '/docs' if self.environment != 'production' else None),
            redoc_url=os.getenv('REDOC_URL', '/redoc' if self.environment != 'production' else None)
        )
        
        # Database configuration
        config.database = DatabaseConfig(
            url=os.getenv('DATABASE_URL', self._get_default_db_url()),
            pool_size=int(os.getenv('DB_POOL_SIZE', '5' if self.environment == 'development' else '10')),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', '10' if self.environment == 'development' else '20')),
            pool_timeout=int(os.getenv('DB_POOL_TIMEOUT', '30')),
            pool_recycle=int(os.getenv('DB_POOL_RECYCLE', '3600'))
        )
        
        # Redis configuration (optional)
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            config.redis = RedisConfig(
                url=redis_url,
                max_connections=int(os.getenv('REDIS_MAX_CONNECTIONS', '10')),
                socket_timeout=int(os.getenv('REDIS_SOCKET_TIMEOUT', '5')),
                socket_connect_timeout=int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', '5'))
            )
        
        # Authentication configuration
        config.auth = AuthConfig(
            jwt_secret_key=self._get_required('JWT_SECRET_KEY'),
            jwt_algorithm=os.getenv('JWT_ALGORITHM', 'HS256'),
            access_token_expire_minutes=int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30')),
            refresh_token_expire_days=int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '7')),
            google_client_id=os.getenv('GOOGLE_CLIENT_ID'),
            google_client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            facebook_app_id=os.getenv('FACEBOOK_APP_ID'),
            facebook_app_secret=os.getenv('FACEBOOK_APP_SECRET'),
            apple_client_id=os.getenv('APPLE_CLIENT_ID'),
            apple_team_id=os.getenv('APPLE_TEAM_ID'),
            apple_key_id=os.getenv('APPLE_KEY_ID'),
            apple_private_key=os.getenv('APPLE_PRIVATE_KEY')
        )
        
        # Payment configuration
        config.payment = PaymentConfig(
            stripe_secret_key=self._get_required('STRIPE_SECRET_KEY'),
            stripe_publishable_key=self._get_required('STRIPE_PUBLISHABLE_KEY'),
            stripe_webhook_secret=self._get_required('STRIPE_WEBHOOK_SECRET'),
            paypal_client_id=self._get_required('PAYPAL_CLIENT_ID'),
            paypal_client_secret=self._get_required('PAYPAL_CLIENT_SECRET'),
            paypal_webhook_id=self._get_required('PAYPAL_WEBHOOK_ID'),
            platform_fee_percentage=float(os.getenv('PLATFORM_FEE_PERCENTAGE', '5.0')),
            auto_release_days=int(os.getenv('AUTO_RELEASE_DAYS', '14'))
        )
        
        # Notification configuration
        config.notification = NotificationConfig(
            firebase_server_key=self._get_required('FIREBASE_SERVER_KEY'),
            twilio_account_sid=self._get_required('TWILIO_ACCOUNT_SID'),
            twilio_auth_token=self._get_required('TWILIO_AUTH_TOKEN'),
            twilio_phone_number=self._get_required('TWILIO_PHONE_NUMBER'),
            sendgrid_api_key=self._get_required('SENDGRID_API_KEY'),
            sendgrid_from_email=self._get_required('SENDGRID_FROM_EMAIL')
        )
        
        # Storage configuration
        config.storage = StorageConfig(
            upload_dir=os.getenv('UPLOAD_DIR', './uploads'),
            max_file_size=int(os.getenv('MAX_FILE_SIZE', str(50 * 1024 * 1024))),
            allowed_extensions=self._get_list('ALLOWED_EXTENSIONS', [
                'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'
            ]),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_s3_bucket=os.getenv('AWS_S3_BUCKET'),
            aws_region=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        # Load environment-specific overrides
        self._load_environment_overrides(config)
        
        return config
    
    def _get_default_db_url(self) -> str:
        """Get default database URL based on environment"""
        if self.environment == 'production':
            return 'sqlite:///./handwork_marketplace_prod.db'
        elif self.environment == 'staging':
            return 'sqlite:///./handwork_marketplace_staging.db'
        else:
            return 'sqlite:///./handwork_marketplace_dev.db'
    
    def _get_required(self, key: str) -> str:
        """Get required environment variable"""
        value = os.getenv(key)
        if not value:
            raise ValueError(f"Required environment variable {key} is not set")
        return value
    
    def _get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean environment variable"""
        value = os.getenv(key, '').lower()
        if value in ('true', '1', 'yes', 'on'):
            return True
        elif value in ('false', '0', 'no', 'off'):
            return False
        return default
    
    def _get_list(self, key: str, default: list = None) -> list:
        """Get list from comma-separated environment variable"""
        value = os.getenv(key)
        if not value:
            return default or []
        return [item.strip() for item in value.split(',')]
    
    def _load_environment_overrides(self, config: AppConfig) -> None:
        """Load environment-specific configuration overrides"""
        config_file = self.config_dir / f"{self.environment}.json"
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    overrides = json.load(f)
                
                # Apply overrides (simplified - in practice, you'd want recursive merging)
                for key, value in overrides.items():
                    if hasattr(config, key):
                        setattr(config, key, value)
                        
            except Exception as e:
                print(f"Warning: Failed to load config overrides from {config_file}: {e}")

# Global configuration instance
config_manager = ConfigManager()

def get_config() -> AppConfig:
    """Get current configuration"""
    return config_manager.get_config()

def get_database_url() -> str:
    """Get database URL for current environment"""
    return get_config().database.url

def is_development() -> bool:
    """Check if running in development environment"""
    return get_config().environment == 'development'

def is_production() -> bool:
    """Check if running in production environment"""
    return get_config().environment == 'production'