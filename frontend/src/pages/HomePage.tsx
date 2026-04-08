import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { brandLogos } from '../assets/brands';

const navItems = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Quy trình', href: '#workflow' },
  { label: 'Ngân hàng', href: '#banks' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const metrics = [
  { value: '8+', label: 'Ngân hàng và cổng thanh toán đang hỗ trợ' },
  { value: '99.99%', label: 'Mục tiêu uptime cho hệ thống webhook' },
  { value: '<1s', label: 'Độ trễ phản hồi callback gần như tức thì' },
  { value: '24/7', label: 'Theo dõi vận hành và hỗ trợ xử lý sự cố' },
];

const features = [
  {
    title: 'Webhook tức thì',
    description:
      'Đẩy giao dịch mới về server ngay khi có biến động số dư để xác nhận đơn hàng tự động.',
  },
  {
    title: 'Theo dõi lịch sử',
    description:
      'Tra cứu giao dịch theo thời gian, số tiền, nội dung chuyển khoản và trạng thái xử lý.',
  },
  {
    title: 'Kết nối đa ngân hàng',
    description:
      'Gom nhiều tài khoản ngân hàng và cổng thanh toán trong cùng một workspace vận hành.',
  },
  {
    title: 'Báo cáo doanh thu',
    description:
      'Tổng hợp dòng tiền vào, dòng tiền ra và biểu đồ doanh thu ngay trên dashboard quản trị.',
  },
  {
    title: 'Token truy vấn',
    description:
      'Mỗi tài khoản liên kết đều có token API riêng để gọi lịch sử giao dịch, số dư và thống kê.',
  },
  {
    title: 'Vận hành linh hoạt',
    description:
      'Dễ thêm tài khoản, làm mới session, rà soát giao dịch nạp tiền và mở rộng theo quy mô hệ thống.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Tạo workspace',
    description: 'Đăng ký tài khoản, lấy API key và vào dashboard quản trị trong vài phút.',
  },
  {
    number: '02',
    title: 'Liên kết ngân hàng',
    description: 'Thêm tài khoản MB Bank hoặc các cổng đang hỗ trợ để bắt đầu đồng bộ giao dịch.',
  },
  {
    number: '03',
    title: 'Cấu hình webhook',
    description: 'Khai báo URL callback để hệ thống gửi giao dịch mới ngay khi có biến động.',
  },
  {
    number: '04',
    title: 'Vận hành realtime',
    description: 'Theo dõi giao dịch, số dư, doanh thu và đối soát nạp tiền trên cùng một giao diện.',
  },
];

const providers = [
  {
    code: 'VCB',
    name: 'Vietcombank',
    logo: brandLogos.vietcombank,
    tags: ['Webhook', 'History API'],
    description: 'Theo dõi lịch sử giao dịch và đẩy callback xác nhận thanh toán theo thời gian thực.',
  },
  {
    code: 'ACB',
    name: 'ACB',
    logo: brandLogos.acb,
    tags: ['API', 'Balance'],
    description: 'Phù hợp các hệ thống cần đối soát đơn hàng qua tài khoản ngân hàng truyền thống.',
  },
  {
    code: 'MBB',
    name: 'MB Bank',
    logo: brandLogos.mbbank,
    tags: ['MBBank', 'Fast Sync'],
    description: 'Tối ưu cho luồng MB Bank với tốc độ đồng bộ ổn định và payload truy vấn gọn.',
  },
  {
    code: 'BIDV',
    name: 'BIDV',
    logo: brandLogos.bidv,
    tags: ['Realtime', 'Notify'],
    description: 'Nhận giao dịch mới, kiểm tra số dư và cập nhật callback tức thì về hệ thống.',
  },
  {
    code: 'VTB',
    name: 'VietinBank',
    logo: brandLogos.vietinbank,
    tags: ['Banking', 'History'],
    description: 'Kết nối thêm một kênh ngân hàng truyền thống để mở rộng vùng phủ thanh toán.',
  },
  {
    code: 'VTM',
    name: 'Viettel Money',
    logo: brandLogos.viettelpay,
    tags: ['Wallet', 'Realtime'],
    description: 'Dành cho các hệ thống cần đồng bộ thêm ví điện tử bên cạnh tài khoản ngân hàng.',
  },
];

const plans = [
  {
    name: 'Gói Miễn Phí',
    highlight: 'Miễn phí',
    apiCalls: 'API calls: 100',
    price: '0đ',
    period: '/365 ngày',
    featured: false,
    description: 'Dùng thử để kiểm tra kết nối và gọi API cơ bản.',
    features: [
      'Kết nối 1 tài khoản MB Bank',
      '100 API calls/năm',
      'Lịch sử giao dịch 30 ngày',
      'Thống kê cơ bản',
    ],
  },
  {
    name: 'Gói Cơ Bản',
    highlight: 'Phổ biến',
    apiCalls: 'API calls: 5000',
    price: '49,000đ',
    period: '/30 ngày',
    featured: true,
    description: 'Phù hợp nhu cầu vận hành nhỏ với giới hạn sử dụng theo tháng.',
    features: [
      'Kết nối tối đa 3 tài khoản MB Bank',
      '5.000 API calls/tháng',
      'Lịch sử giao dịch 90 ngày',
      'Thống kê chi tiết',
    ],
  },
  {
    name: 'Gói Chuyên Nghiệp',
    highlight: 'Nâng cao',
    apiCalls: 'API calls: 20000',
    price: '149,000đ',
    period: '/30 ngày',
    featured: false,
    description: 'Dành cho hệ thống cần lưu lượng lớn và dữ liệu lịch sử đầy đủ hơn.',
    features: [
      'Kết nối tối đa 10 tài khoản MB Bank',
      '20.000 API calls/tháng',
      'Lịch sử giao dịch không giới hạn',
      'Thống kê nâng cao',
      'Truy vấn lịch sử, số dư và thống kê',
    ],
  },
  {
    name: 'Gói Doanh Nghiệp',
    highlight: 'Enterprise',
    apiCalls: 'API calls: Không giới hạn',
    price: '499,000đ',
    period: '/30 ngày',
    featured: false,
    description: 'Dành cho hệ thống lớn cần dung lượng sử dụng và phạm vi vận hành cao hơn.',
    features: [
      'Kết nối không giới hạn tài khoản MB Bank',
      'API calls không giới hạn',
      'Lịch sử giao dịch không giới hạn',
      'Toàn bộ tính năng gói Chuyên Nghiệp',
    ],
  },
];

const faqs = [
  {
    question: 'Hệ thống này hoạt động như thế nào?',
    answer:
      'Bạn liên kết tài khoản ngân hàng hoặc cổng thanh toán, sau đó hệ thống theo dõi biến động và gửi callback về server của bạn theo thời gian thực.',
  },
  {
    question: 'Có thể dùng cho nhiều tài khoản ngân hàng không?',
    answer:
      'Có. Mỗi gói sẽ có giới hạn số tài khoản khác nhau, từ 1 tài khoản ở gói miễn phí đến không giới hạn ở gói doanh nghiệp.',
  },
  {
    question: 'Có lịch sử giao dịch và số dư không?',
    answer:
      'Có. Dashboard hỗ trợ truy vấn lịch sử giao dịch, kiểm tra số dư, thống kê dòng tiền và đối soát giao dịch nạp tiền.',
  },
  {
    question: 'Landing page này đã khớp với dashboard chưa?',
    answer:
      'Phần bảng giá hiện đã đồng bộ lại theo đúng 4 gói đang dùng trong dashboard: Miễn Phí, Cơ Bản, Chuyên Nghiệp và Doanh Nghiệp.',
  },
];

const heroBanks = [
  brandLogos.vietcombank,
  brandLogos.acb,
  brandLogos.mbbank,
  brandLogos.bidv,
  brandLogos.vietinbank,
];

const sampleResponse = `{
  "status": "success",
  "transactions": [
    {
      "transactionID": "FT26097045834102",
      "amount": 250000,
      "description": "THUEAPI000003",
      "type": "IN"
    }
  ]
}`;

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-sky-500/16 blur-3xl md:h-96 md:w-96" />
        <div className="absolute bottom-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl md:h-96 md:w-96" />
        <div className="noise-grid absolute inset-0 opacity-60" />
      </div>

      <header className="site-header sticky top-0 z-20 backdrop-blur-xl">
        <div className="section-shell flex items-center justify-between gap-4 py-4">
          <a className="flex min-w-0 items-center gap-3" href="#top">
            <span className="glow-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-cyan-200">
              TA
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-200/70 sm:text-xs">
                Thue API
              </span>
              <span className="font-display text-base font-bold text-white sm:text-lg">Realtime Gateway</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-white" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <a className="btn-secondary hidden sm:inline-flex" href="/register">
              Bắt đầu ngay
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="section-shell grid gap-10 py-12 md:gap-14 md:py-16 lg:grid-cols-2 lg:items-center xl:gap-16 xl:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
              Hệ thống webhook realtime cho thanh toán ngân hàng
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl xl:text-6xl">
              Đồng bộ giao dịch ngân hàng, số dư và webhook trong một nền tảng vận hành thống nhất.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg md:leading-8">
              Landing page này đã được refactor theo hướng responsive và đồng bộ lại bảng giá với đúng 4 gói đang dùng trong
              dashboard để khách nhìn là hiểu ngay dịch vụ nào đang bán.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a className="btn-primary" href="/register">
                Dùng thử miễn phí
              </a>
              <a className="btn-secondary" href="#pricing">
                Xem bảng giá
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">REST API</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Webhook tức thì</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Lịch sử giao dịch</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Dashboard doanh thu</span>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center">
                {heroBanks.map((logo, index) => (
                  <span
                    key={logo}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/90 p-2 shadow-sm sm:h-11 sm:w-11 ${
                      index > 0 ? '-ml-3' : ''
                    }`}
                  >
                    <img alt="Bank logo" className="h-full w-full object-contain" src={logo} />
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400">Logo thật cho Vietcombank, ACB, MB Bank, BIDV và VietinBank.</p>
            </div>
          </div>

          <div>
            <div className="surface-card overflow-hidden rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Live Preview</p>
                  <h2 className="font-display text-2xl font-semibold text-white">Webhook Monitor</h2>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
                  API Online
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  ['Sự kiện hôm nay', '12,482'],
                  ['Webhook thành công', '99.94%'],
                  ['Độ trễ trung bình', '620ms'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[rgba(2,6,23,0.85)] p-5">
                <div className="flex flex-wrap items-center gap-2 pb-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  GET /history/providers/mbbank/transactions
                </div>
                <pre className="overflow-x-auto font-mono text-sm leading-7 text-cyan-100">
                  <code>{sampleResponse}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell grid grid-cols-1 gap-4 pb-10 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <article
              key={metric.label}
              className="surface-card animate-fade-up rounded-[1.75rem] p-5 sm:p-6"
              style={{ animationDelay: `${index * 80 + 120}ms` }}
            >
              <p className="font-display text-3xl font-bold text-white md:text-4xl">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="section-shell py-16" id="features">
          <div className="max-w-2xl">
            <p className="section-kicker">Tính năng</p>
            <h2 className="section-heading">Mọi thứ cần để tự động hóa thanh toán và đối soát giao dịch.</h2>
            <p className="section-copy">
              Giao diện giữ tinh thần hiện đại, sạch sẽ nhưng được sắp xếp lại để hiển thị gọn hơn trên mobile, tablet và desktop.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="surface-card animate-fade-up rounded-[1.75rem] p-6"
                style={{ animationDelay: `${index * 80 + 120}ms` }}
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <p className="section-kicker">Quy trình</p>
              <h2 className="section-heading">Bắt đầu nhanh trong 4 bước, không cần luồng onboarding phức tạp.</h2>
              <p className="section-copy">
                Mỗi bước được tách rõ để khách hàng hiểu được cách đi từ đăng ký, liên kết ngân hàng đến vận hành webhook thật.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {steps.map((step, index) => (
                <article
                  key={step.number}
                  className="surface-card animate-fade-up rounded-[1.75rem] p-6"
                  style={{ animationDelay: `${index * 80 + 120}ms` }}
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
            <h2 className="section-heading">Logo thật của ngân hàng và cổng thanh toán giúp trang nhìn đáng tin hơn.</h2>
            <p className="section-copy">
              Khối này được giữ theo dạng card hiện đại nhưng dùng grid mềm để co giãn hợp lý trên mọi kích thước màn hình.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider, index) => (
              <article
                key={provider.name}
                className="surface-card animate-fade-up rounded-[1.5rem] p-5"
                style={{ animationDelay: `${index * 70 + 120}ms` }}
              >
                <div className="flex items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-sm">
                    <img alt={provider.name} className="h-full w-full object-contain" src={provider.logo} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{provider.code}</p>
                    <p className="mt-1 font-display text-xl font-bold text-white">{provider.name}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-300">{provider.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {provider.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
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
            <h2 className="section-heading">4 gói dịch vụ đang triển khai đúng với hệ thống hiện tại.</h2>
            <p className="section-copy mx-auto">
              Phần `#pricing` đã được đồng bộ lại theo đúng các gói đang dùng trong dashboard: Miễn Phí, Cơ Bản, Chuyên Nghiệp và Doanh Nghiệp.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                className={`animate-fade-up rounded-[2rem] p-[1px] ${plan.featured ? 'bg-gradient-to-b from-cyan-300/70 via-sky-300/30 to-white/10' : 'bg-white/10'}`}
                style={{ animationDelay: `${index * 80 + 120}ms` }}
              >
                <div className="surface-card flex h-full flex-col rounded-[calc(2rem-1px)] p-6 sm:p-7">
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-sm ${
                      plan.featured ? 'border border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {plan.highlight}
                  </span>

                  <h3 className="mt-5 font-display text-2xl font-semibold text-white md:text-3xl">{plan.name}</h3>
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-cyan-200/70">{plan.apiCalls}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{plan.description}</p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="font-display text-4xl font-bold text-white md:text-5xl">{plan.price}</span>
                    <span className="pb-2 text-slate-400">{plan.period}</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-xs text-emerald-200">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a className={`mt-auto pt-8 ${plan.featured ? 'btn-primary' : 'btn-secondary'} w-full justify-center`} href="/register">
                    Mua ngay
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell py-16" id="faq">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <p className="section-kicker">FAQ</p>
              <h2 className="section-heading">Những câu hỏi thường gặp trước khi khách quyết định triển khai.</h2>
              <p className="section-copy">
                Dùng `details/summary` để phần này nhẹ, dễ bảo trì và vẫn hoạt động tốt trên màn hình nhỏ.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="surface-card animate-fade-up group rounded-[1.5rem] p-6"
                  style={{ animationDelay: `${index * 70 + 80}ms` }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-white md:text-xl">
                    {faq.question}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-100 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-16">
          <div className="surface-card overflow-hidden rounded-[2.2rem] px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="section-kicker">Sẵn sàng triển khai</p>
                <h2 className="section-heading">Giao diện đã đồng bộ dữ liệu gói và tối ưu responsive cho mobile đến desktop.</h2>
                <p className="section-copy">
                  Nếu cần, tôi có thể làm tiếp popup mua gói, bảng giá theo chu kỳ tháng/năm hoặc landing page riêng cho từng ngân hàng.
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
          <p>© 2026 Thue API Realtime Gateway. Giao diện đã được tối ưu responsive cho nhiều loại thiết bị.</p>
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
