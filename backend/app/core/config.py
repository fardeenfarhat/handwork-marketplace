from typing import List
from pydantic_settings import BaseSettings
from decouple import config

class Settings(BaseSettings):
    PROJECT_NAME: str = "Handwork Marketplace"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = config("DATABASE_URL", default="sqlite:///./handwork_marketplace.db")
    
    # Security
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1
    
    # CORS - Allow all origins for development, specific origins for production
    ALLOWED_HOSTS: List[str] = [
        "http://localhost:3000",  # Admin web
        "http://127.0.0.1:3000",  # Admin web alternative
        "http://localhost:8081",  # Expo dev server
        "http://127.0.0.1:8081",  # Expo dev server alternative
        "http://localhost:19006", # Expo web
        "http://127.0.0.1:19006", # Expo web alternative
        "exp://localhost:19000",  # Expo mobile
        "exp://127.0.0.1:19000",  # Expo mobile alternative
        "*"  # Allow all for development - remove in production
    ]
    
    # External Services
    STRIPE_SECRET_KEY: str = config("STRIPE_SECRET_KEY", default="")
    STRIPE_PUBLISHABLE_KEY: str = config("STRIPE_PUBLISHABLE_KEY", default="")
    STRIPE_WEBHOOK_SECRET: str = config("STRIPE_WEBHOOK_SECRET", default="")
    
    # PayPal Settings
    PAYPAL_CLIENT_ID: str = config("PAYPAL_CLIENT_ID", default="")
    PAYPAL_CLIENT_SECRET: str = config("PAYPAL_CLIENT_SECRET", default="")
    PAYPAL_MODE: str = config("PAYPAL_MODE", default="sandbox")  # sandbox or live
    
    # Platform Settings
    PLATFORM_FEE_PERCENTAGE: float = config("PLATFORM_FEE_PERCENTAGE", default=5.0, cast=float)
    
    # OAuth Settings
    GOOGLE_CLIENT_ID: str = config("GOOGLE_CLIENT_ID", default="")
    GOOGLE_CLIENT_SECRET: str = config("GOOGLE_CLIENT_SECRET", default="")
    FACEBOOK_CLIENT_ID: str = config("FACEBOOK_CLIENT_ID", default="")
    FACEBOOK_CLIENT_SECRET: str = config("FACEBOOK_CLIENT_SECRET", default="")
    APPLE_CLIENT_ID: str = config("APPLE_CLIENT_ID", default="")
    APPLE_TEAM_ID: str = config("APPLE_TEAM_ID", default="")
    APPLE_KEY_ID: str = config("APPLE_KEY_ID", default="")
    APPLE_PRIVATE_KEY: str = config("APPLE_PRIVATE_KEY", default="")
    
    # Environment Detection
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")
    DEBUG: bool = config("DEBUG", default=True, cast=bool)
    
    # Database Performance Settings
    DB_QUERY_TIMEOUT: int = config("DB_QUERY_TIMEOUT", default=10, cast=int)  # 10 seconds
    DB_CONNECTION_TIMEOUT: int = config("DB_CONNECTION_TIMEOUT", default=5, cast=int)  # 5 seconds
    
    # Authentication Performance Settings
    LOGIN_TIMEOUT: int = config("LOGIN_TIMEOUT", default=5, cast=int)  # 5 seconds
    PASSWORD_HASH_ROUNDS: int = config("PASSWORD_HASH_ROUNDS", default=12, cast=int)  # bcrypt rounds
    
    # Email Settings
    MAIL_ENABLED: bool = config("MAIL_ENABLED", default=False, cast=bool)
    MAIL_DEVELOPMENT_MODE: bool = config("MAIL_DEVELOPMENT_MODE", default=True, cast=bool)
    MAIL_USERNAME: str = config("MAIL_USERNAME", default="")
    MAIL_PASSWORD: str = config("MAIL_PASSWORD", default="")
    MAIL_FROM: str = config("MAIL_FROM", default="noreply@handworkmarketplace.com")
    MAIL_PORT: int = config("MAIL_PORT", default=587, cast=int)
    MAIL_SERVER: str = config("MAIL_SERVER", default="smtp.gmail.com")
    MAIL_FROM_NAME: str = config("MAIL_FROM_NAME", default="Handwork Marketplace")
    MAIL_STARTTLS: bool = config("MAIL_STARTTLS", default=True, cast=bool)
    MAIL_SSL_TLS: bool = config("MAIL_SSL_TLS", default=False, cast=bool)
    MAIL_TIMEOUT: int = config("MAIL_TIMEOUT", default=5, cast=int)  # 5-second timeout
    MAIL_CONSOLE_LOGGING: bool = config("MAIL_CONSOLE_LOGGING", default=True, cast=bool)
    MAIL_VALIDATION_STRICT: bool = config("MAIL_VALIDATION_STRICT", default=False, cast=bool)
    
    # SMS Settings (Twilio)
    TWILIO_ACCOUNT_SID: str = config("TWILIO_ACCOUNT_SID", default="")
    TWILIO_AUTH_TOKEN: str = config("TWILIO_AUTH_TOKEN", default="")
    TWILIO_PHONE_NUMBER: str = config("TWILIO_PHONE_NUMBER", default="")
    
    # Frontend URLs
    FRONTEND_URL: str = config("FRONTEND_URL", default="http://localhost:3000")
    
    # File Upload Settings
    UPLOAD_DIR: str = config("UPLOAD_DIR", default="./uploads")
    MAX_UPLOAD_SIZE: int = config("MAX_UPLOAD_SIZE", default=10485760, cast=int)  # 10MB
    
    def is_development_environment(self) -> bool:
        """Detect if we're running in development environment"""
        return (
            self.ENVIRONMENT.lower() == "development" or
            self.DEBUG is True or
            self.MAIL_DEVELOPMENT_MODE is True
        )
    
    def is_email_configured(self) -> bool:
        """Check if email is properly configured for sending"""
        if not self.MAIL_ENABLED:
            return False
            
        # Check for required SMTP settings
        required_settings = [
            self.MAIL_SERVER,
            self.MAIL_USERNAME,
            self.MAIL_PASSWORD,
            self.MAIL_FROM
        ]
        
        # Check if any required setting is missing
        if not all(required_settings):
            return False
            
        # Check for placeholder values that indicate incomplete configuration
        placeholder_values = [
            "your-email@gmail.com",
            "your-mailtrap-username",
            "your-app-password",
            "your-mailtrap-password"
        ]
        
        if any(placeholder in str(setting) for setting in required_settings for placeholder in placeholder_values):
            return False
            
        return True
    
    def validate_email_configuration(self) -> dict:
        """Validate email configuration and return status"""
        validation_result = {
            "is_valid": False,
            "is_development": self.is_development_environment(),
            "is_enabled": self.MAIL_ENABLED,
            "is_configured": self.is_email_configured(),
            "fallback_to_console": False,
            "errors": [],
            "warnings": []
        }
        
        # In development mode, always allow fallback to console
        if validation_result["is_development"]:
            validation_result["fallback_to_console"] = True
            validation_result["is_valid"] = True
            
            if not validation_result["is_enabled"]:
                validation_result["warnings"].append("Email sending disabled - using console logging")
            elif not validation_result["is_configured"]:
                validation_result["warnings"].append("Email not configured - using console logging")
        else:
            # In production, require proper configuration if email is enabled
            if validation_result["is_enabled"]:
                if not validation_result["is_configured"]:
                    validation_result["errors"].append("Email enabled but not properly configured")
                else:
                    validation_result["is_valid"] = True
            else:
                validation_result["warnings"].append("Email sending disabled in production")
                validation_result["is_valid"] = True  # Valid to have email disabled
        
        return validation_result

    class Config:
        case_sensitive = True

settings = Settings()