import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthLayout
      alternateHref="/register"
      alternateLabel="Tạo tài khoản mới"
      alternateText="Chưa có workspace?"
      eyebrow="Đăng nhập"
      mode="login"
      subtitle="Dùng lại phong cách visual của landing page nhưng tập trung vào cảm giác tin cậy, rõ luồng và đủ mạnh để đặt trong hệ sinh thái thanh toán."
      title="Truy cập khu vực vận hành giao dịch."
    >
      <div className="mt-10">
        <h2 className="font-display text-4xl font-bold text-white">Chào mừng trở lại</h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Đăng nhập để theo dõi webhook, quản lý API key và kiểm tra trạng thái kết nối ngân hàng.
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

      <form className="space-y-5">
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

        <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3">
            <input className="auth-check" type="checkbox" />
            Ghi nhớ phiên đăng nhập
          </label>

          <Link className="text-cyan-200 transition hover:text-white" to="/register">
            Quên mật khẩu? Liên hệ quản trị
          </Link>
        </div>

        <button className="btn-primary w-full justify-center" type="submit">
          Đăng nhập vào dashboard
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
