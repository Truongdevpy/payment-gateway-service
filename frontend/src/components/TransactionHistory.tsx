import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getMBBankBalance,
  getMBBankStatistics,
  getMBBankTransactionHistory,
  MBBankStatistics,
  Transaction,
} from '../services/historyService';
import LoadingState from './LoadingState';

interface TransactionHistoryProps {
  accountId: number;
  accountName: string;
  token: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  accountId,
  accountName,
  token,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<MBBankStatistics | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'statistics'>('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    void loadData();
  }, [accountId, token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [balanceData, transactionData, statsData] = await Promise.all([
        getMBBankBalance(accountId, token),
        getMBBankTransactionHistory(accountId, token, startDate || undefined, endDate || undefined),
        getMBBankStatistics(accountId, token, startDate || undefined, endDate || undefined),
      ]);

      setBalance(balanceData.availableBalance);
      setTransactions(transactionData.transactions);
      setStatistics(statsData.statistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !transactions.length && !statistics) {
    return (
      <div className="space-y-6">
        <LoadingState
          compact
          description="Đang tải số dư, giao dịch và thống kê của tài khoản được chọn."
          title="Đang tải lịch sử giao dịch"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="dashboard-skeleton h-28 w-full rounded-2xl" key={`txn-metric-${index}`} />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="dashboard-skeleton h-16 w-full rounded-xl" key={`txn-row-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Lỗi tải dữ liệu</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <h2 className="mb-2 text-2xl font-bold">{accountName}</h2>
        <div className="text-sm text-blue-100">
          {balance !== null ? (
            <p>
              Số dư khả dụng: <span className="text-xl font-semibold text-white">{formatCurrency(balance)}</span>
            </p>
          ) : (
            <p>Thông tin số dư sẽ hiển thị sau khi hoàn tất đồng bộ.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Bộ lọc giao dịch</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              onClick={() => void loadData()}
              disabled={loading}
              type="button"
            >
              {loading ? 'Đang tải...' : 'Lọc dữ liệu'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 px-1 py-4 font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              <Activity className="mr-2 inline h-4 w-4" />
              Lịch sử giao dịch ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`border-b-2 px-1 py-4 font-medium transition-colors ${
                activeTab === 'statistics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              <DollarSign className="mr-2 inline h-4 w-4" />
              Thống kê
            </button>
          </div>
        </div>

        {loading && transactions.length > 0 ? (
          <div className="px-6 pt-4">
            <LoadingState
              compact
              description="Giữ nguyên dữ liệu hiện tại trong lúc hệ thống đồng bộ bản mới."
              title="Đang làm mới dữ liệu"
            />
          </div>
        ) : null}

        {activeTab === 'transactions' ? (
          <div className="space-y-2 p-6">
            {transactions.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">Không có giao dịch nào trong khoảng thời gian này.</p>
              </div>
            ) : (
              transactions.map((transaction, index) => (
                <div
                  key={transaction.transactionId || index}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div className={`rounded-full p-2 ${transaction.transactionType === '+' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {transaction.transactionType === '+' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description || 'Giao dịch chuyển tiền'}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(transaction.transactionDate)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${transaction.transactionType === '+' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transactionType === '+' ? '+' : '-'}
                        {formatCurrency(transaction.transactionAmount)}
                      </p>
                      <p className="text-sm text-gray-500">SD: {formatCurrency(transaction.availableBalance || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                      <div>
                        <span className="font-medium">STK:</span> {transaction.accountNumber}
                      </div>
                      {transaction.beneficiaryAccount ? (
                        <div>
                          <span className="font-medium">STK thụ hưởng:</span> {transaction.beneficiaryAccount}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          statistics && (
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="mb-1 text-sm text-gray-600">Tổng giao dịch</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalTransactions}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-white p-4">
                  <p className="mb-1 text-sm text-gray-600">Tổng tiền vào</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalIncome)}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-white p-4">
                  <p className="mb-1 text-sm text-gray-600">Tổng tiền ra</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totalExpense)}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white p-4">
                  <p className="mb-1 text-sm text-gray-600">Biến động ròng</p>
                  <p className={`text-2xl font-bold ${statistics.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(statistics.netChange)}
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
