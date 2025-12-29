/**
 * NHIF Integration Component
 * Allows users to verify and manage NHIF membership
 */

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, CreditCard, TrendingUp } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { nhifService, NHIFMember } from '../services/nhifService';
import { usePreferences } from '../contexts/PreferencesContext';

export const NHIFIntegration: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = usePreferences();
  const [nhifMember, setNhifMember] = useState<NHIFMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [formData, setFormData] = useState({
    memberNumber: '',
    fullName: '',
    dateOfBirth: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadNHIFStatus();
    }
  }, [user?.id]);

  const loadNHIFStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const member = await nhifService.getNHIFStatus(user.id);
      setNhifMember(member);
    } catch (error) {
      console.error('Load NHIF status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user?.id) return;

    if (!formData.memberNumber || !formData.fullName || !formData.dateOfBirth || !formData.phoneNumber) {
      notify('Please fill all fields', 'error');
      return;
    }

    setVerifying(true);
    try {
      const result = await nhifService.verifyMembership({
        ...formData,
        userId: user.id,
      });

      if (result.success && result.member) {
        setNhifMember(result.member);
        setShowVerifyForm(false);
        setFormData({ memberNumber: '', fullName: '', dateOfBirth: '', phoneNumber: '' });
        notify('NHIF membership verified successfully', 'success');
      } else {
        notify(result.error || 'Failed to verify NHIF membership', 'error');
      }
    } catch (error: any) {
      notify(error.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="animate-pulse mx-auto mb-4 text-nexafya-blue" size={32} />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-800">{t('nhif')}</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your NHIF membership and benefits</p>
        </div>
        {!nhifMember && (
          <button
            onClick={() => setShowVerifyForm(true)}
            className="px-4 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('verifyNHIF')}
          </button>
        )}
      </div>

      {/* Verification Form */}
      {showVerifyForm && !nhifMember && (
        <div className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-800 mb-4">Verify NHIF Membership</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Member Number
              </label>
              <input
                type="text"
                value={formData.memberNumber}
                onChange={(e) => setFormData({ ...formData, memberNumber: e.target.value })}
                placeholder="Enter NHIF member number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800 focus:ring-2 focus:ring-nexafya-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name as on NHIF card"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800 focus:ring-2 focus:ring-nexafya-blue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800 focus:ring-2 focus:ring-nexafya-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="255712345678"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800 focus:ring-2 focus:ring-nexafya-blue"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex-1 px-4 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => setShowVerifyForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NHIF Status */}
      {nhifMember && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-nexafya-blue/10 rounded-full flex items-center justify-center">
                  <Shield className="text-nexafya-blue" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-800">{nhifMember.fullName}</h3>
                  <p className="text-sm text-gray-500">Member: {nhifMember.memberNumber}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                nhifMember.status === 'ACTIVE'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {nhifMember.status}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500">Coverage Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-800">{nhifMember.coverageType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expiry Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                  {nhifMember.expiryDate ? new Date(nhifMember.expiryDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-800">{nhifMember.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                  {new Date(nhifMember.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="font-bold text-gray-900 dark:text-gray-800 mb-4">{t('nhifBenefits')}</h3>
            <div className="space-y-3">
              {nhifMember.benefits.map((benefit, index) => {
                const used = benefit.usedAmount || 0;
                const limit = benefit.annualLimit || 0;
                const remaining = limit - used;
                const percentage = limit > 0 ? (used / limit) * 100 : 0;

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-800">
                          {benefit.type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-500">{benefit.coverage}% coverage</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                          TZS {remaining.toLocaleString()} remaining
                        </p>
                        <p className="text-xs text-gray-500">
                          {used.toLocaleString()} / {limit.toLocaleString()} used
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-nexafya-blue h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* No NHIF */}
      {!nhifMember && !showVerifyForm && (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
          <Shield className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 mb-2">No NHIF membership found</p>
          <p className="text-sm text-gray-400 mb-4">Verify your NHIF membership to access benefits</p>
          <button
            onClick={() => setShowVerifyForm(true)}
            className="px-6 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('verifyNHIF')}
          </button>
        </div>
      )}
    </div>
  );
};

