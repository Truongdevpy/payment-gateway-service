import balanceService, {
  Balance,
  BalanceTransaction,
  RevenueStats,
  RevenueTransactionsResponse,
  RevenueTrend,
  TopupInfo,
} from './balanceService';
import { AuthUser, getCurrentUser, getToken } from './authService';
import { HistoryAccount, listHistoryAccounts } from './historyService';
import {
  Subscription,
  SubscriptionPlan,
  subscriptionService,
} from './subscriptionService';

const API_BASE_URL = 'http://localhost:8000/api';

export interface BalanceHistorySnapshot {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  transactions: BalanceTransaction[];
}

export interface GatewaySummary {
  accountsByProvider: Record<string, number>;
  activeProviders: number;
  totalConnectedAccounts: number;
}

export interface DashboardBootstrapResponse {
  activities: BalanceHistorySnapshot;
  balance: Balance;
  gateways: GatewaySummary;
  generatedAt: string;
  plans: SubscriptionPlan[];
  subscriptions: {
    currentSubscription: Subscription | null;
    items: Subscription[];
    total: number;
  };
  topupInfo: TopupInfo | null;
  user: AuthUser;
}

export interface DashboardRevenueResponse {
  allTimeStats: RevenueStats;
  generatedAt: string;
  periodDays: number;
  periodStats: RevenueStats;
  transactions: RevenueTransactionsResponse;
  trends: RevenueTrend[];
}

const createApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return new Error(data.detail);
    }
    if (typeof data?.message === 'string') {
      return new Error(data.message);
    }
  } catch {
    // Ignore invalid JSON bodies.
  }

  return new Error(fallbackMessage);
};

const shouldFallbackToLegacy = (status: number) => status === 404 || status >= 500;

const nowIso = () => new Date().toISOString();

