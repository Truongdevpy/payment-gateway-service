import React, { useEffect, useMemo, useState } from 'react';
import { brandLogos } from '../assets/brands';
import LoadingState from './LoadingState';
import {
  deleteHistoryAccount,
  getHistoryAccountBalance,
  getHistoryAccountStats,
  getHistoryAccountTransactions,
  getHistoryProviderCatalog,
  getHistoryProviderPolicies,
  HistoryAccount,
  HistoryProviderDefinition,
  listHistoryAccounts,
  ProviderPoliciesResponse,
  registerHistoryAccount,
  renewHistoryAccountToken,
  TransactionRecord,
  TransactionStatsResponse,
  BalanceResponse,
} from '../services/historyService';

type ProviderSection = 'overview' | 'accounts' | 'stats' | 'transactions' | 'api';
type BrandKey = keyof typeof brandLogos;
type VisualDefinition = {
  accent: string;
  brandKey?: BrandKey;
  summary: string;
};

const workspaceStorageKey = 'dashboard-payment-gateway-workspace';

const providerVisuals: Record<string, VisualDefinition> = {
  acb: { accent: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)', brandKey: 'acb', summary: 'Đồng bộ token và lịch sử ACB từ tài khoản đã liên kết.' },
  gt1s: { accent: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', summary: 'Cổng GT1S dùng cookie và lịch sử ví để đối soát.' },
  mbbank: { accent: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)', brandKey: 'mbbank', summary: 'Theo dõi MB Bank thời gian thực, số dư và webhook.' },
  momo: { accent: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)', brandKey: 'momo', summary: 'Ví MoMo cho giao dịch nạp rút và cảnh báo thời gian thực.' },
  seabank: { accent: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', brandKey: 'seabank', summary: 'Quản lý `id_token`, lịch sử giao dịch và làm mới phiên.' },
  thesieure: { accent: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', brandKey: 'thesieure', summary: 'Cookie Thẻ Siêu Rẻ cho lịch sử giao dịch và số dư.' },
  tpbank: { accent: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', brandKey: 'tpbank', summary: 'Tài khoản TPBank, token phiên và truy vấn lịch sử.' },
  trumthe: { accent: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)', brandKey: 'trumthe', summary: 'Cổng thẻ cào Trùm Thẻ với token và đối soát giao dịch.' },
  vcb: { accent: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', brandKey: 'vietcombank', summary: 'Vietcombank Digibank với phiên trình duyệt và lịch sử.' },
  viettel: { accent: 'linear-gradient(135deg, #0f766e 0%, #22c55e 100%)', brandKey: 'viettelpay', summary: 'Viettel Money với token truy cập, token làm mới và IMEI.' },
  zalopay: { accent: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', brandKey: 'zalopay', summary: 'Cookie ZaloPay cho lịch sử và thống kê giao dịch.' },
};

const providerOrder = ['momo', 'vcb', 'mbbank', 'tpbank', 'seabank', 'acb', 'zalopay', 'thesieure', 'viettel', 'trumthe', 'gt1s'];

const sectionItems: Array<{ key: ProviderSection; label: string }> = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'accounts', label: 'Tài khoản' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'transactions', label: 'Lịch sử' },
  { key: 'api', label: 'Token API' },
];

const fieldLabelMap: Record<string, string> = {
  access_token: 'Token truy cập',
  account_number: 'Số tài khoản',
  authorization: 'Chuỗi xác thực',
  cookie: 'Cookie',
  device_id: 'Mã thiết bị',
  id_token: 'ID token',
  imei: 'IMEI',
  password: 'Mật khẩu',
  refresh_token: 'Token làm mới',
  session_id: 'Session ID',
  session_key: 'Khóa phiên',
  username: 'Tên đăng nhập',
};

const authModeLabels: Record<string, string> = {
  authorization_bundle: 'Gói xác thực',
  browser_session: 'Phiên trình duyệt',
  cookie_session: 'Phiên cookie',
  credential_refresh: 'Đăng nhập để làm mới phiên',
  direct_credentials: 'Đăng nhập trực tiếp',
  token_bundle: 'Bộ token truy cập',
};

const providerCategoryLabels: Record<string, string> = {
  bank: 'Ngân hàng',
  payment: 'Thanh toán',
  wallet: 'Ví điện tử',
};

const accountStatusLabels: Record<string, string> = {
  error: 'Lỗi',
  expired: 'Hết hạn',
  linked: 'Đang hoạt động',
  pending: 'Chờ xử lý',
};

const transactionTypeLabels: Record<string, string> = {
  credit: 'Tiền vào',
  debit: 'Tiền ra',
  incoming: 'Tiền vào',
  outgoing: 'Tiền ra',
  in: 'Tiền vào',
  out: 'Tiền ra',
};

const transactionStatusLabels: Record<string, string> = {
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  error: 'Lỗi',
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  success: 'Thành công',
};

const directPayloadFields = new Set([
  'access_token',
  'account_number',
  'authorization',
  'cookie',
  'device_id',
  'id_token',
  'imei',
  'password',
  'refresh_token',
  'session_id',
  'session_key',
  'username',
]);

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getFieldDisplayLabel = (key: string, fallback?: string) => fieldLabelMap[key] || fallback || toTitleCase(key);

const formatProviderCategory = (value?: string | null) => {
  if (!value) return '--';
  return providerCategoryLabels[value.toLowerCase()] || toTitleCase(value);
};

const formatAuthMode = (value?: string | null) => {
  if (!value) return '--';
  return authModeLabels[value.toLowerCase()] || toTitleCase(value);
};

const formatAccountStatus = (value?: string | null) => {
  if (!value) return '--';
  return accountStatusLabels[value.toLowerCase()] || toTitleCase(value);
};

const formatTransactionType = (value?: string | null) => {
  if (!value) return '--';
  return transactionTypeLabels[value.toLowerCase()] || toTitleCase(value);
};

const formatTransactionStatus = (value?: string | null) => {
  if (!value) return '--';
  return transactionStatusLabels[value.toLowerCase()] || toTitleCase(value);
};

const isOutgoingTransaction = (type?: string | null, amount?: number | null) => {
  if ((amount ?? 0) < 0) {
    return true;
  }

  if (!type) {
    return false;
  }

  const normalized = type.toLowerCase();
  return normalized.includes('out') || normalized.includes('debit') || normalized === 'withdrawal';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const formatAmount = (value?: number | null, currency = 'VND') =>
  `${(value ?? 0).toLocaleString('vi-VN')} ${currency}`;

const copyText = async (value: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {}
};

const loadWorkspace = (): { providerKey: string; section: ProviderSection } | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(workspaceStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { providerKey: string; section: ProviderSection };
  } catch {
    return null;
  }
};

const saveWorkspace = (providerKey: string, section: ProviderSection) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(workspaceStorageKey, JSON.stringify({ providerKey, section }));
};

const Panel: React.FC<{ action?: React.ReactNode; children: React.ReactNode; title: React.ReactNode }> = ({ action, children, title }) => (
  <section className="dashboard-card dashboard-card--solid">
    <div className="dashboard-card__head">
      <div className="flex items-center gap-3">{title}</div>
      {action}
    </div>
    <div className="dashboard-card__body">{children}</div>
  </section>
);

const PaymentGatewayManagerSkeleton: React.FC = () => (
  <div className="space-y-6">
    <LoadingState
      compact
      description="Đang đồng bộ danh sách cổng, tài khoản liên kết, token và các endpoint truy vấn."
      title="Đang tải cổng thanh toán"
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="dashboard-skeleton h-44 w-full rounded-[28px]" key={`provider-skeleton-${index}`} />
      ))}
    </div>
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="dashboard-skeleton h-11 w-28 rounded-full" key={`section-skeleton-${index}`} />
      ))}
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <div className="dashboard-skeleton h-[260px] w-full rounded-[28px]" />
        <div className="dashboard-skeleton h-[240px] w-full rounded-[28px]" />
      </div>
      <div className="space-y-6">
        <div className="dashboard-skeleton h-[180px] w-full rounded-[28px]" />
        <div className="space-y-3 rounded-[28px] border border-[color:var(--dashboard-border)] bg-white/70 p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="dashboard-skeleton h-16 w-full rounded-[20px]" key={`api-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PaymentGatewayManager: React.FC = () => {
  const initialWorkspace = loadWorkspace();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [catalog, setCatalog] = useState<HistoryProviderDefinition[]>([]);
  const [policies, setPolicies] = useState<ProviderPoliciesResponse | null>(null);
  const [accounts, setAccounts] = useState<HistoryAccount[]>([]);
  const [activeProviderKey, setActiveProviderKey] = useState(initialWorkspace?.providerKey || '');
  const [activeSection, setActiveSection] = useState<ProviderSection>(initialWorkspace?.section || 'overview');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', message: '' });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [stats, setStats] = useState<TransactionStatsResponse | null>(null);
  const [detailsAccountId, setDetailsAccountId] = useState<number | null>(null);
  const [transactionQuery, setTransactionQuery] = useState('');

  const orderedProviders = useMemo(() => {
    const sortOrder = new Map(providerOrder.map((provider, index) => [provider, index]));
    return [...catalog].sort((left, right) => {
      const leftIndex = sortOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = sortOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.label.localeCompare(right.label);
    });
  }, [catalog]);

  const activeProvider = useMemo(
    () => orderedProviders.find((provider) => provider.key === activeProviderKey) ?? orderedProviders[0] ?? null,
    [activeProviderKey, orderedProviders],
  );

  const providerAccounts = useMemo(
    () => accounts.filter((account) => account.provider === activeProvider?.key),
    [accounts, activeProvider],
  );

  const selectedAccount = useMemo(
    () => providerAccounts.find((account) => account.id === selectedAccountId) ?? providerAccounts[0] ?? null,
    [providerAccounts, selectedAccountId],
  );

  const filteredTransactions = useMemo(() => {
    if (!transactionQuery.trim()) {
      return transactions;
    }

    const keyword = transactionQuery.trim().toLowerCase();
    return transactions.filter((transaction) =>
      [
        transaction.transactionId,
        transaction.transactionType,
        transaction.description,
        transaction.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [transactionQuery, transactions]);

  const refreshAccounts = async (preferredProvider?: string, preferredAccountId?: number | null) => {
    const nextAccounts = await listHistoryAccounts();
    setAccounts(nextAccounts);

    const nextProviderKey =
      preferredProvider && orderedProviders.some((provider) => provider.key === preferredProvider)
        ? preferredProvider
        : activeProvider?.key || orderedProviders[0]?.key || '';

    const nextProviderAccounts = nextAccounts.filter((account) => account.provider === nextProviderKey);
    const nextSelectedAccount =
      preferredAccountId && nextProviderAccounts.some((account) => account.id === preferredAccountId)
        ? preferredAccountId
        : nextProviderAccounts[0]?.id ?? null;

    setSelectedAccountId(nextSelectedAccount);
  };

  const loadBootstrapData = async () => {
    setLoading(true);
    setFeedback({ error: '', message: '' });

    try {
      const [nextCatalog, nextPolicies, nextAccounts] = await Promise.all([
        getHistoryProviderCatalog(),
        getHistoryProviderPolicies(),
        listHistoryAccounts(),
      ]);

      const sortOrder = new Map(providerOrder.map((provider, index) => [provider, index]));
      const sortedCatalog = [...nextCatalog].sort((left, right) => {
        const leftIndex = sortOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = sortOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER;
        return leftIndex - rightIndex || left.label.localeCompare(right.label);
      });

      const nextProviderKey =
        sortedCatalog.some((provider) => provider.key === activeProviderKey)
          ? activeProviderKey
          : sortedCatalog[0]?.key || '';
      const nextProviderAccounts = nextAccounts.filter((account) => account.provider === nextProviderKey);
      const nextSelectedAccount =
        nextProviderAccounts.find((account) => account.id === selectedAccountId)?.id ?? nextProviderAccounts[0]?.id ?? null;

      setCatalog(sortedCatalog);
      setPolicies(nextPolicies);
      setAccounts(nextAccounts);
      setActiveProviderKey(nextProviderKey);
      setSelectedAccountId(nextSelectedAccount);
    } catch (error: any) {
      setFeedback({ error: error.message || 'Không tải được danh sách cổng thanh toán', message: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrapData();
  }, []);

  useEffect(() => {
    if (!activeProvider?.key) {
      return;
    }

    saveWorkspace(activeProvider.key, activeSection);
  }, [activeProvider, activeSection]);

  useEffect(() => {
    if (!activeProvider) {
      return;
    }

    const nextSelectedAccount =
      providerAccounts.find((account) => account.id === selectedAccountId)?.id ?? providerAccounts[0]?.id ?? null;
    setSelectedAccountId(nextSelectedAccount);
  }, [activeProvider, providerAccounts, selectedAccountId]);

  useEffect(() => {
    setTransactions([]);
    setBalance(null);
    setStats(null);
    setDetailsAccountId(null);
    setTransactionQuery('');
  }, [selectedAccountId]);

  const resetRegisterForm = () => {
    setRegisterOpen(false);
    setAccountDisplayName('');
    setAcceptedPolicies(false);
    setShowSensitiveFields(false);
    setFieldValues({});
  };

  const handleProviderSelect = (providerKey: string) => {
    setActiveProviderKey(providerKey);
    setActiveSection('overview');
    setFeedback({ error: '', message: '' });
    resetRegisterForm();
  };

  const handleFieldValueChange = (fieldKey: string, value: string) => {
    setFieldValues((previous) => ({ ...previous, [fieldKey]: value }));
  };

  const loadSelectedAccountDetails = async (force = false) => {
    if (!selectedAccount) {
      return;
    }

    if (!force && detailsAccountId === selectedAccount.id) {
      return;
    }

    setWorking(true);
    setFeedback({ error: '', message: '' });

    try {
      const [nextTransactions, nextBalance, nextStats] = await Promise.all([
        getHistoryAccountTransactions(selectedAccount.id),
        getHistoryAccountBalance(selectedAccount.id),
        getHistoryAccountStats(selectedAccount.id),
      ]);

      setTransactions(nextTransactions.transactions);
      setBalance(nextBalance);
      setStats(nextStats);
      setDetailsAccountId(selectedAccount.id);
    } catch (error: any) {
      setFeedback({ error: error.message || 'Không tải được chi tiết tài khoản', message: '' });
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    if (activeSection === 'stats' || activeSection === 'transactions' || activeSection === 'api') {
      void loadSelectedAccountDetails();
    }
  }, [activeSection, selectedAccount]);

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeProvider) {
      return;
    }

    setWorking(true);
    setFeedback({ error: '', message: '' });

    try {
      const metadata = Object.entries(fieldValues).reduce<Record<string, unknown>>((result, [key, value]) => {
        if (!value || directPayloadFields.has(key)) {
          return result;
        }

        result[key] = value;
        return result;
      }, {});

      const response = await registerHistoryAccount({
        provider: activeProvider.key,
        username: fieldValues.username || '',
        password: fieldValues.password || undefined,
        accountName: accountDisplayName || activeProvider.label,
        accountNumber: fieldValues.account_number || undefined,
        cookie: fieldValues.cookie || undefined,
        accessToken: fieldValues.access_token || undefined,
        refreshToken: fieldValues.refresh_token || undefined,
        sessionId: fieldValues.session_id || undefined,
        deviceId: fieldValues.device_id || undefined,
        idToken: fieldValues.id_token || undefined,
        imei: fieldValues.imei || undefined,
        authorization: fieldValues.authorization || undefined,
        sessionKey: fieldValues.session_key || undefined,
        acceptPolicies: acceptedPolicies,
        metadata,
      });

      await refreshAccounts(activeProvider.key, response.accountId ?? null);
      setFeedback({ error: '', message: response.message || 'Đã thêm tài khoản thành công' });
      resetRegisterForm();
      setActiveSection('accounts');
    } catch (error: any) {
      setFeedback({ error: error.message || 'Thêm tài khoản thất bại', message: '' });
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteAccount = async (account: HistoryAccount) => {
    if (!window.confirm(`Xóa tài khoản ${account.accountName || account.loginIdentifier || account.id}?`)) {
      return;
    }

    setWorking(true);
    setFeedback({ error: '', message: '' });

    try {
      const response = await deleteHistoryAccount(account.id);
      await refreshAccounts(activeProvider?.key, account.id === selectedAccountId ? null : selectedAccountId);
      if (account.id === detailsAccountId) {
        setTransactions([]);
        setBalance(null);
        setStats(null);
        setDetailsAccountId(null);
      }
      setFeedback({ error: '', message: response.message || 'Đã xóa tài khoản' });
    } catch (error: any) {
      setFeedback({ error: error.message || 'Xóa tài khoản thất bại', message: '' });
    } finally {
      setWorking(false);
    }
  };

  const handleRenewAccount = async (account: HistoryAccount) => {
    setWorking(true);
    setFeedback({ error: '', message: '' });

    try {
      const response = await renewHistoryAccountToken(account.id);
      await refreshAccounts(activeProvider?.key, response.id);
      setFeedback({ error: '', message: 'Đã gia hạn token thành công' });
    } catch (error: any) {
      setFeedback({ error: error.message || 'Gia hạn token thất bại', message: '' });
    } finally {
      setWorking(false);
    }
  };

  const renderLogo = (providerKey: string, label: string) => {
    const visual = providerVisuals[providerKey];
    const brandKey = visual?.brandKey;

    if (brandKey && brandLogos[brandKey]) {
      return (
        <div className="dashboard-bank-card__logo">
          <img alt={label} src={brandLogos[brandKey]} />
        </div>
      );
    }

    return (
      <div className="dashboard-bank-card__logo">
        <span className="text-sm font-semibold dashboard-text-primary">{label.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  };

  if (loading) {
    return <PaymentGatewayManagerSkeleton />;
  }

  if (loading) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state__icon">...</div>
        <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Đang tải cổng thanh toán</h3>
        <p className="dashboard-text-muted">Hệ thống đang đồng bộ cổng thanh toán, token và danh sách tài khoản.</p>
      </div>
    );
  }

  if (!activeProvider) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state__icon">!</div>
        <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa có cổng khả dụng</h3>
        <p className="dashboard-text-muted">Backend chưa trả về danh sách cổng thanh toán để kết nối.</p>
      </div>
    );
  }

  const transactionEndpoint = selectedAccount
    ? `http://localhost:8000/api/history/providers/${activeProvider.key}/transactions?token=${selectedAccount.token}`
    : '';
  const balanceEndpoint = selectedAccount
    ? `http://localhost:8000/api/history/providers/${activeProvider.key}/balance?token=${selectedAccount.token}`
    : '';
  const statsEndpoint = selectedAccount
    ? `http://localhost:8000/api/history/providers/${activeProvider.key}/stats?token=${selectedAccount.token}`
    : '';

  const apiCards = [
    {
      description: 'Trả về danh sách lịch sử giao dịch từ token đang dùng.',
      key: 'transactions',
      label: 'Lịch sử giao dịch',
      url: transactionEndpoint,
    },
    {
      description: 'Trả về số dư khả dụng của tài khoản đang liên kết.',
      key: 'balance',
      label: 'Số dư',
      url: balanceEndpoint,
    },
    {
      description: 'Trả về thống kê tổng vào, tổng ra và biến động ròng.',
      key: 'stats',
      label: 'Thống kê',
      url: statsEndpoint,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="dashboard-alert dashboard-alert--success">
        Kết nối đa cổng: lưu thông tin đăng nhập, tạo token, xem thống kê, lịch sử và truy vấn giao dịch trên cùng một màn hình.
      </div>

      {feedback.error ? <div className="dashboard-alert dashboard-alert--warning">{feedback.error}</div> : null}
      {feedback.message ? <div className="dashboard-alert dashboard-alert--success">{feedback.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderedProviders.map((provider) => {
          const visual = providerVisuals[provider.key];
          const providerAccountsCount = accounts.filter((account) => account.provider === provider.key).length;
          const isActive = provider.key === activeProvider.key;

          return (
            <button
              key={provider.key}
              type="button"
              className={`dashboard-provider-tile rounded-[28px] border p-5 text-left transition-all ${
                isActive ? 'dashboard-provider-tile--active border-emerald-400 shadow-[0_20px_45px_rgba(22,163,74,0.16)]' : 'border-[color:var(--dashboard-border)]'
              }`}
              style={{ background: visual?.accent || 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' }}
              onClick={() => handleProviderSelect(provider.key)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/90 p-2">{renderLogo(provider.key, provider.label)}</div>
                  <div>
                    <p className="text-lg font-semibold text-white">{provider.label}</p>
                    <p className="mt-1 text-sm text-white/80">{formatProviderCategory(provider.category)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  {providerAccountsCount} kết nối
                </span>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/85">{providerVisuals[provider.key]?.summary || provider.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {sectionItems.map((section) => (
          <button
            key={section.key}
            type="button"
            className={`dashboard-button ${activeSection === section.key ? '' : 'dashboard-button--ghost'}`}
            onClick={() => setActiveSection(section.key)}
          >
            {section.label}
          </button>
        ))}
        <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => void loadBootstrapData()}>
          Làm mới
        </button>
      </div>

      {activeSection === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={
              <>
                {renderLogo(activeProvider.key, activeProvider.label)}
                <div>
                  <p className="font-semibold dashboard-text-primary">{activeProvider.label}</p>
                  <p className="text-sm dashboard-text-muted">{formatAuthMode(activeProvider.authMode)}</p>
                </div>
              </>
            }
            action={<span className="dashboard-badge dashboard-badge--info">{providerAccounts.length} kết nối</span>}
          >
            <div className="space-y-4">
              <p className="dashboard-text-secondary">{providerVisuals[activeProvider.key]?.summary || activeProvider.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="dashboard-summary-panel">
                  <p className="text-sm dashboard-text-muted">Chế độ xác thực</p>
                  <p className="mt-2 text-xl font-semibold dashboard-text-primary">{formatAuthMode(activeProvider.authMode)}</p>
                </div>
                <div className="dashboard-summary-panel">
                  <p className="text-sm dashboard-text-muted">Tệp tương thích cũ</p>
                  <p className="mt-2 text-sm font-semibold dashboard-text-primary">
                    {activeProvider.legacyRegisterFile} / {activeProvider.legacyHistoryFile}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeProvider.requiredFields.map((field) => (
                  <span key={field} className="dashboard-badge dashboard-badge--neutral">
                    {getFieldDisplayLabel(field)}
                  </span>
                ))}
              </div>
              <div className="dashboard-code-item">
                <p className="font-semibold dashboard-text-primary">Gợi ý gia hạn phiên</p>
                <p className="mt-2 text-sm dashboard-text-muted">{activeProvider.sessionRefreshHint}</p>
              </div>
            </div>
          </Panel>

          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">TK</span>
                <span className="font-semibold dashboard-text-primary">Tóm tắt nhanh</span>
              </>
            }
            action={<button className="dashboard-button" type="button" onClick={() => setActiveSection('accounts')}>Thêm mới</button>}
          >
            <div className="grid gap-4">
              <div className="dashboard-summary-panel">
                <p className="text-sm dashboard-text-muted">Tài khoản đang liên kết</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{providerAccounts.length}</p>
              </div>
                  <div className="dashboard-summary-panel">
                    <p className="text-sm dashboard-text-muted">Khả năng đồng bộ</p>
                    <p className="mt-2 text-sm font-semibold dashboard-text-primary">
                      {activeProvider.supportsHistory ? 'Có lịch sử giao dịch' : 'Không hỗ trợ lịch sử'} · {activeProvider.supportsBalance ? 'Có truy vấn số dư' : 'Không hỗ trợ số dư'}
                    </p>
              </div>
              <div className="dashboard-summary-panel">
                <p className="text-sm dashboard-text-muted">Tài khoản đang chọn</p>
                <p className="mt-2 text-sm font-semibold dashboard-text-primary">
                  {selectedAccount?.accountName || selectedAccount?.loginIdentifier || 'Chưa chọn tài khoản'}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {activeSection === 'accounts' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">+</span>
                <span className="font-semibold dashboard-text-primary">Thêm tài khoản {activeProvider.label}</span>
              </>
            }
            action={
              <button
                className="dashboard-button dashboard-button--ghost"
                type="button"
                onClick={() => setRegisterOpen((current) => !current)}
              >
                {registerOpen ? 'Đóng biểu mẫu' : 'Thêm mới'}
              </button>
            }
          >
            <div className="space-y-4">
              <div className="dashboard-alert dashboard-alert--info">
                Điền đúng thông tin đăng nhập của {activeProvider.label} để hệ thống tạo token truy vấn cho cổng này.
              </div>
              {registerOpen ? (
                <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                  <label className="dashboard-field">
                    <span>Tên hiển thị</span>
                    <input
                      className="dashboard-input"
                      value={accountDisplayName}
                      onChange={(event) => setAccountDisplayName(event.target.value)}
                      placeholder={`Ví dụ: ${activeProvider.label} chính`}
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeProvider.fields.map((field) => (
                      <label className="dashboard-field" key={field.key}>
                        <span>
                          {getFieldDisplayLabel(field.key, field.label)}
                          {field.required ? ' *' : ''}
                        </span>
                        <input
                          className="dashboard-input"
                          type={field.sensitive && !showSensitiveFields ? 'password' : field.inputType || 'text'}
                          value={fieldValues[field.key] || ''}
                          onChange={(event) => handleFieldValueChange(field.key, event.target.value)}
                          placeholder={field.placeholder || getFieldDisplayLabel(field.key, field.label)}
                          required={field.required}
                        />
                        {field.helpText ? <small className="dashboard-text-muted">{field.helpText}</small> : null}
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-3 text-sm dashboard-text-secondary">
                    <input
                      checked={showSensitiveFields}
                      onChange={(event) => setShowSensitiveFields(event.target.checked)}
                      type="checkbox"
                    />
                    Hiển thị các trường nhạy cảm để kiểm tra dữ liệu nhập
                  </label>
                  <label className="flex items-start gap-3 rounded-[20px] border border-[color:var(--dashboard-border)] bg-emerald-50/60 p-4 text-sm dashboard-text-secondary">
                    <input
                      checked={acceptedPolicies}
                      onChange={(event) => setAcceptedPolicies(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      {policies?.consentLabel || 'Bạn cần đồng ý với điều khoản và chính sách bảo mật trước khi lưu tài khoản.'}{' '}
                      <button className="font-semibold text-emerald-700" type="button" onClick={() => setPolicyOpen(true)}>
                        Xem điều khoản
                      </button>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button className="dashboard-button" disabled={working} type="submit">
                      {working ? 'Đang xử lý...' : 'Lưu tài khoản'}
                    </button>
                    <button className="dashboard-button dashboard-button--ghost" type="button" onClick={resetRegisterForm}>
                      Đặt lại
                    </button>
                  </div>
                </form>
              ) : (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon">+</div>
                  <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Thêm tài khoản mới</h3>
                  <p className="dashboard-text-muted">
                    Mở biểu mẫu để liên kết {activeProvider.label}, lấy token và bắt đầu truy vấn giao dịch.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">DS</span>
                <span className="font-semibold dashboard-text-primary">Danh sách tài khoản</span>
              </>
            }
            action={<span className="dashboard-badge dashboard-badge--success">{providerAccounts.length} tài khoản</span>}
          >
            {providerAccounts.length === 0 ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state__icon">∅</div>
                <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa có tài khoản</h3>
                <p className="dashboard-text-muted">Tài khoản liên kết của cổng này sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providerAccounts.map((account) => {
                  const isSelected = selectedAccount?.id === account.id;
                  return (
                    <div
                      className={`dashboard-code-item ${isSelected ? 'ring-2 ring-emerald-400/50' : ''}`}
                      key={account.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold dashboard-text-primary">
                              {account.accountName || account.providerLabel || activeProvider.label}
                            </p>
                            <span className="dashboard-badge dashboard-badge--info">{formatAccountStatus(account.status)}</span>
                          </div>
                          <p className="text-sm dashboard-text-muted">
                            Đăng nhập: {account.loginIdentifier || '--'} · STK: {account.externalId || '--'}
                          </p>
                          <p className="break-all text-xs dashboard-text-muted">{account.token}</p>
                          <p className="text-xs dashboard-text-muted">Cập nhật: {formatDateTime(account.updatedAt)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => setSelectedAccountId(account.id)}>
                            Chọn
                          </button>
                          <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => void handleRenewAccount(account)}>
                            Gia hạn
                          </button>
                          <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => void handleDeleteAccount(account)}>
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeSection === 'stats' ? (
        <div className="space-y-6">
          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">TK</span>
                <span className="font-semibold dashboard-text-primary">Thống kê giao dịch</span>
              </>
            }
            action={
              <button className="dashboard-button" type="button" onClick={() => void loadSelectedAccountDetails(true)} disabled={!selectedAccount || working}>
                {working ? 'Đang tải...' : 'Tải dữ liệu'}
              </button>
            }
          >
            {!selectedAccount ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state__icon">!</div>
                <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa chọn tài khoản</h3>
                <p className="dashboard-text-muted">Chọn một tài khoản trong mục Tài khoản để xem thống kê.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="dashboard-summary-panel">
                    <p className="text-sm dashboard-text-muted">Tài khoản</p>
                    <p className="mt-2 text-lg font-semibold dashboard-text-primary">
                      {selectedAccount.accountName || selectedAccount.loginIdentifier || selectedAccount.id}
                    </p>
                  </div>
                  <div className="dashboard-summary-panel">
                    <p className="text-sm dashboard-text-muted">Tổng giao dịch</p>
                    <p className="mt-2 text-3xl font-bold dashboard-text-primary">{stats?.totalTransactions ?? 0}</p>
                  </div>
                  <div className="dashboard-summary-panel">
                    <p className="text-sm dashboard-text-muted">Tổng vào</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">{formatAmount(stats?.totalIncoming, stats?.currency)}</p>
                  </div>
                  <div className="dashboard-summary-panel">
                    <p className="text-sm dashboard-text-muted">Tổng ra</p>
                    <p className="mt-2 text-3xl font-bold text-rose-600">{formatAmount(stats?.totalOutgoing, stats?.currency)}</p>
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="dashboard-code-item">
                    <p className="font-semibold dashboard-text-primary">Số dư hiện tại</p>
                    <p className="mt-2 text-2xl font-bold text-sky-600">{formatAmount(balance?.balance, balance?.currency)}</p>
                    <p className="mt-1 text-sm dashboard-text-muted">Số tài khoản: {balance?.accountId || selectedAccount.externalId || '--'}</p>
                  </div>
                  <div className="dashboard-code-item">
                    <p className="font-semibold dashboard-text-primary">Biến động ròng</p>
                    <p className={`mt-2 text-2xl font-bold ${(stats?.netAmount || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatAmount(stats?.netAmount, stats?.currency)}
                    </p>
                    <p className="mt-1 text-sm dashboard-text-muted">Cập nhật lần cuối: {formatDateTime(selectedAccount.lastSyncedAt || selectedAccount.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeSection === 'transactions' ? (
        <Panel
          title={
            <>
              <span className="dashboard-icon-bubble">LS</span>
              <span className="font-semibold dashboard-text-primary">Lịch sử giao dịch</span>
            </>
          }
          action={
            <div className="flex flex-wrap gap-2">
              <input
                className="dashboard-input w-full md:flex-1"
                value={transactionQuery}
                onChange={(event) => setTransactionQuery(event.target.value)}
                placeholder="Tìm mã giao dịch, nội dung, trạng thái..."
              />
              <button className="dashboard-button" type="button" onClick={() => void loadSelectedAccountDetails(true)} disabled={!selectedAccount || working}>
                {working ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>
          }
        >
          {!selectedAccount ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">!</div>
              <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa chọn tài khoản</h3>
              <p className="dashboard-text-muted">Chọn tài khoản trước khi xem lịch sử giao dịch.</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">∅</div>
              <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa có giao dịch</h3>
              <p className="dashboard-text-muted">Cổng này chưa trả về giao dịch hoặc bộ lọc hiện tại không khớp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Loại</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.transactionId}>
                      <td>{transaction.transactionId}</td>
                      <td>
                        <span className={`dashboard-badge ${isOutgoingTransaction(transaction.transactionType, transaction.amount) ? 'dashboard-badge--danger' : 'dashboard-badge--success'}`}>
                          {formatTransactionType(transaction.transactionType)}
                        </span>
                      </td>
                      <td className={`font-semibold ${isOutgoingTransaction(transaction.transactionType, transaction.amount) ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatAmount(transaction.amount, transaction.currency)}
                      </td>
                      <td>{formatTransactionStatus(transaction.status)}</td>
                      <td>{formatDateTime(transaction.postedAt)}</td>
                      <td>{transaction.description || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {activeSection === 'api' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">API</span>
                <span className="font-semibold dashboard-text-primary">Token truy vấn</span>
              </>
            }
            action={selectedAccount ? <span className="dashboard-badge dashboard-badge--success">{activeProvider.label}</span> : null}
          >
            {!selectedAccount ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state__icon">!</div>
                <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa có token</h3>
                <p className="dashboard-text-muted">Thêm tài khoản cổng thanh toán để hệ thống cấp token truy vấn.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="dashboard-code-item">
                  <p className="font-semibold dashboard-text-primary">Token hiện tại</p>
                  <p className="mt-2 break-all text-sm dashboard-text-secondary">{selectedAccount.token}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => void copyText(selectedAccount.token)}>
                      Sao chép token
                    </button>
                    <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => void handleRenewAccount(selectedAccount)}>
                      Gia hạn token
                    </button>
                  </div>
                </div>
                <div className="dashboard-api-grid">
                  {apiCards.map((item) => (
                    <div className="dashboard-api-card" key={item.key}>
                      <p className="font-semibold dashboard-text-primary">{item.label}</p>
                      <p className="mt-2 text-sm dashboard-text-muted">{item.description}</p>
                      <p className="mt-3 break-all text-sm dashboard-text-secondary">{item.url}</p>
                      <button className="dashboard-button dashboard-button--ghost mt-4" type="button" onClick={() => void copyText(item.url)}>
                        Sao chép liên kết
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title={
              <>
                <span className="dashboard-icon-bubble">HD</span>
                <span className="font-semibold dashboard-text-primary">Hướng dẫn nhanh</span>
              </>
            }
            action={<span className="dashboard-badge dashboard-badge--neutral">v{policies?.version || '2026-04-06'}</span>}
          >
            <div className="space-y-4">
              <div className="dashboard-code-item">
                <p className="font-semibold dashboard-text-primary">1. Thêm tài khoản</p>
                <p className="mt-2 text-sm dashboard-text-muted">Vào mục Tài khoản, chọn cổng và lưu thông tin đăng nhập để lấy token.</p>
              </div>
              <div className="dashboard-code-item">
                <p className="font-semibold dashboard-text-primary">2. Gọi API theo token</p>
                <p className="mt-2 text-sm dashboard-text-muted">Đường dẫn API đã được chuẩn hóa: lịch sử giao dịch, số dư và thống kê.</p>
              </div>
              <div className="dashboard-code-item">
                <p className="font-semibold dashboard-text-primary">3. Truy vấn giao dịch</p>
                <p className="mt-2 text-sm dashboard-text-muted">Dùng token đúng cổng để đọc lịch sử giao dịch, thống kê tổng tiền vào, tổng tiền ra và lọc trực tiếp trên dashboard.</p>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {policyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-[color:var(--dashboard-border)] bg-[color:var(--dashboard-card)] shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--dashboard-border)] px-6 py-5">
              <div>
                <h3 className="font-display text-2xl font-bold dashboard-text-primary">{policies?.title || 'Điều khoản và chính sách bảo mật'}</h3>
                <p className="mt-1 text-sm dashboard-text-muted">Áp dụng cho tất cả cổng thanh toán được liên kết trong dashboard.</p>
              </div>
              <button className="dashboard-button dashboard-button--ghost" type="button" onClick={() => setPolicyOpen(false)}>
                Đóng
              </button>
            </div>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
              {(policies?.sections || []).map((section) => (
                <div className="dashboard-code-item" key={section.title}>
                  <h4 className="font-semibold dashboard-text-primary">{section.title}</h4>
                  <div className="mt-3 space-y-3 text-sm dashboard-text-secondary">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PaymentGatewayManager;
