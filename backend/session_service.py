"""
DynamoDB Session Storage Service

Provides session management for JWT token tracking and revocation.
Requires AWS DynamoDB table 'Sessions' with:
- Partition key: session_id (String)
- TTL attribute: expires_at
- GSI: user_id-index (partition key: user_id)
"""

import boto3
import os
import uuid
import logging
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
sessions_table = dynamodb.Table(os.getenv('DYNAMODB_SESSIONS_TABLE', 'Sessions'))


def create_session(user_id: int, expires_days: int = 7) -> str:
    """
    Create a new session in DynamoDB and return session_id.
    The session_id is used as the JWT 'jti' (JWT ID) claim.
    
    Args:
        user_id: The user's database ID
        expires_days: Number of days until session expires
        
    Returns:
        session_id: UUID string to be used as JWT jti
    """
    session_id = str(uuid.uuid4())
    expires_at = int((datetime.utcnow() + timedelta(days=expires_days)).timestamp())
    
    try:
        sessions_table.put_item(Item={
            'session_id': session_id,
            'user_id': str(user_id),
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at,  # TTL - DynamoDB auto-deletes expired items
            'is_valid': True
        })
        logger.info(f"Session created: {session_id} for user {user_id}")
        return session_id
    except ClientError as e:
        logger.error(f"Failed to create session: {e}")
        raise


def validate_session(session_id: str) -> bool:
    """
    Check if a session exists and is still valid.
    
    Args:
        session_id: The JWT jti claim to validate
        
    Returns:
        True if session is valid, False otherwise
    """
    try:
        response = sessions_table.get_item(Key={'session_id': session_id})
        item = response.get('Item')
        
        if item is None:
            logger.warning(f"Session not found: {session_id}")
            return False
            
        is_valid = item.get('is_valid', False)
        if not is_valid:
            logger.warning(f"Session invalidated: {session_id}")
            
        return is_valid
    except ClientError as e:
        logger.error(f"Failed to validate session: {e}")
        return False


def invalidate_session(session_id: str) -> bool:
    """
    Invalidate a single session (logout).
    
    Args:
        session_id: The JWT jti claim to invalidate
        
    Returns:
        True if successful
    """
    try:
        sessions_table.update_item(
            Key={'session_id': session_id},
            UpdateExpression='SET is_valid = :val',
            ExpressionAttributeValues={':val': False}
        )
        logger.info(f"Session invalidated: {session_id}")
        return True
    except ClientError as e:
        logger.error(f"Failed to invalidate session: {e}")
        return False


def invalidate_all_user_sessions(user_id: int) -> int:
    """
    Invalidate all sessions for a user (logout from all devices).
    
    Args:
        user_id: The user's database ID
        
    Returns:
        Number of sessions invalidated
    """
    try:
        response = sessions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id))
        )
        
        count = 0
        for item in response.get('Items', []):
            if item.get('is_valid', False):
                invalidate_session(item['session_id'])
                count += 1
                
        logger.info(f"Invalidated {count} sessions for user {user_id}")
        return count
    except ClientError as e:
        logger.error(f"Failed to invalidate user sessions: {e}")
        return 0


def get_user_sessions(user_id: int) -> list:
    """
    Get all active sessions for a user.
    
    Args:
        user_id: The user's database ID
        
    Returns:
        List of active session dictionaries
    """
    try:
        response = sessions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id))
        )
        
        active_sessions = [
            {
                'session_id': item['session_id'],
                'created_at': item.get('created_at'),
                'expires_at': item.get('expires_at')
            }
            for item in response.get('Items', [])
            if item.get('is_valid', False)
        ]
        
        return active_sessions
    except ClientError as e:
        logger.error(f"Failed to get user sessions: {e}")
        return []
