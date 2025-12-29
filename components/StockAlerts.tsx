import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  TrendingDown,
  Search,
  Filter,
  CheckCircle,
  X
} from 'lucide-react';
import { Medicine } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface StockAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  currentStock: number;
  reorderLevel: number;
  status: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  lastAlerted?: string;
}

export const StockAlerts: React.FC = () => {
  const { notify } = useNotification();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    loadAlerts();
    // Check for alerts every 5 minutes
    const interval = setInterval(loadAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const medicines = await db.getMedicines();
      
      const stockAlerts: StockAlert[] = medicines
        .filter(med => {
          const stock = med.stock || 0;
          const reorderLevel = med.reorderLevel || 10;
          return stock <= reorderLevel;
        })
        .map(med => {
          const stock = med.stock || 0;
          const reorderLevel = med.reorderLevel || 10;
          
          let status: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' = 'LOW';
          if (stock === 0) {
            status = 'OUT_OF_STOCK';
          } else if (stock <= reorderLevel * 0.3) {
            status = 'CRITICAL';
          }

          return {
            id: med.id,
            medicineId: med.id,
            medicineName: med.name,
            currentStock: stock,
            reorderLevel,
            status,
            lastAlerted: new Date().toISOString(),
          };
        });

      setAlerts(stockAlerts);
      
      // Send notifications for critical alerts
      const criticalAlerts = stockAlerts.filter(a => a.status === 'CRITICAL' || a.status === 'OUT_OF_STOCK');
      if (criticalAlerts.length > 0 && notificationSettings.push) {
        notify(`${criticalAlerts.length} critical stock alert(s)`, 'warning', {
          action: {
            label: 'View Alerts',
            onClick: () => {},
          },
        });
      }
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    notify('Alert dismissed', 'info');
  };

  const handleDismissAll = () => {
    setAlerts([]);
    notify('All alerts dismissed', 'info');
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.medicineName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || alert.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'CRITICAL':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const criticalCount = alerts.filter(a => a.status === 'CRITICAL' || a.status === 'OUT_OF_STOCK').length;
  const lowCount = alerts.filter(a => a.status === 'LOW').length;

  if (loading) {
    return <SkeletonLoader type="list" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Alerts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor low stock and reorder levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAlerts}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
          {alerts.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase">Critical</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{criticalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <TrendingDown className="text-yellow-600 dark:text-yellow-400" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{lowCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">Total Alerts</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{alerts.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        >
          <option value="ALL">All Status</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="CRITICAL">Critical</option>
          <option value="LOW">Low Stock</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No stock alerts"
            description={searchQuery || filterStatus !== 'ALL'
              ? "Try adjusting your search or filters"
              : "All items are well stocked. Great job!"}
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors ${
                  alert.status === 'OUT_OF_STOCK' || alert.status === 'CRITICAL'
                    ? 'bg-red-50/50 dark:bg-red-900/10'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${
                      alert.status === 'OUT_OF_STOCK'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : alert.status === 'CRITICAL'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      <Package className={
                        alert.status === 'OUT_OF_STOCK'
                          ? 'text-red-600 dark:text-red-400'
                          : alert.status === 'CRITICAL'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      } size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {alert.medicineName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Current: <strong className="text-gray-900 dark:text-white">{alert.currentStock}</strong> units</span>
                        <span>Reorder Level: <strong className="text-gray-900 dark:text-white">{alert.reorderLevel}</strong> units</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Navigate to purchase management
                        notify('Opening purchase management...', 'info');
                      }}
                      className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Reorder
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell size={20} />
          Notification Settings
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Email Notifications</span>
            <input
              type="checkbox"
              checked={notificationSettings.email}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, email: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Push Notifications</span>
            <input
              type="checkbox"
              checked={notificationSettings.push}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, push: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">SMS Notifications</span>
            <input
              type="checkbox"
              checked={notificationSettings.sms}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, sms: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

