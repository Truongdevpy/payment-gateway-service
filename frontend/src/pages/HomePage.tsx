import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { brandLogos } from '../assets/brands';

const metrics = [
  { value: '8+', label: 'Ngân hàng và cổng thanh toán' },
  { value: '99.99%', label: 'Cam kết uptime ổn định' },
  { value: '<1s', label: 'Webhook phản hồi gần như tức thì' },
  { value: '5,000+', label: 'Khách hàng đang vận hành' },
];

const features = [
  {
    title: 'Webhook tức thì',
    description:
      'Push giao dịch về server ngay khi có tiền vào, không cần polling thủ công và không tạo độ trễ xác nhận đơn hàng.',
  },
  {
    title: 'Bảo mật lớp kép',
    description:
      'Kết hợp API key, secret ký request và vùng quản trị tách biệt để giảm rủi ro rò rỉ dữ liệu giao dịch.',
  },
  {
    title: 'Tích hợp nhanh',
    description:
      'REST API rõ ràng, payload dễ parse và luồng cấu hình phù hợp cả hệ thống nhỏ lẫn quy mô doanh nghiệp.',
  },
  {
    title: 'Lịch sử giao dịch',
    description:
      'Tra cứu theo thời gian, số tiền, nội dung chuyển khoản và chuẩn hóa dữ liệu để đối soát đơn giản hơn.',
  },
  {
    title: 'Dashboard rõ ràng',
    description:
      'Theo dõi doanh thu, trạng thái tài khoản, lỗi webhook và hiệu năng API trong một màn hình duy nhất.',
  },
  {
    title: 'Hỗ trợ vận hành',
    description:
      'Mô hình hỗ trợ theo ca giúp xử lý nhanh lỗi kết nối, thay đổi thông tin ngân hàng và tình huống bất thường.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Tạo tài khoản',
    description: 'Khởi tạo workspace và nhận thông tin xác thực ban đầu trong vài phút.',
  },
  {
    number: '02',
    title: 'Chọn gói phù hợp',
    description: 'Bắt đầu với gói cơ bản rồi mở rộng theo số lượng tài khoản hoặc lưu lượng giao dịch.',
  },
  {
    number: '03',
    title: 'Cấu hình webhook',
    description: 'Khai báo URL callback, whitelist IP và bật ngân hàng cần theo dõi.',
  },
  {
    number: '04',
    title: 'Nhận giao dịch tự động',
    description: 'Hệ thống bắt đầu gửi dữ liệu real-time để xác nhận thanh toán và cập nhật trạng thái đơn.',
  },
];

const providers = [
  {
    code: 'VCB',
    description: 'Webhook real-time, tra cứu lịch sử giao dịch và đối soát nội dung chuyển khoản.',
    logo: brandLogos.vietcombank,
    name: 'Vietcombank',
    accent: 'from-emerald-400/30 to-emerald-200/10',
    tags: ['Webhook', 'History API'],
  },
  {
    code: 'ACB',
    description: 'Phù hợp shop, SaaS và hệ thống cần xác nhận đơn hàng qua giao dịch vào tài khoản.',
    logo: brandLogos.acb,
    name: 'ACB',
    accent: 'from-sky-400/30 to-sky-200/10',
    tags: ['API', 'Callback'],
  },
  {
    code: 'MBB',
    description: 'Tối ưu cho luồng MB Bank với payload gọn, dễ map backend và xử lý callback.',
    logo: brandLogos.mbbank,
    name: 'MB Bank',
    accent: 'from-blue-400/30 to-blue-200/10',
    tags: ['MBBank', 'Fast Sync'],
  },
  {
    code: 'BIDV',
    description: 'Đồng bộ biến động số dư, nội dung chuyển khoản và thông báo đến webhook ngay khi có tiền.',
    logo: brandLogos.bidv,
    name: 'BIDV',
    accent: 'from-cyan-400/30 to-cyan-200/10',
    tags: ['Realtime', 'Balance'],
  },
  {
    code: 'VTB',
    description: 'Kết nối luồng giao dịch VietinBank để tự động xác nhận thanh toán và đối soát.',
    logo: brandLogos.vietinbank,
    name: 'VietinBank',
    accent: 'from-orange-400/30 to-orange-200/10',
    tags: ['Webhook', 'Banking'],
  },
  {
    code: 'VTM',
    description: 'Viettel Money cho các hệ thống cần đồng bộ nạp tiền, thanh toán và callback tức thì.',
    logo: brandLogos.viettelpay,
    name: 'Viettel Money',
    accent: 'from-amber-400/30 to-amber-200/10',
    tags: ['Wallet', 'Notify'],
  },
  {
    code: 'NP',
    description: 'Nappay dành cho hệ thống gom nhiều kênh thanh toán và cần thêm lớp callback riêng.',
    logo: brandLogos.nappay,
    name: 'Nappay',
    accent: 'from-fuchsia-400/30 to-fuchsia-200/10',
    tags: ['Gateway', 'Multi Flow'],
  },
  {
    code: 'TSR',
    description: 'TheSieure để triển khai nhanh, phù hợp các nền tảng cần giải pháp chi phí gọn.',
    logo: brandLogos.thesieure,
    name: 'Thesieure',
    accent: 'from-indigo-400/30 to-indigo-200/10',
    tags: ['Topup', 'Realtime'],
  },
];

