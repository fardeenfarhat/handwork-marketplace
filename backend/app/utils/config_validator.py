"""
Configuration validation utilities for the application.
"""
import logging
from typing import Dict, List, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class ConfigValidator:
    """Utility class for validating application configuration"""
    
    @staticmethod
    def validate_email_config() -> Dict[str, Any]:
        """Validate email configuration and return detailed status"""
        return settings.validate_email_configuration()
    
    @staticmethod
    def validate_all_configs() -> Dict[str, Any]:
        """Validate all application configurations"""
        validation_results = {
            "overall_status": "valid",
            "email": ConfigValidator.validate_email_config(),
            "database": ConfigValidator._validate_database_config(),
            "security": ConfigValidator._validate_security_config(),
            "environment": ConfigValidator._validate_environment_config()
        }
        
        # Check if any validation failed
        for config_name, config_result in validation_results.items():
            if config_name == "overall_status":
                continue
                
            if isinstance(config_result, dict) and not config_result.get("is_valid", True):
                validation_results["overall_status"] = "invalid"
                break
        
        return validation_results
    
    @staticmethod
    def _validate_database_config() -> Dict[str, Any]:
        """Validate database configuration"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        if not settings.DATABASE_URL:
            result["is_valid"] = False
            result["errors"].append("DATABASE_URL is not configured")
        elif settings.DATABASE_URL == "sqlite:///./handwork_marketplace.db" and not settings.is_development_environment():
            result["warnings"].append("Using SQLite in production is not recommended")
        
        return result
    
    @staticmethod
    def _validate_security_config() -> Dict[str, Any]:
        """Validate security configuration"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check JWT secret key
        if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-here":
            result["is_valid"] = False
            result["errors"].append("SECRET_KEY must be set to a secure value")
        elif len(settings.SECRET_KEY) < 32:
            result["warnings"].append("SECRET_KEY should be at least 32 characters long")
        
        # Check if using default values in production
        if not settings.is_development_environment():
            if "local-development" in settings.SECRET_KEY:
                result["is_valid"] = False
                result["errors"].append("Using development SECRET_KEY in production")
        
        return result
    
    @staticmethod
    def _validate_environment_config() -> Dict[str, Any]:
        """Validate environment configuration"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG
        }
        
        # Check environment consistency
        if settings.ENVIRONMENT.lower() == "production" and settings.DEBUG:
            result["warnings"].append("DEBUG mode is enabled in production environment")
        
        if settings.ENVIRONMENT.lower() not in ["development", "staging", "production"]:
            result["warnings"].append(f"Unknown environment: {settings.ENVIRONMENT}")
        
        return result
    
    @staticmethod
    def log_validation_results(validation_results: Dict[str, Any]) -> None:
        """Log validation results to the application logger"""
        overall_status = validation_results.get("overall_status", "unknown")
        
        if overall_status == "valid":
            logger.info("All configurations validated successfully")
        else:
            logger.warning("Configuration validation found issues")
        
        for config_name, config_result in validation_results.items():
            if config_name == "overall_status" or not isinstance(config_result, dict):
                continue
            
            # Log errors
            for error in config_result.get("errors", []):
                logger.error(f"{config_name.upper()} CONFIG: {error}")
            
            # Log warnings
            for warning in config_result.get("warnings", []):
                logger.warning(f"{config_name.upper()} CONFIG: {warning}")
    
    @staticmethod
    def get_config_summary() -> Dict[str, Any]:
        """Get a summary of current configuration status"""
        email_config = ConfigValidator.validate_email_config()
        
        return {
            "environment": settings.ENVIRONMENT,
            "debug_mode": settings.DEBUG,
            "email_enabled": settings.MAIL_ENABLED,
            "email_configured": email_config["is_configured"],
            "email_fallback_console": email_config["fallback_to_console"],
            "database_type": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
            "development_mode": settings.is_development_environment()
        }


def validate_startup_config() -> bool:
    """
    Validate configuration at application startup.
    Returns True if configuration is valid, False otherwise.
    """
    try:
        validation_results = ConfigValidator.validate_all_configs()
        ConfigValidator.log_validation_results(validation_results)
        
        # In development, warnings are acceptable
        if settings.is_development_environment():
            return validation_results["overall_status"] != "invalid"
        
        # In production, only valid configurations are acceptable
        return validation_results["overall_status"] == "valid"
        
    except Exception as e:
        logger.error(f"Configuration validation failed: {str(e)}")
        return False


def get_email_config_help() -> str:
    """Get help text for email configuration"""
    return """
Email Configuration Help:

For Development:
1. Set MAIL_ENABLED=false to use console logging (recommended for local development)
2. Set MAIL_DEVELOPMENT_MODE=true to enable development-friendly features
3. Set MAIL_CONSOLE_LOGGING=true to see email content in console

For Production:
1. Set MAIL_ENABLED=true to enable email sending
2. Set MAIL_DEVELOPMENT_MODE=false
3. Configure proper SMTP settings (MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD, etc.)
4. Set MAIL_VALIDATION_STRICT=true for strict validation

Common SMTP Providers:
- Gmail: smtp.gmail.com:587 (requires App Password)
- SendGrid: smtp.sendgrid.net:587 (username: apikey, password: your_api_key)
- Mailtrap: smtp.mailtrap.io:2525 (for testing)

Environment Variables:
- MAIL_ENABLED: Enable/disable email sending
- MAIL_DEVELOPMENT_MODE: Enable development features
- MAIL_SERVER: SMTP server hostname
- MAIL_PORT: SMTP server port
- MAIL_USERNAME: SMTP username
- MAIL_PASSWORD: SMTP password
- MAIL_FROM: From email address
- MAIL_FROM_NAME: From name
- MAIL_TIMEOUT: SMTP operation timeout (seconds)
- MAIL_CONSOLE_LOGGING: Enable console logging
- MAIL_VALIDATION_STRICT: Enable strict validation
"""