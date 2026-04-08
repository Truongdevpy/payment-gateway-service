import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader,
  Zap,
} from 'lucide-react';
import LoadingState from './LoadingState';
import { subscriptionService, Subscription } from '../services/subscriptionService';

interface PlanInfoPageProps {
  token: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expireDate = new Date(expiresAt);
  const diffTime = expireDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getPlanColor = (planType: string) => {
  switch (planType.toLowerCase()) {
    case 'free':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800',
        icon: 'text-gray-600',
      };
    case 'basic':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        icon: 'text-blue-600',
      };
    case 'professional':
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800',
        icon: 'text-purple-600',
      };
    case 'enterprise':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        icon: 'text-amber-600',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800',
        icon: 'text-gray-600',
      };
  }
};

const getPlanNameVi = (planType: string) => {
  switch (planType.toLowerCase()) {
    case 'free':
      return 'Miễn phí';
    case 'basic':
      return 'Cơ bản';
    case 'professional':
      return 'Chuyên nghiệp';
    case 'enterprise':
      return 'Doanh nghiệp';
    default:
      return planType;
  }
};

const PlanInfoPageComponent: React.FC<PlanInfoPageProps> = ({ token }) => {
  const subscriptionsQuery = useQuery({
    queryKey: ['subscription-history', token],
    queryFn: () => subscriptionService.getSubscriptionHistory(token),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const allSubscriptions = useMemo(
    () => subscriptionsQuery.data?.subscriptions || [],
    [subscriptionsQuery.data?.subscriptions]
  );
  const currentSubscription = subscriptionsQuery.data?.currentSubscription || null;
  const activeSubscriptions = useMemo(
    () => allSubscriptions.filter((sub) => sub.isActive && !sub.isExpired),
    [allSubscriptions]
  );
  const expiredSubscriptions = useMemo(
    () => allSubscriptions.filter((sub) => sub.isExpired),
    [allSubscriptions]
  );
  const errorMessage =
    subscriptionsQuery.error instanceof Error
      ? subscriptionsQuery.error.message
      : subscriptionsQuery.error
        ? 'Lỗi khi tải dữ liệu gói'
        : '';

  const renderSubscriptionCard = (sub: Subscription, isExpired: boolean = false) => {
    const colors = getPlanColor(sub.planType);
    const daysLeft = getDaysRemaining(sub.expiresAt);
    const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;

    return (
      <div key={sub.id} className={`rounded-lg border p-6 ${colors.bg} ${colors.border}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-3 ${colors.badge}`}>
              <Zap className={`h-6 w-6 ${colors.icon}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{getPlanNameVi(sub.planType)}</h3>
              <p className="text-sm text-gray-600">Gói {sub.planName}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isExpired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Đã hết hạn
              </span>
            )}
            {!isExpired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <CheckCircle className="h-4 w-4" />
                Đang sử dụng
              </span>
            )}
            {isExpiringSoon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                <Clock className="h-4 w-4" />
                Sắp hết hạn
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded bg-white p-3">
            <p className="mb-1 text-xs text-gray-600">Giá gói</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(sub.price)}</p>
          </div>
          <div className="rounded bg-white p-3">
            <p className="mb-1 text-xs text-gray-600">Thời hạn</p>
            <p className="text-lg font-bold text-gray-900">{sub.durationDays} ngày</p>
          </div>
          {sub.apiCallsLimit && (
            <div className="rounded bg-white p-3">
              <p className="mb-1 text-xs text-gray-600">Giới hạn API</p>
              <p className="text-lg font-bold text-gray-900">
                {sub.apiCallsLimit.toLocaleString('vi-VN')}
              </p>
            </div>
          )}
          {sub.apiCallsLimit && (
            <div className="rounded bg-white p-3">
              <p className="mb-1 text-xs text-gray-600">Đã sử dụng</p>
              <p className="text-lg font-bold text-gray-900">
                {sub.apiCallsUsed.toLocaleString('vi-VN')} / {sub.apiCallsLimit.toLocaleString('vi-VN')}
              </p>
            </div>
          )}
        </div>

        <div className="mb-4 rounded bg-white p-3">
          <div className="space-y-2">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Ngày mua</span>
              <span className="font-medium text-gray-900">
                {formatDate(sub.purchasedAt || sub.createdAt || '')}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Ngày bắt đầu</span>
              <span className="font-medium text-gray-900">
                {formatDate(sub.startsAt || sub.createdAt || '')}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Ngày hết hạn</span>
              <span className="font-medium text-gray-900">{formatDate(sub.expiresAt)}</span>
            </div>
            {!isExpired && (
              <div className="flex justify-between gap-4 border-t pt-2 text-sm">
                <span className="text-gray-600">Còn lại</span>
                <span className={`font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-green-600'}`}>
                  {daysLeft} ngày
                </span>
              </div>
            )}
          </div>
        </div>

        {sub.isAutoRenew && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Tự động gia hạn:</span> Gói này sẽ tự động gia hạn khi hết hạn.
            </p>
          </div>
        )}

        <div className="rounded bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-700">Phương thức thanh toán</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm capitalize text-gray-700">{sub.paymentMethod || 'trực tiếp'}</span>
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                sub.paymentStatus === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : sub.paymentStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {sub.paymentStatus === 'completed'
                ? 'Đã thanh toán'
                : sub.paymentStatus === 'pending'
                  ? 'Chờ xử lý'
                  : 'Thất bại'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (subscriptionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingState
          compact
          description="Đang tải lịch sử gói, trạng thái hiện tại và giới hạn sử dụng."
          title="Đang tải thông tin gói"
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="space-y-4">
              <div className="dashboard-skeleton h-8 w-48 rounded-full" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="dashboard-skeleton h-24 w-full rounded-xl" key={`plan-stat-${index}`} />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="dashboard-skeleton h-14 w-full rounded-xl" key={`plan-row-${index}`} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="dashboard-skeleton h-36 w-full rounded-2xl" />
            <div className="dashboard-skeleton h-36 w-full rounded-2xl" />
            <div className="dashboard-skeleton h-44 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Lỗi</h3>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {currentSubscription && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Gói đang sử dụng</h2>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            {renderSubscriptionCard(currentSubscription, false)}

            <div className="space-y-4">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                <p className="mb-1 text-sm opacity-90">Tổng gói sử dụng</p>
                <p className="text-4xl font-bold">{activeSubscriptions.length}</p>
              </div>

              <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
                <p className="mb-1 text-sm opacity-90">Gói đã hết hạn</p>
                <p className="text-4xl font-bold">{expiredSubscriptions.length}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <p className="mb-4 text-sm font-semibold text-gray-600">Thông tin sử dụng</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-700">Tổng chi tiêu</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(allSubscriptions.reduce((sum, sub) => sum + sub.price, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-700">Trung bình/gói</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        allSubscriptions.length > 0
                          ? allSubscriptions.reduce((sum, sub) => sum + sub.price, 0) / allSubscriptions.length
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubscriptions.length > 0 && (!currentSubscription || activeSubscriptions.length > 1) && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Các gói đang hoạt động</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {activeSubscriptions
              .filter((sub) => !currentSubscription || sub.id !== currentSubscription.id)
              .map((sub) => renderSubscriptionCard(sub, false))}
          </div>
        </div>
      )}

      {expiredSubscriptions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Gói đã hết hạn ({expiredSubscriptions.length})</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {expiredSubscriptions.map((sub) => renderSubscriptionCard(sub, true))}
          </div>
        </div>
      )}

      {allSubscriptions.length === 0 && !errorMessage && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <Zap className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Chưa có gói nào</h3>
          <p className="text-gray-600">Bạn chưa mua bất kỳ gói nào. Hãy chọn một gói để bắt đầu.</p>
        </div>
      )}
    </div>
  );
};

export const PlanInfoPage = React.memo(PlanInfoPageComponent);

export default PlanInfoPage;
