import { useState, useEffect } from 'react';
import { mbBankService, MBBankAccount } from '../services/mbBankService';
import { AlertCircle, Loader, Trash2, RefreshCw, Plus } from 'lucide-react';

interface MBBankManagementProps {
  token: string;
}

export const MBBankManagement: React.FC<MBBankManagementProps> = ({ token }) => {
  const [accounts, setAccounts] = useState<MBBankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    account_number: '',
  });

  useEffect(() => {
    loadAccounts();
  }, [token]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await mbBankService.getAccounts(token);
      setAccounts(response.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginMBBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.phone || !formData.password || !formData.account_number) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const response = await mbBankService.login(
        formData.phone,
        formData.password,
        formData.account_number,
        token
      );

      if (response.status) {
        setSuccess(response.message);
        setFormData({ phone: '', password: '', account_number: '' });
        setShowLoginForm(false);
        await loadAccounts();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này không?')) {
      return;
    }

    try {
      setError('');
      const response = await mbBankService.deleteAccount(accountId, token);
      if (response.status) {
        setSuccess('Xóa tài khoản thành công');
        await loadAccounts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa tài khoản');
    }
  };

  const handleRefreshSession = async (accountId: number) => {
    try {
      setError('');
      const response = await mbBankService.refreshSession(accountId, token);
      if (response.status) {
        setSuccess('Làm mới phiên đăng nhập thành công');
        await loadAccounts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi làm mới phiên');
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
          <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900">Thành công</h3>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý tài khoản MB Bank</h2>
        <button
          onClick={() => setShowLoginForm(!showLoginForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm tài khoản
        </button>
      </div>

      {/* Login Form */}
      {showLoginForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Đăng nhập tài khoản MB Bank</h3>
          <form onSubmit={handleLoginMBBank} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại / Tài khoản đăng nhập
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Nhập số điện thoại"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Nhập mật khẩu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tài khoản (STK)
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                placeholder="Nhập số tài khoản"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {loading && accounts.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">Chưa có tài khoản MB Bank nào</p>
          <p className="text-gray-500 text-sm mt-2">Hãy thêm tài khoản đầu tiên của bạn</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map(account => (
            <div
              key={account.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{account.accountName}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    <span className="font-medium">Số điện thoại:</span> {account.phone}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">STK:</span> {account.accountNumber}
                  </p>
                </div>
                <div className="text-right">
                  {account.lastLoginAt && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">Đăng nhập lần cuối:</span>
                      <br />
                      {new Date(account.lastLoginAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleRefreshSession(account.id)}
                  disabled={loading}
                  className="flex-1 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 text-green-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Làm mới phiên
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  disabled={loading}
                  className="flex-1 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 text-red-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
