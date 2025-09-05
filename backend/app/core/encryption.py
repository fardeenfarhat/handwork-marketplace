"""
Data encryption utilities for sensitive information storage
"""
import os
import base64
import hashlib
from typing import Optional, Union, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import json
import secrets

from app.core.config import settings

class EncryptionManager:
    """Manages encryption and decryption of sensitive data"""
    
    def __init__(self):
        self._fernet_key = self._get_or_create_fernet_key()
        self._fernet = Fernet(self._fernet_key)
        self._aes_key = self._derive_aes_key()
    
    def _get_or_create_fernet_key(self) -> bytes:
        """Get or create Fernet encryption key"""
        # In production, this should be stored securely (e.g., environment variable, key management service)
        key_material = settings.SECRET_KEY.encode()
        
        # Derive a proper Fernet key from the secret
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'handwork_marketplace_salt',  # In production, use a random salt
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(key_material))
        return key
    
    def _derive_aes_key(self) -> bytes:
        """Derive AES key for additional encryption needs"""
        key_material = settings.SECRET_KEY.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'aes_salt_handwork',
            iterations=100000,
        )
        return kdf.derive(key_material)
    
    def encrypt_sensitive_data(self, data: Union[str, Dict[str, Any]]) -> str:
        """Encrypt sensitive data using Fernet (symmetric encryption)"""
        if isinstance(data, dict):
            data = json.dumps(data)
        
        if isinstance(data, str):
            data = data.encode()
        
        encrypted = self._fernet.encrypt(data)
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._fernet.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")
    
    def encrypt_pii(self, pii_data: str) -> str:
        """Encrypt Personally Identifiable Information with additional security"""
        # Add random padding to prevent pattern analysis
        padded_data = pii_data + '|' + secrets.token_hex(16)
        return self.encrypt_sensitive_data(padded_data)
    
    def decrypt_pii(self, encrypted_pii: str) -> str:
        """Decrypt PII data and remove padding"""
        decrypted = self.decrypt_sensitive_data(encrypted_pii)
        return decrypted.split('|')[0]  # Remove padding
    
    def hash_sensitive_data(self, data: str, salt: Optional[str] = None) -> str:
        """Create irreversible hash of sensitive data for comparison"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        # Use PBKDF2 for password-like data
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt.encode(),
            iterations=100000,
        )
        
        hash_bytes = kdf.derive(data.encode())
        return f"{salt}:{base64.urlsafe_b64encode(hash_bytes).decode()}"
    
    def verify_hashed_data(self, data: str, hashed_data: str) -> bool:
        """Verify data against its hash"""
        try:
            salt, hash_b64 = hashed_data.split(':', 1)
            expected_hash = base64.urlsafe_b64decode(hash_b64.encode())
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt.encode(),
                iterations=100000,
            )
            
            try:
                kdf.verify(data.encode(), expected_hash)
                return True
            except:
                return False
        except:
            return False
    
    def encrypt_file_content(self, file_content: bytes) -> bytes:
        """Encrypt file content using AES"""
        # Generate random IV
        iv = os.urandom(16)
        
        # Create cipher
        cipher = Cipher(algorithms.AES(self._aes_key), modes.CBC(iv))
        encryptor = cipher.encryptor()
        
        # Pad content to multiple of 16 bytes
        padding_length = 16 - (len(file_content) % 16)
        padded_content = file_content + bytes([padding_length] * padding_length)
        
        # Encrypt
        encrypted_content = encryptor.update(padded_content) + encryptor.finalize()
        
        # Return IV + encrypted content
        return iv + encrypted_content
    
    def decrypt_file_content(self, encrypted_content: bytes) -> bytes:
        """Decrypt file content"""
        # Extract IV and encrypted data
        iv = encrypted_content[:16]
        encrypted_data = encrypted_content[16:]
        
        # Create cipher
        cipher = Cipher(algorithms.AES(self._aes_key), modes.CBC(iv))
        decryptor = cipher.decryptor()
        
        # Decrypt
        padded_content = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # Remove padding
        padding_length = padded_content[-1]
        return padded_content[:-padding_length]
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def generate_api_key(self) -> str:
        """Generate secure API key"""
        return f"hm_{secrets.token_urlsafe(32)}"

class PIIProtection:
    """Specialized protection for Personally Identifiable Information"""
    
    def __init__(self, encryption_manager: EncryptionManager):
        self.encryption_manager = encryption_manager
    
    def protect_email(self, email: str) -> Dict[str, str]:
        """Protect email address"""
        return {
            'encrypted': self.encryption_manager.encrypt_pii(email),
            'hash': self.encryption_manager.hash_sensitive_data(email.lower())
        }
    
    def protect_phone(self, phone: str) -> Dict[str, str]:
        """Protect phone number"""
        # Normalize phone number
        normalized = ''.join(filter(str.isdigit, phone))
        return {
            'encrypted': self.encryption_manager.encrypt_pii(normalized),
            'hash': self.encryption_manager.hash_sensitive_data(normalized)
        }
    
    def protect_ssn(self, ssn: str) -> Dict[str, str]:
        """Protect Social Security Number"""
        # Remove formatting
        normalized = ''.join(filter(str.isdigit, ssn))
        return {
            'encrypted': self.encryption_manager.encrypt_pii(normalized),
            'hash': self.encryption_manager.hash_sensitive_data(normalized)
        }
    
    def protect_address(self, address: str) -> Dict[str, str]:
        """Protect physical address"""
        return {
            'encrypted': self.encryption_manager.encrypt_pii(address),
            'hash': self.encryption_manager.hash_sensitive_data(address.lower().strip())
        }
    
    def mask_sensitive_data(self, data: str, data_type: str) -> str:
        """Mask sensitive data for display purposes"""
        if not data:
            return ""
        
        if data_type == 'email':
            parts = data.split('@')
            if len(parts) == 2:
                username = parts[0]
                domain = parts[1]
                masked_username = username[0] + '*' * (len(username) - 2) + username[-1] if len(username) > 2 else '*' * len(username)
                return f"{masked_username}@{domain}"
        
        elif data_type == 'phone':
            if len(data) >= 4:
                return '*' * (len(data) - 4) + data[-4:]
        
        elif data_type == 'ssn':
            if len(data) >= 4:
                return 'XXX-XX-' + data[-4:]
        
        elif data_type == 'credit_card':
            if len(data) >= 4:
                return '*' * (len(data) - 4) + data[-4:]
        
        # Default masking
        if len(data) > 4:
            return data[:2] + '*' * (len(data) - 4) + data[-2:]
        else:
            return '*' * len(data)

class SecureStorage:
    """Secure storage utilities for sensitive files and data"""
    
    def __init__(self, encryption_manager: EncryptionManager):
        self.encryption_manager = encryption_manager
    
    def store_encrypted_file(self, file_path: str, content: bytes) -> str:
        """Store file with encryption"""
        encrypted_content = self.encryption_manager.encrypt_file_content(content)
        
        # Create secure filename
        secure_filename = self.encryption_manager.generate_secure_token(16) + '.enc'
        secure_path = os.path.join(os.path.dirname(file_path), secure_filename)
        
        with open(secure_path, 'wb') as f:
            f.write(encrypted_content)
        
        return secure_filename
    
    def retrieve_encrypted_file(self, file_path: str) -> bytes:
        """Retrieve and decrypt file"""
        with open(file_path, 'rb') as f:
            encrypted_content = f.read()
        
        return self.encryption_manager.decrypt_file_content(encrypted_content)
    
    def secure_delete_file(self, file_path: str):
        """Securely delete file by overwriting with random data"""
        if not os.path.exists(file_path):
            return
        
        file_size = os.path.getsize(file_path)
        
        # Overwrite with random data multiple times
        with open(file_path, 'r+b') as f:
            for _ in range(3):  # 3 passes
                f.seek(0)
                f.write(os.urandom(file_size))
                f.flush()
                os.fsync(f.fileno())
        
        # Finally delete the file
        os.remove(file_path)

# Global instances
encryption_manager = EncryptionManager()
pii_protection = PIIProtection(encryption_manager)
secure_storage = SecureStorage(encryption_manager)