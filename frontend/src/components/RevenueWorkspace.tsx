import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  RevenueStats,
  RevenueTransactionRecord,
  RevenueTrend,
} from '../services/balanceService';
import LoadingState from './LoadingState';
import dashboardService from '../services/dashboardService';

const providerLabels: Record<string, string> = {
  acb: 'ACB',
  mbbank: 'MBBANK',
  seabank: 'SEABANK',
  tpbank: 'TPBANK',
  vcb: 'VIETCOMBANK',
  vietcombank: 'VIETCOMBANK',
  vietinbank: 'VIETINBANK',
  viettel: 'VIETTEL MONEY',
  zalopay: 'ZALOPAY',
};

type FilterState = {
  bank: string;
  date: string;
  direction: string;
  query: string;
};

const initialFilters: FilterState = {
  bank: '',
  date: '',
  direction: '',
  query: '',
};

const revenuePeriodDays = 30;
const revenuePageSize = 50;

const Section: React.FC<{ action?: React.ReactNode; children: React.ReactNode; title: React.ReactNode }> = ({ action, children, title }) => (
  <section className="dashboard-card dashboard-card--solid">
    <div className="dashboard-card__head">
      <div className="flex items-center gap-3">{title}</div>
      {action}
    </div>
    <div className="dashboard-card__body">{children}</div>
  </section>
);

const RevenueLoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="dashboard-metric dashboard-metric--info" key={`metric-${index}`}>
          <div className="dashboard-skeleton h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="dashboard-skeleton h-4 w-28 rounded-full" />
            <div className="dashboard-skeleton h-10 w-40 rounded-full" />
            <div className="dashboard-skeleton h-4 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <section className="dashboard-card dashboard-card--solid" key={`chart-${index}`}>
          <div className="dashboard-card__head">
            <div className="flex items-center gap-3">
              <span className="dashboard-icon-bubble">...</span>
              <div className="dashboard-skeleton h-5 w-44 rounded-full" />
            </div>
          </div>
          <div className="dashboard-card__body">
            <div className="space-y-4">
              <div className="dashboard-skeleton h-56 w-full rounded-[28px]" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="dashboard-skeleton h-4 w-32 rounded-full" />
                <div className="dashboard-skeleton h-4 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>

    <section className="dashboard-card dashboard-card--solid">
      <div className="dashboard-card__head">
        <div className="dashboard-skeleton h-5 w-36 rounded-full" />
      </div>
      <div className="dashboard-card__body space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="dashboard-skeleton h-12 w-full rounded-2xl" key={`filter-${index}`} />
          ))}
        </div>
        <div className="dashboard-skeleton h-72 w-full rounded-[28px]" />
      </div>
    </section>
  </div>
);

