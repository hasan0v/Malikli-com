from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class CloudflareR2Storage(S3Boto3Storage):
    """
    Custom storage for Cloudflare R2 implementing the same configuration 
    that works in test_r2_upload.py
    """
    # Set these settings at instance initialization to prevent early settings access
    def __init__(self, *args, **kwargs):
        # Get settings from Django settings
        self.bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        self.custom_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
        self.addressing_style = 'virtual'  # Important for R2
        self.signature_version = 's3v4'    # Important for R2
        self.region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'auto')
        self.file_overwrite = False  # Don't overwrite files with the same name
        self.location = getattr(settings, 'AWS_LOCATION', '')
        self.access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        self.secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        self.endpoint_url = getattr(settings, 'AWS_S3_ENDPOINT_URL', None)
        
        # Pass settings to the parent class
        super().__init__(*args, **kwargs)
