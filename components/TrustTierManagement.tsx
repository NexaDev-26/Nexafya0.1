import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Save, X, Crown, Star, Award, Users, Calendar, DollarSign, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { TrustTierConfig, UserTierAssignment, Doctor } from '../types';
import { db } from '../services/db';
import { useDarkMode } from '../contexts/DarkModeContext';

interface TrustTierManagementProps {
  onClose?: () => void;
}

export const TrustTierManagement: React.FC<TrustTierManagementProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'configs' | 'assignments'>('configs');
  const [tierConfigs, setTierConfigs] = useState<TrustTierConfig[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<UserTierAssignment[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TrustTierConfig | null>(null);
  
  const [configForm, setConfigForm] = useState({
    role: 'DOCTOR' as 'DOCTOR' | 'COURIER',
    tier: 'Basic' as 'Basic' | 'Premium' | 'VIP',
    fee: 0,
    currency: 'TZS',
    description: '',
    features: [] as string[],
    trialPeriodDays: 90,
    isActive: true
  });

  const [assignmentForm, setAssignmentForm] = useState({
    userId: '',
    userRole: 'DOCTOR' as 'DOCTOR' | 'COURIER',
    trustTier: 'Basic' as 'Basic' | 'Premium' | 'VIP',
    startTrial: true
  });

  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configs, doctorsList, couriersList] = await Promise.all([
        db.getTrustTierConfigs(),
        db.getDoctors(),
        db.getCouriers()
      ]);
      setTierConfigs(configs);
      setDoctors(doctorsList);
      setCouriers(couriersList);

      // Load assignments if on that tab
      if (activeTab === 'assignments') {
        const allUserIds = [...doctorsList.map((d: any) => d.id), ...couriersList.map((c: any) => c.id)];
        const assignmentPromises = allUserIds.map(id => db.getUserTierAssignment(id));
        const assignmentResults = await Promise.all(assignmentPromises);
        setAssignments(assignmentResults.filter(a => a !== null) as UserTierAssignment[]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      notify('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configForm.tier || configForm.fee < 0) {
      notify('Please fill all required fields', 'error');
      return;
    }

    try {
      if (editingConfig?.id) {
        await db.updateTrustTierConfig(editingConfig.id, configForm);
        notify('Tier configuration updated', 'success');
      } else {
        await db.createTrustTierConfig(configForm);
        notify('Tier configuration created', 'success');
      }
      
      setShowConfigForm(false);
      setEditingConfig(null);
      resetConfigForm();
      loadData();
    } catch (error) {
      notify('Failed to save configuration', 'error');
    }
  };

  const handleAssignTier = async () => {
    if (!assignmentForm.userId || !assignmentForm.trustTier) {
      notify('Please select user and tier', 'error');
      return;
    }

    try {
      const config = tierConfigs.find(
        c => c.role === assignmentForm.userRole && c.tier === assignmentForm.trustTier
      );

      if (!config) {
        notify('Tier configuration not found', 'error');
        return;
      }

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + config.trialPeriodDays);

      const assignment = {
        userRole: assignmentForm.userRole,
        trustTier: assignmentForm.trustTier,
        fee: config.fee,
        currency: config.currency,
        isTrialActive: assignmentForm.startTrial,
        trialStartDate: assignmentForm.startTrial ? now.toISOString() : undefined,
        trialEndDate: assignmentForm.startTrial ? trialEnd.toISOString() : undefined,
        status: assignmentForm.startTrial ? 'TRIAL' as const : 'ACTIVE' as const,
        activatedBy: user?.id || '',
        activatedAt: now.toISOString(),
        activationDate: !assignmentForm.startTrial ? now.toISOString() : undefined,
        nextPaymentDate: !assignmentForm.startTrial ? new Date(now.setMonth(now.getMonth() + 1)).toISOString() : undefined
      };

      await db.assignUserTier(assignmentForm.userId, assignment);
      notify('Tier assigned successfully', 'success');
      setShowAssignmentForm(false);
      resetAssignmentForm();
      loadData();
    } catch (error) {
      console.error('Failed to assign tier:', error);
      notify('Failed to assign tier', 'error');
    }
  };

  const handleActivateTier = async (userId: string) => {
    if (!confirm('Activate paid tier for this user? They will need to start paying the monthly fee.')) {
      return;
    }

    try {
      await db.activateUserTierAfterTrial(userId, user?.id || '');
      notify('Tier activated successfully', 'success');
      loadData();
    } catch (error) {
      notify('Failed to activate tier', 'error');
    }
  };

  const resetConfigForm = () => {
    setConfigForm({
      role: 'DOCTOR',
      tier: 'Basic',
      fee: 0,
      currency: 'TZS',
      description: '',
      features: [],
      trialPeriodDays: 90,
      isActive: true
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      userId: '',
      userRole: 'DOCTOR',
      trustTier: 'Basic',
      startTrial: true
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setConfigForm(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setConfigForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Basic': return Star;
      case 'Premium': return Award;
      case 'VIP': return Crown;
      default: return Shield;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Basic': return 'text-gray-600 bg-gray-100';
      case 'Premium': return 'text-blue-600 bg-blue-100';
      case 'VIP': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      TRIAL: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Trial' },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Expired' },
      SUSPENDED: { color: 'bg-orange-100 text-orange-800', icon: XCircle, label: 'Suspended' }
    };
    return badges[status as keyof typeof badges] || badges.TRIAL;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trust Tier Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage tier packages and assign tiers to doctors and couriers
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('configs')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'configs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Shield className="inline mr-2" size={18} />
          Tier Configurations
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'assignments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Users className="inline mr-2" size={18} />
          User Assignments
        </button>
      </div>

      {/* Tier Configurations Tab */}
      {activeTab === 'configs' && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setShowConfigForm(true);
              setEditingConfig(null);
              resetConfigForm();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Create Tier Configuration
          </button>

          {/* Tier Configs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tierConfigs.map((config) => {
              const TierIcon = getTierIcon(config.tier);
              return (
                <div
                  key={config.id}
                  className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${getTierColor(config.tier)}`}>
                      <TierIcon size={24} />
                    </div>
                    <button
                      onClick={() => {
                        setEditingConfig(config);
                        setConfigForm({
                          role: config.role,
                          tier: config.tier,
                          fee: config.fee,
                          currency: config.currency,
                          description: config.description,
                          features: config.features,
                          trialPeriodDays: config.trialPeriodDays,
                          isActive: config.isActive
                        });
                        setShowConfigForm(true);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {config.tier} - {config.role}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {config.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Fee</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {config.currency} {config.fee.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Trial Period</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {config.trialPeriodDays} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {config.features.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Features</h4>
                      <ul className="space-y-1">
                        {config.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-500" />
                            {feature}
                          </li>
                        ))}
                        {config.features.length > 3 && (
                          <li className="text-sm text-gray-500 dark:text-gray-500">
                            +{config.features.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Config Form Modal */}
          {showConfigForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingConfig ? 'Edit' : 'Create'} Tier Configuration
                  </h3>
                  <button
                    onClick={() => {
                      setShowConfigForm(false);
                      setEditingConfig(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </label>
                      <select
                        value={configForm.role}
                        onChange={(e) => setConfigForm({ ...configForm, role: e.target.value as 'DOCTOR' | 'COURIER' })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="DOCTOR">Doctor</option>
                        <option value="COURIER">Courier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Tier Level
                      </label>
                      <select
                        value={configForm.tier}
                        onChange={(e) => setConfigForm({ ...configForm, tier: e.target.value as 'Basic' | 'Premium' | 'VIP' })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Premium">Premium</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Monthly Fee
                      </label>
                      <input
                        type="number"
                        value={configForm.fee}
                        onChange={(e) => setConfigForm({ ...configForm, fee: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Trial Period (days)
                      </label>
                      <input
                        type="number"
                        value={configForm.trialPeriodDays}
                        onChange={(e) => setConfigForm({ ...configForm, trialPeriodDays: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={configForm.description}
                      onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Brief description of this tier..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Features
                    </label>
                    <div className="space-y-2">
                      {configForm.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                            {feature}
                          </span>
                          <button
                            onClick={() => removeFeature(idx)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                          placeholder="Add a feature..."
                          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          onClick={addFeature}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={configForm.isActive}
                      onChange={(e) => setConfigForm({ ...configForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active (available for assignment)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveConfig}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {editingConfig ? 'Update' : 'Create'} Configuration
                    </button>
                    <button
                      onClick={() => {
                        setShowConfigForm(false);
                        setEditingConfig(null);
                      }}
                      className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <button
            onClick={() => setShowAssignmentForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Assign Tier to User
          </button>

          {/* Assignments List */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trial End
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {assignments.map((assignment) => {
                    const userData = assignment.userRole === 'DOCTOR' 
                      ? doctors.find(d => d.id === assignment.userId)
                      : couriers.find(c => c.id === assignment.userId);
                    const statusBadge = getStatusBadge(assignment.status);
                    const StatusIcon = statusBadge.icon;
                    const TierIcon = getTierIcon(assignment.trustTier);

                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {userData?.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.userId.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {assignment.userRole}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <TierIcon size={16} className={getTierColor(assignment.trustTier).split(' ')[0]} />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {assignment.trustTier}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignment.currency} {assignment.fee.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${statusBadge.color}`}>
                            <StatusIcon size={14} />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {assignment.trialEndDate 
                            ? new Date(assignment.trialEndDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignment.status === 'TRIAL' && assignment.isTrialActive && (
                            <button
                              onClick={() => handleActivateTier(assignment.userId)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-bold"
                            >
                              Activate Paid Tier
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assignment Form Modal */}
          {showAssignmentForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Assign Tier to User
                  </h3>
                  <button
                    onClick={() => setShowAssignmentForm(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      User Role
                    </label>
                    <select
                      value={assignmentForm.userRole}
                      onChange={(e) => {
                        setAssignmentForm({ 
                          ...assignmentForm, 
                          userRole: e.target.value as 'DOCTOR' | 'COURIER',
                          userId: '' // Reset user selection
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="DOCTOR">Doctor</option>
                      <option value="COURIER">Courier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Select User
                    </label>
                    <select
                      value={assignmentForm.userId}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, userId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Choose a user...</option>
                      {(assignmentForm.userRole === 'DOCTOR' ? doctors : couriers).map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email || user.phone || user.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Tier Level
                    </label>
                    <select
                      value={assignmentForm.trustTier}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, trustTier: e.target.value as 'Basic' | 'Premium' | 'VIP' })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="startTrial"
                      checked={assignmentForm.startTrial}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, startTrial: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="startTrial" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start with trial period (3 months free)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAssignTier}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold"
                    >
                      Assign Tier
                    </button>
                    <button
                      onClick={() => setShowAssignmentForm(false)}
                      className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

