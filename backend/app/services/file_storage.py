import os
import uuid
import shutil
from typing import List, Optional, Tuple
from pathlib import Path
from fastapi import UploadFile, HTTPException
from PIL import Image
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
from app.core.config import settings


class FileStorageService:
    """Service for handling file uploads and storage"""
    
    # Allowed file types
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
    }
    
    ALLOWED_DOCUMENT_TYPES = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png'
    }
    
    ALLOWED_MESSAGE_ATTACHMENT_TYPES = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    }
    
    # File size limits (in bytes)
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_MESSAGE_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Image dimensions
    MAX_IMAGE_WIDTH = 2048
    MAX_IMAGE_HEIGHT = 2048
    THUMBNAIL_SIZE = (300, 300)
    
    def __init__(self):
        self.base_upload_dir = Path(settings.UPLOAD_DIR)
        self.profile_images_dir = self.base_upload_dir / "profile_images"
        self.portfolio_images_dir = self.base_upload_dir / "portfolio_images"
        self.kyc_documents_dir = self.base_upload_dir / "kyc_documents"
        self.message_attachments_dir = self.base_upload_dir / "message_attachments"
        
        # Create directories if they don't exist
        for directory in [self.profile_images_dir, self.portfolio_images_dir, self.kyc_documents_dir, self.message_attachments_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _validate_file_type(self, file: UploadFile, allowed_types: dict) -> str:
        """Validate file type and return file extension"""
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        
        if HAS_MAGIC:
            # Use python-magic to detect actual file type
            file_content = file.file.read(1024)  # Read first 1KB
            file.file.seek(0)  # Reset file pointer
            
            detected_type = magic.from_buffer(file_content, mime=True)
            
            if detected_type not in allowed_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type {detected_type} not allowed. Allowed types: {list(allowed_types.keys())}"
                )
            
            return allowed_types[detected_type]
        else:
            # Fallback to file extension validation when magic is not available
            if file_ext not in allowed_types.values():
                raise HTTPException(
                    status_code=400,
                    detail=f"File extension {file_ext} not allowed. Allowed extensions: {list(allowed_types.values())}"
                )
            
            # Return the extension as-is
            return file_ext
    
    def _validate_file_size(self, file: UploadFile, max_size: int):
        """Validate file size"""
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size {file_size} bytes exceeds maximum allowed size {max_size} bytes"
            )
    
    def _generate_unique_filename(self, original_filename: str, extension: str) -> str:
        """Generate unique filename"""
        base_name = Path(original_filename).stem
        unique_id = str(uuid.uuid4())[:8]
        return f"{base_name}_{unique_id}{extension}"
    
    def _resize_image(self, image_path: Path, max_width: int, max_height: int) -> Path:
        """Resize image if it exceeds maximum dimensions"""
        try:
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Check if resizing is needed
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                    img.save(image_path, 'JPEG', quality=85, optimize=True)
                
                return image_path
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")
    
    def _create_thumbnail(self, image_path: Path) -> Path:
        """Create thumbnail for image"""
        try:
            thumbnail_path = image_path.parent / f"thumb_{image_path.name}"
            
            with Image.open(image_path) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                img.save(thumbnail_path, 'JPEG', quality=80, optimize=True)
                
                return thumbnail_path
        except Exception as e:
            # If thumbnail creation fails, it's not critical
            return None
    
    async def upload_profile_image(self, user_id: int, file: UploadFile) -> dict:
        """Upload and process profile image"""
        # Validate file
        extension = self._validate_file_type(file, self.ALLOWED_IMAGE_TYPES)
        self._validate_file_size(file, self.MAX_IMAGE_SIZE)
        
        # Generate unique filename
        filename = self._generate_unique_filename(file.filename, extension)
        file_path = self.profile_images_dir / str(user_id) / filename
        
        # Create user directory
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Resize image if needed
            self._resize_image(file_path, self.MAX_IMAGE_WIDTH, self.MAX_IMAGE_HEIGHT)
            
            # Create thumbnail
            thumbnail_path = self._create_thumbnail(file_path)
            
            return {
                "filename": filename,
                "path": str(file_path.relative_to(self.base_upload_dir)),
                "thumbnail_path": str(thumbnail_path.relative_to(self.base_upload_dir)) if thumbnail_path else None,
                "size": file_path.stat().st_size,
                "url": f"/uploads/profile_images/{user_id}/{filename}"
            }
            
        except Exception as e:
            # Clean up file if something went wrong
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    async def upload_portfolio_image(self, user_id: int, file: UploadFile) -> dict:
        """Upload and process portfolio image"""
        # Validate file
        extension = self._validate_file_type(file, self.ALLOWED_IMAGE_TYPES)
        self._validate_file_size(file, self.MAX_IMAGE_SIZE)
        
        # Generate unique filename
        filename = self._generate_unique_filename(file.filename, extension)
        file_path = self.portfolio_images_dir / str(user_id) / filename
        
        # Create user directory
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Resize image if needed
            self._resize_image(file_path, self.MAX_IMAGE_WIDTH, self.MAX_IMAGE_HEIGHT)
            
            # Create thumbnail
            thumbnail_path = self._create_thumbnail(file_path)
            
            return {
                "filename": filename,
                "path": str(file_path.relative_to(self.base_upload_dir)),
                "thumbnail_path": str(thumbnail_path.relative_to(self.base_upload_dir)) if thumbnail_path else None,
                "size": file_path.stat().st_size,
                "url": f"/uploads/portfolio_images/{user_id}/{filename}"
            }
            
        except Exception as e:
            # Clean up file if something went wrong
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    async def upload_kyc_document(self, user_id: int, document_type: str, file: UploadFile) -> dict:
        """Upload KYC document"""
        # Validate file
        extension = self._validate_file_type(file, self.ALLOWED_DOCUMENT_TYPES)
        self._validate_file_size(file, self.MAX_DOCUMENT_SIZE)
        
        # Generate unique filename with document type
        base_filename = f"{document_type}_{Path(file.filename).stem}"
        filename = self._generate_unique_filename(base_filename, extension)
        file_path = self.kyc_documents_dir / str(user_id) / filename
        
        # Create user directory
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            return {
                "filename": filename,
                "path": str(file_path.relative_to(self.base_upload_dir)),
                "document_type": document_type,
                "size": file_path.stat().st_size,
                "url": f"/uploads/kyc_documents/{user_id}/{filename}"
            }
            
        except Exception as e:
            # Clean up file if something went wrong
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            full_path = self.base_upload_dir / file_path
            if full_path.exists():
                full_path.unlink()
                
                # Also delete thumbnail if it exists
                if "profile_images" in file_path or "portfolio_images" in file_path:
                    thumbnail_path = full_path.parent / f"thumb_{full_path.name}"
                    if thumbnail_path.exists():
                        thumbnail_path.unlink()
                
                return True
            return False
        except Exception:
            return False
    
    async def upload_message_attachment(self, user_id: int, file: UploadFile) -> dict:
        """Upload message attachment (image or document)"""
        # Validate file
        extension = self._validate_file_type(file, self.ALLOWED_MESSAGE_ATTACHMENT_TYPES)
        self._validate_file_size(file, self.MAX_MESSAGE_ATTACHMENT_SIZE)
        
        # Generate unique filename
        filename = self._generate_unique_filename(file.filename, extension)
        file_path = self.message_attachments_dir / str(user_id) / filename
        
        # Create user directory
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # If it's an image, resize and create thumbnail
            thumbnail_path = None
            if extension.lower() in ['.jpg', '.jpeg', '.png', '.gif']:
                self._resize_image(file_path, self.MAX_IMAGE_WIDTH, self.MAX_IMAGE_HEIGHT)
                thumbnail_path = self._create_thumbnail(file_path)
            
            return {
                "filename": filename,
                "path": str(file_path.relative_to(self.base_upload_dir)),
                "thumbnail_path": str(thumbnail_path.relative_to(self.base_upload_dir)) if thumbnail_path else None,
                "size": file_path.stat().st_size,
                "url": f"/uploads/message_attachments/{user_id}/{filename}",
                "type": "image" if extension.lower() in ['.jpg', '.jpeg', '.png', '.gif'] else "document"
            }
            
        except Exception as e:
            # Clean up file if something went wrong
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    def save_message_attachment(self, file: UploadFile, user_id: int) -> str:
        """Save message attachment and return file path (sync version for messaging service)"""
        import asyncio
        
        # Run the async method in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(self.upload_message_attachment(user_id, file))
            return result["path"]
        finally:
            loop.close()
    
    def get_file_url(self, file_path: str) -> str:
        """Get public URL for file"""
        return f"/uploads/{file_path}"


# Create global instance
file_storage = FileStorageService()