"""
Image processing utilities for converting and optimizing images.
"""

import os
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)

def convert_to_webp(image_file, quality=85, max_width=1920, max_height=1920):
    """
    Convert an image to WebP format with optimization.
    
    Args:
        image_file: Django UploadedFile or file-like object
        quality: WebP quality (1-100, default 85)
        max_width: Maximum width for resizing (default 1920)
        max_height: Maximum height for resizing (default 1920)
    
    Returns:
        ContentFile: WebP formatted image as Django ContentFile
    """
    try:
        # Open the image
        if hasattr(image_file, 'read'):
            image = Image.open(image_file)
        else:
            image = Image.open(BytesIO(image_file))
        
        # Convert RGBA to RGB if necessary (WebP supports RGBA but this ensures compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create a white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize image if it's too large
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            logger.info(f"Image resized to {image.width}x{image.height}")
        
        # Save as WebP
        output = BytesIO()
        image.save(
            output, 
            format='WEBP', 
            quality=quality,
            optimize=True,
            method=6  # Maximum compression effort
        )
        output.seek(0)
          # Create a new filename with .webp extension
        original_name = getattr(image_file, 'name', 'image')
        name_without_ext = os.path.splitext(original_name)[0]
        webp_name = f"{name_without_ext}.webp"
        
        # Use safer logging to avoid Unicode issues
        try:
            logger.info(f"Successfully converted {original_name} to WebP format")
        except UnicodeEncodeError:
            logger.info("Successfully converted image to WebP format (filename contains special characters)")
        
        return ContentFile(output.getvalue(), name=webp_name)
        
    except Exception as e:
        logger.error(f"Error converting image to WebP: {str(e)}")
        # Return the original file if conversion fails
        return image_file

def should_convert_image(image_file):
    """
    Check if an image should be converted to WebP.
    
    Args:
        image_file: Django UploadedFile or file-like object
    
    Returns:
        bool: True if image should be converted, False otherwise
    """
    if not image_file:
        return False
    
    # Get file extension
    filename = getattr(image_file, 'name', '')
    if not filename:
        return False
    
    ext = os.path.splitext(filename)[1].lower()
    
    # Convert common image formats to WebP
    convertible_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    
    # Don't convert if already WebP, GIF (to preserve animation), or SVG
    skip_formats = ['.webp', '.gif', '.svg']
    
    if ext in skip_formats:
        return False
    
    return ext in convertible_formats

def optimize_image_for_upload(image_file, image_type='general'):
    """
    Optimize image for upload based on image type.
    
    Args:
        image_file: Django UploadedFile or file-like object
        image_type: Type of image ('product', 'variant', 'category', 'banner', 'general')
    
    Returns:
        ContentFile: Optimized image
    """
    if not should_convert_image(image_file):
        return image_file
    
    # Define different optimization settings for different image types
    optimization_settings = {
        'product': {'quality': 85, 'max_width': 1920, 'max_height': 1920},
        'variant': {'quality': 85, 'max_width': 1920, 'max_height': 1920},
        'category': {'quality': 80, 'max_width': 800, 'max_height': 600},
        'banner': {'quality': 90, 'max_width': 2400, 'max_height': 1200},
        'general': {'quality': 85, 'max_width': 1920, 'max_height': 1920}
    }
    
    settings = optimization_settings.get(image_type, optimization_settings['general'])
    
    return convert_to_webp(
        image_file,
        quality=settings['quality'],
        max_width=settings['max_width'],
        max_height=settings['max_height']
    )
