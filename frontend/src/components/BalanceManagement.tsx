import React, { useState, useEffect } from 'react';
import { Wallet, Plus, History, TrendingUp } from 'lucide-react';
import balanceService, { Balance, BankAPI } from '../services/balanceService';
import LoadingState from './LoadingState';

interface BalanceManagementProps {}

export const BalanceManagement: React.FC<BalanceManagementProps> = () => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [banks, setBanks] = useState<BankAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'banks' | 'history'>(
    'overview'
  );
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('demo');
  const [depositing, setDepositing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadBalanceData();
  }, []);

  useEffect(() => {
    if (activeTab === 'banks') {
      loadBanks();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadBalanceData = async () => {
    try {
      setLoading(true);
      const data = await balanceService.getCurrentBalance();
      setBalance(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const data = await balanceService.getAvailableBanks();
      setBanks(data.banks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banks');
    }
  };

  const loadHistory = async () => {
    try {
      const data = await balanceService.getBalanceHistory(1, 20);
      setHistory(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      setDepositing(true);
      await balanceService.depositBalance(parseFloat(depositAmount), paymentMethod);
      await loadBalanceData();
      setDepositAmount('');
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi nạp tiền');
    } finally {
      setDepositing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <LoadingState
          compact
          description="Đang tải số dư, ngân hàng liên kết và lịch sử biến động ví."
          title="Đang tải số dư"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="dashboard-skeleton h-40 w-full rounded-[28px]" key={`balance-skeleton-${index}`} />
          ))}
        </div>
        <div className="dashboard-skeleton h-[320px] w-full rounded-[32px]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ví Tiền Của Tôi</h1>
            <p className="mt-2 text-green-100">Quản lý số dư và các giao dịch của bạn</p>
          </div>
          <Wallet size={48} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 bg-white rounded-t-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'overview'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tổng Quan
        </button>
        <button
          onClick={() => setActiveTab('deposit')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'deposit'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nạp Tiền
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'banks'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Danh Sách Ngân Hàng
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'history'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Lịch Sử Giao Dịch
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-lg shadow-lg p-8">
        {activeTab === 'overview' && balance && (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600">
                <p className="text-gray-600 text-sm font-medium">Số Dư Hiện Tại</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(balance.balance)}
                </p>
                <p className="text-blue-600 text-sm mt-2">Sẵn sàng sử dụng</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-medium">Tổng Đã Nạp</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(balance.total_deposited)}
                </p>
                <div className="flex items-center text-green-600 text-sm mt-2">
                  <TrendingUp size={16} className="mr-1" />
                  Tích lũy
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-l-4 border-orange-600">
                <p className="text-gray-600 text-sm font-medium">Tổng Đã Chi</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(balance.total_spent)}
                </p>
                <p className="text-orange-600 text-sm mt-2">Đã tiêu dùng</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('deposit')}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Plus size={20} />
                Nạp Tiền
              </button>
              <button
                onClick={() => setActiveTab('banks')}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <TrendingUp size={20} />
                Xem Ngân Hàng
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nạp Tiền</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số Tiền (VND)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Nhập số tiền cần nạp"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phương Thức Thanh Toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                >
                  <option value="demo">Demo (Không thực chi)</option>
                  <option value="stripe">Stripe</option>
                  <option value="vnpay">VNPay</option>
                  <option value="momo">Momo</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Lưu ý:</strong> Hiện tại đang ở chế độ demo. Tiền nạp sẽ được thêm ngay
                  vào tài khoản.
                </p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={depositing || !depositAmount}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {depositing ? 'Đang xử lý...' : 'Nạp Tiền Ngay'}
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className="w-full bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Quay Lại
              </button>
            </div>
          </div>
        )}

        {activeTab === 'banks' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Danh Sách Ngân Hàng</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banks.map((bank) => (
                <div key={bank.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                  <div className="flex items-center gap-4 mb-4">
                    {bank.logo_url && (
                      <img
                        src={bank.logo_url}
                        alt={bank.bank_name_vi}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/48';
                        }}
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{bank.bank_name_vi}</h3>
                      <p className="text-sm text-gray-600">{bank.bank_code}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">API:</span>
                      <span className="font-medium text-gray-900">{bank.api_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phiên bản:</span>
                      <span className="font-medium text-gray-900">{bank.api_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giá:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(bank.base_price_per_call)}/call
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giới hạn/tháng:</span>
                      <span className="font-medium text-gray-900">
                        {bank.monthly_call_limit?.toLocaleString() || 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span
                        className={`font-medium ${
                          bank.is_active === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {bank.is_active === 'active' ? '✓ Hoạt động' : '✗ Không hoạt động'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Lịch Sử Giao Dịch</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Thời Gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Số Tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Mô Tả
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Trạng Thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.transaction_type === 'deposit'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.transaction_type === 'deposit' ? 'Nạp Tiền' : 'Rút Tiền'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {transaction.transaction_type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transaction.description}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {transaction.status === 'completed' ? '✓ Hoàn tất' : 'Đang xử lý'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">Chưa có giao dịch nào</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceManagement;
