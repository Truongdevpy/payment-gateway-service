import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { brandLogos } from '../assets/brands';
import LoadingState from '../components/LoadingState';
import ThemeToggle from '../components/ThemeToggle';
import {
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  getToken,
  getTwoFactorStatus,
  removeToken,
  setupTwoFactor,
} from '../services/authService';
import balanceService, { AdminTopupSettings, BalanceTransaction, TopupInfo, TopupSyncResponse } from '../services/balanceService';
import dashboardService, { DashboardBootstrapResponse } from '../services/dashboardService';
import { subscriptionService, Subscription, SubscriptionPlan } from '../services/subscriptionService';

const PaymentGatewayManager = lazy(() => import('../components/PaymentGatewayManager'));
const RevenueWorkspace = lazy(() => import('../components/RevenueWorkspace'));
const PlanInfoPage = lazy(() => import('../components/PlanInfoPage'));

type User = {
  createdAt?: string;
  email?: string;
  fullName?: string;
  id?: number;
  isAdmin?: boolean;
  twoFactorEnabled?: boolean;
  updatedAt?: string;
};
type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';
type NoticeTone = 'info' | 'success' | 'warning';
type TwoFactorState = {
  enabled: boolean;
  loading: boolean;
  message: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
  secret: string;
  setupPending: boolean;
};
type GatewayKey = keyof typeof brandLogos;
type GatewayDefinition = {
  brandKey?: GatewayKey;
  label: string;
  providerKey: string;
  summary: string;
};

const gatewayDefinitions: GatewayDefinition[] = [
  { brandKey: 'momo', label: 'MoMo', providerKey: 'momo', summary: 'Vi dien tu realtime cho nap rut va doi soat.' },
  { brandKey: 'vietcombank', label: 'Vietcombank', providerKey: 'vcb', summary: 'Tai khoan VCB Digibank dong bo lich su giao dich.' },
  { brandKey: 'mbbank', label: 'MB Bank', providerKey: 'mbbank', summary: 'Theo doi bien dong so du va webhook MB Bank.' },
  { brandKey: 'tpbank', label: 'TPBank', providerKey: 'tpbank', summary: 'Ket noi tai khoan TPBank de nhan lich su theo token.' },
  { brandKey: 'seabank', label: 'SeABank', providerKey: 'seabank', summary: 'Quan ly tai khoan SeABank va lam moi phien dang nhap.' },
  { brandKey: 'acb', label: 'ACB', providerKey: 'acb', summary: 'Dong bo token ACB va lich su tai khoan thanh toan.' },
  { brandKey: 'zalopay', label: 'ZaloPay', providerKey: 'zalopay', summary: 'Crawl lich su ZaloPay qua cookie va token phien.' },
  { brandKey: 'thesieure', label: 'TheSieuRe', providerKey: 'thesieure', summary: 'Cong trung gian voi lich su giao dich realtime.' },
  { brandKey: 'viettelpay', label: 'Viettel Money', providerKey: 'viettel', summary: 'Dong bo access token va refresh token Viettel.' },
  { brandKey: 'trumthe', label: 'TrumThe', providerKey: 'trumthe', summary: 'Quan ly cong nap the va doi soat doanh thu.' },
];

const paymentPolicySections = [
  {
    paragraphs: [
      'Chúng tôi đặt rất nhiều giá trị vào việc bảo vệ thông tin cá nhân của bạn. Chính sách quyền riêng tư này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng dịch vụ của chúng tôi.',
    ],
    title: 'Chính sách bảo mật',
  },
  {
    bullets: [
      'Cung cấp và duy trì dịch vụ',
      'Thông báo về những thay đổi đối với dịch vụ của chúng tôi',
      'Giải quyết vấn đề hoặc tranh chấp',
      'Theo dõi và phân tích việc sử dụng dịch vụ của chúng tôi',
      'Nâng cao trải nghiệm người dùng',
    ],
    paragraphs: [
      'Khi bạn sử dụng trang web của chúng tôi hoặc tương tác với các dịch vụ của chúng tôi, chúng tôi có thể thu thập một số thông tin cá nhân nhất định từ bạn. Điều này có thể bao gồm tên, địa chỉ email, số điện thoại, địa chỉ và thông tin khác mà bạn cung cấp khi đăng ký hoặc sử dụng dịch vụ của chúng tôi.',
      'Chúng tôi có thể sử dụng thông tin cá nhân của bạn để:',
    ],
    title: 'Thu thập và sử dụng thông tin',
  },
  {
    paragraphs: [
      'Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn và có các biện pháp bảo mật thích hợp để đảm bảo thông tin của bạn được giữ an toàn khi bạn truy cập trang web của chúng tôi.',
      'Tuy nhiên, hãy nhớ rằng không có phương thức truyền thông tin nào qua internet hoặc phương tiện điện tử là an toàn hoặc đáng tin cậy 100%. Mặc dù chúng tôi cố gắng bảo vệ thông tin cá nhân của bạn nhưng chúng tôi không thể đảm bảo hoặc đảm bảo tính bảo mật của bất kỳ thông tin nào bạn gửi cho chúng tôi hoặc từ các dịch vụ của chúng tôi, và bạn phải tự chịu rủi ro này.',
    ],
    title: 'Bảo vệ',
  },
  {
    paragraphs: [
      'Trang web của chúng tôi có thể chứa các liên kết đến các trang web khác không do chúng tôi điều hành. Nếu bạn nhấp vào liên kết của bên thứ ba, bạn sẽ được chuyển hướng đến trang web của bên thứ ba đó. Chúng tôi khuyên bạn nên xem lại Chính sách quyền riêng tư của mọi trang web bạn truy cập vì chúng tôi không có quyền kiểm soát hoặc chịu trách nhiệm đối với các hoạt động hoặc nội dung về quyền riêng tư của các trang web hoặc dịch vụ của bên thứ ba.',
    ],
    title: 'Liên kết đến các trang web khác',
  },
  {
    paragraphs: [
      'Đôi khi, chúng tôi có thể cập nhật Chính sách quyền riêng tư này mà không cần thông báo trước. Mọi thay đổi sẽ được đăng lên trang này và được áp dụng ngay sau khi chúng được đăng. Bằng việc tiếp tục sử dụng dịch vụ của chúng tôi sau khi những thay đổi này được đăng, bạn đồng ý với những thay đổi đó.',
    ],
    title: 'Thay đổi chính sách quyền riêng tư',
  },
];

const gatewayStorageKey = 'dashboard-payment-gateway-accounts';

const demoUser: User = {
  createdAt: '2026-02-01 00:37:09',
  email: 'truongkiemtiemnmo@gmail.com',
  fullName: 'truongdvfb',
  isAdmin: false,
  twoFactorEnabled: false,
  updatedAt: '2026-04-06 18:19:50',
};

const bankCards = [
  ['vietcombank', 'Vietcombank'],
  ['acb', 'ACB'],
  ['mbbank', 'MB Bank'],
  ['bidv', 'BIDV'],
  ['vietinbank', 'VietinBank'],
  ['viettelpay', 'Viettel Money'],
  ['nappay', 'NapPay'],
  ['thesieure', 'TheSieure'],
] as const;

const sidebar = [
  { items: [{ icon: 'TG', label: 'Tổng quan', to: '/dashboard/overview' }, { icon: 'CT', label: 'Cổng thanh toán', to: '/dashboard/payment-gateway' }], title: 'CHÍNH' },
  { items: [{ icon: 'NT', label: 'Nạp tiền', to: '/dashboard/topup' }, { icon: 'GH', label: 'Gia hạn API', to: '/dashboard/plans' }, { icon: 'DT', label: 'Doanh thu', to: '/dashboard/revenue' }], title: 'TÀI CHÍNH' },
  {
    items: [
      { children: [{ label: 'API V1', to: '/dashboard/api-docs/v1' }, { label: 'API V2', to: '/dashboard/api-docs/v2' }], icon: 'API', label: 'Tài liệu API', to: '/dashboard/api-docs/v1' },
      { children: [{ label: 'Thống kê', to: '/dashboard/affiliate/stats' }, { label: 'Lịch sử', to: '/dashboard/affiliate/history' }, { label: 'Rút tiền', to: '/dashboard/affiliate/withdraw' }], icon: 'TT', label: 'Tiếp thị liên kết', to: '/dashboard/affiliate/stats' },
      { icon: 'SV', label: 'Cron Jobs', to: '/dashboard/hosting' },
    ],
    title: 'NHÀ PHÁT TRIỂN',
  },
  { items: [{ children: [{ label: 'Hồ sơ', to: '/dashboard/settings/profile' }, { label: 'Tính năng', to: '/dashboard/settings/features' }, { label: 'Thông tin gói', to: '/dashboard/settings/plan-info' }], icon: 'ST', label: 'Thiết lập', to: '/dashboard/settings/profile' }], title: 'CÀI ĐẶT' },
];