const plans = [
  {
    name: 'Cổng ngân hàng',
    price: 'đ40.000',
    period: '/tháng',
    description: 'Gom nhiều ngân hàng trong một cụm triển khai duy nhất để vận hành gọn hơn.',
    features: [
      'Tối đa 10 tài khoản',
      'Không giới hạn request',
      'Webhook real-time',
      'Không giới hạn tên miền',
    ],
    featured: false,
    highlight: 'Combo',
  },
  {
    name: 'Cổng MB Bank',
    price: 'đ35.000',
    period: '/tháng',
    description: 'Gói chuyên biệt cho MB Bank với tốc độ đồng bộ ổn định và payload gọn.',
    features: [
      'Tối đa 10 tài khoản',
      'Payload tối ưu cho MB',
      'Cập nhật 30 giây/lần',
      'Hỗ trợ webhook signature',
    ],
    featured: true,
    highlight: 'Phổ biến nhất',
  },
  {
    name: 'Cổng TheSieure',
    price: 'đ30.000',
    period: '/tháng',
    description: 'Lựa chọn tiết kiệm để đồng bộ thanh toán qua cổng trung gian nhanh gọn.',
    features: [
      'Tối đa 10 tài khoản',
      'Không phí ẩn',
      'Webhook real-time',
      'Dễ nâng cấp khi tăng tải',
    ],
    featured: false,
    highlight: 'Starter',
  },
  {
    name: 'Cổng Nappay',
    price: 'đ30.000',
    period: '/tháng',
    description: 'Dịch vụ cho hệ thống cần thêm một lớp xử lý giao dịch trung gian và callback riêng.',
    features: [
      'Tối đa 10 tài khoản',
      'Hỗ trợ callback theo giao dịch',
      'Không giới hạn request',
      'Tích hợp nhanh trong 5 phút',
    ],
    featured: false,
    highlight: 'Gateway',
  },
  {
    name: 'Webhook Pro',
    price: 'đ79.000',
    period: '/tháng',
    description: 'Gói nâng cao cho team cần retry webhook, log chi tiết và phân quyền vận hành.',
    features: [
      'Retry callback tự động',
      'Log sự kiện 30 ngày',
      'API key + secret riêng',
      'Cảnh báo lỗi webhook',
    ],
    featured: false,
    highlight: 'Advanced',
  },
  {
    name: 'Enterprise',
    price: 'đ199.000',
    period: '/tháng',
    description: 'Dành cho hệ thống lớn cần nhiều tài khoản, SLA rõ ràng và ưu tiên hỗ trợ kỹ thuật.',
    features: [
      'Không giới hạn tài khoản',
      'Dashboard team vận hành',
      'Ưu tiên xử lý sự cố',
      'Tùy biến luồng callback',
    ],
    featured: false,
    highlight: 'Scale',
  },
];

const faqs = [
  {
    question: 'Nền tảng này hoạt động như thế nào?',
    answer:
      'Hệ thống kết nối tài khoản ngân hàng, theo dõi biến động số dư và đẩy giao dịch mới về webhook của bạn để tự động xác nhận thanh toán.',
  },
  {
    question: 'Mất bao lâu để tích hợp?',
    answer:
      'Với ứng dụng đã có backend, phần lớn chỉ cần map endpoint webhook, lưu API key và xử lý payload trong khoảng vài giờ làm việc.',
  },
  {
    question: 'Dữ liệu giao dịch có an toàn không?',
    answer:
      'Thiết kế phù hợp mô hình API key và secret riêng cho từng workspace, kết hợp mã hóa đường truyền và kiểm soát endpoint nhận dữ liệu.',
  },
  {
    question: 'Có thể mở rộng thêm ngân hàng sau này không?',
    answer:
      'Có. Bố cục trang và nội dung đang được viết theo kiểu modular để bạn thêm gói dịch vụ, ngân hàng và FAQ mới mà không phải sửa cấu trúc tổng thể.',
  },
];