const ensureAuthenticatedToken = () => {
  const token = getToken();

  if (!token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  return token;
};

const asError = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error : new Error(fallbackMessage);

const buildEmptyBalance = (): Balance => {
  const current = nowIso();

  return {
    balance: 0,
    created_at: current,
    id: 0,
    total_deposited: 0,
    total_spent: 0,
    updated_at: current,
  };
};

const buildEmptyBalanceHistory = (
  page: number,
  pageSize: number,
): BalanceHistorySnapshot => ({
  page,
  page_size: pageSize,
  total_count: 0,
  total_pages: 0,
  transactions: [],
});

const buildEmptyRevenueStats = (): RevenueStats => ({
  average_transaction_value: 0,
  daily_revenue: [],
  hourly_revenue: [],
  monthly_revenue: 0,
  net_revenue: 0,
  revenue_by_bank: {},
  today_expense: 0,
  today_expense_transactions: 0,
  today_income_transactions: 0,
  today_revenue: 0,
  today_transactions: 0,
  total_expense: 0,
  total_expense_transactions: 0,
  total_income_transactions: 0,
  total_revenue: 0,
  total_transactions: 0,
  transactions_by_bank: {},
  weekly_revenue: 0,
});

const buildEmptyRevenueTransactions = (
  page: number,
  pageSize: number,
): RevenueTransactionsResponse => ({
  page,
  page_size: pageSize,
  total_count: 0,
  total_pages: 0,
  transactions: [],
});

const buildGatewaySummary = (accounts: HistoryAccount[]): GatewaySummary => {
  const counts = accounts.reduce<Record<string, number>>((summary, account) => {
    const providerKey = String(account.provider || '').toLowerCase();

    if (!providerKey) {
      return summary;
    }

    summary[providerKey] = (summary[providerKey] || 0) + 1;
    return summary;
  }, {});

  return {
    accountsByProvider: counts,
    activeProviders: Object.keys(counts).length,
    totalConnectedAccounts: accounts.length,
  };
};

const authHeaders = () => {
  const token = ensureAuthenticatedToken();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

class DashboardService {
  private async getBootstrapFromLegacy(
    activityPage: number,
    activityPageSize: number,
  ): Promise<DashboardBootstrapResponse> {
    const token = ensureAuthenticatedToken();

    const [
      userResult,
      balanceResult,
      activityResult,
      planResult,
      subscriptionResult,
      topupResult,
      historyAccountsResult,
    ] = await Promise.allSettled([
      getCurrentUser(),
      balanceService.getCurrentBalance(),
      balanceService.getBalanceHistory(activityPage, activityPageSize) as Promise<BalanceHistorySnapshot>,
      subscriptionService.getAvailablePlans(token),
      subscriptionService.getSubscriptionHistory(token),
      balanceService.getTopupInfo(),
      listHistoryAccounts(),
    ]);

    if (userResult.status === 'rejected') {
      throw asError(userResult.reason, 'Không tải được thông tin người dùng');
    }

    return {
      activities: activityResult.status === 'fulfilled'
        ? activityResult.value
        : buildEmptyBalanceHistory(activityPage, activityPageSize),
      balance: balanceResult.status === 'fulfilled' ? balanceResult.value : buildEmptyBalance(),
      generatedAt: nowIso(),
      gateways: buildGatewaySummary(
        historyAccountsResult.status === 'fulfilled' ? historyAccountsResult.value : [],
      ),
      plans: planResult.status === 'fulfilled' ? planResult.value.plans : [],
      subscriptions: subscriptionResult.status === 'fulfilled'
        ? {
            currentSubscription: subscriptionResult.value.currentSubscription,
            items: subscriptionResult.value.subscriptions,
            total: subscriptionResult.value.total,
          }
        : {
            currentSubscription: null,
            items: [],
            total: 0,
          },
      topupInfo: topupResult.status === 'fulfilled' ? topupResult.value : null,
      user: userResult.value,
    };
  }

  private async getRevenueFromLegacy(
    days: number,
    page: number,
    pageSize: number,
  ): Promise<DashboardRevenueResponse> {
    const [allTimeStatsResult, periodStatsResult, trendResult, transactionResult] = await Promise.allSettled([
      balanceService.getRevenueStats(0),
      balanceService.getRevenueStats(days),
      balanceService.getRevenueTrends(days),
      balanceService.getRevenueTransactions(days, pageSize, page, pageSize),
    ]);

    if (
      allTimeStatsResult.status === 'rejected'
      && periodStatsResult.status === 'rejected'
      && trendResult.status === 'rejected'
      && transactionResult.status === 'rejected'
    ) {
      throw asError(allTimeStatsResult.reason, 'Không tải được dữ liệu doanh thu');
    }

    return {
      allTimeStats: allTimeStatsResult.status === 'fulfilled'
        ? allTimeStatsResult.value
        : buildEmptyRevenueStats(),
      generatedAt: nowIso(),
      periodDays: days,
      periodStats: periodStatsResult.status === 'fulfilled'
        ? periodStatsResult.value
        : buildEmptyRevenueStats(),
      transactions: transactionResult.status === 'fulfilled'
        ? transactionResult.value
        : buildEmptyRevenueTransactions(page, pageSize),
      trends: trendResult.status === 'fulfilled' ? trendResult.value : [],
    };
  }

  async getBootstrap(activityPage: number = 1, activityPageSize: number = 20): Promise<DashboardBootstrapResponse> {
    const params = new URLSearchParams({
      activity_page: String(activityPage),
      activity_page_size: String(activityPageSize),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/bootstrap?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        if (shouldFallbackToLegacy(response.status)) {
          return this.getBootstrapFromLegacy(activityPage, activityPageSize);
        }

        throw await createApiError(response, 'Không tải được dữ liệu dashboard');
      }

      return response.json();
    } catch (error) {
      return this.getBootstrapFromLegacy(activityPage, activityPageSize).catch(() => {
        throw asError(error, 'Không tải được dữ liệu dashboard');
      });
    }
  }

  async getRevenue(days: number = 30, page: number = 1, pageSize: number = 50): Promise<DashboardRevenueResponse> {
    const params = new URLSearchParams({
      days: String(days),
      page: String(page),
      page_size: String(pageSize),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/revenue?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        if (shouldFallbackToLegacy(response.status)) {
          return this.getRevenueFromLegacy(days, page, pageSize);
        }

        throw await createApiError(response, 'Không tải được dữ liệu doanh thu');
      }

      return response.json();
    } catch (error) {
      return this.getRevenueFromLegacy(days, page, pageSize).catch(() => {
        throw asError(error, 'Không tải được dữ liệu doanh thu');
      });
    }
  }
}

export default new DashboardService();
