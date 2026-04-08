const API_BASE_URL = 'http://localhost:8000/api';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

export interface Balance {
  id: number;
  balance: number;
  total_deposited: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  reference_id: string;
  created_at: string;
}

export interface BankAPI {
  id: number;
  bank_code: string;
  bank_name: string;
  bank_name_vi: string;
  logo_url: string;
  api_name: string;
  api_version: string;
  is_active: string;
  base_price_per_call: number;
  monthly_call_limit: number;
  supported_operations: string;
}

export interface RevenueStats {
  total_revenue: number;
  total_expense: number;
  net_revenue: number;
  total_transactions: number;
  total_income_transactions: number;
  total_expense_transactions: number;
  today_revenue: number;
  today_expense: number;
  today_transactions: number;
  today_income_transactions: number;
  today_expense_transactions: number;
  weekly_revenue: number;
  monthly_revenue: number;
  average_transaction_value: number;
  revenue_by_bank: Record<string, number>;
  transactions_by_bank: Record<string, number>;
  daily_revenue: Array<{ date: string; amount: number; count: number }>;
  hourly_revenue: Array<{ hour: string; amount: number }>;
}

export interface RevenueTrend {
  date: string;
  in_amount: number;
  out_amount: number;
  net_amount: number;
  transaction_count: number;
}

export interface RevenueTransactionRecord {
  id: number;
  account_id: number;
  account_name?: string;
  external_id?: string;
  provider: string;
  provider_label: string;
  transaction_id: string;
  transaction_type?: string;
  direction: string;
  amount: number;
  currency: string;
  description?: string;
  status: string;
  posted_at: string;
  created_at: string;
}

export interface RevenueTransactionsResponse {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  transactions: RevenueTransactionRecord[];
}

export interface TopupInfo {
  provider: string;
  bank_code: string;
  bank_name: string;
  qr_bank_id: string;
  qr_template: string;
  account_number: string;
  account_name: string;
  history_account_id?: number | null;
  transfer_content: string;
  transfer_content_template: string;
  qr_image_url: string;
  is_active: boolean;
}

export interface TopupSyncResponse {
  status: boolean;
  message: string;
  synced_count: number;
  matched_transaction_ids: string[];
  transfer_content: string;
  last_checked_at: string;
}

export interface AdminTopupSourceAccount {
  id: number;
  provider: string;
  account_name?: string | null;
  external_id?: string | null;
  login_identifier?: string | null;
  status: string;
  user_id: number;
}

export interface AdminTopupSettings {
  provider: string;
  bank_code: string;
  bank_name: string;
  qr_bank_id: string;
  qr_template: string;
  account_number: string;
  account_name: string;
  history_account_id?: number | null;
  transfer_content_template: string;
  is_active: boolean;
  available_history_accounts: AdminTopupSourceAccount[];
}

async function apiCall<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API error');
  }

  return response.json();
}

class BalanceService {
  /**
   * Get current user balance
   */
  async getCurrentBalance(): Promise<Balance> {
    return apiCall<Balance>('/balance/current');
  }

  /**
   * Deposit money into account
   */
  async depositBalance(amount: number, paymentMethod: string = 'demo'): Promise<any> {
    return apiCall('/balance/deposit', 'POST', {
      amount,
      payment_method: paymentMethod,
    });
  }

  /**
   * Get balance transaction history
   */
  async getBalanceHistory(page: number = 1, pageSize: number = 20): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    return apiCall(`/balance/history?${params.toString()}`);
  }

  /**
   * Get available banks and their APIs
   */
  async getAvailableBanks(): Promise<any> {
    return apiCall('/balance/banks');
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(days: number = 0): Promise<RevenueStats> {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    return apiCall<RevenueStats>(`/balance/revenue/stats?${params.toString()}`);
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(days: number = 7): Promise<RevenueTrend[]> {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    return apiCall<RevenueTrend[]>(`/balance/revenue/trends?${params.toString()}`);
  }

  /**
   * Get real-bank transactions for the revenue dashboard.
   */
  async getRevenueTransactions(
    days: number = 30,
    limit: number = 300,
    page: number = 1,
    pageSize: number = 100,
  ): Promise<RevenueTransactionsResponse> {
    const params = new URLSearchParams({
      days: days.toString(),
      limit: limit.toString(),
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    return apiCall<RevenueTransactionsResponse>(`/balance/revenue/transactions?${params.toString()}`);
  }

  async getTopupInfo(): Promise<TopupInfo> {
    return apiCall<TopupInfo>('/balance/topup/info');
  }

  async syncTopups(): Promise<TopupSyncResponse> {
    return apiCall<TopupSyncResponse>('/balance/topup/sync', 'POST');
  }

  async getAdminTopupSettings(): Promise<AdminTopupSettings> {
    return apiCall<AdminTopupSettings>('/balance/admin/topup-settings');
  }

  async updateAdminTopupSettings(payload: Omit<AdminTopupSettings, 'available_history_accounts'>): Promise<AdminTopupSettings> {
    return apiCall<AdminTopupSettings>('/balance/admin/topup-settings', 'PUT', payload);
  }
}

export default new BalanceService();
