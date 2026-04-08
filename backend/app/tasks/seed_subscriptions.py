"""
Seed subscription demo data that matches the dashboard pricing page.

Run:
    python -m app.tasks.seed_subscriptions
"""

from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models.subscription import Subscription, SubscriptionPlan
from app.models.user import User


def seed_subscriptions():
    """Create sample subscriptions for testing."""
    db = SessionLocal()

    try:
        user = db.query(User).first()

        if not user:
            print("No users found in database. Please create a user first.")
            return

        print(f"Using user: {user.email} (ID: {user.id})")

        db.query(Subscription).filter(Subscription.user_id == user.id).delete()
        db.commit()

        now = datetime.utcnow()

        subscriptions = [
            {
                "plan_type": SubscriptionPlan.FREE,
                "plan_name": "Gói Miễn Phí - 365 ngày",
                "price": 0,
                "duration_days": 365,
                "api_calls_limit": 100,
                "starts_at": now - timedelta(days=400),
                "expires_at": now - timedelta(days=35),
                "payment_status": "completed",
                "is_active": False,
                "purchased_at": now - timedelta(days=400),
                "features": ",".join(
                    [
                        "Kết nối 1 tài khoản MB Bank",
                        "100 API calls/năm",
                        "Lịch sử giao dịch 30 ngày",
                        "Thống kê cơ bản",
                    ]
                ),
            },
            {
                "plan_type": SubscriptionPlan.BASIC,
                "plan_name": "Gói Cơ Bản - 30 ngày",
                "price": 49000,
                "duration_days": 30,
                "api_calls_limit": 5000,
                "starts_at": now - timedelta(days=60),
                "expires_at": now - timedelta(days=30),
                "payment_status": "completed",
                "is_active": False,
                "purchased_at": now - timedelta(days=60),
                "features": ",".join(
                    [
                        "Kết nối tối đa 3 tài khoản MB Bank",
                        "5.000 API calls/tháng",
                        "Lịch sử giao dịch 90 ngày",
                        "Thống kê chi tiết",
                    ]
                ),
            },
            {
                "plan_type": SubscriptionPlan.PROFESSIONAL,
                "plan_name": "Gói Chuyên Nghiệp - 30 ngày",
                "price": 149000,
                "duration_days": 30,
                "api_calls_limit": 20000,
                "starts_at": now - timedelta(days=15),
                "expires_at": now + timedelta(days=15),
                "payment_status": "completed",
                "is_active": True,
                "is_auto_renew": True,
                "purchased_at": now - timedelta(days=15),
                "api_calls_used": 6400,
                "features": ",".join(
                    [
                        "Kết nối tối đa 10 tài khoản MB Bank",
                        "20.000 API calls/tháng",
                        "Lịch sử giao dịch không giới hạn",
                        "Thống kê nâng cao",
                        "Truy vấn lịch sử, số dư và thống kê",
                    ]
                ),
            },
            {
                "plan_type": SubscriptionPlan.ENTERPRISE,
                "plan_name": "Gói Doanh Nghiệp - 30 ngày",
                "price": 499000,
                "duration_days": 30,
                "api_calls_limit": None,
                "starts_at": now - timedelta(days=120),
                "expires_at": now - timedelta(days=90),
                "payment_status": "completed",
                "is_active": False,
                "is_auto_renew": True,
                "purchased_at": now - timedelta(days=120),
                "api_calls_used": 12500,
                "features": ",".join(
                    [
                        "Kết nối không giới hạn tài khoản MB Bank",
                        "API calls không giới hạn",
                        "Lịch sử giao dịch không giới hạn",
                        "Toàn bộ tính năng gói Chuyên Nghiệp",
                    ]
                ),
            },
        ]

        for sub_data in subscriptions:
            subscription = Subscription(
                user_id=user.id,
                plan_type=sub_data["plan_type"],
                plan_name=sub_data["plan_name"],
                price=sub_data["price"],
                currency="VND",
                duration_days=sub_data["duration_days"],
                api_calls_limit=sub_data["api_calls_limit"],
                api_calls_used=sub_data.get("api_calls_used", 0),
                starts_at=sub_data["starts_at"],
                expires_at=sub_data["expires_at"],
                purchased_at=sub_data["purchased_at"],
                payment_method="direct",
                payment_status=sub_data["payment_status"],
                is_active=sub_data["is_active"],
                is_auto_renew=sub_data.get("is_auto_renew", False),
                features=sub_data.get("features", ""),
            )
            db.add(subscription)
            print(
                f"Created: {sub_data['plan_name']} ({sub_data['plan_type'].value}) - "
                f"{'Active' if sub_data['is_active'] else 'Expired'}"
            )

        db.commit()

        active = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.is_active == True,
        ).count()
        expired = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.is_active == False,
        ).count()
        total = db.query(Subscription).filter(Subscription.user_id == user.id).count()

        print("\nSummary:")
        print(f"  Total subscriptions: {total}")
        print(f"  Active subscriptions: {active}")
        print(f"  Expired subscriptions: {expired}")

    except Exception as exc:
        print(f"Error: {exc}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_subscriptions()
