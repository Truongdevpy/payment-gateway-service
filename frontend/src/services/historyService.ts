import { getToken } from './authService';

const API_BASE_URL = 'http://localhost:8000/api';

export interface HistoryAccountCreatePayload {
  provider: string;
  token?: string;
  accountName?: string;
  externalId?: string;
}

export interface HistoryAccount {
  id: number;
  userId: number;
  provider: string;
  providerLabel?: string;
  token: string;
  accountName?: string;
  externalId?: string;
  loginIdentifier?: string;
  status: string;
  termsAccepted?: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  inputType: string;
  placeholder: string;
  sensitive: boolean;
  helpText: string;
}

export interface HistoryProviderDefinition {
  key: string;
  label: string;
  category: string;
  authMode: string;
  description: string;
  legacyRegisterFile: string;
  legacyHistoryFile: string;
  requiredFields: string[];
  fields: ProviderFieldDefinition[];
  supportsHistory: boolean;
  supportsBalance: boolean;
  sessionRefreshHint: string;
  legacyTable: string;
}

export interface ProviderPolicySection {
  title: string;
  paragraphs: string[];
}

export interface ProviderPoliciesResponse {
  title: string;
  version: string;
  consentLabel: string;
  sections: ProviderPolicySection[];
}

export interface HistoryAccountRegisterPayload {
  provider: string;
  username: string;
  password?: string;
  accountName?: string;
  accountNumber?: string;
  cookie?: string;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  deviceId?: string;
  idToken?: string;
  imei?: string;
  authorization?: string;
  sessionKey?: string;
  acceptPolicies: boolean;
  metadata?: Record<string, unknown>;
}

export interface AccountRegisterResponse {
  success: boolean;
  token: string;
  message: string;
  accountId?: number;
  provider?: string;
  providerLabel?: string;
}

export interface AccountActionResponse {
  success: boolean;
  message: string;
}

export interface TransactionRecord {
  transactionId: string;
  transactionType?: string;
  amount: number;
  currency: string;
  description?: string;
  status: string;
  postedAt: string;
  createdAt: string;
}

export interface TransactionHistoryResponse {
  provider: string;
  accountId: number;
  accountName?: string;
  transactions: TransactionRecord[];
}

export interface BalanceResponse {
  provider: string;
  accountId: number;
  accountName?: string;
  balance: number;
  currency: string;
}

export interface TransactionStatsResponse {
  provider: string;
  accountId: number;
  accountName?: string;
  totalTransactions: number;
  totalIncoming: number;
  totalOutgoing: number;
  netAmount: number;
  currency: string;
}

const authHeaders = () => {
  const token = getToken();

  if (!token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const createApiError = (data: any, fallbackMessage: string) => {
  const detail = data?.detail;
  const message = typeof detail === 'string'
    ? detail
    : typeof data?.message === 'string'
      ? data.message
      : data?.error || fallbackMessage;

  return new Error(message);
};

export const getHistoryProviders = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/history/providers`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được danh sách cổng');
  }

  return data as string[];
};

export const getHistoryProviderCatalog = async (): Promise<HistoryProviderDefinition[]> => {
  const response = await fetch(`${API_BASE_URL}/history/providers/catalog`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được danh mục cổng');
  }

  return data as HistoryProviderDefinition[];
};

export const getHistoryProviderPolicies = async (): Promise<ProviderPoliciesResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/providers/policies/current`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được chính sách cổng');
  }

  return data as ProviderPoliciesResponse;
};

export const createHistoryAccount = async (payload: HistoryAccountCreatePayload): Promise<HistoryAccount> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      provider: payload.provider,
      token: payload.token,
      account_name: payload.accountName,
      external_id: payload.externalId,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tạo được tài khoản lịch sử');
  }

  return data as HistoryAccount;
};

export const listHistoryAccounts = async (): Promise<HistoryAccount[]> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts`, {
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được danh sách tài khoản lịch sử');
  }

  return data as HistoryAccount[];
};

export const registerHistoryAccount = async (
  payload: HistoryAccountRegisterPayload,
): Promise<AccountRegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/register-account`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      provider: payload.provider,
      username: payload.username,
      password: payload.password,
      account_name: payload.accountName,
      account_number: payload.accountNumber,
      cookie: payload.cookie,
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
      session_id: payload.sessionId,
      device_id: payload.deviceId,
      id_token: payload.idToken,
      imei: payload.imei,
      authorization: payload.authorization,
      session_key: payload.sessionKey,
      accept_policies: payload.acceptPolicies,
      metadata: payload.metadata || {},
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không đăng ký được tài khoản cổng');
  }

  return data as AccountRegisterResponse;
};

