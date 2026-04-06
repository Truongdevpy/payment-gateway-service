import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.config import config


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(hours=config.JWT_EXPIRATION_HOURS)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {
        'user_id': user_id,
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(user_id: int) -> str:
    """Create JWT refresh token"""
    expires_delta = timedelta(days=config.JWT_REFRESH_EXPIRATION_DAYS)
    expire = datetime.utcnow() + expires_delta
    to_encode = {
        'user_id': user_id,
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode JWT token without verification"""
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
        return payload
    except Exception:
        return None
