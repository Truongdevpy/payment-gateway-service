import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, RefreshCw, Lock, Eye, EyeOff, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getToken } from '../services/authService';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  lastUpdated: string;
  status: 'active' | 'inactive';
  token?: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  icon: string;
  color: string;
  accounts: BankAccount[];
}

interface ModalState {
  isOpen: boolean;
  gateway: PaymentGateway | null;
}

const PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'momo',
    name: 'MoMo',
    icon: '🔴',
    color: 'from-red-500 to-red-600',
    accounts: [],
  },
  {
    id: 'vietcombank',
    name: 'Vietcombank (VCB)',
    icon: '🏦',
    color: 'from-blue-500 to-blue-600',
    accounts: [],
  },
  {
    id: 'mbbank',
    name: 'MB Bank',
    icon: '🏦',
    color: 'from-purple-500 to-purple-600',
    accounts: [],
  },
  {
    id: 'tpbank',
    name: 'TPBank',
    icon: '🏦',
    color: 'from-orange-500 to-orange-600',
    accounts: [],
  },
  {
    id: 'seabank',
    name: 'Seabank',
    icon: '🌊',
    color: 'from-cyan-500 to-cyan-600',
    accounts: [],
  },
  {
    id: 'acb',
    name: 'ACB',
    icon: '🏦',
    color: 'from-indigo-500 to-indigo-600',
    accounts: [],
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    icon: '💳',
    color: 'from-pink-500 to-pink-600',
    accounts: [],
  },
  {
    id: 'thesieure',
    name: 'TheSeRue',
    icon: '💳',
    color: 'from-green-500 to-green-600',
    accounts: [],
  },
];

