from datetime import datetime
from typing import Optional

from app.schemas.auth import CamelModel, UserResponse
from app.schemas.balance import (
    BalanceHistoryResponse,
    BalanceResponse,
    RevenueStatsResponse,
    RevenueTransactionsResponse,
    RevenueTrendResponse,
    TopupInfoResponse,
)
from app.schemas.subscription import SubscriptionPlanInfo, SubscriptionResponse


class GatewaySummaryResponse(CamelModel):
    total_connected_accounts: int
    active_providers: int
    accounts_by_provider: dict[str, int]


class DashboardSubscriptionsResponse(CamelModel):
    items: list[SubscriptionResponse]
    current_subscription: Optional[SubscriptionResponse] = None
    total: int


class DashboardBootstrapResponse(CamelModel):
    generated_at: datetime
    user: UserResponse
    balance: BalanceResponse
    activities: BalanceHistoryResponse
    gateways: GatewaySummaryResponse
    subscriptions: DashboardSubscriptionsResponse
    plans: list[SubscriptionPlanInfo]
    topup_info: Optional[TopupInfoResponse] = None


class RevenueBootstrapResponse(CamelModel):
    generated_at: datetime
    period_days: int
    all_time_stats: RevenueStatsResponse
    period_stats: RevenueStatsResponse
    trends: list[RevenueTrendResponse]
    transactions: RevenueTransactionsResponse
