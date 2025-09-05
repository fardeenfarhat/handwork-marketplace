import smtplib
import os
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging
from functools import wraps

from app.core.config import settings

logger = logging.getLogger(__name__)

def timeout_handler(timeout_seconds: int = 5):
    """Decorator to handle timeouts for email operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_seconds)
            except asyncio.TimeoutError:
                logger.error(f"Email operation timed out after {timeout_seconds} seconds")
                return False
            except Exception as e:
                logger.error(f"Email operation failed: {str(e)}")
                return False
        return wrapper
    return decorator


class EmailService:
    def __init__(self):
        self.smtp_server = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.username = settings.MAIL_USERNAME
        self.password = settings.MAIL_PASSWORD
        self.from_email = settings.MAIL_FROM
        self.from_name = settings.MAIL_FROM_NAME
        self.use_tls = settings.MAIL_STARTTLS
        self.use_ssl = settings.MAIL_SSL_TLS
        self.timeout = settings.MAIL_TIMEOUT
        self.enabled = settings.MAIL_ENABLED
        self.console_logging = settings.MAIL_CONSOLE_LOGGING
        
        # Validate configuration on initialization
        self.config_validation = settings.validate_email_configuration()
        
        # Log configuration status
        if self.config_validation["warnings"]:
            for warning in self.config_validation["warnings"]:
                logger.warning(f"Email service: {warning}")
        
        if self.config_validation["errors"]:
            for error in self.config_validation["errors"]:
                logger.error(f"Email service: {error}")
        
    def _should_use_console_fallback(self) -> bool:
        """Determine if we should use console fallback instead of sending emails"""
        return (
            self.config_validation["fallback_to_console"] or
            not self.config_validation["is_configured"] or
            not self.enabled
        )
    
    def _log_email_to_console(self, to_email: str, subject: str, content_type: str, token: str = None):
        """Log email details to console for development"""
        if not self.console_logging:
            return
            
        print(f"\n{'='*80}")
        print(f"📧 EMAIL SERVICE - CONSOLE MODE")
        print(f"{'='*80}")
        print(f"Environment: {settings.ENVIRONMENT}")
        print(f"Email Enabled: {self.enabled}")
        print(f"Email Configured: {self.config_validation['is_configured']}")
        print(f"Development Mode: {self.config_validation['is_development']}")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Type: {content_type}")
        if token:
            print(f"Token: {token}")
            if "verification" in content_type.lower():
                print(f"Verification URL: {settings.FRONTEND_URL}/verify-email?token={token}")
            elif "reset" in content_type.lower():
                print(f"Reset URL: {settings.FRONTEND_URL}/reset-password?token={token}")
        
        # Show configuration status
        if self.config_validation["warnings"]:
            print(f"Warnings: {', '.join(self.config_validation['warnings'])}")
        if self.config_validation["errors"]:
            print(f"Errors: {', '.join(self.config_validation['errors'])}")
            
        print(f"{'='*80}\n")
        
    def _validate_runtime_config(self) -> bool:
        """Validate email configuration at runtime"""
        return self.config_validation["is_configured"] and self.enabled

    @timeout_handler(timeout_seconds=5)
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SMTP with proper timeout and error handling"""
        try:
            # Check if we should use console fallback
            if self._should_use_console_fallback():
                self._log_email_to_console(to_email, subject, "General Email")
                return True
                
            # Validate email configuration at runtime
            if not self._validate_runtime_config():
                logger.warning(f"Email configuration invalid at runtime, using console fallback for {to_email}")
                self._log_email_to_console(to_email, subject, "Runtime Configuration Invalid")
                return True

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Add text content
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Send email with proper timeout handling
            server = None
            try:
                if self.use_ssl:
                    server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=self.timeout)
                else:
                    server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=self.timeout)
                    if self.use_tls:
                        server.starttls()

                if self.username and self.password:
                    server.login(self.username, self.password)

                server.send_message(msg)
                logger.info(f"Email sent successfully to {to_email}")
                return True
                
            finally:
                if server:
                    try:
                        server.quit()
                    except Exception as quit_error:
                        logger.warning(f"Error closing SMTP connection: {quit_error}")

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed for {to_email}: {str(e)}")
            return False
        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP connection failed for {to_email}: {str(e)}")
            return False
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP recipients refused for {to_email}: {str(e)}")
            return False
        except smtplib.SMTPServerDisconnected as e:
            logger.error(f"SMTP server disconnected for {to_email}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {str(e)}")
            return False

    async def send_verification_email(self, to_email: str, token: str, user_name: str) -> bool:
        """Send email verification email with development mode handling"""
        # Check if we should use console fallback
        if self._should_use_console_fallback():
            self._log_email_to_console(to_email, "Email Verification", "Email Verification", token)
            if self.console_logging:
                print(f"📋 API Usage: POST /api/v1/auth/verify-email")
                print(f"📋 Request Body: {{\"token\": \"{token}\"}}")
            return True
            
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        subject = "Verify Your Email - Handwork Marketplace"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Welcome to Handwork Marketplace!</h2>
                
                <p>Hi {user_name},</p>
                
                <p>Thank you for registering with Handwork Marketplace. To complete your registration, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" 
                       style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #3498db;">{verification_url}</p>
                
                <p>This verification link will expire in 24 hours.</p>
                
                <p>If you didn't create an account with us, please ignore this email.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    Best regards,<br>
                    The Handwork Marketplace Team
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Handwork Marketplace!
        
        Hi {user_name},
        
        Thank you for registering with Handwork Marketplace. To complete your registration, please verify your email address by visiting this link:
        
        {verification_url}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with us, please ignore this email.
        
        Best regards,
        The Handwork Marketplace Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_password_reset_email(self, to_email: str, token: str, user_name: str) -> bool:
        """Send password reset email with development mode handling"""
        # Check if we should use console fallback
        if self._should_use_console_fallback():
            self._log_email_to_console(to_email, "Password Reset", "Password Reset", token)
            if self.console_logging:
                print(f"📋 API Usage: POST /api/v1/auth/reset-password")
                print(f"📋 Request Body: {{\"token\": \"{token}\", \"new_password\": \"your_new_password\"}}")
            return True
            
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        subject = "Password Reset - Handwork Marketplace"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Password Reset Request</h2>
                
                <p>Hi {user_name},</p>
                
                <p>We received a request to reset your password for your Handwork Marketplace account.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #e74c3c;">{reset_url}</p>
                
                <p>This password reset link will expire in 1 hour.</p>
                
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    Best regards,<br>
                    The Handwork Marketplace Team
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hi {user_name},
        
        We received a request to reset your password for your Handwork Marketplace account.
        
        Please visit this link to reset your password:
        {reset_url}
        
        This password reset link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        Best regards,
        The Handwork Marketplace Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

# Create global instance
email_service = EmailService()