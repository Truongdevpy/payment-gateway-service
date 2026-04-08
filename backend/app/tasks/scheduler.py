import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import config
from app.database import SessionLocal

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=config.SCHEDULER_TIMEZONE)


def daily_billing_job():
    """Run daily at midnight: charge subscription fees and deactivate expired subs"""
    from app.providers.billing_provider import BillingService

    logger.info("=== Running daily billing job ===")
    db = SessionLocal()
    try:
        # 1. Deactivate expired subscriptions
        expired_count = BillingService.deactivate_expired_subscriptions(db)
        logger.info(f"Deactivated {expired_count} expired subscriptions")

        # 2. Check expiring subscriptions (for reminders)
        expiring = BillingService.check_expiring_subscriptions(db, days_threshold=3)
        if expiring:
            logger.info(f"Found {len(expiring)} subscriptions expiring in 3 days")
            # Send renewal reminders
            from app.providers.email_provider import EmailService
            from app.models.user import User
            for item in expiring:
                user = db.query(User).filter(User.id == item["userId"]).first()
                if user:
                    EmailService.send_renewal_reminder(
                        user,
                        plan_name=item["planName"],
                        days_left=item["daysRemaining"],
                        db=db,
                    )

        # 3. Generate daily report
        report = BillingService.generate_daily_billing_report(db)
        logger.info(
            f"Daily report: {report['totalActiveSubscriptions']} active subs, "
            f"estimated daily revenue: {report['estimatedDailyRevenue']:,.0f} VND"
        )
    except Exception as e:
        logger.error(f"Daily billing job error: {e}")
    finally:
        db.close()


def monthly_reset_job():
    """Run on 1st of each month: reset API call counters"""
    from app.providers.billing_provider import BillingService

    logger.info("=== Running monthly reset job ===")
    db = SessionLocal()
    try:
        count = BillingService.reset_monthly_api_calls(db)
        logger.info(f"Reset API counters for {count} subscriptions")
    except Exception as e:
        logger.error(f"Monthly reset job error: {e}")
    finally:
        db.close()


def init_scheduler():
    """Initialize and start the scheduler"""
    if not config.SCHEDULER_ENABLED:
        logger.info("Scheduler is disabled via config")
        return

    # Daily billing at midnight
    scheduler.add_job(
        daily_billing_job,
        trigger=CronTrigger(hour=0, minute=0),
        id="daily_billing",
        name="Daily Billing Job",
        replace_existing=True,
    )

    # Monthly reset on 1st at 00:05
    scheduler.add_job(
        monthly_reset_job,
        trigger=CronTrigger(day=1, hour=0, minute=5),
        id="monthly_reset",
        name="Monthly API Reset",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with daily billing and monthly reset jobs")


def shutdown_scheduler():
    """Shut down the scheduler gracefully"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