const docs = {
  v1: {
    badge: 'V1',
    endpoint: 'http://localhost:8000/api/history/providers/vcb/transactions?token=:token',
    response: `{
  "provider": "vcb",
  "accountId": 1,
  "accountName": "Vietcombank demo",
  "transactions": [
    {
      "transactionId": "VCB-1-1",
      "transactionType": "transfer_in",
      "amount": 100000,
      "currency": "VND",
      "description": "Ví dụ giao dịch vào",
      "status": "completed",
      "postedAt": "2025-04-01T12:00:00Z",
      "createdAt": "2025-04-01T12:00:00Z"
    }
  ]
}`,
  },
  v2: {
    badge: 'V2 - MỚI',
    endpoint: 'http://localhost:8000/api/history/providers/vcb/balance?token=:token',
    response: `{
  "provider": "vcb",
  "accountId": 1,
  "accountName": "Vietcombank demo",
  "balance": 1000000,
  "currency": "VND"
}`,
  },
} as const;

const loadUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('auth-user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const getExpandedSidebarState = (currentPath: string) =>
  sidebar.reduce<Record<string, boolean>>((state, group) => {
    group.items.forEach((item) => {
      if (item.children) {
        state[item.to] = item.children.some((child) => child.to === currentPath);
      }
    });
    return state;
  }, {});

const copyText = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  }
};

const formatMoney = (amount: number) => `${Math.abs(amount || 0).toLocaleString('vi-VN')}đ`;
const formatSignedRef = (referenceId?: string | null) => String(referenceId || '').replace(/^BANK_TOPUP:/, '');

const isCreditActivity = (activity: BalanceTransaction) => {
  const normalized = String(activity.transaction_type || '').toLowerCase();
  return normalized === 'deposit' || normalized === 'refund';
};

const getActivityTitle = (activity: BalanceTransaction) => {
  const normalized = String(activity.transaction_type || '').toLowerCase();

  if (normalized === 'deposit') {
    return 'Nạp tiền vào tài khoản';
  }

  if (normalized === 'purchase_subscription') {
    return 'Mua gói dịch vụ';
  }

  if (normalized === 'renew_subscription') {
    return 'Gia hạn gói dịch vụ';
  }

  return 'Thanh toán dịch vụ';
};

const Badge: React.FC<{ children: React.ReactNode; tone?: BadgeTone }> = React.memo(({ children, tone = 'success' }) => (
  <span className={`dashboard-badge dashboard-badge--${tone}`}>{children}</span>
));

const IconBubble: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => <span className="dashboard-icon-bubble">{children}</span>);

const Card: React.FC<{ action?: React.ReactNode; children: React.ReactNode; className?: string; title?: React.ReactNode }> = React.memo(({ action, children, className = '', title }) => (
  <section className={`dashboard-card ${className}`.trim()}>
    {title ? <div className="dashboard-card__head"><div className="flex items-center gap-3">{title}</div>{action}</div> : null}
    <div className="dashboard-card__body">{children}</div>
  </section>
));

const PageHeader: React.FC<{ action?: React.ReactNode; badge?: React.ReactNode; crumbs: string[]; title: string }> = React.memo(({ action, badge, crumbs, title }) => (
  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold dashboard-text-primary">{title}</h1>
        {badge}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm dashboard-text-muted">
        {crumbs.map((crumb, index) => <React.Fragment key={`${crumb}-${index}`}><span className={index === 0 ? 'font-semibold text-emerald-600' : ''}>{crumb}</span>{index < crumbs.length - 1 ? <span>›</span> : null}</React.Fragment>)}
      </div>
    </div>
    {action}
  </div>
));

const DashboardSectionFallback: React.FC<{ rows?: number; title?: string }> = ({ rows = 3, title = '\u0110ang t\u1ea3i d\u1eef li\u1ec7u' }) => (
  <div className="space-y-6">
    <LoadingState compact description="Nội dung đang được tải theo từng khối để tránh chặn toàn bộ màn hình." title={title} />
    <Card className="dashboard-card--solid" title={<><IconBubble>...</IconBubble><span className="font-semibold dashboard-text-primary">{title}</span></>}>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="dashboard-skeleton h-16 w-full rounded-[24px]" key={`${title}-${index}`} />
        ))}
      </div>
    </Card>
  </div>
);

const DashboardOverviewSkeleton: React.FC = () => (
  <div className="grid gap-6 xl:grid-cols-2">
    <Card className="dashboard-card--solid" title={<><IconBubble>OV</IconBubble><span className="font-semibold dashboard-text-primary">Tổng quan hệ thống</span></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="dashboard-skeleton h-28 w-full rounded-[28px]" key={`overview-${index}`} />
        ))}
      </div>
    </Card>
    <div className="space-y-6">
      <Card className="dashboard-card--solid" title={<><IconBubble>LS</IconBubble><span className="font-semibold dashboard-text-primary">Lịch sử hoạt động</span></>}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="dashboard-skeleton h-16 w-full rounded-[24px]" key={`activity-${index}`} />
          ))}
        </div>
      </Card>
    </div>
  </div>
);

const DashboardTopupSkeleton: React.FC = () => (
  <div className="space-y-6">
    <LoadingState compact description="Đang tải QR, thông tin chuyển khoản và lịch sử nạp tiền." title="Đang tải nạp tiền" />
    <Card className="dashboard-card--solid" title={<><IconBubble>QR</IconBubble><span className="font-semibold dashboard-text-primary">Tài khoản nhận chuyển khoản</span></>}>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex justify-center xl:justify-start">
          <div className="dashboard-skeleton h-[320px] w-full max-w-[320px] rounded-[32px]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="dashboard-field" key={`topup-field-${index}`}>
              <div className="dashboard-skeleton h-4 w-28 rounded-full" />
              <div className="dashboard-skeleton h-14 w-full rounded-[20px]" />
            </div>
          ))}
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="dashboard-skeleton h-12 w-full rounded-full" />
            <div className="dashboard-skeleton h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </Card>
    <Card className="dashboard-card--solid" title={<><IconBubble>LS</IconBubble><span className="font-semibold dashboard-text-primary">Lịch sử nạp tiền</span></>}>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="dashboard-skeleton h-14 w-full rounded-[20px]" key={`topup-row-${index}`} />
        ))}
      </div>
    </Card>
  </div>
);

