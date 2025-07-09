import boto3
import os
from dotenv import load_dotenv
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError

# Load environment variables from .env file
load_dotenv()

# --- Configuration (Load from environment variables) ---
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL') # e.g., https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'auto') # R2 specific, usually 'auto'

# --- File to Upload (Create a dummy file for testing) ---
LOCAL_FILE_PATH = 'test_image.png'  # Create this file in the same directory as the script
R2_OBJECT_KEY = 'test_uploads/my_test_image.png' # The key (path) in your R2 bucket

def create_dummy_image(file_path):
    """Creates a small dummy PNG image for testing."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (60, 30), color = 'red')
        d = ImageDraw.Draw(img)
        d.text((10,10), "R2 Test", fill=(255,255,0))
        img.save(file_path)
        print(f"Dummy image created at {file_path}")
    except ImportError:
        print("Pillow library not found. Creating a simple text file instead.")
        print("Please install Pillow for dummy image creation: pip install Pillow")
        with open(file_path, 'w') as f:
            f.write("This is a test file for R2 upload.")
        print(f"Dummy text file created at {file_path}")


def upload_to_r2(local_file_path, bucket_name, object_key):
    """
    Uploads a file to an R2 bucket.
    """
    # Validate credentials are loaded
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME, AWS_S3_ENDPOINT_URL]):
        print("Error: Missing one or more R2 configuration variables in your .env file.")
        print("Please check: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME, AWS_S3_ENDPOINT_URL")
        return False

    print(f"Attempting to upload '{local_file_path}' to R2 bucket '{bucket_name}' as '{object_key}'...")
    print(f"Using Endpoint URL: {AWS_S3_ENDPOINT_URL}")
    print(f"Using Access Key ID: {AWS_ACCESS_KEY_ID[:5]}... (truncated for security)") # Show only part of the key

    # Create an S3 client configured for R2
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        endpoint_url=AWS_S3_ENDPOINT_URL,
        region_name=AWS_S3_REGION_NAME, # For R2, 'auto' is common, or specific region like 'wnam', 'enam', etc.
        config=boto3.session.Config(signature_version='s3v4') # R2 requires v4 signatures
    )

    try:
        with open(local_file_path, "rb") as f:
            s3_client.upload_fileobj(
                f,
                bucket_name,
                object_key,
                ExtraArgs={ # Optional: Set content type, ACL (though R2 ACLs are limited)
                    # 'ACL': 'public-read', # R2 generally ignores S3 ACLs, use bucket policies or Workers for public access
                    'ContentType': 'image/png' # Adjust if your dummy file is different
                }
            )
        print(f"Successfully uploaded '{local_file_path}' to '{bucket_name}/{object_key}'")

        # Construct the potential public URL (this depends on your public access setup)
        # If using a custom domain connected to R2:
        aws_s3_custom_domain = os.getenv('AWS_S3_CUSTOM_DOMAIN')
        if aws_s3_custom_domain:
            public_url = f"https://{aws_s3_custom_domain}/{object_key}"
            print(f"Expected public URL (if custom domain is set up): {public_url}")
        else:
            # If using the R2 native endpoint (less common for direct public access without worker/signed URL)
            # This URL style might require bucket public access or a worker to be truly public
            public_url_r2_native = f"{AWS_S3_ENDPOINT_URL}/{bucket_name}/{object_key}"
            print(f"Potential R2 native URL (access depends on bucket/worker setup): {public_url_r2_native}")

        return True
    except FileNotFoundError:
        print(f"Error: The file '{local_file_path}' was not found.")
        return False
    except NoCredentialsError:
        print("Error: Credentials not available. Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.")
        return False
    except PartialCredentialsError:
        print("Error: Incomplete credentials provided.")
        return False
    except ClientError as e:
        print(f"ClientError during upload: {e}")
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'InvalidAccessKeyId':
            print("Detailed Error: The AWS Access Key ID you provided does not exist in our records.")
        elif error_code == 'SignatureDoesNotMatch':
            print("Detailed Error: The request signature we calculated does not match the signature you provided.")
            print("Check your AWS Secret Access Key and signing method (should be s3v4).")
        elif error_code == 'AccessDenied':
            print("Detailed Error: Access Denied. Check bucket policies and token permissions.")
        # Add more specific error handling if needed
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    # Create the dummy file first
    create_dummy_image(LOCAL_FILE_PATH)

    # Attempt to upload
    if os.path.exists(LOCAL_FILE_PATH):
        upload_to_r2(LOCAL_FILE_PATH, AWS_STORAGE_BUCKET_NAME, R2_OBJECT_KEY)
    else:
        print(f"Skipping upload because dummy file '{LOCAL_FILE_PATH}' could not be created.")