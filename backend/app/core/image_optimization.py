"""
Image optimization and compression for uploads.
"""
import os
import logging
from typing import Tuple, Optional, Dict, Any
from PIL import Image, ImageOps
import io
from pathlib import Path

logger = logging.getLogger(__name__)

class ImageOptimizer:
    """Image optimization and compression utilities."""
    
    # Image size configurations
    SIZES = {
        'profile': (300, 300),
        'portfolio': (800, 600),
        'thumbnail': (150, 150),
        'large': (1200, 900)
    }
    
    # Quality settings
    QUALITY_SETTINGS = {
        'high': 95,
        'medium': 85,
        'low': 70,
        'thumbnail': 60
    }
    
    @staticmethod
    def optimize_image(
        input_path: str,
        output_path: str = None,
        size_type: str = 'portfolio',
        quality: str = 'medium',
        format: str = 'JPEG'
    ) -> Dict[str, Any]:
        """
        Optimize an image with resizing and compression.
        
        Args:
            input_path: Path to input image
            output_path: Path for output image (optional)
            size_type: Size configuration to use
            quality: Quality setting
            format: Output format
            
        Returns:
            Dict with optimization results
        """
        try:
            if not os.path.exists(input_path):
                raise FileNotFoundError(f"Input file not found: {input_path}")
            
            # Get original file size
            original_size = os.path.getsize(input_path)
            
            # Open and process image
            with Image.open(input_path) as img:
                # Get original dimensions
                original_width, original_height = img.size
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background for transparency
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Auto-rotate based on EXIF data
                img = ImageOps.exif_transpose(img)
                
                # Resize image
                target_size = ImageOptimizer.SIZES.get(size_type, (800, 600))
                img = ImageOptimizer._smart_resize(img, target_size)
                
                # Set output path
                if not output_path:
                    path_obj = Path(input_path)
                    output_path = str(path_obj.parent / f"{path_obj.stem}_optimized{path_obj.suffix}")
                
                # Save optimized image
                quality_value = ImageOptimizer.QUALITY_SETTINGS.get(quality, 85)
                
                save_kwargs = {
                    'format': format,
                    'quality': quality_value,
                    'optimize': True
                }
                
                if format == 'JPEG':
                    save_kwargs['progressive'] = True
                
                img.save(output_path, **save_kwargs)
                
                # Get optimized file size
                optimized_size = os.path.getsize(output_path)
                
                # Calculate compression ratio
                compression_ratio = (1 - optimized_size / original_size) * 100
                
                result = {
                    'success': True,
                    'input_path': input_path,
                    'output_path': output_path,
                    'original_size': original_size,
                    'optimized_size': optimized_size,
                    'compression_ratio': round(compression_ratio, 2),
                    'original_dimensions': (original_width, original_height),
                    'optimized_dimensions': img.size,
                    'format': format,
                    'quality': quality
                }
                
                logger.info(f"Image optimized: {compression_ratio:.1f}% reduction")
                return result
                
        except Exception as e:
            logger.error(f"Image optimization failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'input_path': input_path
            }
    
    @staticmethod
    def _smart_resize(img: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
        """
        Smart resize that maintains aspect ratio and crops if necessary.
        """
        target_width, target_height = target_size
        original_width, original_height = img.size
        
        # Calculate aspect ratios
        target_ratio = target_width / target_height
        original_ratio = original_width / original_height
        
        if original_ratio > target_ratio:
            # Image is wider than target - crop width
            new_height = original_height
            new_width = int(original_height * target_ratio)
            left = (original_width - new_width) // 2
            img = img.crop((left, 0, left + new_width, new_height))
        elif original_ratio < target_ratio:
            # Image is taller than target - crop height
            new_width = original_width
            new_height = int(original_width / target_ratio)
            top = (original_height - new_height) // 2
            img = img.crop((0, top, new_width, top + new_height))
        
        # Resize to target dimensions
        return img.resize(target_size, Image.Resampling.LANCZOS)
    
    @staticmethod
    def create_thumbnail(input_path: str, output_path: str = None) -> Dict[str, Any]:
        """Create a thumbnail version of an image."""
        return ImageOptimizer.optimize_image(
            input_path=input_path,
            output_path=output_path,
            size_type='thumbnail',
            quality='thumbnail'
        )
    
    @staticmethod
    def batch_optimize(
        input_directory: str,
        output_directory: str = None,
        size_type: str = 'portfolio',
        quality: str = 'medium'
    ) -> List[Dict[str, Any]]:
        """
        Batch optimize all images in a directory.
        """
        if not output_directory:
            output_directory = input_directory
        
        # Create output directory if it doesn't exist
        os.makedirs(output_directory, exist_ok=True)
        
        results = []
        supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        for filename in os.listdir(input_directory):
            file_path = os.path.join(input_directory, filename)
            
            # Skip if not an image file
            if not any(filename.lower().endswith(ext) for ext in supported_formats):
                continue
            
            # Skip if not a file
            if not os.path.isfile(file_path):
                continue
            
            # Generate output path
            name, ext = os.path.splitext(filename)
            output_path = os.path.join(output_directory, f"{name}_optimized.jpg")
            
            # Optimize image
            result = ImageOptimizer.optimize_image(
                input_path=file_path,
                output_path=output_path,
                size_type=size_type,
                quality=quality
            )
            
            results.append(result)
        
        logger.info(f"Batch optimization completed: {len(results)} images processed")
        return results
    
    @staticmethod
    def validate_image(file_path: str) -> Dict[str, Any]:
        """
        Validate an image file.
        """
        try:
            with Image.open(file_path) as img:
                # Basic validation
                img.verify()
                
                # Reopen for detailed info (verify() closes the image)
                with Image.open(file_path) as img:
                    width, height = img.size
                    format = img.format
                    mode = img.mode
                    file_size = os.path.getsize(file_path)
                    
                    # Check if image is too large
                    max_dimension = 4000
                    max_file_size = 10 * 1024 * 1024  # 10MB
                    
                    issues = []
                    if width > max_dimension or height > max_dimension:
                        issues.append(f"Image dimensions too large: {width}x{height}")
                    
                    if file_size > max_file_size:
                        issues.append(f"File size too large: {file_size / 1024 / 1024:.1f}MB")
                    
                    return {
                        'valid': len(issues) == 0,
                        'issues': issues,
                        'width': width,
                        'height': height,
                        'format': format,
                        'mode': mode,
                        'file_size': file_size
                    }
                    
        except Exception as e:
            return {
                'valid': False,
                'issues': [f"Invalid image file: {str(e)}"],
                'error': str(e)
            }

class ImageUploadHandler:
    """Handle image uploads with optimization."""
    
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)
    
    async def process_upload(
        self,
        file_content: bytes,
        filename: str,
        user_id: int,
        image_type: str = 'portfolio'
    ) -> Dict[str, Any]:
        """
        Process an uploaded image file.
        """
        try:
            # Generate unique filename
            import uuid
            file_ext = os.path.splitext(filename)[1].lower()
            unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
            
            # Create user directory
            user_dir = os.path.join(self.upload_dir, str(user_id))
            os.makedirs(user_dir, exist_ok=True)
            
            # Save original file
            original_path = os.path.join(user_dir, f"original_{unique_filename}")
            with open(original_path, 'wb') as f:
                f.write(file_content)
            
            # Validate image
            validation = ImageOptimizer.validate_image(original_path)
            if not validation['valid']:
                os.remove(original_path)
                return {
                    'success': False,
                    'error': 'Invalid image file',
                    'issues': validation['issues']
                }
            
            # Optimize image
            optimized_path = os.path.join(user_dir, unique_filename)
            optimization_result = ImageOptimizer.optimize_image(
                input_path=original_path,
                output_path=optimized_path,
                size_type=image_type,
                quality='medium'
            )
            
            if not optimization_result['success']:
                os.remove(original_path)
                return optimization_result
            
            # Create thumbnail
            thumbnail_path = os.path.join(user_dir, f"thumb_{unique_filename}")
            thumbnail_result = ImageOptimizer.create_thumbnail(
                input_path=optimized_path,
                output_path=thumbnail_path
            )
            
            # Clean up original file
            os.remove(original_path)
            
            return {
                'success': True,
                'filename': unique_filename,
                'optimized_path': optimized_path,
                'thumbnail_path': thumbnail_path if thumbnail_result['success'] else None,
                'optimization_stats': optimization_result,
                'validation_info': validation
            }
            
        except Exception as e:
            logger.error(f"Image upload processing failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

def setup_image_optimization():
    """Setup image optimization system."""
    # Ensure PIL is available with required formats
    try:
        from PIL import Image
        logger.info(f"PIL available with formats: {Image.registered_extensions()}")
    except ImportError:
        logger.error("PIL not available - image optimization disabled")
        return False
    
    return True