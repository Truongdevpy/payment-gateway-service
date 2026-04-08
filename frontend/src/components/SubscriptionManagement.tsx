import { useState, useEffect } from 'react';
import { subscriptionService, SubscriptionPlan, Subscription } from '../services/subscriptionService';
import { AlertCircle, Loader, Check, X, TrendingUp, Clock, Zap } from 'lucide-react';

interface SubscriptionManagementProps {
  token: string;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ token }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'plans' | 'current'>('plans');

  useEffect(() => {
    loadPlans();
  }, [token]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await subscriptionService.getAvailablePlans(token);
      setPlans(response.plans);
      setCurrentSubscription(response.currentSubscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách gói');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planType: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await subscriptionService.purchaseSubscription(
        token,
        planType,
        30,
        'balance'
      );

      if (response.status) {
        setSuccess(response.message);
        setCurrentSubscription(response.subscription || null);
        await loadPlans();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi mua gói');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (planType: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await subscriptionService.renewSubscription(
        token,
        planType,
        30,
        'balance'
      );

      if (response.status) {
        setSuccess(response.message);
        setCurrentSubscription(response.subscription || null);
        await loadPlans();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi gia hạn gói');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlanType: string) => {
    if (!currentSubscription) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await subscriptionService.upgradeSubscription(token, newPlanType);

      if (response.status) {
        setSuccess(response.message);
        setCurrentSubscription(response.newSubscription);
        await loadPlans();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi nâng cấp gói');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Lỗi</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900">Thành công</h3>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'current'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Gói hiện tại
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'plans'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Tất cả gói
          </button>
        </div>
      </div>

      {loading && !plans.length ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activeTab === 'current' ? (
        // Current Subscription
        currentSubscription ? (
          <div className="space-y-4">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{currentSubscription.planName}</h2>
                  <p className="text-blue-100 mt-2">
                    {currentSubscription.isExpired ? '❌ Đã hết hạn' : '✅ Đang hoạt động'}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full font-semibold ${getPlanBadgeColor(currentSubscription.planType)}`}>
                  {currentSubscription.planType.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Ngày hết hạn</p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentSubscription.expiresAt)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Còn lại</p>
                  <p className="text-lg font-semibold">
                    {currentSubscription.daysRemaining} ngày
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Giá</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(currentSubscription.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* API Usage */}
            {currentSubscription.apiCallsLimit && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Sử dụng API</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">
                      {currentSubscription.apiCallsUsed} / {currentSubscription.apiCallsLimit} API calls
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {Math.round((currentSubscription.apiCallsUsed / currentSubscription.apiCallsLimit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(currentSubscription.apiCallsUsed / currentSubscription.apiCallsLimit) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {currentSubscription.features && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Tính năng</h3>
                <ul className="space-y-2">
                  {currentSubscription.features.split(',').map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {feature.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!currentSubscription.isExpired && (
                <button
                  onClick={() => handleUpgrade('professional')}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-400 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {loading && <Loader className="w-4 h-4 animate-spin" />}
                  Nâng cấp
                </button>
              )}
              <button
                onClick={() => handleRenew(currentSubscription.planType)}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                Gia hạn
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Bạn chưa có gói nào</p>
            <p className="text-gray-500 text-sm mt-1">Chọn một gói bên dưới để bắt đầu</p>
            <button
              onClick={() => setActiveTab('plans')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium inline-block"
            >
              Xem tất cả gói
            </button>
          </div>
        )
      ) : (
        // Available Plans
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.planType === plan.planType;

            return (
              <div
                key={plan.planType}
                className={`rounded-lg border-2 transition-all ${
                  isCurrentPlan
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.planName}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Miễn phí' : formatCurrency(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-600 text-sm ml-2">/ {plan.durationDays} ngày</span>
                      )}
                    </div>
                  </div>

                  {/* API Calls */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600">
                      {plan.apiCallsLimit
                        ? `${plan.apiCallsLimit.toLocaleString()} API calls`
                        : 'API calls không giới hạn'}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-gray-600 italic">
                        +{plan.features.length - 4} tính năng khác
                      </li>
                    )}
                  </ul>

                  {/* Action Button */}
                  {isCurrentPlan ? (
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-center font-medium text-sm">
                      ✓ Gói hiện tại
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(plan.planType)}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                      {loading ? 'Đang xử lý...' : 'Chọn'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
