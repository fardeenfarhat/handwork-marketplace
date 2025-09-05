"""
Secure file upload validation and virus scanning
"""
import os
import hashlib
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
import subprocess
from typing import List, Dict, Optional, Tuple, BinaryIO
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageFile
import mimetypes
import tempfile
import shutil
from pathlib import Path
import re

from app.core.config import settings
from app.core.encryption import secure_storage

# Enable loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

class FileValidator:
    """Comprehensive file validation and security scanning"""
    
    # Allowed file types and their MIME types
    ALLOWED_FILE_TYPES = {
        'images': {
            'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            'mime_types': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
            'max_size': 10 * 1024 * 1024,  # 10MB
        },
        'documents': {
            'extensions': ['.pdf', '.doc', '.docx', '.txt'],
            'mime_types': ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'text/plain'],
            'max_size': 25 * 1024 * 1024,  # 25MB
        },
        'kyc_documents': {
            'extensions': ['.jpg', '.jpeg', '.png', '.pdf'],
            'mime_types': ['image/jpeg', 'image/png', 'application/pdf'],
            'max_size': 15 * 1024 * 1024,  # 15MB
        }
    }
    
    # Dangerous file signatures (magic bytes)
    DANGEROUS_SIGNATURES = [
        b'\x4D\x5A',  # PE executable
        b'\x7F\x45\x4C\x46',  # ELF executable
        b'\xCA\xFE\xBA\xBE',  # Java class file
        b'\xFE\xED\xFA\xCE',  # Mach-O executable
        b'\x50\x4B\x03\x04',  # ZIP (could contain malware)
        b'\x52\x61\x72\x21',  # RAR archive
    ]
    
    # Suspicious patterns in filenames
    SUSPICIOUS_PATTERNS = [
        r'\.exe$', r'\.bat$', r'\.cmd$', r'\.com$', r'\.scr$',
        r'\.vbs$', r'\.js$', r'\.jar$', r'\.php$', r'\.asp$',
        r'\.jsp$', r'\.py$', r'\.pl$', r'\.sh$', r'\.ps1$'
    ]
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix='handwork_uploads_')
    
    def validate_file_type(self, file: UploadFile, allowed_category: str) -> bool:
        """Validate file type against allowed categories"""
        if allowed_category not in self.ALLOWED_FILE_TYPES:
            return False
        
        allowed_config = self.ALLOWED_FILE_TYPES[allowed_category]
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in allowed_config['extensions']:
            return False
        
        # Check MIME type
        if file.content_type not in allowed_config['mime_types']:
            return False
        
        return True
    
    def validate_file_size(self, file: UploadFile, allowed_category: str) -> bool:
        """Validate file size"""
        if allowed_category not in self.ALLOWED_FILE_TYPES:
            return False
        
        max_size = self.ALLOWED_FILE_TYPES[allowed_category]['max_size']
        
        # Get file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        return file_size <= max_size
    
    def validate_filename(self, filename: str) -> bool:
        """Validate filename for security issues"""
        if not filename:
            return False
        
        # Check for suspicious patterns
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, filename, re.IGNORECASE):
                return False
        
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            return False
        
        # Check for null bytes
        if '\x00' in filename:
            return False
        
        # Check length
        if len(filename) > 255:
            return False
        
        return True
    
    def detect_file_type_by_content(self, file_content: bytes) -> Optional[str]:
        """Detect actual file type by analyzing content"""
        if MAGIC_AVAILABLE:
            try:
                # Use python-magic to detect file type
                file_type = magic.from_buffer(file_content, mime=True)
                return file_type
            except:
                pass
        
        # Fallback to basic file signature detection
        return self._detect_file_type_by_signature(file_content)
    
    def _detect_file_type_by_signature(self, file_content: bytes) -> Optional[str]:
        """Basic file type detection by file signatures"""
        if not file_content:
            return None
        
        # Common file signatures
        signatures = {
            b'\xFF\xD8\xFF': 'image/jpeg',
            b'\x89PNG\r\n\x1a\n': 'image/png',
            b'GIF87a': 'image/gif',
            b'GIF89a': 'image/gif',
            b'RIFF': 'image/webp',  # WebP files start with RIFF
            b'%PDF': 'application/pdf',
            b'PK\x03\x04': 'application/zip',
        }
        
        for signature, mime_type in signatures.items():
            if file_content.startswith(signature):
                return mime_type
        
        return None
    
    def validate_image_content(self, file_content: bytes) -> bool:
        """Validate image content and check for embedded threats"""
        try:
            # Try to open and verify the image
            with tempfile.NamedTemporaryFile() as temp_file:
                temp_file.write(file_content)
                temp_file.flush()
                
                # Open with PIL to validate
                with Image.open(temp_file.name) as img:
                    # Verify image format
                    img.verify()
                    
                    # Check image dimensions (prevent zip bombs)
                    width, height = img.size
                    if width > 10000 or height > 10000:
                        return False
                    
                    # Check for reasonable file size vs dimensions ratio
                    expected_size = width * height * 3  # Rough estimate for RGB
                    if len(file_content) > expected_size * 2:  # Allow 2x overhead
                        return False
                
                return True
        except Exception:
            return False
    
    def scan_for_malware_signatures(self, file_content: bytes) -> bool:
        """Scan file content for known malware signatures"""
        # Check for dangerous file signatures
        for signature in self.DANGEROUS_SIGNATURES:
            if file_content.startswith(signature):
                return False
        
        # Check for suspicious strings in content
        suspicious_strings = [
            b'<script', b'javascript:', b'vbscript:', b'onload=',
            b'eval(', b'exec(', b'system(', b'shell_exec(',
            b'<?php', b'<%', b'<jsp:', b'<%@'
        ]
        
        content_lower = file_content.lower()
        for suspicious in suspicious_strings:
            if suspicious in content_lower:
                return False
        
        return True
    
    def calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def scan_with_clamav(self, file_path: str) -> bool:
        """Scan file with ClamAV antivirus (if available)"""
        try:
            # Check if ClamAV is available
            result = subprocess.run(['clamscan', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode != 0:
                # ClamAV not available, skip scan
                return True
            
            # Scan the file
            result = subprocess.run(['clamscan', '--no-summary', file_path], 
                                  capture_output=True, text=True, timeout=30)
            
            # Return True if clean (exit code 0), False if infected (exit code 1)
            return result.returncode == 0
            
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            # If ClamAV is not available or fails, allow the file but log the issue
            return True
    
    def quarantine_file(self, file_path: str, reason: str):
        """Move suspicious file to quarantine directory"""
        quarantine_dir = os.path.join(settings.UPLOAD_DIR, 'quarantine')
        os.makedirs(quarantine_dir, exist_ok=True)
        
        filename = os.path.basename(file_path)
        quarantine_path = os.path.join(quarantine_dir, f"{reason}_{filename}")
        
        shutil.move(file_path, quarantine_path)
    
    def comprehensive_file_scan(self, file: UploadFile, allowed_category: str) -> Dict[str, any]:
        """Perform comprehensive file security scan"""
        scan_result = {
            'safe': False,
            'issues': [],
            'file_hash': None,
            'detected_type': None,
            'file_size': 0
        }
        
        try:
            # Read file content
            file_content = file.file.read()
            file.file.seek(0)  # Reset file pointer
            
            scan_result['file_size'] = len(file_content)
            scan_result['file_hash'] = self.calculate_file_hash(file_content)
            
            # Validate filename
            if not self.validate_filename(file.filename):
                scan_result['issues'].append('Invalid or suspicious filename')
                return scan_result
            
            # Validate file type
            if not self.validate_file_type(file, allowed_category):
                scan_result['issues'].append('File type not allowed')
                return scan_result
            
            # Validate file size
            if not self.validate_file_size(file, allowed_category):
                scan_result['issues'].append('File size exceeds limit')
                return scan_result
            
            # Detect actual file type
            detected_type = self.detect_file_type_by_content(file_content)
            scan_result['detected_type'] = detected_type
            
            # Verify file type matches content
            allowed_mimes = self.ALLOWED_FILE_TYPES[allowed_category]['mime_types']
            if detected_type and detected_type not in allowed_mimes:
                scan_result['issues'].append('File content does not match declared type')
                return scan_result
            
            # Scan for malware signatures
            if not self.scan_for_malware_signatures(file_content):
                scan_result['issues'].append('Suspicious content detected')
                return scan_result
            
            # Additional validation for images
            if allowed_category in ['images', 'kyc_documents'] and detected_type and detected_type.startswith('image/'):
                if not self.validate_image_content(file_content):
                    scan_result['issues'].append('Invalid or corrupted image')
                    return scan_result
            
            # Create temporary file for external scanning
            with tempfile.NamedTemporaryFile(delete=False, dir=self.temp_dir) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Scan with ClamAV if available
                if not self.scan_with_clamav(temp_file_path):
                    scan_result['issues'].append('Virus detected')
                    self.quarantine_file(temp_file_path, 'virus')
                    return scan_result
                
                # If all checks pass
                scan_result['safe'] = True
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
        except Exception as e:
            scan_result['issues'].append(f'Scan error: {str(e)}')
        
        return scan_result

class SecureFileUpload:
    """Secure file upload handler"""
    
    def __init__(self):
        self.validator = FileValidator()
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def save_file_securely(self, file: UploadFile, category: str, user_id: int) -> Dict[str, str]:
        """Save file securely after validation"""
        # Perform comprehensive scan
        scan_result = self.validator.comprehensive_file_scan(file, category)
        
        if not scan_result['safe']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File upload rejected: {', '.join(scan_result['issues'])}"
            )
        
        # Generate secure filename
        file_ext = Path(file.filename).suffix.lower()
        secure_filename = f"{user_id}_{scan_result['file_hash'][:16]}{file_ext}"
        
        # Create category directory
        category_dir = os.path.join(self.upload_dir, category)
        os.makedirs(category_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(category_dir, secure_filename)
        
        # Read and encrypt file content
        file_content = file.file.read()
        encrypted_filename = secure_storage.store_encrypted_file(file_path, file_content)
        
        return {
            'filename': secure_filename,
            'encrypted_filename': encrypted_filename,
            'file_hash': scan_result['file_hash'],
            'file_size': scan_result['file_size'],
            'category': category,
            'path': os.path.join(category, encrypted_filename)
        }
    
    def get_file_securely(self, file_path: str) -> bytes:
        """Retrieve and decrypt file securely"""
        full_path = os.path.join(self.upload_dir, file_path)
        
        if not os.path.exists(full_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return secure_storage.retrieve_encrypted_file(full_path)
    
    def delete_file_securely(self, file_path: str):
        """Securely delete file"""
        full_path = os.path.join(self.upload_dir, file_path)
        
        if os.path.exists(full_path):
            secure_storage.secure_delete_file(full_path)

# Global instance
secure_file_upload = SecureFileUpload()