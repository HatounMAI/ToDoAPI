"""
S3 Service for profile image uploads using presigned URLs.
Uses IAM role credentials (no explicit AWS keys required when running on AWS).
"""
import boto3
import os
import uuid
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Configuration from environment
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")


def get_s3_client():
    """
    Create and return S3 client.
    Uses IAM role credentials automatically when running on AWS infrastructure.
    """
    return boto3.client('s3', region_name=AWS_REGION)


def generate_presigned_upload_url(user_id: int, file_type: str) -> dict:
    """
    Generate a presigned URL for direct S3 upload from the client.
    
    Args:
        user_id: User ID for organizing uploads
        file_type: MIME type of the file (e.g., 'image/png', 'image/jpeg')
    
    Returns:
        dict with 'upload_url' (presigned URL) and 'file_url' (final accessible URL)
    
    Raises:
        ClientError: If presigned URL generation fails
    """
    if not S3_BUCKET_NAME:
        raise ValueError("S3_BUCKET_NAME environment variable is not set")
    
    # Determine file extension from MIME type
    extension = file_type.split('/')[-1]
    if extension == 'jpeg':
        extension = 'jpg'
    
    # Generate unique key for the file
    key = f"profile-pictures/{user_id}/{uuid.uuid4()}.{extension}"
    
    try:
        s3_client = get_s3_client()
        
        # Generate presigned URL for PUT operation
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': key,
                'ContentType': file_type,
            },
            ExpiresIn=300  # URL valid for 5 minutes
        )
        
        # Construct the final public URL where the image will be accessible
        file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
        
        logger.info(f"Generated presigned upload URL for user {user_id}, key: {key}")
        
        return {
            "upload_url": presigned_url,
            "file_url": file_url
        }
        
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise


def delete_profile_image(image_url: str) -> bool:
    """
    Delete a profile image from S3 by its URL.
    
    Args:
        image_url: Full S3 URL of the image to delete
    
    Returns:
        True if deletion was successful, False otherwise
    """
    if not image_url or not S3_BUCKET_NAME:
        return False
    
    # Only process URLs from our bucket
    if S3_BUCKET_NAME not in image_url:
        logger.warning(f"Attempted to delete image from unknown bucket: {image_url}")
        return False
    
    try:
        # Extract the key from the URL
        # URL format: https://bucket.s3.region.amazonaws.com/key
        key = image_url.split('.amazonaws.com/')[-1]
        
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
        
        logger.info(f"Deleted S3 object: {key}")
        return True
        
    except ClientError as e:
        logger.error(f"Failed to delete S3 object: {e}")
        return False
