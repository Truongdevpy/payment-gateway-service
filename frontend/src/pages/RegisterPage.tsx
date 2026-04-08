import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { registerUser, saveToken } from '../services/authService';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'register-name') {
      setFormData((prev) => ({ ...prev, fullName: value }));
      return;
    }

    if (id === 'register-email') {
      setFormData((prev) => ({ ...prev, email: value }));
      return;
    }

    if (id === 'register-password') {
      setFormData((prev) => ({ ...prev, password: value }));
      return;
    }

    if (id === 'register-confirm-password') {
      setFormData((prev) => ({ ...prev, confirmPassword: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
        throw new Error('Vui lòng điền tất cả các trường bắt buộc.');
      }

      if (formData.fullName.trim().length < 2) {
        throw new Error('Tên người dùng phải có ít nhất 2 ký tự.');
      }

      if (formData.password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Email không hợp lệ.');
      }

      const response = await registerUser(formData);
      saveToken(response.token, response.refreshToken);
      localStorage.setItem('auth-user', JSON.stringify(response.user));
      setSuccess(true);

      window.setTimeout(() => {
        navigate('/dashboard/overview');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      alternateHref="/login"
      alternateLabel="Đăng nhập ngay"
      alternateText="Đã có tài khoản?"
      eyebrow="Đăng ký"
      mode="register"
      subtitle="Tạo workspace để kết nối tài khoản, nhận giao dịch real-time và quản trị API trong cùng một nơi."
      title="Khởi tạo hệ thống thanh toán của bạn."
    >
      <div className="mt-10">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Tạo tài khoản mới</h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Bắt đầu với gói miễn phí, cấu hình webhook và nâng cấp khi khối lượng giao dịch tăng lên.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
            Đăng ký thành công. Đang chuyển vào dashboard...
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="auth-label" htmlFor="register-name">
              Tên người phụ trách
            </label>
            <input
              className="auth-input"
              id="register-name"
              placeholder="Nguyen Van A"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="register-workspace">
              Tên workspace
            </label>
            <input
              className="auth-input"
              id="register-workspace"
              placeholder="retail-payment-prod"
              type="text"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="auth-label" htmlFor="register-email">
              Email
            </label>
            <input
              className="auth-input"
              id="register-email"
              placeholder="ops@your-company.vn"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="register-phone">
              Số điện thoại
            </label>
            <input className="auth-input" id="register-phone" placeholder="09xx xxx xxx" type="tel" />
          </div>
        </div>

        <div>
          <label className="auth-label" htmlFor="register-scale">
            Quy mô vận hành
          </label>
          <select className="auth-select" defaultValue="small" id="register-scale">
            <option value="small">Dưới 500 giao dịch mỗi ngày</option>
            <option value="medium">Từ 500 đến 5.000 giao dịch mỗi ngày</option>
            <option value="large">Trên 5.000 giao dịch mỗi ngày</option>
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="auth-label" htmlFor="register-password">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                className="auth-input pr-16"
                id="register-password"
                placeholder="Tạo mật khẩu mạnh"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div>
            <label className="auth-label" htmlFor="register-confirm-password">
              Nhập lại mật khẩu
            </label>
            <div className="relative">
              <input
                className="auth-input pr-16"
                id="register-confirm-password"
                placeholder="Xác nhận mật khẩu"
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                onClick={() => setShowConfirm((value) => !value)}
                type="button"
              >
                {showConfirm ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm leading-7 text-slate-200">
          Hệ thống cho phép bắt đầu nhỏ với gói miễn phí, sau đó nâng cấp dần khi cần thêm tài khoản,
          webhook hoặc giới hạn API lớn hơn.
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
          <input className="auth-check mt-1" type="checkbox" required />
          <span>
            Tôi đồng ý với điều khoản sử dụng, chính sách bảo mật và cho phép hệ thống gửi email hướng dẫn
            tích hợp sau khi đăng ký.
          </span>
        </label>

        <button className="btn-primary w-full justify-center disabled:opacity-50" type="submit" disabled={loading}>
          {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản miễn phí'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