const formatCurrency = (value: number, options?: { compact?: boolean; signed?: boolean }) => {
  const absolute = Math.abs(value || 0);
  const sign = options?.signed ? (value > 0 ? '+' : value < 0 ? '-' : '') : '';

  if (options?.compact && absolute >= 1_000_000) {
    return `${sign}${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  return `${sign}${absolute.toLocaleString('vi-VN')}đ`;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const getLocalDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getProviderLabel = (provider: string, providerLabel?: string) => {
  return providerLabels[provider?.toLowerCase?.() || ''] || providerLabel || provider.toUpperCase();
};

const RevenueWorkspace: React.FC = () => {
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const revenueQuery = useQuery({
    queryKey: ['dashboard-revenue', revenuePeriodDays, page, revenuePageSize],
    queryFn: () => dashboardService.getRevenue(revenuePeriodDays, page, revenuePageSize),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const allTimeStats = revenueQuery.data?.allTimeStats ?? null;
  const recentStats = revenueQuery.data?.periodStats ?? null;
  const recentTransactions = revenueQuery.data?.transactions.transactions ?? [];
  const trends = revenueQuery.data?.trends ?? [];
  const loading = revenueQuery.isLoading && !revenueQuery.data;
  const error = revenueQuery.error instanceof Error
    ? revenueQuery.error.message
    : '';
  const currentPage = revenueQuery.data?.transactions.page ?? page;
  const totalPages = revenueQuery.data?.transactions.total_pages ?? 0;
  const totalCount = revenueQuery.data?.transactions.total_count ?? 0;

  const bankOptions = useMemo(() => {
    return Array.from(
      new Set(recentTransactions.map((transaction) => getProviderLabel(transaction.provider, transaction.provider_label))),
    ).sort((left, right) => left.localeCompare(right));
  }, [recentTransactions]);

  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter((transaction) => {
      const providerLabel = getProviderLabel(transaction.provider, transaction.provider_label);
      const query = filters.query.trim().toLowerCase();

      if (filters.bank && providerLabel !== filters.bank) {
        return false;
      }

      if (filters.direction && transaction.direction !== filters.direction) {
        return false;
      }

      if (filters.date && getLocalDateKey(transaction.posted_at) !== filters.date) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        providerLabel,
        transaction.account_name,
        transaction.description,
        transaction.external_id,
        transaction.transaction_id,
        transaction.transaction_type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [filters, recentTransactions]);

  const filteredSummary = useMemo(() => {
    return filteredTransactions.reduce(
      (summary, transaction) => {
        if (transaction.direction === 'income') {
          summary.income += transaction.amount;
        }
        if (transaction.direction === 'expense') {
          summary.expense += transaction.amount;
        }
        summary.count += 1;
        return summary;
      },
      { count: 0, expense: 0, income: 0 },
    );
  }, [filteredTransactions]);

  const bankSummaryRows = useMemo(() => {
    if (!recentStats) {
      return [];
    }

    const raw = Object.entries(recentStats.transactions_by_bank || {}).map(([bankCode, count]) => {
      const revenue = Number(recentStats.revenue_by_bank?.[bankCode] || 0);
      return {
        count: Number(count || 0),
        label: getProviderLabel(bankCode),
        revenue,
        scaleValue: revenue > 0 ? revenue : Number(count || 0),
      };
    });

    const maxScale = Math.max(...raw.map((item) => item.scaleValue), 1);

    return raw
      .sort((left, right) => right.scaleValue - left.scaleValue)
      .map((item) => ({
        ...item,
        width: `${Math.max((item.scaleValue / maxScale) * 100, 8)}%`,
      }));
  }, [recentStats]);

  const recentTrendRows = useMemo(() => {
    const visibleRows = trends.slice(-12);
    const maxAmount = Math.max(
      1,
      ...visibleRows.map((item) => Math.max(item.in_amount, item.out_amount)),
    );

    return visibleRows.map((item) => ({
      ...item,
      inHeight: item.in_amount > 0 ? Math.max((item.in_amount / maxAmount) * 100, 8) : 0,
      outHeight: item.out_amount > 0 ? Math.max((item.out_amount / maxAmount) * 100, 8) : 0,
    }));
  }, [trends]);

  const applyFilters = () => {
    setPage(1);
    setFilters(draftFilters);
  };

  const resetFilters = () => {
    setPage(1);
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState
          compact
          description="Đang tải thống kê, biểu đồ và lịch sử doanh thu gần nhất."
          title="Đang tải doanh thu"
        />
        <RevenueLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="dashboard-alert dashboard-alert--warning">{error}</div>;
  }

  if (!allTimeStats || !recentStats) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state__icon">∅</div>
        <h3 className="font-display text-2xl font-semibold dashboard-text-primary">Chưa có dữ liệu doanh thu</h3>
        <p className="dashboard-text-muted">Hãy liên kết tài khoản ngân hàng và đồng bộ lịch sử giao dịch trước.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="dashboard-metric dashboard-metric--success">
          <div className="dashboard-metric__icon">↗</div>
          <div>
            <p className="text-sm font-medium dashboard-text-secondary">Tổng tiền vào (IN)</p>
            <p className="mt-1 text-3xl font-bold dashboard-text-primary">{formatCurrency(allTimeStats.total_revenue)}</p>
            <p className="mt-1 text-sm dashboard-text-muted">{allTimeStats.total_income_transactions} giao dịch</p>
          </div>
        </div>
        <div className="dashboard-metric dashboard-metric--danger">
          <div className="dashboard-metric__icon">↘</div>
          <div>
            <p className="text-sm font-medium dashboard-text-secondary">Tổng tiền ra (OUT)</p>
            <p className="mt-1 text-3xl font-bold dashboard-text-primary">{formatCurrency(allTimeStats.total_expense)}</p>
            <p className="mt-1 text-sm dashboard-text-muted">{allTimeStats.total_expense_transactions} giao dịch</p>
          </div>
        </div>
        <div className="dashboard-metric dashboard-metric--info">
          <div className="dashboard-metric__icon">₫</div>
          <div>
            <p className="text-sm font-medium dashboard-text-secondary">Tổng giao dịch</p>
            <p className="mt-1 text-3xl font-bold dashboard-text-primary">{allTimeStats.total_transactions.toLocaleString('vi-VN')}</p>
            <p className="mt-1 text-sm dashboard-text-muted">Tất cả ngân hàng</p>
          </div>
        </div>
        <div className="dashboard-metric dashboard-metric--warning">
          <div className="dashboard-metric__icon">⏱</div>
          <div>
            <p className="text-sm font-medium dashboard-text-secondary">Hôm nay (IN)</p>
            <p className="mt-1 text-3xl font-bold dashboard-text-primary">{formatCurrency(allTimeStats.today_revenue)}</p>
            <p className="mt-1 text-sm dashboard-text-muted">{allTimeStats.today_income_transactions} giao dịch hôm nay</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title={(
            <>
              <span className="dashboard-icon-bubble">DT</span>
              <span className="font-semibold dashboard-text-primary">Doanh thu 30 ngày gần nhất</span>
            </>
          )}
        >
          {recentTrendRows.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">∅</div>
              <p className="dashboard-text-muted">Chưa có biến động giao dịch trong 30 ngày gần nhất.</p>
            </div>
          ) : (
            <div className="dashboard-chart">
              {recentTrendRows.map((item) => (
                <div className="dashboard-chart__group" key={item.date}>
                  <div className="dashboard-chart__bars">
                    <span className="dashboard-chart__bar dashboard-chart__bar--in" style={{ height: `${item.inHeight}%` }} />
                    <span className="dashboard-chart__bar dashboard-chart__bar--out" style={{ height: `${item.outHeight}%` }} />
                  </div>
                  <span className="dashboard-chart__label">{item.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={(
            <>
              <span className="dashboard-icon-bubble">NH</span>
              <span className="font-semibold dashboard-text-primary">Theo ngân hàng</span>
            </>
          )}
        >
          {bankSummaryRows.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">∅</div>
              <p className="dashboard-text-muted">Chưa có doanh thu ngân hàng trong 30 ngày gần nhất.</p>
            </div>
          ) : (
            bankSummaryRows.map((item, index) => (
              <div className="mb-5 last:mb-0" key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold dashboard-text-primary">{item.label} ({item.count})</span>
                  <span className={index === 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-sky-600'}>
                    {formatCurrency(item.revenue, { compact: true })}
                  </span>
                </div>
                <div className="dashboard-progress-track">
                  <span
                    className={`dashboard-progress-bar ${index % 2 === 1 ? 'dashboard-progress-bar--sky' : ''}`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))
          )}
        </Section>
      </div>

      <Section
        action={revenueQuery.isFetching ? <span className="text-sm dashboard-text-muted">Đang cập nhật...</span> : null}
        title={<span className="font-semibold dashboard-text-primary">Bộ lọc giao dịch</span>}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            className="dashboard-input"
            onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Tìm nội dung, mã giao dịch..."
            value={draftFilters.query}
          />
          <select
            className="dashboard-select"
            onChange={(event) => setDraftFilters((current) => ({ ...current, bank: event.target.value }))}
            value={draftFilters.bank}
          >
            <option value="">-- Tất cả cổng --</option>
            {bankOptions.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
          <select
            className="dashboard-select"
            onChange={(event) => setDraftFilters((current) => ({ ...current, direction: event.target.value }))}
            value={draftFilters.direction}
          >
            <option value="">-- Tất cả loại --</option>
            <option value="income">IN</option>
            <option value="expense">OUT</option>
          </select>
          <input
            className="dashboard-input"
            onChange={(event) => setDraftFilters((current) => ({ ...current, date: event.target.value }))}
            type="date"
            value={draftFilters.date}
          />
          <button className="dashboard-button w-full justify-center xl:w-auto" onClick={applyFilters} type="button">
            Lọc
          </button>
          <button className="dashboard-button dashboard-button--ghost w-full justify-center xl:w-auto" onClick={resetFilters} type="button">
            Reset
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm dashboard-text-secondary">
          <span>Kết quả trang hiện tại: {filteredSummary.count} giao dịch</span>
          <span className="text-emerald-600">Tiền vào: {formatCurrency(filteredSummary.income)}</span>
          <span className="text-rose-600">Tiền ra: {formatCurrency(filteredSummary.expense)}</span>
          <span className={filteredSummary.income - filteredSummary.expense >= 0 ? 'text-sky-600' : 'text-orange-600'}>
            Lợi nhuận: {formatCurrency(filteredSummary.income - filteredSummary.expense, { signed: true })}
          </span>
          <span>Tổng giao dịch server: {totalCount.toLocaleString('vi-VN')}</span>
        </div>

        <div className="mt-5 overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">∅</div>
              <p className="dashboard-text-muted">Không có giao dịch thật nào khớp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Ngân hàng</th>
                  <th>Mã giao dịch</th>
                  <th>Loại</th>
                  <th>Số tiền</th>
                  <th>Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const bankLabel = getProviderLabel(transaction.provider, transaction.provider_label);
                  const isIncome = transaction.direction === 'income';

                  return (
                    <tr key={`${transaction.id}-${transaction.transaction_id}`}>
                      <td>{formatDateTime(transaction.posted_at)}</td>
                      <td>
                        <span className="dashboard-badge dashboard-badge--neutral">{bankLabel}</span>
                      </td>
                      <td>{transaction.transaction_id}</td>
                      <td>
                        <span className={`dashboard-badge ${isIncome ? 'dashboard-badge--success' : 'dashboard-badge--danger'}`}>
                          {isIncome ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className={isIncome ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                        {formatCurrency(transaction.amount, { signed: true })}
                      </td>
                      <td>{transaction.description || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm dashboard-text-muted">
            Trang {currentPage} / {Math.max(totalPages, 1)} • {revenuePageSize} dòng mỗi trang
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="dashboard-button dashboard-button--ghost"
              disabled={currentPage <= 1 || revenueQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Trang trước
            </button>
            <button
              className="dashboard-button"
              disabled={currentPage >= Math.max(totalPages, 1) || revenueQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Trang sau
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default React.memo(RevenueWorkspace);
