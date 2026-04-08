from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.providers.subscription_provider import SubscriptionService


def check_api_access(user: User, db: Session) -> bool:
    """
    Check if user has API access (has active, non-expired subscription)
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        bool: True if user has access
        
    Raises:
        HTTPException: If user doesn't have access
    """
    subscription = SubscriptionService.get_active_subscription(user.id, db)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn cần mua gói để sử dụng dịch vụ. Vui lòng truy cập trang gói dịch vụ",
        )
    
    if not subscription.can_use_api():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gói dịch vụ của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng",
        )
    
    return True


def check_api_quota(user: User, db: Session) -> bool:
    """
    Check if user has remaining API quota
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        bool: True if user has remaining quota
        
    Raises:
        HTTPException: If quota is exceeded
    """
    subscription = SubscriptionService.get_active_subscription(user.id, db)
    
    if not subscription or not subscription.can_use_api():
        check_api_access(user, db)  # This will raise appropriate error
        return False
    
    if not subscription.has_api_calls_remaining():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Bạn đã vượt quá giới hạn API calls ({subscription.api_calls_limit}). Vui lòng nâng cấp gói để tiếp tục",
        )
    
    return True


def consume_api_call(user: User, db: Session) -> bool:
    """
    Consume one API call from user's quota
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        bool: True if call was consumed successfully
        
    Raises:
        HTTPException: If access or quota check fails
    """
    check_api_quota(user, db)
    
    subscription = SubscriptionService.get_active_subscription(user.id, db)
    
    if subscription:
        SubscriptionService.use_api_call(subscription, db)
    
    return True
