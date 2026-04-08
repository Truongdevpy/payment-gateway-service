import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.user import User
from app.providers.invoice_provider import InvoiceService

logger = logging.getLogger(__name__)


class BillingService:
    """Service for daily/monthly billing calculations"""

    @staticmethod
    def calculate_daily_usage(user_id: int, date: datetime, db: Session) -> Dict[str, Any]:
        """Calculate API usage for a specific day"""
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
        ).order_by(Subscription.expires_at.desc()).first()

        if not subscription:
            return {
                "userId": user_id,
                "date": date.isoformat(),
                "hasSubscription": False,
                "apiCallsUsed": 0,
                "dailyCost": 0,
            }

        # For daily billing: price / duration_days
        daily_rate = subscription.price / max(subscription.duration_days, 1)

        return {
            "userId": user_id,
            "date": date.isoformat(),
            "hasSubscription": True,
            "planType": subscription.plan_type,
            "planName": subscription.plan_name,
            "apiCallsUsed": subscription.api_calls_used,
            "apiCallsLimit": subscription.api_calls_limit,
            "dailyRate": round(daily_rate, 2),
            "daysRemaining": subscription.days_remaining(),
        }

    @staticmethod
    def charge_daily_subscription_fee(user_id: int, db: Session) -> Dict[str, Any]:
        """
        Charge daily subscription fee for a user.
        In a real system this would deduct from balance.
        """
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
        ).order_by(Subscription.expires_at.desc()).first()

        if not subscription:
            return {"success": False, "message": "No active subscription", "userId": user_id}

        if subscription.is_expired():
            subscription.is_active = False
            db.commit()
            return {"success": False, "message": "Subscription expired", "userId": user_id}

        daily_rate = subscription.price / max(subscription.duration_days, 1)

        logger.info(
            f"Daily billing: user={user_id}, plan={subscription.plan_type}, "
            f"daily_rate={daily_rate:.0f} VND"
        )

        return {
            "success": True,
            "userId": user_id,
            "planType": subscription.plan_type,
            "dailyRate": round(daily_rate, 2),
            "message": "Daily billing processed",
        }

    @staticmethod
    def check_expiring_subscriptions(db: Session, days_threshold: int = 3) -> List[Dict[str, Any]]:
        """Find subscriptions expiring soon for renewal reminders"""
        from datetime import timedelta
        now = datetime.utcnow()
        threshold = now + timedelta(days=days_threshold)

        expiring = db.query(Subscription).filter(
            Subscription.is_active == True,
            Subscription.expires_at <= threshold,
            Subscription.expires_at > now,
        ).all()

        results = []
        for sub in expiring:
            results.append({
                "userId": sub.user_id,
                "subscriptionId": sub.id,
                "planName": sub.plan_name,
                "expiresAt": sub.expires_at.isoformat(),
                "daysRemaining": sub.days_remaining(),
            })
        return results

    @staticmethod
    def deactivate_expired_subscriptions(db: Session) -> int:
        """Deactivate all expired subscriptions. Returns count."""
        now = datetime.utcnow()
        expired = db.query(Subscription).filter(
            Subscription.is_active == True,
            Subscription.expires_at <= now,
        ).all()

        count = 0
        for sub in expired:
            sub.is_active = False
            count += 1

        if count:
            db.commit()
            logger.info(f"Deactivated {count} expired subscriptions")
        return count

    @staticmethod
    def reset_monthly_api_calls(db: Session) -> int:
        """Reset API call counters on the 1st of each month. Returns count."""
        subs = db.query(Subscription).filter(
            Subscription.is_active == True,
        ).all()

        count = 0
        for sub in subs:
            if sub.api_calls_used > 0:
                sub.api_calls_used = 0
                count += 1

        if count:
            db.commit()
            logger.info(f"Reset API call counters for {count} subscriptions")
        return count

    @staticmethod
    def generate_daily_billing_report(db: Session) -> Dict[str, Any]:
        """Generate a summary billing report"""
        active_subs = db.query(Subscription).filter(
            Subscription.is_active == True,
        ).all()

        total_daily_revenue = 0
        plan_summary = {}

        for sub in active_subs:
            daily_rate = sub.price / max(sub.duration_days, 1)
            total_daily_revenue += daily_rate

            plan_type = sub.plan_type
            if plan_type not in plan_summary:
                plan_summary[plan_type] = {"count": 0, "revenue": 0}
            plan_summary[plan_type]["count"] += 1
            plan_summary[plan_type]["revenue"] += daily_rate

        return {
            "date": datetime.utcnow().isoformat(),
            "totalActiveSubscriptions": len(active_subs),
            "estimatedDailyRevenue": round(total_daily_revenue, 2),
            "estimatedMonthlyRevenue": round(total_daily_revenue * 30, 2),
            "planSummary": plan_summary,
        }
