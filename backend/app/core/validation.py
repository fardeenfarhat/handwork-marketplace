"""
Input validation and sanitization utilities for API endpoints
"""
import re
import html
import bleach
from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException, status
from pydantic import BaseModel, validator
import email_validator
from urllib.parse import urlparse

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    # Regex patterns for validation
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$')
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$')
    NAME_PATTERN = re.compile(r'^[a-zA-Z\s\-\'\.]{2,50}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    
    # Allowed HTML tags for rich text content
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a']
    ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """Sanitize HTML content to prevent XSS attacks"""
        if not text:
            return ""
        
        # Remove potentially dangerous HTML
        cleaned = bleach.clean(
            text,
            tags=InputValidator.ALLOWED_TAGS,
            attributes=InputValidator.ALLOWED_ATTRIBUTES,
            strip=True
        )
        
        # HTML escape any remaining content
        return html.escape(cleaned)
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000) -> str:
        """Sanitize general string input"""
        if not text:
            return ""
        
        # Remove null bytes and control characters
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Trim whitespace and limit length
        sanitized = sanitized.strip()[:max_length]
        
        # HTML escape
        return html.escape(sanitized)
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        try:
            # Use email_validator with check_deliverability=False for format validation only
            email_validator.validate_email(email, check_deliverability=False)
            return InputValidator.EMAIL_PATTERN.match(email) is not None
        except email_validator.EmailNotValidError:
            return False
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format"""
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        return InputValidator.PHONE_PATTERN.match(cleaned) is not None
    
    @staticmethod
    def validate_password(password: str) -> bool:
        """Validate password strength"""
        return InputValidator.PASSWORD_PATTERN.match(password) is not None
    
    @staticmethod
    def validate_name(name: str) -> bool:
        """Validate name format"""
        return InputValidator.NAME_PATTERN.match(name) is not None
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    @staticmethod
    def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
        """Validate file extension"""
        if not filename:
            return False
        
        extension = filename.lower().split('.')[-1]
        return extension in [ext.lower() for ext in allowed_extensions]
    
    @staticmethod
    def validate_file_size(file_size: int, max_size: int) -> bool:
        """Validate file size"""
        return 0 < file_size <= max_size
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent directory traversal"""
        if not filename:
            return ""
        
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Limit length
        return sanitized[:255]
    
    @staticmethod
    def validate_json_structure(data: Dict[str, Any], required_fields: List[str]) -> bool:
        """Validate JSON structure has required fields"""
        return all(field in data for field in required_fields)
    
    @staticmethod
    def sanitize_search_query(query: str) -> str:
        """Sanitize search query to prevent injection attacks"""
        if not query:
            return ""
        
        # Remove SQL injection patterns
        dangerous_patterns = [
            r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
            r'(--|#|/\*|\*/)',
            r'(\bOR\b.*=.*\bOR\b)',
            r'(\bAND\b.*=.*\bAND\b)',
            r'[\'";]'
        ]
        
        sanitized = query
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # Limit length and sanitize
        return InputValidator.sanitize_string(sanitized, 100)

class ValidationError(HTTPException):
    """Custom validation error"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

def validate_request_data(data: Dict[str, Any], validation_rules: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize request data based on rules"""
    validated_data = {}
    
    for field, rules in validation_rules.items():
        value = data.get(field)
        
        # Check required fields
        if rules.get('required', False) and not value:
            raise ValidationError(f"Field '{field}' is required")
        
        if value is None:
            continue
        
        # Type validation
        expected_type = rules.get('type')
        if expected_type and not isinstance(value, expected_type):
            raise ValidationError(f"Field '{field}' must be of type {expected_type.__name__}")
        
        # String validation
        if isinstance(value, str):
            # Length validation
            min_length = rules.get('min_length', 0)
            max_length = rules.get('max_length', 1000)
            
            if len(value) < min_length:
                raise ValidationError(f"Field '{field}' must be at least {min_length} characters")
            
            if len(value) > max_length:
                raise ValidationError(f"Field '{field}' must be at most {max_length} characters")
            
            # Pattern validation
            pattern = rules.get('pattern')
            if pattern and not pattern.match(value):
                raise ValidationError(f"Field '{field}' has invalid format")
            
            # Sanitization
            if rules.get('sanitize', True):
                if rules.get('html', False):
                    value = InputValidator.sanitize_html(value)
                else:
                    value = InputValidator.sanitize_string(value, max_length)
        
        # Numeric validation
        elif isinstance(value, (int, float)):
            min_value = rules.get('min_value')
            max_value = rules.get('max_value')
            
            if min_value is not None and value < min_value:
                raise ValidationError(f"Field '{field}' must be at least {min_value}")
            
            if max_value is not None and value > max_value:
                raise ValidationError(f"Field '{field}' must be at most {max_value}")
        
        # Custom validation
        custom_validator = rules.get('validator')
        if custom_validator and not custom_validator(value):
            raise ValidationError(f"Field '{field}' failed validation")
        
        validated_data[field] = value
    
    return validated_data