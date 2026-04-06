import React, { useState } from 'react';
import AuthLayout from './AuthLayout';

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <AuthLayout
      alternateHref="/login"
      alternateLabel="Đăng nhập ngay"
      alternateText="Đã có tài khoản?"
      eyebrow="Đăng ký"
      mode="register"
      subtitle="Trang đăng ký được dựng để trông như một SaaS payment thật: có định vị rõ ràng, lợi ích cụ thể và hình ảnh thương hiệu hỗ trợ quyết định đăng ký."
      title="Tạo workspace để nhận giao dịch real-time."
    >
      <div className="mt-10">
        <h2 className="font-display text-4xl font-bold text-white">Khởi tạo tài khoản mới</h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Tạo workspace, nhận thông tin tích hợp và bắt đầu cấu hình webhook cho hệ thống thanh toán của bạn.
        </p>
      </div>

      <form className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="auth-label" htmlFor="register-name">
              Tên người phụ trách
            </label>
            <input className="auth-input" id="register-name" placeholder="Nguyen Van A" type="text" />
          </div>

          <div>
            <label className="auth-label" htmlFor="register-workspace">
              Tên workspace
            </label>
            <input className="auth-input" id="register-workspace" placeholder="retail-payment-prod" type="text" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="auth-label" htmlFor="register-email">
              Email
            </label>
            <input className="auth-input" id="register-email" placeholder="ops@your-company.vn" type="email" />
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
          Gói dùng thử có thể bắt đầu với số lượng connector nhỏ, sau đó nâng cấp dần khi cần thêm tài khoản,
          webhook hoặc phân quyền vận hành.
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
          <input className="auth-check mt-1" type="checkbox" />
          <span>
            Tôi đồng ý với điều khoản sử dụng, chính sách bảo mật và cho phép hệ thống gửi email hướng dẫn tích
            hợp sau khi đăng ký.
          </span>
        </label>

        <button className="btn-primary w-full justify-center" type="submit">
          Tạo tài khoản miễn phí
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