const DashboardPlansSkeleton: React.FC = () => (
  <div className="space-y-6">
    <LoadingState compact description="Đang tải giá, giới hạn và tính năng của từng gói API." title="Đang tải gói API" />
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card className="dashboard-card--solid" key={`plan-skeleton-${index}`}>
          <div className="space-y-5">
            <div className="mx-auto dashboard-skeleton h-6 w-40 rounded-full" />
            <div className="mx-auto dashboard-skeleton h-4 w-28 rounded-full" />
            <div className="mx-auto dashboard-skeleton h-12 w-36 rounded-full" />
            <div className="space-y-3">
              {Array.from({ length: index === 3 ? 7 : 5 }).map((__, rowIndex) => (
                <div className="dashboard-skeleton h-11 w-full rounded-[18px]" key={`plan-skeleton-${index}-${rowIndex}`} />
              ))}
            </div>
            <div className="dashboard-skeleton h-12 w-full rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getToken();
  const initialUser = useMemo(() => loadUser() ?? demoUser, []);
  const [user, setUser] = useState<User>(initialUser);
  const [copied, setCopied] = useState(false);
  const path = location.pathname === '/dashboard' ? '/dashboard/overview' : location.pathname.replace(/\/$/, '');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => getExpandedSidebarState(path));
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  });
  const [passwordFeedback, setPasswordFeedback] = useState({ error: '', message: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorState>({
    enabled: Boolean(initialUser.twoFactorEnabled),
    loading: false,
    message: '',
    provisioningUri: '',
    qrCodeDataUrl: '',
    secret: '',
    setupPending: false,
  });
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('');

  const [systemBalance, setSystemBalance] = useState<{ balance: number, total_deposited: number } | null>(null);
  const [activeBanks, setActiveBanks] = useState<Record<string, number>>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activities, setActivities] = useState<BalanceTransaction[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [topupInfo, setTopupInfo] = useState<TopupInfo | null>(null);
  const [topupSyncing, setTopupSyncing] = useState(false);
  const [topupSyncMessage, setTopupSyncMessage] = useState('');
  const [topupSyncTone, setTopupSyncTone] = useState<NoticeTone>('info');
  const [topupToast, setTopupToast] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const [adminTopupSettings, setAdminTopupSettings] = useState<AdminTopupSettings | null>(null);
  const [adminTopupLoading, setAdminTopupLoading] = useState(false);
  const [adminTopupSaving, setAdminTopupSaving] = useState(false);
  const [adminTopupError, setAdminTopupError] = useState('');
  const [adminTopupMessage, setAdminTopupMessage] = useState('');

  const docKey = path.endsWith('/v2') ? 'v2' : 'v1';
  const doc = docs[docKey];
  const applyDashboardBootstrap = (payload: DashboardBootstrapResponse) => {
    setUser(payload.user || demoUser);
    localStorage.setItem('auth-user', JSON.stringify(payload.user || demoUser));
    setSystemBalance({
      balance: payload.balance?.balance ?? 0,
      total_deposited: payload.balance?.total_deposited ?? 0,
    });
    setActivities(payload.activities?.transactions || []);
    setActiveBanks(payload.gateways?.accountsByProvider || {});
    setSubscriptions(payload.subscriptions?.items || []);
    setAvailablePlans(payload.plans || []);
    setTopupInfo(payload.topupInfo || null);
  };

  const dashboardBootstrapQuery = useQuery({
    queryKey: ['dashboard-bootstrap', token],
    queryFn: () => dashboardService.getBootstrap(1, 20),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const dashboardLoading = dashboardBootstrapQuery.isLoading && !dashboardBootstrapQuery.data;
  const dashboardError = dashboardBootstrapQuery.error instanceof Error
    ? dashboardBootstrapQuery.error.message
    : '';

  const topupActivities = useMemo(
    () => activities.filter((activity) => isCreditActivity(activity) && String(activity.reference_id || '').startsWith('BANK_TOPUP:')),
    [activities],
  );
  const sidebarGroups = user.isAdmin
    ? sidebar.map((group) => {
        if (group.title !== 'CÀI ĐẶT') {
          return group;
        }

        return {
          ...group,
          items: group.items.map((item) => ({
            ...item,
            children: item.children
              ? [...item.children, { label: 'Admin panel', to: '/dashboard/settings/admin' }]
              : item.children,
          })),
        };
      })
    : sidebar;

  const applyTopupSyncFeedback = (
    response?: TopupSyncResponse,
    options?: { showNeutralMessage?: boolean },
  ) => {
    if (!response) {
      return;
    }

    const hasNewTopup = response.synced_count > 0;
    if (!hasNewTopup && !options?.showNeutralMessage) {
      return;
    }

    const message = hasNewTopup
      ? response.message || 'Đã nạp tiền thành công vào ví.'
      : response.message || 'Đã rà soát giao dịch nạp tiền';

    setTopupSyncTone(hasNewTopup ? 'success' : 'info');
    setTopupSyncMessage(message);

    if (hasNewTopup) {
      setTopupToast({ message, tone: 'success' });
    }
  };

  const refreshDashboardBootstrap = async (
    syncResponse?: TopupSyncResponse,
    options?: { showNeutralMessage?: boolean },
  ) => {
    const refreshed = await dashboardBootstrapQuery.refetch();

    if (refreshed.data) {
      applyDashboardBootstrap(refreshed.data);
    }

    applyTopupSyncFeedback(syncResponse, options);
    return refreshed.data;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!topupToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTopupToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [topupToast]);

  useEffect(() => {
    if (!dashboardBootstrapQuery.data) {
      return;
    }

    applyDashboardBootstrap(dashboardBootstrapQuery.data);
  }, [dashboardBootstrapQuery.data]);

  useEffect(() => {
    if (path !== '/dashboard/settings/admin' || !user.isAdmin) {
      return;
    }

    let cancelled = false;
    setAdminTopupLoading(true);
    setAdminTopupError('');

    balanceService.getAdminTopupSettings().then((settings) => {
      if (!cancelled) {
        setAdminTopupSettings(settings);
      }
    }).catch((error: Error) => {
      if (!cancelled) {
        setAdminTopupError(error.message || 'Không tải được cấu hình nạp tiền');
      }
    }).finally(() => {
      if (!cancelled) {
        setAdminTopupLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path, user.isAdmin]);

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };

      sidebarGroups.forEach((group) => {
        group.items.forEach((item) => {
          if (item.children?.some((child) => child.to === path)) {
            next[item.to] = true;
          }
        });
      });

      return next;
    });
  }, [path, user.isAdmin]);

  useEffect(() => {
    if (path !== '/dashboard/settings/profile') {
      return;
    }

    let cancelled = false;

    const loadTwoFactor = async () => {
      try {
        const status = await getTwoFactorStatus();

        if (cancelled) {
          return;
        }

        setTwoFactor((prev) => ({
          ...prev,
          enabled: status.enabled,
          loading: false,
          message: status.message || '',
          provisioningUri: status.provisioningUri || '',
          secret: status.secret || '',
          setupPending: status.setupPending,
        }));
        setUser((prev) => ({ ...prev, twoFactorEnabled: status.enabled }));
        setTwoFactorError('');
      } catch (error: any) {
        if (!cancelled) {
          setTwoFactorError(error.message || 'Không tải được trạng thái 2FA');
        }
      }
    };

    void loadTwoFactor();

    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (!twoFactor.provisioningUri) {
      setTwoFactor((prev) => ({ ...prev, qrCodeDataUrl: '' }));
      return;
    }

    let active = true;

    void QRCode.toDataURL(twoFactor.provisioningUri, { margin: 1, width: 220 })
      .then((dataUrl) => {
        if (active) {
          setTwoFactor((prev) => ({ ...prev, qrCodeDataUrl: dataUrl }));
        }
      })
      .catch(() => {
        if (active) {
          setTwoFactor((prev) => ({ ...prev, qrCodeDataUrl: '' }));
        }
      });

    return () => {
      active = false;
    };
  }, [twoFactor.provisioningUri]);

  const logout = () => {
    removeToken();
    window.localStorage.removeItem('auth-user');
    navigate('/login');
  };

  const handlePasswordFieldChange = (field: 'confirmPassword' | 'currentPassword' | 'newPassword', value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordFeedback({ error: '', message: '' });
    setPasswordSaving(true);

    try {
      const response = await changePassword(passwordForm);
      setPasswordFeedback({ error: '', message: response.message });
      setPasswordForm({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
    } catch (error: any) {
      setPasswordFeedback({ error: error.message || 'Đổi mật khẩu thất bại', message: '' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleStartTwoFactorSetup = async () => {
    setTwoFactorError('');
    setTwoFactor((prev) => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await setupTwoFactor();
      setTwoFactor((prev) => ({
        ...prev,
        enabled: response.enabled,
        loading: false,
        message: response.message || 'Quét mã QR và nhập mã 6 số để bật 2FA',
        provisioningUri: response.provisioningUri || '',
        secret: response.secret || '',
        setupPending: response.setupPending,
      }));
      setTwoFactorCode('');
    } catch (error: any) {
      setTwoFactor((prev) => ({ ...prev, loading: false }));
      setTwoFactorError(error.message || 'Không thể khởi tạo 2FA');
    }
  };

  const handleEnableTwoFactor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTwoFactorError('');
    setTwoFactor((prev) => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await enableTwoFactor({ code: twoFactorCode });
      setTwoFactor({
        enabled: response.enabled,
        loading: false,
        message: response.message || 'Đã bật 2FA thành công',
        provisioningUri: '',
        qrCodeDataUrl: '',
        secret: '',
        setupPending: response.setupPending,
      });
      setTwoFactorCode('');
      setUser((prev) => ({ ...prev, twoFactorEnabled: true }));
      localStorage.setItem('auth-user', JSON.stringify({ ...user, twoFactorEnabled: true }));
    } catch (error: any) {
      setTwoFactor((prev) => ({ ...prev, loading: false }));
      setTwoFactorError(error.message || 'Bật 2FA thất bại');
    }
  };

  const handleDisableTwoFactor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTwoFactorError('');
    setTwoFactor((prev) => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await disableTwoFactor({
        code: twoFactorDisableCode,
        currentPassword: twoFactorDisablePassword,
      });
      setTwoFactor({
        enabled: response.enabled,
        loading: false,
        message: response.message || 'Đã tắt 2FA',
        provisioningUri: '',
        qrCodeDataUrl: '',
        secret: '',
        setupPending: response.setupPending,
      });
      setTwoFactorDisableCode('');
      setTwoFactorDisablePassword('');
      setUser((prev) => ({ ...prev, twoFactorEnabled: false }));
      localStorage.setItem('auth-user', JSON.stringify({ ...user, twoFactorEnabled: false }));
    } catch (error: any) {
      setTwoFactor((prev) => ({ ...prev, loading: false }));
      setTwoFactorError(error.message || 'Tắt 2FA thất bại');
    }
  };

  const handlePurchasePlan = async (plan: SubscriptionPlan) => {
    try {
      setPurchasingPlan(plan.planType);
      
      const isRenewing = subscriptions.some(s => s.planType === plan.planType && s.isActive && !s.isExpired);
      let res;
      
      if (isRenewing) {
        res = await subscriptionService.renewSubscription(getToken() || '', plan.planType, plan.durationDays, 'balance');
      } else {
        res = await subscriptionService.purchaseSubscription(getToken() || '', plan.planType, plan.durationDays, 'balance');
      }
      
      if (res.status || res.message) {
        alert(res.message || 'Gia hạn/Mua gói thành công!');
        await refreshDashboardBootstrap();
      } else {
        alert('Lỗi mua/gia hạn gói!');
      }
    } catch (e: any) {
      alert(e.message || 'Không đủ số dư hoặc lỗi hệ thống!');
    } finally {
      setPurchasingPlan(null);
    }
  };

  const handleSyncTopups = async () => {
    try {
      setTopupSyncing(true);
      setTopupSyncMessage('');
      setTopupSyncTone('info');
      const response = await balanceService.syncTopups();
      await refreshDashboardBootstrap(response, { showNeutralMessage: true });
    } catch (error: any) {
      setTopupSyncTone('warning');
      setTopupSyncMessage(error.message || 'Rà soát giao dịch thất bại');
    } finally {
      setTopupSyncing(false);
    }
  };

  const handleAdminTopupFieldChange = (
    field: keyof Omit<AdminTopupSettings, 'available_history_accounts'>,
    value: string | boolean | number | null,
  ) => {
    setAdminTopupSettings((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleSaveAdminTopupSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminTopupSettings) {
      return;
    }

    try {
      setAdminTopupSaving(true);
      setAdminTopupError('');
      setAdminTopupMessage('');
      const updated = await balanceService.updateAdminTopupSettings({
        provider: adminTopupSettings.provider,
        bank_code: adminTopupSettings.bank_code,
        bank_name: adminTopupSettings.bank_name,
        qr_bank_id: adminTopupSettings.qr_bank_id,
        qr_template: adminTopupSettings.qr_template,
        account_number: adminTopupSettings.account_number,
        account_name: adminTopupSettings.account_name,
        history_account_id: adminTopupSettings.history_account_id ?? null,
        transfer_content_template: adminTopupSettings.transfer_content_template,
        is_active: adminTopupSettings.is_active,
      });
      setAdminTopupSettings(updated);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-bootstrap', token] });
      await refreshDashboardBootstrap();
      setAdminTopupMessage('Đã lưu cấu hình nạp tiền');
    } catch (error: any) {
      setAdminTopupError(error.message || 'Lưu cấu hình nạp tiền thất bại');
    } finally {
      setAdminTopupSaving(false);
    }
  };

  const content = (() => {
if (path === '/dashboard/overview') {
      if (dashboardLoading) {
        return (
          <>
            <PageHeader crumbs={['Tá»•ng quan']} title="Tá»•ng quan" />
            <div className="space-y-6">
              <LoadingState compact description="Ưu tiên tải số dư, trạng thái gói và hoạt động gần đây trước." title="Đang tải tổng quan" />
              <DashboardOverviewSkeleton />
            </div>
          </>
        );
      }

      if (dashboardError && !dashboardBootstrapQuery.data) {
        return (
          <>
            <PageHeader crumbs={['Tổng quan']} title="Tổng quan" />
            <div className="dashboard-alert dashboard-alert--warning">{dashboardError}</div>
          </>
        );
      }

      return (
        <>
          <PageHeader crumbs={['Tổng quan']} title="Tổng quan" />
          <div className="space-y-4">
            <div className="dashboard-alert dashboard-alert--warning">Vui lòng cập nhật BOT Telegram để thông báo hết hạn API và die cookie thesieure.</div>
            <div className="dashboard-alert dashboard-alert--info">Lưu ý: Nghiêm cấm lạm dụng API THUEAPI để phục vụ cho các hoạt động vi phạm pháp luật.</div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="dashboard-card--solid">
                <div className="flex flex-col items-center text-center">
                  <div className="dashboard-avatar">{user.fullName?.slice(0, 1).toUpperCase() ?? 'T'}</div>
                  <h2 className="mt-4 font-display text-3xl font-bold dashboard-text-primary">Xin chào {user.fullName}</h2>
                  <p className="mt-2 text-sm font-semibold text-emerald-600">Số dư: {(systemBalance?.balance ?? 0).toLocaleString()} vnđ</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link className="dashboard-button" to="/dashboard/topup">Nạp tiền</Link>
                    <Link className="dashboard-button dashboard-button--ghost" to="/dashboard/settings/profile">Xem thông tin</Link>
                  </div>
                </div>
              </Card>
              <Card action={<Badge>{Object.keys(activeBanks).length} kết nối</Badge>} className="dashboard-card--solid" title={<><IconBubble>NH</IconBubble><span className="font-semibold dashboard-text-primary">Ngân hàng đang hoạt động</span></>}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {bankCards.map(([key, label]) => <div className="dashboard-bank-card cursor-pointer hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all" key={key} onClick={() => navigate('/dashboard/payment-gateway')}><div className="dashboard-bank-card__logo"><img alt={label} src={brandLogos[key as any]} /><span className="dashboard-bank-card__counter">{activeBanks[key] || 0}</span></div><p className="mt-3 text-sm font-semibold dashboard-text-primary">{label}</p></div>)}
                </div>
              </Card>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card action={<Link className="dashboard-button" to="/dashboard/plans">Nâng cấp gói</Link>} className="dashboard-card--solid" title={<><IconBubble>GOI</IconBubble><span className="font-semibold dashboard-text-primary">Gói API BANK</span></>}>
                <div className="space-y-3">
                  <div className="dashboard-row"><span>Tổng ATM đang sử dụng</span><Badge tone="success">{Object.keys(activeBanks).length} ngân hàng</Badge></div>
                  {subscriptions.length > 0 ? subscriptions.map((sub) => (
                    <div className="dashboard-row" key={sub.id}>
                      <span>Gói {sub.planName || sub.planType}</span>
                      <Badge tone={sub.isExpired ? 'danger' : 'success'}>
                        {sub.isExpired ? 'Đã hết hạn' : `Đến ${new Date(sub.expiresAt).toLocaleDateString('vi-VN')}`}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-500 italic p-2 text-center">Bạn chưa đăng ký gói thiết lập nào</div>
                  )}
                </div>
              </Card>
              <div className="space-y-6">
                <Card className="dashboard-card--solid" title={<><IconBubble>SD</IconBubble><span className="font-semibold dashboard-text-primary">Biến động số dư</span></>}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="dashboard-summary-panel"><p className="text-sm dashboard-text-muted">Số dư hiện tại</p><p className="mt-2 text-3xl font-bold text-emerald-600">{(systemBalance?.balance ?? 0).toLocaleString()}đ</p></div>
                    <div className="dashboard-summary-panel"><p className="text-sm dashboard-text-muted">Tổng nạp</p><p className="mt-2 text-3xl font-bold text-sky-600">{(systemBalance?.total_deposited ?? 0).toLocaleString()}đ</p></div>
                  </div>
                </Card>
                <Card className="dashboard-card--solid" title={<><IconBubble>LS</IconBubble><span className="font-semibold dashboard-text-primary">Lịch sử hoạt động</span></>}>
                  <div className="space-y-3">
                    {activities.length > 0 ? activities.slice(0, 5).map(act => (
                      <div className="dashboard-activity-item" key={act.id}>
                        <span className="dashboard-activity-item__icon">{isCreditActivity(act) ? '+' : '-'}</span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold dashboard-text-primary">
                                {getActivityTitle(act)}
                              </p>
                              <p className="mt-1 text-sm dashboard-text-muted">
                                {act.description || act.reference_id} • {new Date(act.created_at).toLocaleString('vi-VN')}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${isCreditActivity(act) ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isCreditActivity(act) ? '+' : '-'}{formatMoney(act.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 italic p-2 text-center">Chưa có hoạt động nào gần đây</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (path === '/dashboard/payment-gateway') {
      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Cổng thanh toán']} title="Cổng thanh toán" />
          <Suspense fallback={<DashboardSectionFallback rows={4} title={'\u0110ang t\u1ea3i c\u1ed5ng thanh to\u00e1n'} />}>
            <PaymentGatewayManager />
          </Suspense>
        </>
      );
    }

if (path === '/dashboard/topup') {
      if (dashboardLoading) {
        return (
          <>
            <PageHeader crumbs={['Tá»•ng quan', 'Náº¡p tiá»n']} title="Náº¡p tiá»n" />
            <DashboardTopupSkeleton />
          </>
        );
      }

      if (dashboardError && !topupInfo) {
        return (
          <>
            <PageHeader crumbs={['Tổng quan', 'Nạp tiền']} title="Nạp tiền" />
            <div className="space-y-6">
              <div className="dashboard-alert dashboard-alert--warning">{dashboardError}</div>
              <Card
                action={<button className="dashboard-button dashboard-button--ghost" disabled={topupSyncing} onClick={() => void handleSyncTopups()} type="button">{topupSyncing ? 'Đang rà soát...' : 'Rà soát giao dịch'}</button>}
                className="dashboard-card--solid"
                title={<><IconBubble>QR</IconBubble><span className="font-semibold dashboard-text-primary">Tài khoản nhận chuyển khoản</span></>}
              >
                <div className="dashboard-alert dashboard-alert--info">Không tải được thông tin nạp tiền. Hãy tải lại trang hoặc khởi động lại backend mới.</div>
              </Card>
            </div>
          </>
        );
      }

      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Nạp tiền']} title="Nạp tiền" />
          <div className="space-y-6">
            <div className="dashboard-alert dashboard-alert--success">Chuyển khoản đúng nội dung để hệ thống tự động cộng tiền trong vòng 1-2 phút.</div>
            <Card
              action={<button className="dashboard-button dashboard-button--ghost" disabled={topupSyncing} onClick={() => void handleSyncTopups()} type="button">{topupSyncing ? 'Đang rà soát...' : 'Rà soát giao dịch'}</button>}
              className="dashboard-card--solid"
              title={<><IconBubble>QR</IconBubble><span className="font-semibold dashboard-text-primary">Tài khoản nhận chuyển khoản</span></>}
            >
              {topupInfo ? (
                <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                  <div className="flex justify-center xl:justify-start">
                    <div className="dashboard-qr dashboard-qr--topup">
                      <img alt={`QR nạp tiền ${topupInfo.bank_name}`} src={topupInfo.qr_image_url} />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-3 lg:max-w-2xl">
                    {[
                      ['Ngân hàng', topupInfo.bank_name],
                      ['Số tài khoản', topupInfo.account_number],
                      ['Chủ tài khoản', topupInfo.account_name],
                      ['Nội dung CK', topupInfo.transfer_content],
                    ].map(([label, value]) => (
                      <div className="dashboard-field" key={label}>
                        <label>{label}</label>
                        <div className="dashboard-field__value">
                          <span className="min-w-0 flex-1 break-words">{value}</span>
                          <button className="shrink-0" onClick={() => void copyText(String(value))} type="button">Sao chép</button>
                        </div>
                      </div>
                    ))}
                    <div className="grid gap-3 xl:grid-cols-2">
                      <button className="dashboard-button w-full justify-center" onClick={() => void copyText(`${topupInfo.account_number} ${topupInfo.transfer_content}`)} type="button">Sao chép STK + nội dung</button>
                      <button className="dashboard-button dashboard-button--ghost w-full justify-center" onClick={() => void copyText(topupInfo.qr_image_url)} type="button">Sao chép link QR</button>
                    </div>
                    <p className="break-words text-sm dashboard-text-muted">Nếu QR còn nhỏ do template nhiều viền, vào Admin panel đổi `Template VietQR` sang `compact2` hoặc template riêng của anh.</p>
                    {topupSyncMessage ? <div className={`dashboard-alert dashboard-alert--${topupSyncTone}`}>{topupSyncMessage}</div> : null}
                  </div>
                </div>
              ) : (
                dashboardBootstrapQuery.isFetching ? (
                  <LoadingState compact description="Hệ thống đang nạp QR và thông tin chuyển khoản." title="Đang tải thông tin nạp tiền" />
                ) : (
                  <div className="dashboard-alert dashboard-alert--info">Chưa có cấu hình nạp tiền khả dụng cho tài khoản này.</div>
                )
              )}
            </Card>
            <Card className="dashboard-card--solid" title={<><IconBubble>LS</IconBubble><span className="font-semibold dashboard-text-primary">Lịch sử nạp tiền</span></>}>
              <div className="mt-5 overflow-x-auto">
                <table className="dashboard-table">
                  <thead><tr><th>Phương thức</th><th>Mã GD</th><th>Số tiền</th><th>Nội dung</th><th>Thời gian</th></tr></thead>
                  <tbody>
                    {topupActivities.length > 0 ? topupActivities.map((item) => (
                      <tr key={item.id}>
                        <td><Badge>{topupInfo?.bank_code || 'NẠP'}</Badge></td>
                        <td>{formatSignedRef(item.reference_id) || `NAP-${item.id}`}</td>
                        <td className="font-semibold text-emerald-600">+{formatMoney(item.amount)}</td>
                        <td>{item.description || topupInfo?.transfer_content || '--'}</td>
                        <td>{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="text-center text-sm text-gray-500" colSpan={5}>Chưa có giao dịch nạp tiền nào được cộng vào ví</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      );
    }

if (path === '/dashboard/plans') {
      if (dashboardLoading) {
        return (
          <>
            <PageHeader crumbs={['Tá»•ng quan', 'NÃ¢ng cáº¥p gÃ³i']} title="NÃ¢ng cáº¥p gÃ³i API" />
            <DashboardPlansSkeleton />
          </>
        );
      }

      if (dashboardError && availablePlans.length === 0) {
        return (
          <>
            <PageHeader crumbs={['Tổng quan', 'Nâng cấp gói']} title="Nâng cấp gói API" />
            <div className="dashboard-alert dashboard-alert--warning">{dashboardError}</div>
          </>
        );
      }

      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Nâng cấp gói']} title="Nâng cấp gói API" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {availablePlans.length > 0 ? availablePlans.map((plan, index) => (
              <Card className={`dashboard-card--solid dashboard-plan flex flex-col h-full ${index === 1 ? 'dashboard-plan--featured' : ''}`} key={plan.planType}>
                <div className="text-center">
                  <h2 className="mt-4 font-display text-3xl font-bold dashboard-text-primary">{plan.planName}</h2>
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] dashboard-text-muted">
                    API calls: {plan.apiCallsLimit === null ? 'Không giới hạn' : plan.apiCallsLimit.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-2 text-sm dashboard-text-muted">{plan.description || `Gói API ${plan.planName}`}</p>
                  <p className="mt-5 text-5xl font-bold text-emerald-600">{plan.price.toLocaleString()}đ</p>
                  <p className="mt-1 text-sm dashboard-text-muted">/{plan.durationDays} ngày</p>
                </div>
                <div className="mt-6 space-y-3">
                  {(plan.features || []).length > 0 ? plan.features.map((item) => (
                     <div className="dashboard-feature-row" key={item}>
                       <span className="dashboard-checkmark">✓</span><span>{item}</span>
                     </div>
                  )) : (
                    <div className="dashboard-feature-row"><span className="dashboard-checkmark">✓</span><span>Tất cả tính năng cơ bản</span></div>
                  )}
                </div>
                <div className="mt-auto pt-8">
                  <button 
                    className={`dashboard-button w-full justify-center ${purchasingPlan === plan.planType ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    onClick={() => handlePurchasePlan(plan)}
                    disabled={purchasingPlan === plan.planType}
                    type="button"
                  >
                    {purchasingPlan === plan.planType ? 'Đang xử lý...' : 'Gia hạn ngay'}
                  </button>
                </div>
              </Card>
            )) : (
               <div className="col-span-3 text-center py-10 text-sm dashboard-text-muted">
                 {dashboardBootstrapQuery.isFetching ? 'Đang tải danh sách gói...' : 'Chưa có gói nào khả dụng.'}
               </div>
            )}
          </div>
        </>
      );
    }

    if (path === '/dashboard/revenue') {
      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Doanh thu']} title="Doanh Thu Toàn Thời Gian" />
          <Suspense fallback={<DashboardSectionFallback rows={4} title="Äang táº£i doanh thu" />}>
            <RevenueWorkspace />
          </Suspense>
        </>
      );
    }

    if (path.startsWith('/dashboard/api-docs')) {
      return (
        <>
          <PageHeader action={<Link className="dashboard-button dashboard-button--ghost" to={docKey === 'v1' ? '/dashboard/api-docs/v2' : '/dashboard/api-docs/v1'}>{docKey === 'v1' ? 'Xem API V2 →' : '← Xem API V1'}</Link>} badge={<Badge tone={docKey === 'v1' ? 'warning' : 'success'}>{doc.badge}</Badge>} crumbs={['Tổng quan', 'Tài liệu API', docKey.toUpperCase()]} title="Tài liệu API" />
          <div className="space-y-4">
            <div className="dashboard-alert dashboard-alert--success">API trả về format thống nhất cho tất cả ngân hàng. Response gồm status, message và transactions.</div>
            <Card className="dashboard-card--solid" title={<><IconBubble>API</IconBubble><span className="font-semibold dashboard-text-primary">API Endpoints</span></>}>
              <div className="flex flex-wrap gap-2">{bankCards.slice(0, 6).map(([key, label]) => <button className={`dashboard-bank-chip ${key === 'vietcombank' ? 'dashboard-bank-chip--active' : ''}`} key={key} type="button"><img alt={label} src={brandLogos[key]} /><span>{label}</span></button>)}</div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="dashboard-code-panel"><p className="text-xs font-semibold uppercase tracking-[0.24em] dashboard-text-muted">Endpoint</p><div className="mt-4 flex items-center gap-3 rounded-2xl border border-[color:var(--dashboard-border)] bg-white/80 px-4 py-4"><Badge>GET</Badge><code className="truncate text-sm dashboard-text-primary">{doc.endpoint}</code><button className="dashboard-inline-icon" onClick={() => void copyText(doc.endpoint)} type="button">Sao chép</button></div></div>
                <div className="dashboard-code-block"><div className="dashboard-code-block__head"><span className="font-semibold text-white">Success Response</span><button className="dashboard-inline-icon dashboard-inline-icon--dark" onClick={() => void copyText(doc.response)} type="button">Sao chép</button></div><pre className="overflow-x-auto px-5 py-5 text-xs leading-7 text-cyan-100">{doc.response}</pre></div>
              </div>
            </Card>
          </div>
        </>
      );
    }

    if (path === '/dashboard/affiliate/stats') {
      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Tiếp thị liên kết', 'Thống kê']} title="Thống kê hoa hồng" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="dashboard-card--solid" title={<><IconBubble>HH</IconBubble><span className="font-semibold dashboard-text-primary">Thống kê của bạn</span></>}>
              <div className="dashboard-highlight-panel text-center"><p className="text-sm dashboard-text-muted">Số tiền hoa hồng khả dụng</p><p className="mt-2 text-5xl font-bold text-emerald-600">0đ</p></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">{[['Lượt nhấp liên kết', '0'], ['Tỷ lệ hoa hồng', '50%'], ['Tổng hoa hồng đã nhận', '0đ'], ['Thành viên giới thiệu', '0']].map((item) => <div className="dashboard-summary-panel text-center" key={item[0]}><p className="text-sm dashboard-text-muted">{item[0]}</p><p className="mt-2 text-3xl font-bold dashboard-text-primary">{item[1]}</p></div>)}</div>
              <div className="mt-4 flex flex-wrap gap-3"><Link className="dashboard-button dashboard-button--ghost" to="/dashboard/affiliate/history">Lịch sử hoa hồng</Link><Link className="dashboard-button" to="/dashboard/affiliate/withdraw">Rút hoa hồng</Link></div>
            </Card>
            <Card className="dashboard-card--solid" title={<><IconBubble>LK</IconBubble><span className="font-semibold dashboard-text-primary">Liên kết giới thiệu</span></>}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className="dashboard-input flex-1" readOnly value="https://thueapi.pro/reffer/1298" />
                <button className="dashboard-button" onClick={() => { void copyText('https://thueapi.pro/reffer/1298'); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} type="button">{copied ? 'Đã sao chép' : 'Sao chép'}</button>
              </div>
              <div className="mt-5 rounded-3xl border border-amber-300/50 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
                <ul className="list-disc pl-5"><li>Chia sẻ liên kết này lên mạng xã hội hoặc bạn bè của bạn.</li><li>Bạn sẽ nhận được hoa hồng khi người được giới thiệu sử dụng dịch vụ.</li><li>Hoa hồng sẽ được cộng tự động sau khi giao dịch nạp tiền thành công.</li><li>Nghiêm cấm hành vi tự giới thiệu bản thân để giảm giá bán.</li></ul>
              </div>
            </Card>
          </div>
        </>
      );
    }

    if (path === '/dashboard/affiliate/history' || path === '/dashboard/affiliate/withdraw') {
      const withdraw = path.endsWith('/withdraw');
      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Tiếp thị liên kết', withdraw ? 'Rút tiền' : 'Lịch sử']} title={withdraw ? 'Rút tiền hoa hồng' : 'Lịch sử hoa hồng'} />
          <div className="space-y-6">
            {withdraw ? <div className="grid gap-6 xl:grid-cols-2"><Card className="dashboard-card--solid" title={<><IconBubble>RT</IconBubble><span className="font-semibold dashboard-text-primary">Rút số dư hoa hồng</span></>}>
              <div className="space-y-4"><select className="dashboard-select"><option>-- Chọn ngân hàng cần rút --</option><option>MB Bank</option><option>Vietcombank</option></select><input className="dashboard-input" placeholder="Nhập số tài khoản" /><input className="dashboard-input" placeholder="Nhập tên chủ tài khoản" /><input className="dashboard-input" placeholder="Nhập số tiền cần rút" /><div className="dashboard-alert dashboard-alert--warning">Số tiền rút tối thiểu: 10.000đ</div><button className="dashboard-button w-full justify-center" type="button">Rút tiền</button></div>
            </Card><Card className="dashboard-card--solid" title={<><IconBubble>HH</IconBubble><span className="font-semibold dashboard-text-primary">Thống kê của bạn</span></>}>
              <div className="dashboard-highlight-panel text-center"><p className="text-sm dashboard-text-muted">Số tiền hoa hồng khả dụng</p><p className="mt-2 text-5xl font-bold text-emerald-600">0đ</p></div>
            </Card></div> : null}
            <Card action={<button className="dashboard-button dashboard-button--ghost" type="button">Bộ lọc</button>} className="dashboard-card--solid" title={<><IconBubble>LS</IconBubble><span className="font-semibold dashboard-text-primary">{withdraw ? 'Lịch sử rút tiền' : 'Lịch sử hoa hồng'}</span></>}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><input className="dashboard-input" placeholder={withdraw ? 'Mã giao dịch' : 'Lý do'} /><input className="dashboard-input" placeholder="Chọn thời gian" /><button className="dashboard-button w-full justify-center xl:w-auto" type="button">Tìm</button></div>
              <div className="dashboard-empty-state"><div className="dashboard-empty-state__icon">∅</div><h3 className="font-display text-2xl font-semibold dashboard-text-primary">Không có dữ liệu</h3><p className="dashboard-text-muted">Không tìm thấy dữ liệu phù hợp.</p></div>
            </Card>
          </div>
        </>
      );
    }

    if (path === '/dashboard/hosting') {
      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Cron Jobs']} title="Cron Jobs" />
          <div className="grid gap-6 xl:grid-cols-3">
            {[
              ['Cron Monitor', 'Theo dõi cron job quét giao dịch và cảnh báo khi polling bị gián đoạn.', 'Xem cấu hình'],
            ].map((item) => <Card className="dashboard-card--solid" key={item[0]} title={<><IconBubble>SV</IconBubble><span className="font-semibold dashboard-text-primary">{item[0]}</span></>}><p className="text-sm leading-7 dashboard-text-secondary">{item[1]}</p><button className="dashboard-button mt-6" type="button">{item[2]}</button></Card>)}
          </div>
        </>
      );
    }

    if (
      path === '/dashboard/settings/features'
      || path === '/dashboard/settings/plan-info'
      || path === '/dashboard/settings/profile'
      || path === '/dashboard/settings/admin'
    ) {
      if (path === '/dashboard/settings/features') {
        return (
          <>
            <PageHeader crumbs={['Tổng quan', 'Thiết lập', 'Tính năng']} title="Tính năng" />
            <Card className="dashboard-card--solid" title={<><IconBubble>BOT</IconBubble><span className="font-semibold dashboard-text-primary">Bot thông báo Telegram</span></>}>
              <div className="dashboard-alert dashboard-alert--success">Kết nối Telegram Bot để nhận thông báo tự động khi gói sử dụng hết hạn hoặc cookie TheSieure bị die.</div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2"><select className="dashboard-select"><option>Bật</option><option>Tắt</option></select><input className="dashboard-input" placeholder="Nhập Chat ID" /><div className="xl:col-span-2"><input className="dashboard-input" placeholder="Nhập Token Bot" /></div></div>
              <button className="dashboard-button mt-5" type="button">Lưu thay đổi</button>
            </Card>
          </>
        );
      }

      if (path === '/dashboard/settings/plan-info') {
        return (
          <>
            <PageHeader crumbs={['Tổng quan', 'Thiết lập', 'Thông tin gói']} title="Thông tin gói sử dụng" />
            {token ? (
              <Suspense fallback={<DashboardSectionFallback rows={3} title="Đang tải thông tin gói" />}>
                <PlanInfoPage token={token} />
              </Suspense>
            ) : <div className="text-center text-gray-600">Vui lòng đăng nhập</div>}
          </>
        );
      }

      if (path === '/dashboard/settings/admin') {
        if (!user.isAdmin) {
          return (
            <>
              <PageHeader crumbs={['Tổng quan', 'Thiết lập', 'Admin panel']} title="Admin panel" />
              <div className="dashboard-alert dashboard-alert--warning">Bạn không có quyền truy cập khu vực quản trị.</div>
            </>
          );
        }

        return (
          <>
            <PageHeader crumbs={['Tổng quan', 'Thiết lập', 'Admin panel']} title="Admin panel" />
            <Card className="dashboard-card--solid" title={<><IconBubble>ADM</IconBubble><span className="font-semibold dashboard-text-primary">Cấu hình nạp tiền thật</span></>}>
              {adminTopupLoading ? (
                <div className="text-sm dashboard-text-muted">Đang tải cấu hình...</div>
              ) : adminTopupSettings ? (
                <form className="space-y-4" onSubmit={handleSaveAdminTopupSettings}>
                  {adminTopupError ? <div className="dashboard-alert dashboard-alert--warning">{adminTopupError}</div> : null}
                  {adminTopupMessage ? <div className="dashboard-alert dashboard-alert--success">{adminTopupMessage}</div> : null}
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <label className="dashboard-form-label">Provider nguồn</label>
                      <input className="dashboard-input" value={adminTopupSettings.provider} onChange={(e) => handleAdminTopupFieldChange('provider', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Mã ngân hàng hiển thị</label>
                      <input className="dashboard-input" value={adminTopupSettings.bank_code} onChange={(e) => handleAdminTopupFieldChange('bank_code', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Tên ngân hàng</label>
                      <input className="dashboard-input" value={adminTopupSettings.bank_name} onChange={(e) => handleAdminTopupFieldChange('bank_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">VietQR BANK_ID</label>
                      <input className="dashboard-input" value={adminTopupSettings.qr_bank_id} onChange={(e) => handleAdminTopupFieldChange('qr_bank_id', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Template VietQR</label>
                      <input className="dashboard-input" value={adminTopupSettings.qr_template} onChange={(e) => handleAdminTopupFieldChange('qr_template', e.target.value)} />
                      <p className="mt-2 text-sm dashboard-text-muted">Nhập template như <code>print</code>, <code>compact2</code> hoặc mã template riêng từ <code>my.vietqr.io</code>. Muốn QR to và ít viền hơn thì ưu tiên <code>compact2</code>.</p>
                    </div>
                    <div>
                      <label className="dashboard-form-label">Số tài khoản nhận tiền</label>
                      <input className="dashboard-input" value={adminTopupSettings.account_number} onChange={(e) => handleAdminTopupFieldChange('account_number', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Tên chủ tài khoản</label>
                      <input className="dashboard-input" value={adminTopupSettings.account_name} onChange={(e) => handleAdminTopupFieldChange('account_name', e.target.value)} />
                    </div>
                    <div className="xl:col-span-2">
                      <label className="dashboard-form-label">Tài khoản nguồn để rà soát giao dịch</label>
                      <select className="dashboard-select" value={adminTopupSettings.history_account_id ?? ''} onChange={(e) => handleAdminTopupFieldChange('history_account_id', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Tự tìm theo provider + số tài khoản</option>
                        {adminTopupSettings.available_history_accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.provider.toUpperCase()} | {account.account_name || '--'} | {account.external_id || '--'} | user #{account.user_id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="xl:col-span-2">
                      <label className="dashboard-form-label">Mẫu nội dung chuyển khoản</label>
                      <input className="dashboard-input" value={adminTopupSettings.transfer_content_template} onChange={(e) => handleAdminTopupFieldChange('transfer_content_template', e.target.value)} />
                      <p className="mt-2 text-sm dashboard-text-muted">Bắt buộc chứa <code>{'{user_id}'}</code> để mỗi user có nội dung riêng. Hệ thống sẽ zero-pad mã user, ví dụ <code>THUEAPI{'{user_id}'}</code> thành <code>THUEAPI000123</code>.</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm dashboard-text-primary">
                    <input checked={adminTopupSettings.is_active} onChange={(e) => handleAdminTopupFieldChange('is_active', e.target.checked)} type="checkbox" />
                    Bật cấu hình nạp tiền thật
                  </label>
                  <button className="dashboard-button" disabled={adminTopupSaving} type="submit">
                    {adminTopupSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </form>
              ) : (
                <div className="text-sm dashboard-text-muted">Chưa tải được cấu hình nạp tiền.</div>
              )}
            </Card>
          </>
        );
      }

      return (
        <>
          <PageHeader crumbs={['Tổng quan', 'Hồ sơ']} title="Hồ sơ" />
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">{[['Hồ sơ', '/dashboard/settings/profile'], ['Tính năng', '/dashboard/settings/features'], ['Thông tin gói', '/dashboard/settings/plan-info'], ...(user.isAdmin ? [['Admin panel', '/dashboard/settings/admin']] : [])].map((item, index) => <Link className={`dashboard-setting-link ${path === item[1] ? 'dashboard-setting-link--active' : ''}`} key={item[0]} to={item[1]}><span className="dashboard-icon-bubble">{index === 0 ? 'HS' : index === 1 ? 'TN' : index === 2 ? 'GOI' : 'ADM'}</span><span>{item[0]}</span><span className="dashboard-setting-link__arrow">›</span></Link>)}</div>
            <div className="space-y-6">
              <Card className="dashboard-card--solid" title={<><IconBubble>HS</IconBubble><span className="font-semibold dashboard-text-primary">Thông tin cá nhân</span></>}>
                <div className="grid gap-4 xl:grid-cols-3">
                  <div>
                    <label className="dashboard-form-label">Tên đăng nhập</label>
                    <input className="dashboard-input" readOnly value={user.fullName ?? ''} />
                  </div>
                  <div>
                    <label className="dashboard-form-label">Địa chỉ email</label>
                    <input className="dashboard-input" readOnly value={user.email ?? ''} />
                  </div>
                  <div>
                    <label className="dashboard-form-label">IP</label>
                    <input className="dashboard-input" readOnly value="27.71.121.131" />
                  </div>
                  <div>
                    <label className="dashboard-form-label">Thiết bị</label>
                    <input className="dashboard-input" readOnly value="Mozilla/5.0 (Windows NT 10.0; Win64; x64)" />
                  </div>
                  <div>
                    <label className="dashboard-form-label">Đăng ký vào lúc</label>
                    <input className="dashboard-input" readOnly value={user.createdAt ?? ''} />
                  </div>
                  <div>
                    <label className="dashboard-form-label">Đăng nhập gần nhất</label>
                    <input className="dashboard-input" readOnly value={user.updatedAt ?? ''} />
                  </div>
                </div>
              </Card>
              <Card className="dashboard-card--solid dashboard-card--accent" title={<><IconBubble>MK</IconBubble><span className="font-semibold dashboard-text-primary">Đổi mật khẩu</span></>}>
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  {passwordFeedback.error ? <div className="dashboard-alert dashboard-alert--warning">{passwordFeedback.error}</div> : null}
                  {passwordFeedback.message ? <div className="dashboard-alert dashboard-alert--success">{passwordFeedback.message}</div> : null}
                  <div className="grid gap-4 xl:grid-cols-3">
                    <div>
                      <label className="dashboard-form-label">Mật khẩu hiện tại</label>
                      <input className="dashboard-input" placeholder="Mật khẩu hiện tại" type="password" value={passwordForm.currentPassword} onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Mật khẩu mới</label>
                      <input className="dashboard-input" placeholder="Mật khẩu mới" type="password" value={passwordForm.newPassword} onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)} />
                    </div>
                    <div>
                      <label className="dashboard-form-label">Xác nhận mật khẩu</label>
                      <input className="dashboard-input" placeholder="Xác nhận mật khẩu" type="password" value={passwordForm.confirmPassword} onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button className="dashboard-button" disabled={passwordSaving} type="submit">
                      {passwordSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </Card>
              <Card className="dashboard-card--solid" title={<><IconBubble>2FA</IconBubble><span className="font-semibold dashboard-text-primary">Xác thực hai yếu tố</span></>}>
                <p className="text-sm leading-7 dashboard-text-secondary">Xác thực hai yếu tố tăng cường bảo mật truy cập bằng cách yêu cầu hai phương pháp để xác minh danh tính của bạn.</p>
                {twoFactorError ? <div className="dashboard-alert dashboard-alert--warning mt-5">{twoFactorError}</div> : null}
                {twoFactor.message ? <div className="dashboard-alert dashboard-alert--success mt-5">{twoFactor.message}</div> : null}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Badge tone={twoFactor.enabled ? 'success' : 'neutral'}>
                    {twoFactor.enabled ? '2FA đang bật' : '2FA đang tắt'}
                  </Badge>
                  {user.twoFactorEnabled ? <Badge tone="info">Bảo vệ đăng nhập đang hoạt động</Badge> : null}
                </div>

                {!twoFactor.enabled ? (
                  <>
                    {twoFactor.qrCodeDataUrl ? (
                      <div className="dashboard-two-factor-grid mt-6">
                        <div className="dashboard-two-factor-qr">
                          <img alt="QR 2FA" className="h-52 w-52 rounded-3xl bg-white p-4" src={twoFactor.qrCodeDataUrl} />
                        </div>
                        <form className="space-y-4" onSubmit={handleEnableTwoFactor}>
                          <div>
                            <label className="dashboard-form-label">Secret key</label>
                            <div className="dashboard-field__value">
                              <span className="break-all">{twoFactor.secret || '---'}</span>
                              <button onClick={() => void copyText(twoFactor.secret)} type="button">
                                Sao chép
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="dashboard-form-label">Mã xác thực</label>
                            <input className="dashboard-input" inputMode="numeric" maxLength={6} placeholder="Nhập mã 6 số từ Google Authenticator" type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button className="dashboard-button" disabled={twoFactor.loading} type="submit">
                              {twoFactor.loading ? 'Đang xác minh...' : 'Xác nhận bật 2FA'}
                            </button>
                            <button className="dashboard-button dashboard-button--ghost" disabled={twoFactor.loading} onClick={handleStartTwoFactorSetup} type="button">
                              Tạo lại QR
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="dashboard-illustration">
                        <div className="dashboard-illustration__code">2FA</div>
                        <div className="dashboard-illustration__shield">SHIELD</div>
                      </div>
                    )}
                    <button className="dashboard-button" disabled={twoFactor.loading} onClick={handleStartTwoFactorSetup} type="button">
                      {twoFactor.loading ? 'Đang khởi tạo...' : twoFactor.setupPending ? 'Hiển thị lại QR 2FA' : 'Bật 2FA'}
                    </button>
                  </>
                ) : (
                  <form className="mt-6 space-y-4" onSubmit={handleDisableTwoFactor}>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div>
                        <label className="dashboard-form-label">Mật khẩu hiện tại</label>
                        <input className="dashboard-input" placeholder="Nhập mật khẩu hiện tại" type="password" value={twoFactorDisablePassword} onChange={(e) => setTwoFactorDisablePassword(e.target.value)} />
                      </div>
                      <div>
                        <label className="dashboard-form-label">Mã 2FA hiện tại</label>
                        <input className="dashboard-input" inputMode="numeric" maxLength={6} placeholder="Nhập mã 6 số" type="text" value={twoFactorDisableCode} onChange={(e) => setTwoFactorDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                      </div>
                    </div>
                    <button className="dashboard-button dashboard-button--ghost" disabled={twoFactor.loading} type="submit">
                      {twoFactor.loading ? 'Đang tắt...' : 'Tắt 2FA'}
                    </button>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </>
      );
    }

    return null;
  })();

  return (
    <div className="dashboard-shell">
      <div className="dashboard-announcement">HOT : Ra Mắt Tính Năng Tiếp Thị Liên Kết</div>
      <div className="lg:grid lg:min-h-[calc(100vh-52px)] lg:grid-cols-4">
        <aside className="dashboard-sidebar lg:col-span-1">
          <div className="border-b border-[color:var(--dashboard-border)] px-5 py-5"><Link className="dashboard-logo" to="/"><span className="dashboard-logo__mark">THUEAPI.PRO</span><span className="dashboard-logo__sub">Realtime Gateway</span></Link></div>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-5 py-5">
            {sidebarGroups.map((group) => (
              <div className="mb-6" key={group.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] dashboard-text-muted">{group.title}</p>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const active = path.startsWith(item.to) || (item.children?.some((child) => child.to === path) ?? false);
                    const isExpanded = item.children ? Boolean(expandedSections[item.to]) : false;

                    return (
                      <div key={item.to}>
                        {item.children ? (
                          <button
                            aria-expanded={isExpanded}
                            className={`dashboard-nav-link ${active ? 'dashboard-nav-link--active' : ''}`}
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                [item.to]: !prev[item.to],
                              }))
                            }
                            type="button"
                          >
                            <span className="dashboard-nav-link__icon">{item.icon}</span>
                            <span>{item.label}</span>
                            <span className={`dashboard-nav-link__arrow ${isExpanded ? 'dashboard-nav-link__arrow--open' : ''}`}>›</span>
                          </button>
                        ) : (
                          <Link className={`dashboard-nav-link ${active ? 'dashboard-nav-link--active' : ''}`} to={item.to}>
                            <span className="dashboard-nav-link__icon">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        )}
                        {item.children && isExpanded ? (
                          <div className="mt-2 space-y-2 pl-12">
                            {item.children.map((child) => (
                              <NavLink className={({ isActive }) => `dashboard-subnav-link ${isActive ? 'dashboard-subnav-link--active' : ''}`} key={child.to} to={child.to}>
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[color:var(--dashboard-border)] px-5 py-5"><button className="dashboard-nav-link dashboard-nav-link--danger" onClick={logout} type="button"><span className="dashboard-nav-link__icon">DX</span><span>Đăng xuất</span></button></div>
        </aside>
        <main className="dashboard-main min-w-0 lg:col-span-3">
          <header className="dashboard-header">
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-[color:var(--dashboard-border)] bg-white/80 px-3 py-2 shadow-sm"><div className="dashboard-user-badge">{user.fullName?.slice(0, 1).toUpperCase() ?? 'T'}</div><p className="text-sm font-semibold dashboard-text-primary">{user.fullName} - {formatMoney(systemBalance?.balance ?? 0)}</p><span className="dashboard-setting-link__arrow">›</span></div>
              <div className="flex flex-wrap items-center gap-3"><ThemeToggle compact /><button className="dashboard-round-button" type="button">9</button><button className="dashboard-round-button" type="button">GL</button></div>
            </div>
          </header>
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 lg:px-6 xl:px-8">
            {topupToast ? (
              <div className="dashboard-toast-stack">
                <div className={`dashboard-toast dashboard-toast--${topupToast.tone}`}>
                  <strong>{topupToast.tone === 'success' ? 'Đã nạp thành công' : 'Thông báo'}</strong>
                  <span>{topupToast.message}</span>
                </div>
              </div>
            ) : null}
            <div className="page-transition" key={path}>
              {content}
            </div>
          </div>
        </main>
      </div>
      <div className="dashboard-floating"><button className="dashboard-float-button" type="button">VIEW</button><button className="dashboard-float-button" type="button">ZALO</button><button className="dashboard-float-button" type="button">SEND</button></div>
    </div>
  );
};

export default DashboardPage;