const sampleResponse = `{
  "status": "success",
  "transactions": [
    {
      "transactionID": 3993,
      "amount": 1500000,
      "description": "DH20250305 thanh toan",
      "type": "IN"
    }
  ]
}`;

const navItems = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Quy trình', href: '#workflow' },
  { label: 'Ngân hàng', href: '#banks' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const heroBanks = [
  brandLogos.vietcombank,
  brandLogos.acb,
  brandLogos.mbbank,
  brandLogos.bidv,
  brandLogos.vietinbank,
];

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-32 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="noise-grid absolute inset-0 opacity-60" />
      </div>

      <header className="site-header sticky top-0 z-20 backdrop-blur-xl">
        <div className="section-shell flex items-center justify-between gap-4 py-4">
          <a className="flex items-center gap-3" href="#top">
            <span className="glow-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-cyan-200">
              TA
            </span>
            <span>
              <span className="block text-sm font-medium uppercase tracking-[0.28em] text-cyan-200/70">
                Thue API
              </span>
              <span className="font-display text-lg font-bold text-white">Realtime Gateway</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-white" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <a className="btn-secondary hidden md:inline-flex" href="/register">
              Bắt đầu ngay
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="section-shell relative grid gap-16 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 shadow-[0_0_0_1px_rgba(45,212,191,0.05)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
              Hệ thống hoạt động ổn định, uptime mục tiêu 99.99%
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.04] tracking-tight text-white md:text-6xl">
              Giao diện landing page cho nền tảng API thanh toán ngân hàng real-time.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Thiết kế bám theo tinh thần của trang mẫu: định vị rõ sản phẩm, nhấn mạnh webhook tức thì, ngân
              hàng hỗ trợ trực quan bằng logo thật và bảng giá đủ nhiều gói để khách dễ chọn dịch vụ.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a className="btn-primary" href="/register">
                Dùng thử miễn phí
              </a>
              <a className="btn-secondary" href="#features">
                Xem tính năng
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">RESTful API</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Webhook tức thì</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Hỗ trợ 8+ cổng</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Tích hợp trong 5 phút</span>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center">
                {heroBanks.map((logo, index) => (
                  <span
                    key={logo}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/90 p-2 shadow-sm ${
                      index > 0 ? '-ml-3' : ''
                    }`}
                  >
                    <img alt="Bank logo" className="h-full w-full object-contain" src={logo} />
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400">Logo thật cho Vietcombank, ACB, MB Bank, BIDV, VietinBank.</p>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:160ms]">
            <div className="surface-card relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Live Preview</p>
                  <h2 className="font-display text-2xl font-semibold text-white">Webhook Monitor</h2>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
                  API Online
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Sự kiện hôm nay</p>
                  <p className="mt-2 text-2xl font-semibold text-white">12,482</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Webhook thành công</p>
                  <p className="mt-2 text-2xl font-semibold text-white">99.94%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Độ trễ trung bình</p>
                  <p className="mt-2 text-2xl font-semibold text-white">620ms</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[rgba(2,6,23,0.85)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-2 pb-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  GET /historyapimbbankv2/:token
                </div>
                <pre className="overflow-x-auto font-mono text-sm leading-7 text-cyan-100">
                  <code>{sampleResponse}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell grid gap-4 pb-10 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <article
              key={metric.label}
              className="surface-card animate-fade-up rounded-[1.75rem] p-6"
              style={{ animationDelay: `${index * 90 + 240}ms` }}
            >
              <p className="font-display text-4xl font-bold text-white">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="section-shell py-16" id="features">
          <div className="max-w-2xl">
            <p className="section-kicker">Tính năng</p>
            <h2 className="section-heading">Mọi thứ cần để tự động hóa thanh toán và đối soát giao dịch.</h2>
            <p className="section-copy">
              Phần giao diện này bám theo cấu trúc bán hàng của trang mẫu nhưng được tổ chức lại cho cảm giác hiện
              đại hơn, dễ mở rộng hơn khi bạn cần bổ sung dashboard hoặc tài liệu kỹ thuật sau này.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="surface-card animate-fade-up rounded-[1.75rem] p-6"
                style={{ animationDelay: `${index * 90 + 120}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-lg text-cyan-200">
                  {index + 1}
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell py-16" id="workflow">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <p className="section-kicker">Quy trình</p>
              <h2 className="section-heading">Bắt đầu nhanh trong 4 bước, không cần luồng onboarding phức tạp.</h2>
              <p className="section-copy">
                Mỗi bước được tách rõ để phù hợp với landing page SaaS: người xem hiểu sản phẩm, chọn gói, cấu hình
                webhook và đi thẳng đến hành động mua hoặc đăng ký.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {steps.map((step, index) => (
                <article
                  key={step.number}
                  className="surface-card animate-fade-up rounded-[1.75rem] p-6"
                  style={{ animationDelay: `${index * 100 + 180}ms` }}
                >
                  <p className="font-display text-5xl font-bold leading-none text-white/15">{step.number}</p>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-16" id="banks">
          <div className="max-w-2xl">
            <p className="section-kicker">Ngân hàng</p>
            <h2 className="section-heading">Logo thật của ngân hàng và cổng thanh toán giúp phần đối tác đáng tin hơn.</h2>
            <p className="section-copy">
              Tôi đổi khối này từ tile chữ sang logo thật để section nhìn giống website thương mại hơn, khách quét một
              lần là nhận ra ngay các đối tác đang hỗ trợ.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {providers.map((provider, index) => (
              <article
                key={provider.name}
                className="surface-card animate-fade-up rounded-[1.5rem] p-5"
                style={{ animationDelay: `${index * 70 + 120}ms` }}
              >
                <div className={`rounded-[1.25rem] bg-gradient-to-br ${provider.accent} p-4`}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-sm">
                      <img alt={provider.name} className="h-full w-full object-contain" src={provider.logo} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{provider.code}</p>
                      <p className="mt-1 font-display text-xl font-bold text-white">{provider.name}</p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-300">{provider.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {provider.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell py-16" id="pricing">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-kicker justify-center">Bảng giá</p>
            <h2 className="section-heading">Thêm nhiều mức giá để khách thấy rõ từng dịch vụ đang bán.</h2>
            <p className="section-copy mx-auto">
              Tôi mở rộng section này thành nhiều gói hơn: gói theo từng cổng, gói nâng cao cho webhook và gói lớn cho
              hệ thống enterprise, để nhìn đúng kiểu landing page dịch vụ thật.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                className={`animate-fade-up rounded-[2rem] p-[1px] ${
                  plan.featured
                    ? 'bg-gradient-to-b from-cyan-300/70 via-sky-300/30 to-white/10'
                    : 'bg-white/10'
                }`}
                style={{ animationDelay: `${index * 90 + 120}ms` }}
              >
                <div className="surface-card h-full rounded-[calc(2rem-1px)] p-7">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm ${
                      plan.featured
                        ? 'border border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                        : 'border border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {plan.highlight}
                  </span>

                  <h3 className="mt-5 font-display text-3xl font-semibold text-white">{plan.name}</h3>
                  <p className="mt-3 min-h-[5rem] text-sm leading-7 text-slate-300">{plan.description}</p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="font-display text-5xl font-bold text-white">{plan.price}</span>
                    <span className="pb-2 text-slate-400">{plan.period}</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/15 text-xs text-emerald-200">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a className={`mt-8 ${plan.featured ? 'btn-primary' : 'btn-secondary'} w-full justify-center`} href="/register">
                    Mua ngay
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell py-16" id="faq">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="section-kicker">FAQ</p>
              <h2 className="section-heading">Khối câu hỏi thường gặp để xử lý băn khoăn trước khi khách quyết định.</h2>
              <p className="section-copy">
                Tôi dùng `details/summary` để phần này nhẹ, dễ bảo trì và không cần thêm dependency cho accordion.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="surface-card animate-fade-up group rounded-[1.5rem] p-6"
                  style={{ animationDelay: `${index * 90 + 80}ms` }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl font-semibold text-white">
                    {faq.question}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-100 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-16">
          <div className="surface-card relative overflow-hidden rounded-[2.2rem] px-6 py-10 sm:px-10 sm:py-14">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-cyan-300/10 to-transparent" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="section-kicker">Sẵn sàng triển khai</p>
                <h2 className="section-heading">
                  Trang đã có logo thật ở phần ngân hàng và nhiều mức giá hơn ở phần dịch vụ.
                </h2>
                <p className="section-copy">
                  Nếu cần, tôi có thể làm tiếp các phần như popup mua gói, form chọn package, hoặc bảng giá theo chu
                  kỳ tháng và năm.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a className="btn-primary" href="/register">
                  Tạo tài khoản ngay
                </a>
                <a className="btn-secondary" href="#pricing">
                  Xem tất cả gói
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="section-shell border-t border-white/10 py-8 text-sm text-slate-400">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Thue API Realtime Gateway. Landing page clone-inspired for your payment service.</p>
          <div className="flex flex-wrap gap-5">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-white" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
