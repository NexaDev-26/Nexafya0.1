import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Mail, Share2, FileText, Calendar, DollarSign, Filter } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface Sale {
  id: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  createdAt: any;
}

export const PharmacySales: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    if (user?.id) {
      loadSales();
    }
  }, [user?.id, dateFilter]);

  const loadSales = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Try query with orderBy first (requires index)
      let q;
      let snap;
      
      try {
        q = query(
          collection(firestore, 'sales'),
          where('pharmacyId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        snap = await getDocs(q);
      } catch (indexError: any) {
        // If index error, try without orderBy and sort in memory
        // Silently fall back - index warnings are expected during development
        q = query(
          collection(firestore, 'sales'),
          where('pharmacyId', '==', user.id),
          limit(100)
        );
        snap = await getDocs(q);
      }

      let salesData = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          createdAt: data.createdAt || data.created_at || new Date()
        };
      }) as Sale[];

      // Sort by date if orderBy wasn't used
      salesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let filterStart: Date;
        
        if (dateFilter === 'today') {
          filterStart = new Date(now);
          filterStart.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          filterStart = new Date(now);
          filterStart.setDate(now.getDate() - 7);
          filterStart.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'month') {
          filterStart = new Date(now);
          filterStart.setDate(now.getDate() - 30);
          filterStart.setHours(0, 0, 0, 0);
        } else {
          filterStart = new Date(0); // Show all
        }
        
        salesData = salesData.filter(sale => {
          const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt || 0);
          return saleDate >= filterStart;
        });
      }

      setSales(salesData);
    } catch (error: any) {
      console.error('Failed to load sales:', error);
      const errorMessage = error.code === 'failed-precondition' 
        ? 'Please create a Firestore index for sales queries'
        : error.message || 'Failed to load sales';
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = (saleId: string) => {
    return `INV-${saleId.slice(0, 8).toUpperCase()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalTransactions = sales.length;
  const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Total Sales</span>
          </div>
          <p className="text-3xl font-bold mb-1">TZS {totalSales.toLocaleString()}</p>
          <p className="text-blue-100 text-sm">All time</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <FileText size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Transactions</span>
          </div>
          <p className="text-3xl font-bold mb-1">{totalTransactions}</p>
          <p className="text-emerald-100 text-sm">Total sales</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Average</span>
          </div>
          <p className="text-3xl font-bold mb-1">TZS {Math.round(averageSale).toLocaleString()}</p>
          <p className="text-purple-100 text-sm">Per transaction</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
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
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0A1B2E]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No sales found.
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{generateInvoiceNumber(sale.id)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.customerName || 'Walk-in'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {sale.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold">
                        {sale.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        TZS {Number(sale.total || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowInvoiceModal(true);
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={handlePrint}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Invoice</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">#{generateInvoiceNumber(selectedSale.id)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {selectedSale.createdAt?.toDate ? selectedSale.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Bill To:</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedSale.customerName || 'Walk-in Customer'}</p>
              </div>

              {/* Items */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#0A1B2E]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedSale.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">TZS {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                          TZS {(item.price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-bold text-gray-900 dark:text-white">TZS {Number(selectedSale.subtotal || 0).toLocaleString()}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-TZS {Number(selectedSale.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax (18%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">TZS {Number(selectedSale.tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-lg text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                    TZS {Number(selectedSale.total || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedSale.paymentMethod || 'CASH'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

