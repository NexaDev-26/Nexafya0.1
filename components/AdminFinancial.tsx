import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, TrendingUp, TrendingDown, Calendar, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

export const AdminFinancial: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadFinancialData();
    }
  }, [user, dateFilter]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      let transactionsQuery = query(
        collection(firestore, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(transactionsQuery);
      let allTransactions = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || d.data().created_at),
      }));

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        allTransactions = allTransactions.filter(t => t.createdAt >= todayStart);
      } else if (dateFilter === 'week') {
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        allTransactions = allTransactions.filter(t => t.createdAt >= weekStart);
      } else if (dateFilter === 'month') {
        const monthStart = new Date(now.setDate(now.getDate() - 30));
        allTransactions = allTransactions.filter(t => t.createdAt >= monthStart);
      }

      setTransactions(allTransactions);

      // Calculate summary
      const verified = allTransactions.filter((t: any) => t.status === 'VERIFIED' || t.status === 'COMPLETED');
      const totalRevenue = verified.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      
      const pending = allTransactions.filter((t: any) => t.status === 'PENDING');
      const pendingPayouts = pending.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      setFinancialSummary({
        totalRevenue,
        totalExpenses: 0, // Would need expenses collection
        netProfit: totalRevenue,
        pendingPayouts,
        completedPayouts: totalRevenue - pendingPayouts,
      });
    } catch (error) {
      console.error('Failed to load financial data:', error);
      notify('Failed to load financial data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Reference'].join(','),
      ...transactions.map(t => [
        t.createdAt.toLocaleDateString(),
        t.type || t.itemType || 'N/A',
        t.amount,
        t.currency || 'TZS',
        t.status,
        t.referenceNumber || t.id,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify('Financial report exported', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={24} className="opacity-80" />
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold">TZS {financialSummary.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <CreditCard size={24} className="opacity-80" />
            <ArrowUpRight size={20} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Completed Payouts</p>
          <p className="text-3xl font-bold">TZS {financialSummary.completedPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Calendar size={24} className="opacity-80" />
            <ArrowDownRight size={20} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Pending Payouts</p>
          <p className="text-3xl font-bold">TZS {financialSummary.pendingPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={24} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Net Profit</p>
          <p className="text-3xl font-bold">TZS {financialSummary.netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'month', label: 'This Month' },
            { id: 'week', label: 'This Week' },
            { id: 'today', label: 'Today' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setDateFilter(filter.id as any)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                dateFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#0F172A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0A1B2E]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {transaction.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold">
                        {transaction.type || transaction.itemType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {transaction.currency || 'TZS'} {Number(transaction.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        transaction.status === 'VERIFIED' || transaction.status === 'COMPLETED'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : transaction.status === 'PENDING'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {transaction.referenceNumber || transaction.id.slice(0, 8)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

