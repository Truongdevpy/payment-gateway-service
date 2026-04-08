from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionListResponse,
    PaymentRequest,
    PaymentResponse,
    UpgradeResponse,
    ApiUsageResponse,
    AvailablePlansResponse,
    SubscriptionPlanInfo,
)
from app.providers.subscription_provider import SubscriptionService, SUBSCRIPTION_PLANS
from app.providers.balance_provider import BalanceService
from app.routes.auth import get_authenticated_user

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


@router.get("/plans", response_model=AvailablePlansResponse)
async def get_available_plans(
    response: Response,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get all available subscription plans
    
    Returns:
        AvailablePlansResponse: List of available plans
    """
    try:
        response.headers["Cache-Control"] = "private, max-age=60"
        plans = []
        for plan_type, plan_info in SUBSCRIPTION_PLANS.items():
            plans.append(
                SubscriptionPlanInfo(
                    planType=plan_type,
                    planName=plan_info["name"],
                    price=plan_info["price"],
                    durationDays=plan_info["duration_days"],
                    apiCallsLimit=plan_info["api_calls_limit"],
                    features=plan_info["features"],
                    description=plan_info.get("description", "")
                )
            )
        
        # Get current subscription
        current_subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        return AvailablePlansResponse(
            plans=plans,
            currentSubscription=SubscriptionResponse(**current_subscription.to_dict()) if current_subscription else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách gói: {str(e)}"
        )


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    response: Response,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get user's current active subscription
    
    Returns:
        SubscriptionResponse: Current subscription details
    """
    try:
        response.headers["Cache-Control"] = "private, max-age=30"
        subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bạn chưa có gói nào được kích hoạt"
            )
        
        return SubscriptionResponse(**subscription.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy thông tin gói: {str(e)}"
        )


@router.get("/history", response_model=SubscriptionListResponse)
async def get_subscription_history(
    response: Response,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get all subscription history of the user
    
    Returns:
        SubscriptionListResponse: List of all subscriptions
    """
    try:
        response.headers["Cache-Control"] = "private, max-age=30"
        subscriptions = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).order_by(Subscription.created_at.desc()).all()
        
        current_subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        return SubscriptionListResponse(
            message="Lịch sử gói dịch vụ",
            subscriptions=[SubscriptionResponse(**s.to_dict()) for s in subscriptions],
            currentSubscription=SubscriptionResponse(**current_subscription.to_dict()) if current_subscription else None,
            total=len(subscriptions)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy lịch sử gói: {str(e)}"
        )


@router.post("/purchase", response_model=PaymentResponse)
async def purchase_subscription(
    payload: PaymentRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Purchase a new subscription
    
    Args:
        payload: Payment request with plan type and duration
        
    Returns:
        PaymentResponse: Payment result and subscription details
    """
    try:
        # Validate plan type
        plan_type = SubscriptionPlan(payload.plan_type)
        plan_info = SubscriptionService.get_plan_info(plan_type)
        plan_name = plan_info.get("name", plan_type.value)
        plan_price = float(plan_info.get("price", 0) or 0)
        payment_reference = f"SUBPAY_{current_user.id}_{plan_type.value}_{int(datetime.utcnow().timestamp() * 1000)}"

        if plan_price > 0 and payload.payment_method != "balance":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hiện tại chỉ hỗ trợ mua gói bằng số dư tài khoản.",
            )
        
        # Check if user already has active subscription for THIS specific plan
        existing_subscriptions = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True,
            Subscription.plan_type == plan_type
        ).all()
        
        has_active = any(not sub.is_expired() for sub in existing_subscriptions)
        
        if has_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã có gói này đang hoạt động. Vui lòng gia hạn thêm ngày thay vì mua mới"
            )
        
        # Create subscription and charge the wallet in the same transaction.
        subscription = SubscriptionService.create_subscription(
            user_id=current_user.id,
            plan_type=plan_type,
            duration_days=payload.duration_days,
            db=db,
            payment_method=payload.payment_method,
            transaction_id=payment_reference if plan_price > 0 else None,
            commit=False,
        )

        if plan_price > 0:
            success, message, _ = BalanceService.withdraw_balance(
                current_user.id,
                plan_price,
                db,
                reason=plan_name,
                transaction_type="purchase_subscription",
                description=f"Mua gói {plan_name} ({payload.duration_days} ngày)",
                reference_id=f"SUB_{subscription.id}",
                commit=False,
            )
            if not success:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=message,
                )

        db.commit()
        db.refresh(subscription)
        
        return PaymentResponse(
            status=True,
            message=(
                f"Mua gói {plan_name} thành công. Đã trừ {plan_price:,.0f}đ khỏi số dư."
                if plan_price > 0
                else "Mua gói thành công"
            ),
            subscription=SubscriptionResponse(**subscription.to_dict()),
            transaction_id=payment_reference if plan_price > 0 else None,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại gói không hợp lệ"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi mua gói: {str(e)}"
        )


