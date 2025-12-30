
import React, { useState, useEffect } from 'react';
import { ADMIN_STATS_DATA, SUBSCRIPTION_PACKAGES } from '../constants';
import { Users, DollarSign, Activity, CheckCircle, TrendingUp, FileText, Server, AlertOctagon, ArrowDownRight, CreditCard, Layers, Shield, Settings, Check, X, Handshake, Plus, Trash2, Edit2, Save, MoreVertical, Search, Filter, Banknote, History, Box, ChevronRight, Bell, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { Partner, SubscriptionPackage, UserRole, Transaction } from '../types';
import { useDarkMode } from '../contexts/DarkModeContext';
import { UserManagement } from './UserManagement';
import { AdminSettings } from './AdminSettings';
import { AdminFinancial } from './AdminFinancial';
import { AdminLogs } from './AdminLogs';
import { AdminNotifications } from './AdminNotifications';
import { DataExport } from './DataExport';
import { TrustTierManagement } from './TrustTierManagement';
import { ArticleVerification } from './ArticleVerification';
import { AdminVerificationReview } from './AdminVerificationReview';

export const AdminAnalytics: React.FC = () => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'verifications' | 'partners' | 'users' | 'financial' | 'settings' | 'logs' | 'notifications' | 'export' | 'tiers' | 'articles'>('overview');
  const [verifSubTab, setVerifSubTab] = useState<'professional' | 'payments'>('professional');
  
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<(Transaction & { userName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<any>(null);

  // Package Form State
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgFormData, setPkgFormData] = useState<Partial<SubscriptionPackage>>({
      name: '',
      role: 'DOCTOR',
      price: '',
      currency: 'TZS',
      period: '/mo',
      description: '',
      features: [],
      allowedMethods: [],
      isPopular: false
  });

  const { isDarkMode: isDark } = useDarkMode();

  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true);
          try {
              if (activeTab === 'overview') {
                  // Use real analytics service
                  const { analyticsService } = await import('../services/analyticsService');
                  const stats = await analyticsService.getAdminStats();
                  setAdminStats(stats);
              }
              
              const [pkgData, prtData] = await Promise.all([
                  db.getPackages(),
                  db.getPartners()
              ]);
              setPackages(pkgData || []);
              setPartners(prtData || []);
              
              if (activeTab === 'verifications') {
                  const [verifData, payData] = await Promise.all([
                      db.getPendingVerifications(),
                      db.getPendingTransactions()
                  ]);
                  setPendingVerifications(verifData || []);
                  setPendingPayments(payData || []);
              }
          } catch (e) {
              console.error("Failed to load admin data", e);
          } finally {
              setIsLoading(false);
          }
      };
      loadData();
  }, [activeTab]);

  const handleApprovePayment = async (id: string) => {
      if(!confirm("Are you sure you want to release these funds? This action is irreversible.")) return;
      try {
          await db.verifyTransaction(id, 'COMPLETED');
          setPendingPayments(prev => prev.filter(p => p.id !== id));
          notify("Payment approved and funds released", "success");
      } catch {
          notify("Failed to process payment", "error");
      }
  };

  const handleRejectPayment = async (id: string) => {
      if(!confirm("Reject this payment? The transaction will be marked as failed.")) return;
      try {
          await db.verifyTransaction(id, 'FAILED');
          setPendingPayments(prev => prev.filter(p => p.id !== id));
          notify("Payment rejected", "info");
      } catch {
          notify("System error", "error");
      }
  };

  // Package Management Handlers
  const handleEditPkg = (pkg: SubscriptionPackage) => {
      setEditingPkgId(pkg.id);
      setPkgFormData(pkg);
      setIsEditingPackage(true);
  };

  const handleNewPkg = () => {
      setEditingPkgId(null);
      setPkgFormData({
          name: '',
          role: 'DOCTOR',
          price: '0',
          currency: 'TZS',
          period: '/mo',
          description: '',
          features: [],
          allowedMethods: ['M-Pesa', 'Bank'],
          isPopular: false
      });
      setIsEditingPackage(true);
  };

  const savePackage = async () => {
      if (!pkgFormData.name || !pkgFormData.price) {
          notify("Name and Price are required.", "error");
          return;
      }

      const updatedPackages = editingPkgId 
          ? packages.map(p => p.id === editingPkgId ? { ...p, ...pkgFormData } as SubscriptionPackage : p)
          : [...packages, { ...pkgFormData, id: `pkg-${Date.now()}` } as SubscriptionPackage];

      try {
          await db.updatePackages(updatedPackages);
          setPackages(updatedPackages);
          setIsEditingPackage(false);
          notify(editingPkgId ? "Package updated." : "Package created.", "success");
      } catch {
          notify("Failed to save package.", "error");
      }
  };

  const deletePackage = async (id: string) => {
      if (!confirm("Delete this subscription plan?")) return;
      const filtered = packages.filter(p => p.id !== id);
      try {
          await db.updatePackages(filtered);
          setPackages(filtered);
          notify("Package deleted.", "info");
      } catch {
          notify("Delete failed.", "error");
      }
  };

  const StatCard = ({ title, value, icon, trend }: any) => (
    <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:scale-[1.02]">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{title}</p>
          <h3 className="text-3xl font-bold font-serif text-gray-900 dark:text-white">{value}</h3>
          {trend && (
            <div className={`flex items-center mt-3 text-xs font-bold px-2 py-1 rounded-lg w-fit text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400`}>
              <TrendingUp size={14} className="mr-1" /> {trend}
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-gray-100 text-gray-600 dark:text-gray-600`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderOverview = () => {
    const stats = adminStats || {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      activeDoctors: 0,
      userGrowth: '0',
      revenueGrowth: '0',
    };
    
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users size={24} />} trend={`+${stats.userGrowth}% growth`} />
            <StatCard title="Total Revenue" value={`TZS ${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={24} />} trend={`+${stats.revenueGrowth}% growth`} />
            <StatCard title="Active Doctors" value={stats.activeDoctors.toString()} icon={<Activity size={24} />} trend={`${stats.usersByRole?.DOCTOR || 0} total`} />
            <StatCard title="Active Users" value={stats.activeUsers.toLocaleString()} icon={<CheckCircle size={24} />} trend={`${stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}% of total`} />
          </div>
          
          {/* Role Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {stats.usersByRole && Object.entries(stats.usersByRole).map(([role, count]: [string, any]) => (
              <div key={role} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{role}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            ))}
          </div>
          
          {/* Revenue Breakdown */}
          {stats.revenueByType && (
            <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Revenue Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Consultations</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">TZS {stats.revenueByType.consultations.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Pharmacy</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">TZS {stats.revenueByType.pharmacy.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Subscriptions</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">TZS {stats.revenueByType.subscriptions.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderPackages = () => (
      <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm">
              <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-serif">Subscription Plans</h3>
                  <p className="text-sm text-gray-500">Configure tiers for medical professionals and pharmacies.</p>
              </div>
              {!isEditingPackage && (
                  <button 
                      onClick={handleNewPkg}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-105"
                  >
                      <Plus size={18} /> Create New Plan
                  </button>
              )}
          </div>

          {isEditingPackage ? (
              <div className="bg-white dark:bg-[#0F172A] p-8 rounded-[2.5rem] border border-blue-100 dark:border-gray-700/50 shadow-xl animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-8">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {editingPkgId ? <Edit2 size={20}/> : <Plus size={20}/>}
                          {editingPkgId ? 'Edit Package' : 'New Subscription Plan'}
                      </h4>
                      <button onClick={() => setIsEditingPackage(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Package Name</label>
                              <input 
                                  type="text" 
                                  value={pkgFormData.name}
                                  onChange={e => setPkgFormData({...pkgFormData, name: e.target.value})}
                                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="e.g. Premium Clinic"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Role</label>
                              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-100 rounded-xl">
                                  <button 
                                      onClick={() => setPkgFormData({...pkgFormData, role: 'DOCTOR'})}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pkgFormData.role === 'DOCTOR' ? 'bg-white dark:bg-[#0A0F1C] shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                                  >
                                      Doctors
                                  </button>
                                  <button 
                                      onClick={() => setPkgFormData({...pkgFormData, role: 'PHARMACY'})}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pkgFormData.role === 'PHARMACY' ? 'bg-white dark:bg-[#0A0F1C] shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                                  >
                                      Pharmacies
                                  </button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Price</label>
                                  <input 
                                      type="text" 
                                      value={pkgFormData.price}
                                      onChange={e => setPkgFormData({...pkgFormData, price: e.target.value})}
                                      className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Period</label>
                                  <input 
                                      type="text" 
                                      value={pkgFormData.period}
                                      onChange={e => setPkgFormData({...pkgFormData, period: e.target.value})}
                                      className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                              <textarea 
                                  value={pkgFormData.description}
                                  onChange={e => setPkgFormData({...pkgFormData, description: e.target.value})}
                                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                  placeholder="Small summary for the plan..."
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Features</label>
                              <div className="space-y-2">
                                  {(pkgFormData.features || []).map((feature, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                          <input
                                              type="text"
                                              value={feature}
                                              onChange={e => {
                                                  const newFeatures = [...(pkgFormData.features || [])];
                                                  newFeatures[index] = e.target.value;
                                                  setPkgFormData({...pkgFormData, features: newFeatures});
                                              }}
                                              className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                              placeholder="e.g., Unlimited consultations"
                                          />
                                          <button
                                              onClick={() => {
                                                  const newFeatures = (pkgFormData.features || []).filter((_, i) => i !== index);
                                                  setPkgFormData({...pkgFormData, features: newFeatures});
                                              }}
                                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                          >
                                              <X size={16} />
                                          </button>
                                      </div>
                                  ))}
                                  <button
                                      onClick={() => setPkgFormData({...pkgFormData, features: [...(pkgFormData.features || []), '']})}
                                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-bold"
                                  >
                                      <Plus size={16} className="inline mr-2" /> Add Feature
                                  </button>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Payment Methods</label>
                              <div className="space-y-2">
                                  {(pkgFormData.allowedMethods || []).map((method, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                          <input
                                              type="text"
                                              value={method}
                                              onChange={e => {
                                                  const newMethods = [...(pkgFormData.allowedMethods || [])];
                                                  newMethods[index] = e.target.value;
                                                  setPkgFormData({...pkgFormData, allowedMethods: newMethods});
                                              }}
                                              className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                              placeholder="e.g., M-Pesa, Bank Transfer"
                                          />
                                          <button
                                              onClick={() => {
                                                  const newMethods = (pkgFormData.allowedMethods || []).filter((_, i) => i !== index);
                                                  setPkgFormData({...pkgFormData, allowedMethods: newMethods});
                                              }}
                                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                          >
                                              <X size={16} />
                                          </button>
                                      </div>
                                  ))}
                                  <button
                                      onClick={() => setPkgFormData({...pkgFormData, allowedMethods: [...(pkgFormData.allowedMethods || []), '']})}
                                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-bold"
                                  >
                                      <Plus size={16} className="inline mr-2" /> Add Payment Method
                                  </button>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                              <input 
                                  type="checkbox" 
                                  checked={pkgFormData.isPopular}
                                  onChange={e => setPkgFormData({...pkgFormData, isPopular: e.target.checked})}
                                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Mark as "Popular" (Recommended)</span>
                          </div>
                      </div>
                  </div>

                  <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => setIsEditingPackage(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
                      <button onClick={savePackage} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2">
                         <Save size={18} /> Save Plan
                      </button>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map(pkg => (
                      <div key={pkg.id} className="bg-white dark:bg-[#0F172A] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/50 shadow-sm group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pkg.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {pkg.role}
                              </span>
                              <div className="flex gap-1">
                                  <button onClick={() => handleEditPkg(pkg)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                                  <button onClick={() => deletePackage(pkg.id)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                              </div>
                          </div>
                          
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{pkg.name}</h4>
                          <p className="text-sm text-gray-500 mb-6 line-clamp-2">{pkg.description}</p>
                          
                          <div className="mb-6 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-gray-900 dark:text-white">{pkg.currency || 'TZS'} {typeof pkg.price === 'number' ? pkg.price.toLocaleString() : (pkg.price || '0')}</span>
                              <span className="text-xs text-gray-400 font-bold">{pkg.period || '/mo'}</span>
                          </div>

                          <div className="space-y-3 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                                  <span>Allowed Payments</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                  {(pkg.allowedMethods || []).map(m => (
                                      <span key={m} className="px-2 py-1 bg-gray-50 dark:bg-gray-100 rounded-lg text-[10px] text-gray-500 dark:text-gray-600 font-medium">{m}</span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  ))}
                  <button 
                    onClick={handleNewPkg}
                    className="border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all group min-h-[300px]"
                  >
                      <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-[#0A0F1C] flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-[#0F172A] transition-colors">
                          <Plus size={32} />
                      </div>
                      <span className="font-bold">Add Custom Plan</span>
                  </button>
              </div>
          )}
      </div>
  );

  const renderVerifications = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white dark:bg-[#0F172A] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold font-serif text-gray-900 dark:text-white">Admin Audit Hub</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Verify user credentials and release pending payments.</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl inline-flex shadow-inner">
                    <button 
                        onClick={() => setVerifSubTab('professional')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${verifSubTab === 'professional' ? 'bg-white dark:bg-[#0A0F1C] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <Shield size={16} /> Professional
                    </button>
                    <button 
                        onClick={() => setVerifSubTab('payments')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${verifSubTab === 'payments' ? 'bg-white dark:bg-[#0A0F1C] shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <Banknote size={16} /> Payments
                    </button>
                </div>
            </div>

            {verifSubTab === 'professional' ? (
                <div className="grid gap-4">
                    {pendingVerifications.map((req) => (
                        <div key={req.id} className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">{req.name.charAt(0)}</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{req.name}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full uppercase">{req.role}</span>
                                    <span className="text-xs text-gray-400">Requested: {req.date}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">View Docs</button>
                                <div className="flex gap-2">
                                    <button className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"><X size={20} /></button>
                                    <button className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md">Approve</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingPayments.map((pay) => (
                        <div key={pay.id} className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                {pay.type === 'WITHDRAWAL' ? <ArrowDownRight size={24}/> : <DollarSign size={24}/>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{pay.userName}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{pay.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><History size={12}/> {new Date(pay.created_at || '').toLocaleDateString()}</span>
                                    <span className="font-mono text-gray-500">{pay.reference_id}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col md:flex-row items-center gap-6">
                                <div>
                                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{pay.currency} {pay.amount.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{pay.type}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRejectPayment(pay.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><X size={20} /></button>
                                    <button onClick={() => handleApprovePayment(pay.id)} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm shadow-md shadow-emerald-600/20"><Check size={18} /> Release Funds</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold font-serif text-gray-900 dark:text-white leading-none">Admin Control</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">System-wide health and financial analytics.</p>
        </div>
        <div className="bg-white dark:bg-[#0F172A] p-1.5 rounded-2xl inline-flex flex-wrap gap-1 shadow-sm border border-gray-100 dark:border-gray-700/50 max-w-full overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Activity size={14} /> Overview</button>
            <button onClick={() => setActiveTab('tiers')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'tiers' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Shield size={14} /> Trust Tiers</button>
            <button onClick={() => setActiveTab('articles')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'articles' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><FileText size={14} /> Articles</button>
            <button onClick={() => setActiveTab('packages')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'packages' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Box size={14} /> Packages</button>
            <button onClick={() => setActiveTab('verifications')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'verifications' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><CheckCircle size={14} /> Audit {(pendingVerifications.length > 0 || pendingPayments.length > 0) && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</button>
            <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Users size={14} /> Users</button>
            <button onClick={() => setActiveTab('financial')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'financial' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><DollarSign size={14} /> Financial</button>
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Settings size={14} /> Settings</button>
            <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><History size={14} /> Logs</button>
            <button onClick={() => setActiveTab('notifications')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'notifications' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Bell size={14} /> Notifications</button>
            <button onClick={() => setActiveTab('export')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'export' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Download size={14} /> Export</button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tiers' && <TrustTierManagement />}
        {activeTab === 'articles' && <ArticleVerification />}
        {activeTab === 'packages' && renderPackages()}
        {activeTab === 'verifications' && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setVerifSubTab('professional')}
                className={`px-4 py-2 font-bold text-sm rounded-t-xl transition-colors ${
                  verifSubTab === 'professional'
                    ? 'bg-white dark:bg-[#0F172A] text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Professional Verification
              </button>
              <button
                onClick={() => setVerifSubTab('payments')}
                className={`px-4 py-2 font-bold text-sm rounded-t-xl transition-colors ${
                  verifSubTab === 'payments'
                    ? 'bg-white dark:bg-[#0F172A] text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Payment Verification
              </button>
            </div>
            {verifSubTab === 'professional' ? (
              <AdminVerificationReview />
            ) : (
              renderVerifications()
            )}
          </div>
        )}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'financial' && <AdminFinancial />}
        {activeTab === 'settings' && <AdminSettings />}
        {activeTab === 'logs' && <AdminLogs />}
        {activeTab === 'notifications' && <AdminNotifications />}
        {activeTab === 'export' && <DataExport />}
      </div>
    </div>
  );
};
