#!/usr/bin/env python3
"""
Configuration help utility for Handwork Marketplace backend.
Run this script to get help with configuration and validate current settings.
"""
import sys
import os
import asyncio

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.utils.config_validator import ConfigValidator, get_email_config_help, validate_startup_config
from app.services.email import EmailService


def print_header(title: str):
    """Print a formatted header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}")


def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'-'*60}")
    print(f" {title}")
    print(f"{'-'*60}")


async def main():
    """Main configuration help function"""
    print_header("HANDWORK MARKETPLACE - CONFIGURATION HELP")
    
    # Show current environment
    print_section("Current Environment")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Development Mode: {settings.is_development_environment()}")
    
    # Show configuration summary
    print_section("Configuration Summary")
    summary = ConfigValidator.get_config_summary()
    for key, value in summary.items():
        print(f"{key.replace('_', ' ').title()}: {value}")
    
    # Validate all configurations
    print_section("Configuration Validation")
    config_valid = validate_startup_config()
    validation_results = ConfigValidator.validate_all_configs()
    
    print(f"Overall Status: {validation_results['overall_status'].upper()}")
    
    for config_name, config_result in validation_results.items():
        if config_name == "overall_status" or not isinstance(config_result, dict):
            continue
        
        print(f"\n{config_name.upper()}:")
        print(f"  Valid: {config_result.get('is_valid', 'N/A')}")
        
        if config_result.get('errors'):
            print("  Errors:")
            for error in config_result['errors']:
                print(f"    - {error}")
        
        if config_result.get('warnings'):
            print("  Warnings:")
            for warning in config_result['warnings']:
                print(f"    - {warning}")
    
    # Test email service
    print_section("Email Service Test")
    try:
        email_service = EmailService()
        print(f"Email Service Status:")
        print(f"  Enabled: {email_service.enabled}")
        print(f"  Console Logging: {email_service.console_logging}")
        print(f"  Uses Console Fallback: {email_service._should_use_console_fallback()}")
        
        print(f"\nTesting email service...")
        result = await email_service.send_verification_email(
            "test@example.com", 
            "test-token-123", 
            "Test User"
        )
        print(f"Email test result: {'SUCCESS' if result else 'FAILED'}")
        
    except Exception as e:
        print(f"Email service test failed: {str(e)}")
    
    # Show email configuration help
    print_section("Email Configuration Help")
    print(get_email_config_help())
    
    # Show next steps
    print_section("Next Steps")
    if not config_valid:
        print("❌ Configuration issues found. Please review the errors above.")
    else:
        print("✅ Configuration is valid!")
    
    if settings.is_development_environment():
        print("\n📝 Development Mode Tips:")
        print("  - Email is configured to use console logging by default")
        print("  - Set MAIL_ENABLED=true and configure SMTP to test real email sending")
        print("  - Use /config/status endpoint to check configuration via API")
        print("  - Check application logs for detailed configuration information")
    else:
        print("\n🚀 Production Mode:")
        print("  - Ensure all required configurations are properly set")
        print("  - Review security settings and secrets")
        print("  - Monitor application logs for configuration warnings")


if __name__ == "__main__":
    asyncio.run(main())