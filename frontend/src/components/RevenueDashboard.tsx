import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Activity,
} from 'lucide-react';
import balanceService from '../services/balanceService';

interface RevenueDashboardProps {}

interface RevenueStats {
  total_revenue: number;
  total_transactions: number;
  today_revenue: number;
  today_transactions: number;
  weekly_revenue: number;
  monthly_revenue: number;
  average_transaction_value: number;
  revenue_by_bank: Record<string, number>;
  transactions_by_bank: Record<string, number>;
  daily_revenue: Array<{ date: string; amount: number; count: number }>;
}

interface RevenueTrend {
  date: string;
  in_amount: number;
  out_amount: number;
  net_amount: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const RevenueDashboard: React.FC<RevenueDashboardProps> = () => {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDays]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, trendsData] = await Promise.all([
        balanceService.getRevenueStats(selectedDays),
        balanceService.getRevenueTrends(selectedDays > 0 ? selectedDays : 7),
      ]);

      setStats(statsData);
      setTrends(trendsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Lỗi: {error}
      </div>
    );
  }

  if (!stats) {
    return <div>Không có dữ liệu</div>;
  }

  const bankNames: Record<string, string> = {
    MBBANK: 'MB Bank',
    VCB: 'Vietcombank',
    VPB: 'VPBank',
    ACB: 'ACB',
  };

  const bankChartData = Object.entries(stats.revenue_by_bank).map(([code, revenue]) => ({
    name: bankNames[code] || code,
    value: revenue,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Doanh Thu Toàn Thời Gian</h1>
            <p className="text-gray-600 mt-1">Thống kê doanh thu và giao dịch</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDays(0)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDays === 0
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedDays(7)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDays === 7
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setSelectedDays(30)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDays === 30
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 ngày
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Tổng Doanh Thu</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.total_revenue)}
                </p>
                <p className="text-gray-500 text-xs mt-1">{stats.total_transactions} giao dịch</p>
              </div>
              <DollarSign className="text-green-600" size={32} />
            </div>
          </div>

          {/* Today Revenue */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Doanh Thu Hôm Nay</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.today_revenue)}
                </p>
                <p className="text-gray-500 text-xs mt-1">{stats.today_transactions} giao dịch</p>
              </div>
              <Activity className="text-blue-600" size={32} />
            </div>
          </div>

          {/* Weekly Revenue */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Doanh Thu 7 Ngày</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.weekly_revenue)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {stats.weekly_revenue > 0 ? '+' : ''}{formatCurrency(stats.weekly_revenue)}
                </p>
              </div>
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </div>

          {/* Avg Transaction */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Giao Dịch Trung Bình</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.average_transaction_value)}
                </p>
                <p className="text-gray-500 text-xs mt-1">Giá trị trung bình</p>
              </div>
              <ShoppingCart className="text-orange-600" size={32} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Doanh Thu Hàng Ngày</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
                <Bar dataKey="amount" fill="#10b981" name="Doanh Thu" />
                <Bar dataKey="count" fill="#3b82f6" name="Số Giao Dịch" yAxisId="right" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Bank Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Doanh Thu Theo Ngân Hàng</h2>
            {bankChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bankChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bankChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">Không có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Xu Hướng Nạp/Rút Tiền</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="in_amount" stroke="#10b981" name="Tiền Nạp" />
              <Line type="monotone" dataKey="out_amount" stroke="#ef4444" name="Tiền Rút" />
              <Line type="monotone" dataKey="net_amount" stroke="#3b82f6" name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bank Details Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Chi Tiết Theo Ngân Hàng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ngân Hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Doanh Thu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Số Giao Dịch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Giao Dịch Trung Bình
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.revenue_by_bank).map(([code, revenue]) => (
                  <tr key={code} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {bankNames[code] || code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {formatCurrency(revenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatNumber(stats.transactions_by_bank[code] || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatCurrency(
                        (stats.transactions_by_bank[code] || 0) > 0
                          ? revenue / stats.transactions_by_bank[code]
                          : 0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
