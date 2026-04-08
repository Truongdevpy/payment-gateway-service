from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.subscription import Subscription, SubscriptionPlan


SUBSCRIPTION_PLANS = {
    SubscriptionPlan.FREE: {
        "name": "Gói Miễn Phí",
        "price": 0,
        "duration_days": 365,
        "api_calls_limit": 100,
        "description": "Dùng thử để kiểm tra kết nối và gọi API cơ bản.",
        "features": [
            "Kết nối 1 tài khoản MB Bank",
            "100 API calls/năm",
            "Lịch sử giao dịch 30 ngày",
            "Thống kê cơ bản",
        ],
    },
    SubscriptionPlan.BASIC: {
        "name": "Gói Cơ Bản",
        "price": 49000,
        "duration_days": 30,
        "api_calls_limit": 5000,
        "description": "Phù hợp nhu cầu vận hành nhỏ với giới hạn sử dụng theo tháng.",
        "features": [
            "Kết nối tối đa 3 tài khoản MB Bank",
            "5.000 API calls/tháng",
            "Lịch sử giao dịch 90 ngày",
            "Thống kê chi tiết",
        ],
    },
    SubscriptionPlan.PROFESSIONAL: {
        "name": "Gói Chuyên Nghiệp",
        "price": 149000,
        "duration_days": 30,
        "api_calls_limit": 20000,
        "description": "Dành cho hệ thống cần lưu lượng lớn và dữ liệu lịch sử đầy đủ hơn.",
        "features": [
            "Kết nối tối đa 10 tài khoản MB Bank",
            "20.000 API calls/tháng",
            "Lịch sử giao dịch không giới hạn",
            "Thống kê nâng cao",
            "Truy vấn lịch sử, số dư và thống kê",
        ],
    },
    SubscriptionPlan.ENTERPRISE: {
        "name": "Gói Doanh Nghiệp",
        "price": 499000,
        "duration_days": 30,
        "api_calls_limit": None,
        "description": "Dành cho hệ thống lớn cần dung lượng sử dụng và phạm vi vận hành cao hơn.",
        "features": [
            "Kết nối không giới hạn tài khoản MB Bank",
            "API calls không giới hạn",
            "Lịch sử giao dịch không giới hạn",
            "Toàn bộ tính năng gói Chuyên Nghiệp",
        ],
    },
}


class SubscriptionService:
    """Service to manage user subscriptions and API usage."""

    @staticmethod
    def get_plan_info(plan_type: SubscriptionPlan) -> Dict[str, Any]:
        return SUBSCRIPTION_PLANS.get(plan_type, {})

    @staticmethod
    def create_subscription(
        user_id: int,
        plan_type: SubscriptionPlan,
        duration_days: int,
        db: Session,
        payment_method: str = "direct",
        transaction_id: Optional[str] = None,
        commit: bool = True,
    ) -> Subscription:
        plan_info = SUBSCRIPTION_PLANS.get(plan_type, {})

        now = datetime.utcnow()
        expires_at = now + timedelta(days=duration_days)

        subscription = Subscription(
            user_id=user_id,
            plan_type=plan_type,
            plan_name=plan_info.get("name", getattr(plan_type, "value", str(plan_type))),
            price=plan_info.get("price", 0),
            currency="VND",
            duration_days=duration_days,
            api_calls_limit=plan_info.get("api_calls_limit"),
            api_calls_used=0,
            starts_at=now,
            expires_at=expires_at,
            is_active=True,
            is_auto_renew=plan_type != SubscriptionPlan.FREE,
            payment_method=payment_method,
            transaction_id=transaction_id,
            payment_status="completed",
            features=",".join(plan_info.get("features", [])),
        )

        db.add(subscription)

        if commit:
            db.commit()
            db.refresh(subscription)
        else:
            db.flush()

        return subscription

    @staticmethod
    def get_active_subscription(user_id: int, db: Session) -> Optional[Subscription]:
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True,
            )
            .order_by(Subscription.expires_at.desc())
            .first()
        )

        if subscription and subscription.is_expired():
            subscription.is_active = False
            db.commit()
            return None

        return subscription

    @staticmethod
    def renew_subscription(
        subscription: Subscription,
        plan_type: SubscriptionPlan,
        duration_days: int,
        db: Session,
        payment_method: str = "direct",
        transaction_id: Optional[str] = None,
        commit: bool = True,
    ) -> Subscription:
        subscription.is_active = False

        new_subscription = SubscriptionService.create_subscription(
            user_id=subscription.user_id,
            plan_type=plan_type,
            duration_days=duration_days,
            db=db,
            payment_method=payment_method,
            transaction_id=transaction_id,
            commit=False,
        )

        subscription.renewed_at = datetime.utcnow()

        if commit:
            db.commit()
            db.refresh(new_subscription)
        else:
            db.flush()

        return new_subscription

    @staticmethod
    def upgrade_subscription(
        subscription: Subscription,
        new_plan_type: SubscriptionPlan,
        db: Session,
    ) -> Subscription:
        remaining_days = max(0, (subscription.expires_at - datetime.utcnow()).days)

        return SubscriptionService.renew_subscription(
            subscription=subscription,
            plan_type=new_plan_type,
            duration_days=remaining_days + 30,
            db=db,
            payment_method="upgrade",
        )

    @staticmethod
    def use_api_call(subscription: Subscription, db: Session) -> bool:
        if not subscription.can_use_api():
            return False

        if not subscription.has_api_calls_remaining():
            return False

        subscription.api_calls_used += 1
        db.commit()
        return True

    @staticmethod
    def get_subscription_stats(subscription: Subscription) -> Dict[str, Any]:
        return {
            "planType": subscription.plan_type,
            "planName": subscription.plan_name,
            "isActive": subscription.is_active,
            "isExpired": subscription.is_expired(),
            "daysRemaining": subscription.days_remaining(),
            "apiCallsLimit": subscription.api_calls_limit,
            "apiCallsUsed": subscription.api_calls_used,
            "apiCallsRemaining": (
                subscription.api_calls_limit - subscription.api_calls_used
                if subscription.api_calls_limit
                else None
            ),
            "usagePercent": (
                (subscription.api_calls_used / subscription.api_calls_limit * 100)
                if subscription.api_calls_limit
                else 0
            ),
            "expiresAt": subscription.expires_at.isoformat(),
            "canUseApi": subscription.can_use_api(),
        }

    @staticmethod
    def create_free_trial(user_id: int, db: Session) -> Subscription:
        free_plan = SUBSCRIPTION_PLANS[SubscriptionPlan.FREE]
        return SubscriptionService.create_subscription(
            user_id=user_id,
            plan_type=SubscriptionPlan.FREE,
            duration_days=free_plan["duration_days"],
            db=db,
            payment_method="free_trial",
        )