@router.post("/renew", response_model=PaymentResponse)
async def renew_subscription(
    payload: PaymentRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Renew current subscription
    
    Args:
        payload: Payment request with plan type and duration
        
    Returns:
        PaymentResponse: Renewal result
    """
    try:
        plan_type = SubscriptionPlan(payload.plan_type)
        plan_info = SubscriptionService.get_plan_info(plan_type)
        plan_name = plan_info.get("name", plan_type.value)
        plan_price = float(plan_info.get("price", 0) or 0)
        payment_reference = f"RENEW_{current_user.id}_{plan_type.value}_{int(datetime.utcnow().timestamp() * 1000)}"

        if plan_price > 0 and payload.payment_method != "balance":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hiện tại chỉ hỗ trợ gia hạn bằng số dư tài khoản.",
            )

        # Get current subscription for this specific plan
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True,
            Subscription.plan_type == payload.plan_type
        ).order_by(Subscription.expires_at.desc()).first()
        
        if not subscription or subscription.is_expired():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bạn chưa có gói này để gia hạn"
            )
        
        # Renew subscription
        new_subscription = SubscriptionService.renew_subscription(
            subscription=subscription,
            plan_type=plan_type,
            duration_days=payload.duration_days,
            db=db,
            payment_method=payload.payment_method,
            transaction_id=payment_reference if plan_price > 0 else None,
            commit=False,
        )

        if plan_price > 0:
            success, message, _ = BalanceService.withdraw_balance(
                current_user.id,
                plan_price,
                db,
                reason=plan_name,
                transaction_type="renew_subscription",
                description=f"Gia hạn gói {plan_name} ({payload.duration_days} ngày)",
                reference_id=f"SUB_{new_subscription.id}",
                commit=False,
            )
            if not success:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=message,
                )

        db.commit()
        db.refresh(new_subscription)
        
        return PaymentResponse(
            status=True,
            message=(
                f"Gia hạn gói {plan_name} thành công. Đã trừ {plan_price:,.0f}đ khỏi số dư."
                if plan_price > 0
                else "Gia hạn gói thành công"
            ),
            subscription=SubscriptionResponse(**new_subscription.to_dict()),
            transaction_id=payment_reference if plan_price > 0 else None,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại gói không hợp lệ"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi gia hạn gói: {str(e)}"
        )


@router.post("/upgrade", response_model=UpgradeResponse)
async def upgrade_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Upgrade to a higher tier subscription
    
    Args:
        payload: New plan type
        
    Returns:
        UpgradeResponse: Upgrade result with old and new subscriptions
    """
    try:
        # Get current subscription
        old_subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        if not old_subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bạn chưa có gói nào để nâng cấp"
            )
        
        new_plan_type = SubscriptionPlan(payload.plan_type)
        
        # Upgrade subscription
        new_subscription = SubscriptionService.upgrade_subscription(
            subscription=old_subscription,
            new_plan_type=new_plan_type,
            db=db,
        )
        
        # Refresh to get updated old subscription
        db.refresh(old_subscription)
        
        return UpgradeResponse(
            status=True,
            message="Nâng cấp gói thành công",
            oldSubscription=SubscriptionResponse(**old_subscription.to_dict()),
            newSubscription=SubscriptionResponse(**new_subscription.to_dict()),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại gói không hợp lệ"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi nâng cấp gói: {str(e)}"
        )


@router.get("/usage", response_model=ApiUsageResponse)
async def get_api_usage(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get API usage statistics for current subscription
    
    Returns:
        ApiUsageResponse: Usage statistics
    """
    try:
        subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bạn chưa có gói nào được kích hoạt"
            )
        
        usage = SubscriptionService.get_subscription_stats(subscription)
        
        return ApiUsageResponse(
            status=True,
            subscription=SubscriptionResponse(**subscription.to_dict()),
            usage=usage,
            message="Thống kê sử dụng API"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy thống kê sử dụng: {str(e)}"
        )


@router.post("/cancel/{subscription_id}")
async def cancel_subscription(
    subscription_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a subscription
    
    Args:
        subscription_id: Subscription ID to cancel
        
    Returns:
        dict: Cancellation result
    """
    try:
        subscription = db.query(Subscription).filter(
            Subscription.id == subscription_id,
            Subscription.user_id == current_user.id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gói không tìm thấy"
            )
        
        subscription.is_active = False
        db.commit()
        
        return {
            "status": True,
            "message": "Hủy gói thành công",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hủy gói: {str(e)}"
        )


@router.post("/check-access")
async def check_api_access(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Check if user has access to API (has active subscription)
    
    Returns:
        dict: Access status
    """
    try:
        subscription = SubscriptionService.get_active_subscription(current_user.id, db)
        
        if not subscription or not subscription.can_use_api():
            return {
                "status": False,
                "hasAccess": False,
                "message": "Bạn không có quyền truy cập API. Vui lòng mua hoặc gia hạn gói",
            }
        
        return {
            "status": True,
            "hasAccess": True,
            "message": "Bạn có quyền truy cập API",
            "subscription": SubscriptionResponse(**subscription.to_dict()),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kiểm tra truy cập: {str(e)}"
        )
