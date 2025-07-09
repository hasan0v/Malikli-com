"""
Quick test for Cloudflare R2 storage integration
Run this file directly to test R2 connectivity
"""
import os
import sys
import time

# Set up Django environment BEFORE other imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Then import Django
import django
django.setup()

# Now we can safely import Django-related modules
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw
from io import BytesIO

# Import our custom modules
from products.r2_utils import check_r2_connection
# Now it's safe to import our storage class
from products.storage import CloudflareR2Storage

def create_dummy_image(text="R2 Test"):
    """Creates a small dummy PNG image for testing."""
    img = Image.new('RGB', (200, 100), color='blue')
    d = ImageDraw.Draw(img)
    d.text((20, 40), text, fill=(255, 255, 255))
    
    # Save to BytesIO instead of file
    img_io = BytesIO()
    img.save(img_io, format='PNG')
    img_io.seek(0)
    return img_io

def test_django_storage():
    """Test Django's default storage configuration"""
    print(f"Testing {settings.DEFAULT_FILE_STORAGE} configuration...")
    
    # Create test image content
    img_content = create_dummy_image(f"Django Test {int(time.time())}")
    
    # Define a path in the storage with timestamp to avoid cache issues
    timestamp = int(time.time())
    path = f'test_uploads/django_test_{timestamp}.png'
    
    # Save the file using default_storage
    path = default_storage.save(path, ContentFile(img_content.read()))
    
    # Get the file's URL
    url = default_storage.url(path)
    
    print(f"File saved at path: {path}")
    print(f"File URL: {url}")
    
    # Test if file exists
    exists = default_storage.exists(path)
    print(f"File exists in storage: {exists}")
    
    return path, url

def test_direct_r2_storage():
    """Test R2 storage directly"""
    print("\nTesting direct R2 storage...")
    
    # Create a test image
    img_content = create_dummy_image(f"Direct R2 Test {int(time.time())}")
    
    try:
        # Create storage instance
        r2_storage = CloudflareR2Storage()
        print(f"Created R2 storage instance")
        
        # Generate filename with timestamp
        timestamp = int(time.time())
        filename = f"test_uploads/direct_r2_test_{timestamp}.png"
        
        # Upload file
        path = r2_storage.save(filename, ContentFile(img_content.read()))
        print(f"File saved at: {path}")
        
        # Get URL
        url = r2_storage.url(path)
        print(f"File URL: {url}")
        
        # Check if exists
        exists = r2_storage.exists(path)
        print(f"File exists in storage: {exists}")
        
        return path, url
    except Exception as e:
        print(f"Direct R2 storage failed: {e}")
        raise

def test_r2_connection():
    """Test connection to R2"""
    print("\nTesting R2 connection...")
    success, message = check_r2_connection()
    
    if success:
        print(f"Connection successful: {message}")
    else:
        print(f"Connection failed: {message}")
    return success

if __name__ == "__main__":
    # Print environment info
    print("=" * 60)
    print("R2 STORAGE TEST SCRIPT")
    print("=" * 60)
    print("\nDjango Environment:")
    print(f"  Settings module: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"  Storage backend: {settings.DEFAULT_FILE_STORAGE}")
    print(f"  Media URL: {settings.MEDIA_URL}")
    print(f"  Media Root: {settings.MEDIA_ROOT}")
    print(f"  R2 Bucket: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)}")
    print(f"  R2 Endpoint: {getattr(settings, 'AWS_S3_ENDPOINT_URL', None)}")
    print(f"  R2 Custom Domain: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)}")
    print(f"  R2 Location: {getattr(settings, 'AWS_LOCATION', None)}")
    
    # Test connection
    connection_success = test_r2_connection()
    if not connection_success:
        print("\nR2 connection test failed. Further tests may not work correctly.")
    
    # Test storage
    try:
        # Test regular Django storage
        path, url = test_django_storage()
        print("\nDjango storage test successful!")
        print(f"File saved at: {path}")
        print(f"Access URL: {url}")
        
        # Test direct R2 storage
        try:
            r2_path, r2_url = test_direct_r2_storage()
            print("\nDirect R2 storage test successful!")
            print(f"File saved at: {r2_path}")
            print(f"Access URL: {r2_url}")
        except Exception as e:
            print(f"\nDirect R2 storage test failed: {str(e)}")
            
    except Exception as e:
        print(f"\nStorage test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETED")
    print("=" * 60)
