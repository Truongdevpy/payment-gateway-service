import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { loginUser, saveToken } from '../services/authService';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'login-email') {
      setFormData((prev) => ({ ...prev, email: value, otp: '' }));
      setRequiresTwoFactor(false);
      return;
    }

    if (id === 'login-password') {
      setFormData((prev) => ({ ...prev, password: value, otp: '' }));
      setRequiresTwoFactor(false);
      return;
    }

    if (id === 'login-otp') {
      setFormData((prev) => ({ ...prev, otp: value.replace(/\D/g, '').slice(0, 6) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Vui lòng nhập email và mật khẩu');
      }

      const response = await loginUser({
        email: formData.email,
        otp: formData.otp || undefined,
        password: formData.password,
      });

      if (response.requires2fa) {
        setRequiresTwoFactor(true);
        return;
      }

      if (!response.token || !response.user) {
        throw new Error('Phản hồi đăng nhập không hợp lệ');
      }

      saveToken(response.token, response.refreshToken);
      localStorage.setItem('auth-user', JSON.stringify(response.user));

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/overview');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      alternateHref="/register"
      alternateLabel="Tạo tài khoản mới"
      alternateText="Chưa có workspace?"
      eyebrow="Đăng nhập"
      mode="login"
      subtitle="Đăng nhập để theo dõi webhook, quản lý API key và vận hành hệ thống giao dịch."
      title="Truy cập khu vực vận hành giao dịch."
    >
      <div className="mt-10">
        <h2 className="font-display text-4xl font-bold text-white">Chào mừng trở lại</h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Đăng nhập để kiểm tra trạng thái kết nối ngân hàng và xử lý giao dịch real-time.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button className="auth-social" type="button">
          Google Workspace
        </button>
        <button className="auth-social" type="button">
          Telegram Support
        </button>
      </div>

      <div className="auth-divider">
        <span>hoặc đăng nhập bằng email</span>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            Đăng nhập thành công. Đang chuyển hướng...
          </div>
        ) : null}

        {requiresTwoFactor ? (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            Tài khoản này đang bật 2FA. Nhập mã 6 số từ ứng dụng xác thực để hoàn tất đăng nhập.
          </div>
        ) : null}

        <div>
          <label className="auth-label" htmlFor="login-email">
            Email hoặc tài khoản quản trị
          </label>
          <input
            className="auth-input"
            id="login-email"
            name="email"
            placeholder="admin@your-company.vn"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="auth-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              className="auth-input pr-16"
              id="login-password"
              name="password"
              placeholder="Nhập mật khẩu đăng nhập"
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

        {requiresTwoFactor ? (
          <div>
            <label className="auth-label" htmlFor="login-otp">
              Mã xác thực 2FA
            </label>
            <input
              className="auth-input"
              id="login-otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã 6 số"
              type="text"
              value={formData.otp}
              onChange={handleChange}
              required={requiresTwoFactor}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3">
            <input className="auth-check" type="checkbox" />
            Ghi nhớ phiên đăng nhập
          </label>

          <Link className="text-cyan-200 transition hover:text-white" to="/register">
            Chưa có tài khoản? Tạo mới
          </Link>
        </div>

        <button
          className="btn-primary w-full justify-center disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Đang đăng nhập...' : requiresTwoFactor ? 'Xác nhận mã 2FA' : 'Đăng nhập vào dashboard'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
