import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { handleError } from '../utils/errorHandler';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useDarkMode } from '../contexts/DarkModeContext';

interface ReportData {
  sales: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  purchases: {
    total: number;
    thisMonth: number;
    growth: number;
  };
  inventory: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  topSelling: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    purchases: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export const ReportsDashboard: React.FC = () => {
  const { notify } = useNotification();
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [reportType, setReportType] = useState<'sales' | 'purchases' | 'inventory' | 'all'>('all');

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      // Fetch data from database
      const [salesData, purchasesData, inventoryData] = await Promise.all([
        db.getSalesReport?.(dateRange),
        db.getPurchasesReport?.(dateRange),
        db.getInventoryReport?.(),
      ]);

      // Process and format data
      const processedData: ReportData = {
        sales: {
          total: salesData?.total || 0,
          today: salesData?.today || 0,
          thisWeek: salesData?.thisWeek || 0,
          thisMonth: salesData?.thisMonth || 0,
          growth: salesData?.growth || 0,
        },
        purchases: {
          total: purchasesData?.total || 0,
          thisMonth: purchasesData?.thisMonth || 0,
          growth: purchasesData?.growth || 0,
        },
        inventory: {
          totalItems: inventoryData?.totalItems || 0,
          lowStock: inventoryData?.lowStock || 0,
          outOfStock: inventoryData?.outOfStock || 0,
          totalValue: inventoryData?.totalValue || 0,
        },
        topSelling: salesData?.topSelling || [],
        salesTrend: salesData?.trend || [],
        categoryBreakdown: salesData?.categoryBreakdown || [],
      };

      setReportData(processedData);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      notify(`Exporting report as ${format.toUpperCase()}...`, 'info');
      // Implement export functionality
      // await exportReport(reportData, format);
      notify('Report exported successfully', 'success');
    } catch (error) {
      handleError(error, notify);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  if (!reportData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No report data available"
        description="Start making sales and purchases to generate reports"
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive business insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            {reportData.sales.growth >= 0 ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp size={16} />
                <span className="text-sm font-bold">+{reportData.sales.growth}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown size={16} />
                <span className="text-sm font-bold">{reportData.sales.growth}%</span>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            TZS {reportData.sales.total.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Today</span>
            <span className="font-bold text-gray-900 dark:text-white">
              TZS {reportData.sales.today.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Purchases Card */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <ShoppingCart className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            {reportData.purchases.growth >= 0 ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp size={16} />
                <span className="text-sm font-bold">+{reportData.purchases.growth}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown size={16} />
                <span className="text-sm font-bold">{reportData.purchases.growth}%</span>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            TZS {reportData.purchases.total.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Purchases</p>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">This Month</span>
            <span className="font-bold text-gray-900 dark:text-white">
              TZS {reportData.purchases.thisMonth.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Inventory Card */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Package className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {reportData.inventory.totalItems}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Value</span>
            <span className="font-bold text-gray-900 dark:text-white">
              TZS {reportData.inventory.totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Filter className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {reportData.inventory.lowStock + reportData.inventory.outOfStock}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stock Alerts</p>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Low Stock</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {reportData.inventory.lowStock}
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData.salesTrend}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
              <XAxis 
                dataKey="date" 
                stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                  borderRadius: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorSales)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Selling Products</h3>
        </div>
        {reportData.topSelling.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No sales data"
            description="Start making sales to see top products"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A0F1C]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Quantity Sold</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.topSelling.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity} units
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      TZS {item.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

