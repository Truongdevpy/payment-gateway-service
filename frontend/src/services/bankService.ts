/**
 * Bank Management Service
 * Handles bank account operations
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface BankAccount {
  id: number;
  user_id: number;
  bank_type: string;
  account_number: string;
  account_name?: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  last_used_at?: string;
  daily_limit: number;
  monthly_limit: number;
  used_today: number;
  used_this_month: number;
  can_use_api: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: number;
  transaction_id?: string;
  transaction_date?: string;
  amount: number;
  currency: string;
  transaction_type: string;
  description?: string;
  counterparty_name?: string;
  counterparty_account?: string;
  balance_after?: number;
}

export interface SupportedBank {
  code: string;
  name: string;
  icon: string;
  description: string;
  api_endpoint: string;
}

class BankService {
  private token: string = '';

  constructor() {
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...this.getHeaders(),
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      let detail = 'Yêu cầu thất bại';

      try {
        const error = await response.json();
        detail = error.detail || detail;
      } catch {
        detail = response.statusText || detail;
      }

      throw new Error(detail);
    }

    return response.json() as Promise<T>;
  }

  async getSupportedBanks(): Promise<SupportedBank[]> {
    const data = await this.request<{ banks?: SupportedBank[] }>('/banks/supported', {
      method: 'GET',
    });
    return data.banks || [];
  }

  async createBankAccount(accountData: {
    bank_type: string;
    account_number: string;
    phone: string;
    password: string;
    account_name?: string;
  }): Promise<BankAccount> {
    return this.request<BankAccount>('/banks/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async getBankAccounts(): Promise<BankAccount[]> {
    const data = await this.request<{ accounts?: BankAccount[] }>('/banks/accounts', {
      method: 'GET',
    });
    return data.accounts || [];
  }

  async getBankAccount(accountId: number): Promise<BankAccount> {
    return this.request<BankAccount>(`/banks/accounts/${accountId}`, {
      method: 'GET',
    });
  }

  async deleteBankAccount(accountId: number): Promise<{ status: boolean; message: string }> {
    return this.request<{ status: boolean; message: string }>(`/banks/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  async getBankTransactions(accountId: number, days: number = 30): Promise<BankTransaction[]> {
    const data = await this.request<{ transactions?: BankTransaction[] }>(
      `/banks/accounts/${accountId}/transactions?days=${days}`,
      { method: 'GET' }
    );
    return data.transactions || [];
  }

  async getBankStatistics(accountId: number, days: number = 30) {
    return this.request(`/banks/accounts/${accountId}/statistics?days=${days}`, {
      method: 'GET',
    });
  }

  async syncBankTransactions(accountId: number) {
    return this.request(`/banks/accounts/${accountId}/sync`, {
      method: 'POST',
    });
  }
}

export default new BankService();
