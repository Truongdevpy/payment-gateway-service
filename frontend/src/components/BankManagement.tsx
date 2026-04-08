import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Eye, EyeOff, TrendingUp } from 'lucide-react';
import bankService, { BankAccount, SupportedBank } from '../services/bankService';

const BankManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('mbbank');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    account_number: '',
    phone: '',
    password: '',
    account_name: '',
  });

  // Load accounts and supported banks on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [banksData, accountsData] = await Promise.all([
        bankService.getSupportedBanks(),
        bankService.getBankAccounts(),
      ]);
      
      setSupportedBanks(banksData);
      setAccounts(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const newAccount = await bankService.createBankAccount({
        bank_type: selectedBank,
        ...formData,
      });
      
      setAccounts([...accounts, newAccount]);
      setSuccess('Thêm tài khoản ngân hàng thành công!');
      setShowForm(false);
      setFormData({ account_number: '', phone: '', password: '', account_name: '' });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi thêm tài khoản');
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa tài khoản này?')) return;
    
    try {
      setError(null);
      await bankService.deleteBankAccount(accountId);
      setAccounts(accounts.filter(acc => acc.id !== accountId));
      setSuccess('Xóa tài khoản thành công!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xóa tài khoản');
    }
  };

  const handleSyncTransactions = async (accountId: number) => {
    try {
      setError(null);
      await bankService.syncBankTransactions(accountId);
      setSuccess('Đang đồng bộ giao dịch...');
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đồng bộ');
    }
  };

  const getBankInfo = (bankType: string) => {
    return supportedBanks.find(b => b.code === bankType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản Lí Ngân Hàng</h2>
          <p className="text-sm text-gray-600 mt-1">Kết nối và quản lí các tài khoản ngân hàng của bạn</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          Thêm Tài Khoản
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">Lỗi</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold">Thành công</p>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Add Account Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-4">Thêm Tài Khoản Ngân Hàng Mới</h3>
          
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn Ngân Hàng
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {supportedBanks.map(bank => (
                    <option key={bank.code} value={bank.code}>
                      {bank.icon} {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số Tài Khoản
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleInputChange}
                  placeholder="Nhập số tài khoản"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Nhập số điện thoại"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật Khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Nhập mật khẩu"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Account Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên Hiển Thị (Tùy Chọn)
                </label>
                <input
                  type="text"
                  name="account_name"
                  value={formData.account_name}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Tài khoản chính"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition font-medium"
              >
                Thêm Tài Khoản
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition font-medium"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chưa có tài khoản ngân hàng nào</p>
            <p className="text-sm text-gray-400 mt-1">Thêm tài khoản của bạn để bắt đầu</p>
          </div>
        ) : (
          accounts.map(account => {
            const bankInfo = getBankInfo(account.bank_type);
            const usagePercent = (account.used_today / account.daily_limit) * 100;
            
            return (
              <div
                key={account.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{bankInfo?.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">
                          {bankInfo?.name || account.bank_type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {account.account_name || account.account_number}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSyncTransactions(account.id)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                      title="Đồng bộ giao dịch"
                    >
                      <RefreshCw size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Xóa tài khoản"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Usage Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Sử dụng API hôm nay</span>
                    <span className="text-sm text-gray-600">
                      {account.used_today} / {account.daily_limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{account.used_this_month}</p>
                    <p className="text-xs text-gray-600">API tháng này</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {account.is_active ? '✓' : '✗'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {account.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      <TrendingUp size={20} className="mx-auto" />
                    </p>
                    <p className="text-xs text-gray-600">
                      {account.last_used_at ? 'Được sử dụng' : 'Chưa dùng'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BankManagement;
