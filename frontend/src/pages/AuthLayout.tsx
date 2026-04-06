import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { brandLogos } from '../assets/brands';

type AuthLayoutProps = {
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  children: React.ReactNode;
  eyebrow: string;
  mode: 'login' | 'register';
  subtitle: string;
  title: string;
};

const partnerLogos = [
  { src: brandLogos.vietcombank, name: 'Vietcombank' },
  { src: brandLogos.acb, name: 'ACB' },
  { src: brandLogos.mbbank, name: 'MB Bank' },
  { src: brandLogos.bidv, name: 'BIDV' },
  { src: brandLogos.vietinbank, name: 'VietinBank' },
  { src: brandLogos.viettelpay, name: 'Viettel Money' },
  { src: brandLogos.thesieure, name: 'TheSieure' },
];

const sideMetrics = [
  { value: '99.99%', label: 'Mục tiêu uptime cho cụm webhook' },
  { value: '<1s', label: 'Độ trễ đẩy giao dịch khi có tiền vào' },
  { value: '8+', label: 'Nguồn thanh toán được gom về một nơi' },
  { value: '24/7', label: 'Mô hình giám sát và phản hồi sự cố' },
];

const quickSteps = [
  'Kết nối tài khoản ngân hàng và webhook nhận giao dịch.',
  'Theo dõi dòng tiền, đối soát đơn hàng và trạng thái callback.',
  'Mở rộng thêm cổng hoặc user vận hành khi hệ thống tăng tải.',
];

const AuthLayout: React.FC<AuthLayoutProps> = ({
  alternateHref,
  alternateLabel,
  alternateText,
  children,
  eyebrow,
  mode,
  subtitle,
  title,
}) => {
  return (
    <div className="auth-shell min-h-screen text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-5rem] top-[-4rem] h-72 w-72 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-96 w-96 rounded-full bg-sky-500/14 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="noise-grid absolute inset-0 opacity-70" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
        <aside className="auth-panel hidden flex-col justify-between overflow-hidden rounded-[2rem] p-8 lg:flex xl:p-10">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link className="flex items-center gap-3" to="/">
                <span className="glow-ring flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-cyan-200">
                  TA
                </span>
                <div>
                  <span className="block text-xs uppercase tracking-[0.32em] text-cyan-200/70">Realtime</span>
                  <span className="font-display text-xl font-semibold text-white">Gateway Access</span>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <ThemeToggle compact />
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100">
                  {mode === 'login' ? 'Member login' : 'Create account'}
                </span>
              </div>
            </div>

            <div className="mt-10 max-w-xl">
              <p className="section-kicker">{eyebrow}</p>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] text-white">{title}</h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-slate-300">{subtitle}</p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {sideMetrics.map((metric) => (
                <div key={metric.label} className="auth-metric">
                  <p className="font-display text-3xl font-bold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{metric.label}</p>
                </div>
              ))}
            </div>

            <div className="auth-panel auth-logo-orb mt-10 rounded-[1.8rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Connected banks</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-white">Network preview</h2>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
                  7 live connectors
                </span>
              </div>

              <div className="mt-8 grid grid-cols-4 gap-4">
                {partnerLogos.map((partner) => (
                  <div key={partner.name} className="auth-logo-badge">
                    <img alt={partner.name} src={partner.src} />
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Access flow</p>
                    <p className="mt-2 font-display text-xl font-semibold text-white">Từ auth đến webhook thực chiến</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    Ready
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {quickSteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/12 text-xs font-semibold text-cyan-100">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 text-sm text-slate-400">
            <span>Thiết kế auth đồng bộ với landing page và dùng asset tải từ internet.</span>
            <Link className="text-cyan-200 transition hover:text-white" to="/">
              Về trang chủ
            </Link>
          </div>
        </aside>

        <main className="flex items-center justify-center py-4 lg:py-0">
          <div className="auth-form-card w-full max-w-xl rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link className="flex items-center gap-3 lg:hidden" to="/">
                <span className="glow-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-cyan-200">
                  TA
                </span>
                <span className="font-display text-lg font-semibold text-white">Gateway Access</span>
              </Link>

              <div className="ml-auto flex items-center gap-3">
                <ThemeToggle compact />
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  to="/login"
                >
                  Đăng nhập
                </Link>
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  to="/register"
                >
                  Đăng ký
                </Link>
                </div>
              </div>
            </div>

            {children}

            <p className="mt-8 text-center text-sm text-slate-400">
              {alternateText}{' '}
              <Link className="font-medium text-cyan-200 transition hover:text-white" to={alternateHref}>
                {alternateLabel}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