const PaymentGatewayPage: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>(PAYMENT_GATEWAYS);
  const [expandedGateway, setExpandedGateway] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    gateway: null,
  });
  const [formData, setFormData] = useState({
    accountHolder: '',
    username: '',
    password: '',
    accountNumber: '',
    agreePolicy: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddAccount = async (e: React.FormEvent, gateway: PaymentGateway) => {
    e.preventDefault();
    setError('');

    if (!formData.accountHolder || !formData.username || !formData.password || !formData.accountNumber) {
      setError('Vui lòng điền tất cả các trường');
      return;
    }

    if (!formData.agreePolicy) {
      setError('Bạn phải đồng ý với chính sách bảo mật');
      return;
    }

    setLoading(true);
    try {
      const authToken = getToken();
      if (!authToken) {
        throw new Error('Vui lòng đăng nhập trước');
      }

      // Call API to register account
      const response = await fetch(`http://localhost:8000/api/history/register-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          provider: gateway.id,
          username: formData.username,
          password: formData.password,
          account_number: formData.accountNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi thêm tài khoản');
      }

      // Add new account to local state
      const newAccount: BankAccount = {
        id: Date.now().toString(),
        bankName: gateway.name,
        accountHolder: formData.accountHolder,
        accountNumber: formData.accountNumber,
        lastUpdated: new Date().toLocaleString('vi-VN'),
        status: 'active',
        token: data.token,
      };

      setGateways(prev =>
        prev.map(g =>
          g.id === gateway.id
            ? { ...g, accounts: [...g.accounts, newAccount] }
            : g
        )
      );

      // Reset form
      setFormData({
        accountHolder: '',
        username: '',
        password: '',
        accountNumber: '',
        agreePolicy: false,
      });
      setModal({ isOpen: false, gateway: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = (gatewayId: string, accountId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      setGateways(prev =>
        prev.map(g =>
          g.id === gatewayId
            ? { ...g, accounts: g.accounts.filter(a => a.id !== accountId) }
            : g
        )
      );
    }
  };

  const handleRefreshToken = (gatewayId: string, accountId: string) => {
    setGateways(prev =>
      prev.map(g =>
        g.id === gatewayId
          ? {
              ...g,
              accounts: g.accounts.map(a =>
                a.id === accountId
                  ? { ...a, lastUpdated: new Date().toLocaleString('vi-VN') }
                  : a
              ),
            }
          : g
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Quản lý Cổng Thanh Toán</h1>
          <p className="mt-2 text-lg text-gray-600">
            Kết nối và quản lý tài khoản thanh toán từ các cổng khác nhau
          </p>
        </div>

        {/* Payment Gateways */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {gateways.map(gateway => (
            <button
              key={gateway.id}
              onClick={() => {
                setExpandedGateway(expandedGateway === gateway.id ? null : gateway.id);
                setModal({ isOpen: false, gateway: null });
              }}
              className={`bg-gradient-to-br ${gateway.color} p-6 rounded-2xl text-white transform transition-all duration-300 hover:shadow-2xl hover:scale-105 text-left group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{gateway.icon}</div>
                <ChevronRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all ${expandedGateway === gateway.id ? 'rotate-90' : ''}`} />
              </div>
              <h3 className="text-lg font-bold mb-1">{gateway.name}</h3>
              <p className="text-sm opacity-90">
                {gateway.accounts.length} tài khoản
              </p>
            </button>
          ))}
        </div>

        {/* Expanded Gateway Details */}
        {expandedGateway && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            {gateways.map(gateway =>
              gateway.id === expandedGateway && (
                <div key={gateway.id}>
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${gateway.color} p-6 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{gateway.icon}</span>
                        <div>
                          <h2 className="text-2xl font-bold">{gateway.name}</h2>
                          <p className="text-sm opacity-90">Quản lý tài khoản ngân hàng</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedGateway(null)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Accounts List */}
                    {gateway.accounts.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Tài khoản của tôi</h3>
                        <div className="space-y-4">
                          {gateway.accounts.map(account => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{account.accountHolder}</h4>
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3" />
                                    Hoạt động
                                  </span>
                                </div>
                                <div className="grid gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Số tài khoản:</span> {account.accountNumber}
                                  </div>
                                  <div>
                                    <span className="font-medium">Cập nhật:</span> {account.lastUpdated}
                                  </div>
                                  {account.token && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Token:</span>
                                      <code className="rounded bg-gray-200 px-2 py-1 text-xs font-mono">
                                        {account.token.slice(0, 20)}...
                                      </code>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleRefreshToken(gateway.id, account.id)}
                                  className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                                  title="Làm mới phiên"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(gateway.id, account.id)}
                                  className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Account Form */}
                    {!modal.isOpen && (
                      <button
                        onClick={() => {
                          setModal({ isOpen: true, gateway });
                          setError('');
                          setFormData({
                            accountHolder: '',
                            username: '',
                            password: '',
                            accountNumber: '',
                            agreePolicy: false,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        Thêm tài khoản mới
                      </button>
                    )}

                    {/* Modal Form */}
                    {modal.isOpen && modal.gateway?.id === gateway.id && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          Thêm tài khoản mới
                        </h3>

                        <form onSubmit={(e) => handleAddAccount(e, gateway)} className="space-y-4">
                          {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                              <AlertCircle className="w-4 h-4" />
                              {error}
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tài khoản chủ
                            </label>
                            <input
                              type="text"
                              value={formData.accountHolder}
                              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                              placeholder="Tên người quản lý"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tài khoản ngân hàng
                            </label>
                            <input
                              type="text"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              placeholder="Tài khoản đăng nhập"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mật khẩu ngân hàng
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Nhập mật khẩu"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Mật khẩu được mã hóa và bảo vệ
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Số tài khoản ngân hàng
                            </label>
                            <input
                              type="text"
                              value={formData.accountNumber}
                              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                              placeholder="Nhập số tài khoản"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 border border-blue-200">
                            <input
                              type="checkbox"
                              checked={formData.agreePolicy}
                              onChange={(e) => setFormData({ ...formData, agreePolicy: e.target.checked })}
                              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                            <label className="text-sm font-medium text-gray-700">
                              Tôi đồng ý với{' '}
                              <button
                                type="button"
                                onClick={() => setShowPolicyModal(true)}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                Chính sách bảo mật
                              </button>
                              , Các điều khoản và điều kiện & Chính sách bảo mật
                            </label>
                          </div>

                          <div className="flex gap-3 pt-4 border-t">
                            <button
                              type="button"
                              onClick={() => setModal({ isOpen: false, gateway: null })}
                              className="flex-1 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Hủy
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {loading ? 'Đang xử lý...' : 'Thêm tài khoản'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Policy Modal */}
        {showPolicyModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-6">
                  <h2 className="text-xl font-bold text-gray-900">Chính sách bảo mật & Điều khoản</h2>
                  <button
                    onClick={() => setShowPolicyModal(false)}
                    className="rounded-lg p-1 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-96 space-y-4 overflow-y-auto p-6 text-sm text-gray-700">
                  <div>
                    <h3 className="mb-2 font-semibold text-gray-900">Chính sách bảo mật</h3>
                    <p className="mb-3">
                      Chúng tôi đặt rất nhiều giá trị vào việc bảo vệ thông tin cá nhân của bạn. Chính sách quyền riêng tư này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng dịch vụ của chúng tôi.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-gray-900">Thu thập và sử dụng thông tin</h3>
                    <p className="mb-3">
                      Khi bạn sử dụng trang web của chúng tôi hoặc tương tác với các dịch vụ của chúng tôi, chúng tôi có thể thu thập một số thông tin cá nhân nhất định từ bạn. Điều này có thể bao gồm tên, địa chỉ email, số điện thoại, địa chỉ và thông tin khác mà bạn cung cấp khi đăng ký hoặc sử dụng dịch vụ của chúng tôi.
                    </p>
                    <p className="mb-3">Chúng tôi có thể sử dụng thông tin cá nhân của bạn để:</p>
                    <ul className="mb-3 ml-4 space-y-1">
                      <li>• Cung cấp và duy trì dịch vụ</li>
                      <li>• Thông báo về những thay đổi đối với dịch vụ của chúng tôi</li>
                      <li>• Giải quyết vấn đề hoặc tranh chấp</li>
                      <li>• Theo dõi và phân tích việc sử dụng dịch vụ của chúng tôi</li>
                      <li>• Nâng cao trải nghiệm người dùng</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-gray-900">Bảo vệ</h3>
                    <p className="mb-3">
                      Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn và có các biện pháp bảo mật thích hợp để đảm bảo thông tin của bạn được giữ an toàn khi bạn truy cập trang web của chúng tôi.
                    </p>
                    <p>
                      Tuy nhiên, hãy nhớ rằng không có phương thức truyền thông tin nào qua internet hoặc phương tiện điện tử là an toàn hoặc đáng tin cậy 100%. Mặc dù chúng tôi cố gắng bảo vệ thông tin cá nhân của bạn nhưng chúng tôi không thể đảm bảo hoặc đảm bảo tính bảo mật của bất kỳ thông tin nào bạn gửi cho chúng tôi hoặc từ các dịch vụ của chúng tôi, và bạn phải tự chịu rủi ro này.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-gray-900">Thay đổi chính sách quyền riêng tư</h3>
                    <p>
                      Đôi khi, chúng tôi có thể cập nhật Chính sách quyền riêng tư này mà không cần thông báo trước. Mọi thay đổi sẽ được đăng lên trang này và được áp dụng ngay sau khi chúng được đăng. Bằng việc tiếp tục sử dụng dịch vụ của chúng tôi sau khi những thay đổi này được đăng, bạn đồng ý với những thay đổi đó.
                    </p>
                  </div>
                </div>

                <div className="border-t p-6">
                  <button
                    onClick={() => setShowPolicyModal(false)}
                    className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGatewayPage;
