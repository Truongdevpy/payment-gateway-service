const API_BASE_URL = 'http://localhost:8000/api';

export interface MBBankAccount {
  id: number;
  phone: string;
  accountNumber: string;
  accountName: string;
  sessionId?: string;
  deviceId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MBBankLoginRequest {
  phone: string;
  password: string;
  account_number: string;
}

export interface MBBankLoginResponse {
  message: string;
  status: boolean;
  account?: MBBankAccount;
  token?: string;
}

export interface MBBankAccountListResponse {
  message: string;
  accounts: MBBankAccount[];
  total: number;
}

export interface CaptchaResponse {
  status: boolean;
  message: string;
  data: {
    image_data: string;
    captcha_id: string;
  };
}

class MBBankService {
  /**
   * Get captcha image from MB Bank
   */
  async getCaptcha(): Promise<CaptchaResponse> {
    const response = await fetch(`${API_BASE_URL}/mbbank/get-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi khi lấy captcha');
    }

    return response.json();
  }

  /**
   * Login to MB Bank with credentials
   */
  async login(
    phone: string,
    password: string,
    accountNumber: string,
    token: string
  ): Promise<MBBankLoginResponse> {
    const response = await fetch(`${API_BASE_URL}/mbbank/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone,
        password,
        account_number: accountNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi đăng nhập MB Bank');
    }

    return response.json();
  }

  /**
   * Get all MB Bank accounts for current user
   */
  async getAccounts(token: string): Promise<MBBankAccountListResponse> {
    const response = await fetch(`${API_BASE_URL}/mbbank/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy danh sách tài khoản');
    }

    return response.json();
  }

  /**
   * Get specific MB Bank account details
   */
  async getAccount(accountId: number, token: string): Promise<MBBankAccount> {
    const response = await fetch(`${API_BASE_URL}/mbbank/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy thông tin tài khoản');
    }

    return response.json();
  }

  /**
   * Delete a linked MB Bank account
   */
  async deleteAccount(accountId: number, token: string): Promise<{ message: string; status: boolean }> {
    const response = await fetch(`${API_BASE_URL}/mbbank/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi xóa tài khoản');
    }

    return response.json();
  }

  /**
   * Refresh MB Bank session
   */
  async refreshSession(accountId: number, token: string): Promise<{ status: boolean; message: string; account: MBBankAccount }> {
    const response = await fetch(`${API_BASE_URL}/mbbank/refresh-session/${accountId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi làm mới phiên');
    }

    return response.json();
  }
}

export const mbBankService = new MBBankService();
