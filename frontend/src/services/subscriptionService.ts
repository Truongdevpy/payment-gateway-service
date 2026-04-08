const API_BASE_URL = 'http://localhost:8000/api';

export interface SubscriptionPlan {
  planType: string;
  planName: string;
  price: number;
  currency: string;
  durationDays: number;
  apiCallsLimit: number | null;
  features: string[];
  description: string;
}

export interface Subscription {
  id: number;
  userId: number;
  planType: string;
  planName: string;
  price: number;
  currency: string;
  durationDays: number;
  apiCallsLimit: number | null;
  apiCallsUsed: number;
  purchasedAt?: string;
  startsAt?: string;
  expiresAt: string;
  renewedAt?: string;
  isActive: boolean;
  isAutoRenew: boolean;
  isExpired: boolean;
  daysRemaining: number;
  canUseApi: boolean;
  hasApiCallsRemaining: boolean;
  paymentMethod?: string;
  transactionId?: string;
  paymentStatus: string;
  features?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailablePlansResponse {
  plans: SubscriptionPlan[];
  currentSubscription: Subscription | null;
}

export interface SubscriptionListResponse {
  message: string;
  subscriptions: Subscription[];
  currentSubscription: Subscription | null;
  total: number;
}

export interface PaymentResponse {
  status: boolean;
  message: string;
  subscription?: Subscription;
  paymentUrl?: string;
  transaction_id?: string;
}

export interface UpgradeResponse {
  status: boolean;
  message: string;
  oldSubscription?: Subscription;
  newSubscription: Subscription;
}

export interface ApiUsageResponse {
  status: boolean;
  subscription: Subscription;
  usage: any;
  message: string;
}

class SubscriptionService {
  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(token: string): Promise<AvailablePlansResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy danh sách gói');
    }

    return response.json();
  }

  /**
   * Get current active subscription
   */
  async getCurrentSubscription(token: string): Promise<Subscription> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy gói hiện tại');
    }

    return response.json();
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(token: string): Promise<SubscriptionListResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy lịch sử gói');
    }

    return response.json();
  }

  /**
   * Purchase a new subscription
   */
  async purchaseSubscription(
    token: string,
    planType: string,
    durationDays: number,
    paymentMethod: string = 'balance'
  ): Promise<PaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_type: planType,
        duration_days: durationDays,
        payment_method: paymentMethod,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi mua gói');
    }

    return response.json();
  }

  /**
   * Renew current subscription
   */
  async renewSubscription(
    token: string,
    planType: string,
    durationDays: number,
    paymentMethod: string = 'balance'
  ): Promise<PaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_type: planType,
        duration_days: durationDays,
        payment_method: paymentMethod,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi gia hạn gói');
    }

    return response.json();
  }

  /**
   * Upgrade to a higher tier subscription
   */
  async upgradeSubscription(token: string, newPlanType: string): Promise<UpgradeResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_type: newPlanType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi nâng cấp gói');
    }

    return response.json();
  }

  /**
   * Get API usage statistics
   */
  async getApiUsage(token: string): Promise<ApiUsageResponse> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi lấy thống kê');
    }

    return response.json();
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(token: string, subscriptionId: number): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/subscriptions/cancel/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi hủy gói');
    }

    return response.json();
  }

  /**
   * Check API access
   */
  async checkApiAccess(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/check-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi kiểm tra truy cập');
    }

    return response.json();
  }
}

export const subscriptionService = new SubscriptionService();
