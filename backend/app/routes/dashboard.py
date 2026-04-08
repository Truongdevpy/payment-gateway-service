from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.history import HistoryAccount
from app.models.subscription import Subscription
from app.models.user import User
from app.providers.balance_provider import BalanceService, RevenueService
from app.providers.subscription_provider import SUBSCRIPTION_PLANS, SubscriptionService
from app.providers.topup_provider import TopupService
from app.routes.auth import get_authenticated_user
from app.schemas.auth import UserResponse
from app.schemas.balance import (
    BalanceHistoryResponse,
    RevenueStatsResponse,
    RevenueTransactionsResponse,
    RevenueTrendResponse,
    TopupInfoResponse,
)
from app.schemas.dashboard import (
    DashboardBootstrapResponse,
    DashboardSubscriptionsResponse,
    GatewaySummaryResponse,
    RevenueBootstrapResponse,
)
from app.schemas.subscription import SubscriptionPlanInfo, SubscriptionResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _serialize_plan(plan_type, plan_info) -> SubscriptionPlanInfo:
    return SubscriptionPlanInfo(
        planType=plan_type,
        planName=plan_info["name"],
        price=plan_info["price"],
        durationDays=plan_info["duration_days"],
        apiCallsLimit=plan_info["api_calls_limit"],
        features=plan_info["features"],
        description=plan_info.get("description", ""),
    )


def _build_revenue_stats_response(db: Session, user_id: int, days: int) -> RevenueStatsResponse:
    total_stats = RevenueService.get_total_revenue(db, user_id, days)
    bank_stats = RevenueService.get_revenue_by_bank(db, user_id, days)
    daily_revenue = RevenueService.get_daily_revenue(db, user_id, days if days > 0 else 30)
    weekly_revenue = RevenueService.get_total_revenue(db, user_id, days=7)["total_revenue"]
    monthly_revenue = RevenueService.get_total_revenue(db, user_id, days=30)["total_revenue"]

    return RevenueStatsResponse(
        total_revenue=total_stats["total_revenue"],
        total_expense=total_stats["total_expense"],
        net_revenue=total_stats["net_revenue"],
        total_transactions=total_stats["total_transactions"],
        total_income_transactions=total_stats["total_income_transactions"],
        total_expense_transactions=total_stats["total_expense_transactions"],
        today_revenue=total_stats["today_revenue"],
        today_expense=total_stats["today_expense"],
        today_transactions=total_stats["today_transactions"],
        today_income_transactions=total_stats["today_income_transactions"],
        today_expense_transactions=total_stats["today_expense_transactions"],
        weekly_revenue=weekly_revenue,
        monthly_revenue=monthly_revenue,
        average_transaction_value=total_stats["average_transaction_value"],
        revenue_by_bank=bank_stats["revenue_by_bank"],
        transactions_by_bank=bank_stats["transactions_by_bank"],
        daily_revenue=daily_revenue,
        hourly_revenue=[],
    )


@router.get("/bootstrap", response_model=DashboardBootstrapResponse)
async def get_dashboard_bootstrap(
    response: Response,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    activity_page: int = Query(1, ge=1, description="Page number for recent wallet activities"),
    activity_page_size: int = Query(20, ge=1, le=50, description="Rows per page for wallet activities"),
):
    try:
        response.headers["Cache-Control"] = "private, max-age=30"

        balance = BalanceService.get_balance(current_user.id, db)
        activity_payload = BalanceService.get_transaction_history(
            current_user.id,
            db,
            page=activity_page,
            page_size=activity_page_size,
        )
        provider_counts = dict(
            db.query(HistoryAccount.provider, func.count(HistoryAccount.id))
            .filter(HistoryAccount.user_id == current_user.id)
            .group_by(HistoryAccount.provider)
            .all()
        )
        total_connected_accounts = sum(int(count or 0) for count in provider_counts.values())

        subscriptions_query = (
            db.query(Subscription)
            .filter(Subscription.user_id == current_user.id)
            .order_by(Subscription.created_at.desc())
        )
        subscriptions = subscriptions_query.limit(10).all()
        current_subscription = SubscriptionService.get_active_subscription(current_user.id, db)

        topup_info = None
        try:
            topup_payload = TopupService.build_topup_info(current_user, db)
            topup_info = TopupInfoResponse(**topup_payload)
        except Exception:
            topup_info = None

        return DashboardBootstrapResponse(
            generated_at=datetime.utcnow(),
            user=UserResponse.model_validate(current_user),
            balance=balance,
            activities=BalanceHistoryResponse(**activity_payload),
            gateways=GatewaySummaryResponse(
                total_connected_accounts=total_connected_accounts,
                active_providers=len(provider_counts),
                accounts_by_provider={str(key).lower(): int(value or 0) for key, value in provider_counts.items()},
            ),
            subscriptions=DashboardSubscriptionsResponse(
                items=[SubscriptionResponse(**item.to_dict()) for item in subscriptions],
                current_subscription=SubscriptionResponse(**current_subscription.to_dict()) if current_subscription else None,
                total=subscriptions_query.count(),
            ),
            plans=[_serialize_plan(plan_type, plan_info) for plan_type, plan_info in SUBSCRIPTION_PLANS.items()],
            topup_info=topup_info,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tải bootstrap dashboard: {str(exc)}",
        ) from exc


@router.get("/revenue", response_model=RevenueBootstrapResponse)
async def get_dashboard_revenue(
    response: Response,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Period in days for dashboard revenue widgets"),
    page: int = Query(1, ge=1, description="Transaction page number"),
    page_size: int = Query(50, ge=1, le=100, description="Transaction rows per page"),
):
    try:
        response.headers["Cache-Control"] = "private, max-age=30"

        transaction_payload = RevenueService.get_revenue_transactions(
            db,
            current_user.id,
            days=days,
            page=page,
            page_size=page_size,
            limit=page_size,
        )

        return RevenueBootstrapResponse(
            generated_at=datetime.utcnow(),
            period_days=days,
            all_time_stats=_build_revenue_stats_response(db, current_user.id, 0),
            period_stats=_build_revenue_stats_response(db, current_user.id, days),
            trends=[RevenueTrendResponse(**item) for item in RevenueService.get_revenue_trends(db, current_user.id, days)],
            transactions=RevenueTransactionsResponse(**transaction_payload),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tải dashboard doanh thu: {str(exc)}",
        ) from exc
