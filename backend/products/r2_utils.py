import boto3
import os
from django.conf import settings
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError

def check_r2_connection():
    """
    Test the R2 connection and bucket accessibility
    Returns a tuple (success, message)
    """
    # Get settings from Django settings
    aws_access_key_id = settings.AWS_ACCESS_KEY_ID
    aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY
    aws_storage_bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    aws_s3_endpoint_url = settings.AWS_S3_ENDPOINT_URL
    aws_s3_region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'auto')

    # Validate credentials are loaded
    if not all([aws_access_key_id, aws_secret_access_key, aws_storage_bucket_name, aws_s3_endpoint_url]):
        return False, "Missing one or more R2 configuration variables in settings"

    try:
        # Create an S3 client configured for R2
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            endpoint_url=aws_s3_endpoint_url,
            region_name=aws_s3_region_name, 
            config=boto3.session.Config(signature_version='s3v4')
        )

        # Try to list objects to check if bucket exists and is accessible
        s3_client.list_objects_v2(Bucket=aws_storage_bucket_name, MaxKeys=1)
        return True, "Successfully connected to R2 bucket"
    
    except NoCredentialsError:
        return False, "Credentials not available. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    except PartialCredentialsError:
        return False, "Incomplete credentials provided"
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'InvalidAccessKeyId':
            return False, "Invalid Access Key ID. Check AWS_ACCESS_KEY_ID"
        elif error_code == 'SignatureDoesNotMatch':
            return False, "Signature does not match. Check AWS_SECRET_ACCESS_KEY"
        elif error_code == 'NoSuchBucket':
            return False, f"Bucket '{aws_storage_bucket_name}' does not exist"
        elif error_code == 'AccessDenied':
            return False, "Access Denied. Check bucket policies and permissions"
        else:
            return False, f"Client error: {error_code}: {e}"
    except Exception as e:
        return False, f"Unexpected error: {e}"
