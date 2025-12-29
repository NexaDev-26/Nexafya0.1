import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, TrendingUp, TrendingDown, Store, Package, AlertTriangle, Users, ShoppingBag, FileText, CheckCircle, Clock, Calendar, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './NotificationSystem';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface PharmacyDashboardProps {
  onNavigate?: (view: string) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [dashboardData, setDashboardData] = useState({
    packageActiveDays: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalProfits: 0,
    totalBranches: 0,
    totalItems: 0,
    lowStockItems: 0,
    totalCashSales: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    outstandingInvoices: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && user.role === 'PHARMACY') {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Load branches count
      const branchesQuery = query(collection(firestore, 'pharmacyBranches'), where('owner_id', '==', user.id));
      const branchesSnap = await getDocs(branchesQuery);
      const totalBranches = branchesSnap.size;

      // Load inventory items
      const inventoryQuery = query(collection(firestore, 'inventory'), where('pharmacy_id', '==', user.id));
      const inventorySnap = await getDocs(inventoryQuery);
      const items = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalItems = items.length;
      const lowStockItems = items.filter((item: any) => (item.stock || 0) < (item.min_stock || 10)).length;

      // Load sales for financial data
      const salesQuery = query(collection(firestore, 'sales'), where('pharmacyId', '==', user.id));
      const salesSnap = await getDocs(salesQuery);
      const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Calculate financial metrics
      const totalInvoices = sales.length;
      const paidInvoices = sales.length; // All sales are paid (POS sales)
      const outstandingInvoices = 0;
      const totalCashSales = sales.reduce((sum: number, sale: any) => sum + (Number(sale.total || 0)), 0);

      // Load transactions for income
      const txQuery = query(
        collection(firestore, 'transactions'),
        where('recipientId', '==', user.id),
        where('status', '==', 'VERIFIED')
      );
      const txSnap = await getDocs(txQuery);
      const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const totalIncome = transactions.reduce((sum: number, tx: any) => sum + (Number(tx.amount || 0)), 0) + totalCashSales;
      
      // Load purchase records for expenses
      const purchasesQuery = query(collection(firestore, 'purchaseRecords'), where('pharmacyId', '==', user.id));
      const purchasesSnap = await getDocs(purchasesQuery);
      const purchases = purchasesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalExpenses = purchases.reduce((sum: number, purchase: any) => sum + (Number(purchase.total || 0)), 0);
      
      const totalProfits = totalIncome - totalExpenses;

      // Load customers (from sales - simplified)
      const customerIds = new Set(sales.map((s: any) => s.customerId).filter(Boolean));
      const totalCustomers = customerIds.size;
      const activeCustomers = customerIds.size;
      const inactiveCustomers = 0;

      // Subscription/package days (would come from subscription collection)
      const packageActiveDays = 30; // Placeholder

      setDashboardData({
        packageActiveDays,
        totalIncome,
        totalExpenses,
        totalProfits,
        totalBranches,
        totalItems,
        lowStockItems,
        totalCashSales,
        totalInvoices,
        paidInvoices,
        outstandingInvoices,
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      notify('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-600/20">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Total Income</span>
          </div>
          <p className="text-3xl font-bold mb-1">TZS {dashboardData.totalIncome.toLocaleString()}</p>
          <p className="text-blue-100 text-sm">All time earnings</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-600/20">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Total Profits</span>
          </div>
          <p className="text-3xl font-bold mb-1">TZS {dashboardData.totalProfits.toLocaleString()}</p>
          <p className="text-emerald-100 text-sm">Income - Expenses</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-3xl shadow-lg shadow-purple-600/20">
          <div className="flex items-center justify-between mb-4">
            <ShoppingBag size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Cash Sales</span>
          </div>
          <p className="text-3xl font-bold mb-1">TZS {dashboardData.totalCashSales.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">Paid orders total</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-lg shadow-amber-600/20">
          <div className="flex items-center justify-between mb-4">
            <Calendar size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Package Days</span>
          </div>
          <p className="text-3xl font-bold mb-1">{dashboardData.packageActiveDays}</p>
          <p className="text-amber-100 text-sm">Active subscription days</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <TrendingDown size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">TZS {dashboardData.totalExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Store size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Branches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.totalBranches}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Package size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Low Stocks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.lowStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices & Customers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Summary */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" /> Invoices Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#0A1B2E]/50 rounded-2xl">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Invoices</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{dashboardData.totalInvoices}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Paid Invoices</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{dashboardData.paidInvoices}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
              <span className="text-sm font-bold text-red-700 dark:text-red-400">Outstanding Invoices</span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400">{dashboardData.outstandingInvoices}</span>
            </div>
          </div>
          {onNavigate && (
            <button 
              onClick={() => onNavigate('sales')}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              View All Sales
            </button>
          )}
        </div>

        {/* Customers Summary */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users size={20} className="text-purple-600" /> Customers Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#0A1B2E]/50 rounded-2xl">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Customers</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{dashboardData.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Active Customers</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{dashboardData.activeCustomers}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Inactive Customers</span>
              <span className="text-xl font-bold text-gray-700 dark:text-gray-300">{dashboardData.inactiveCustomers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