export const deleteHistoryAccount = async (accountId: number): Promise<AccountActionResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts/${accountId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không xóa được tài khoản cổng');
  }

  return data as AccountActionResponse;
};

export const getHistoryAccountTransactions = async (accountId: number): Promise<TransactionHistoryResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts/${accountId}/transactions`, {
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được lịch sử giao dịch của tài khoản');
  }

  return data as TransactionHistoryResponse;
};

export const getHistoryAccountBalance = async (accountId: number): Promise<BalanceResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts/${accountId}/balance`, {
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được số dư tài khoản');
  }

  return data as BalanceResponse;
};

export const renewHistoryAccountToken = async (accountId: number): Promise<HistoryAccount> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts/${accountId}/renew`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không gia hạn được token tài khoản');
  }

  return data as HistoryAccount;
};

export const getHistoryAccountStats = async (accountId: number): Promise<TransactionStatsResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/accounts/${accountId}/stats`, {
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được thống kê tài khoản');
  }

  return data as TransactionStatsResponse;
};

export const getProviderTransactionsByToken = async (
  provider: string,
  token: string,
): Promise<TransactionHistoryResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/providers/${provider}/transactions?token=${encodeURIComponent(token)}`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được giao dịch từ cổng');
  }

  return data as TransactionHistoryResponse;
};

export const getProviderBalanceByToken = async (provider: string, token: string): Promise<BalanceResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/providers/${provider}/balance?token=${encodeURIComponent(token)}`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được số dư từ cổng');
  }

  return data as BalanceResponse;
};

export const getProviderStatsByToken = async (provider: string, token: string): Promise<TransactionStatsResponse> => {
  const response = await fetch(`${API_BASE_URL}/history/providers/${provider}/stats?token=${encodeURIComponent(token)}`);
  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Không tải được thống kê từ cổng');
  }

  return data as TransactionStatsResponse;
};

// MB Bank Transaction History
export interface Transaction {
  transactionId: string;
  accountNumber: string;
  postingDate?: string;
  transactionDate: string;
  creditAmount: number;
  debitAmount: number;
  transactionAmount: number;
  transactionType: string;
  currency: string;
  description?: string;
  beneficiaryAccount?: string;
  availableBalance?: number;
}

export interface MBBankTransactionHistoryResponse {
  status: boolean;
  message: string;
  transactions: Transaction[];
  total: number;
}

export interface MBBankBalance {
  status: boolean;
  message: string;
  accountNumber: string;
  accountName: string;
  availableBalance: number;
  balance: number;
  currency: string;
}

export interface MBBankStatistics {
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  transactionsByType: { income: number; expense: number };
  averageIncome: number;
  averageExpense: number;
  maxIncome: number;
  maxExpense: number;
  minIncome: number;
  minExpense: number;
  transactionsByDate: Record<string, { income: number; expense: number; count: number }>;
  transactionsByDescription: Record<string, { count: number; amount: number; type: string[] }>;
  transactionsByDay: Record<string, { income: number; expense: number; count: number }>;
}

export interface MBBankStatisticsResponse {
  status: boolean;
  message: string;
  statistics: MBBankStatistics;
}

export const getMBBankTransactionHistory = async (
  accountId: number,
  authToken: string,
  startDate?: string,
  endDate?: string
): Promise<MBBankTransactionHistoryResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const url = `${API_BASE_URL}/history/mbbank/transaction-history/${accountId}${
    params.toString() ? '?' + params.toString() : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Lỗi lấy lịch sử giao dịch');
  }

  return data as MBBankTransactionHistoryResponse;
};

export const getMBBankBalance = async (
  accountId: number,
  authToken: string
): Promise<MBBankBalance> => {
  const response = await fetch(
    `${API_BASE_URL}/history/mbbank/balance/${accountId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Lỗi lấy số dư');
  }

  return data as MBBankBalance;
};

export const getMBBankStatistics = async (
  accountId: number,
  authToken: string,
  startDate?: string,
  endDate?: string
): Promise<MBBankStatisticsResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const url = `${API_BASE_URL}/history/mbbank/statistics/${accountId}${
    params.toString() ? '?' + params.toString() : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Lỗi lấy thống kê');
  }

  return data as MBBankStatisticsResponse;
};
