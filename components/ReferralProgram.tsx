import React, { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Users, Gift, MessageCircle, Facebook, Twitter, Mail, Settings, Save, X, Power, PowerOff, Plus, Trash2, Edit2, Loader2, DollarSign } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { UserRole } from '../types';
import { db as firestore } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface ReferralProgramProps {
  onClose?: () => void;
}

export const ReferralProgram: React.FC<ReferralProgramProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, referrals: [] });
  
  // Admin state
  const [referralSettings, setReferralSettings] = useState<any>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    enabled: true,
    referrerReward: 20,
    referredReward: 15,
    rewardType: 'percentage',
    minReferralsForReward: 1,
    maxReferralsPerUser: 0,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (user?.id) {
      if (user.role === UserRole.ADMIN) {
        loadReferralSettings();
      } else {
        loadReferralStats();
      }
    }
  }, [user?.id, user?.role]);

  const loadReferralSettings = async () => {
    try {
      const settingsRef = doc(firestore, 'platformSettings', 'referralProgram');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setReferralSettings(data);
        setSettingsForm({
          enabled: data.enabled !== false,
          referrerReward: data.referrerReward || 20,
          referredReward: data.referredReward || 15,
          rewardType: data.rewardType || 'percentage',
          minReferralsForReward: data.minReferralsForReward || 1,
          maxReferralsPerUser: data.maxReferralsPerUser || 0,
        });
      } else {
        setReferralSettings({ enabled: true });
      }
    } catch (error) {
      console.error('Failed to load referral settings:', error);
    }
  };

  const saveReferralSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsRef = doc(firestore, 'platformSettings', 'referralProgram');
      await setDoc(settingsRef, {
        ...settingsForm,
        updatedAt: serverTimestamp(),
        updatedBy: user?.id,
      }, { merge: true });
      setReferralSettings(settingsForm);
      setIsEditingSettings(false);
      notify('Referral program settings saved successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to save referral settings:', error);
      notify(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadReferralStats = async () => {
    if (!user?.id) return;
    try {
      const stats = await db.getReferralStats(user.id);
      setReferralStats(stats);
    } catch (error) {
      console.error('Failed to load referral stats:', error);
    }
  };

  const referralCode = user?.referralCode || `REF${user?.id?.slice(0, 8).toUpperCase() || 'XXXX'}`;
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    notify('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Join NexaFya - Professional Healthcare, Anytime You Need It! 🏥\n\nUse my referral code: ${referralCode}\n\nGet 15% off your first consultation!\n\n${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareViaTwitter = () => {
    const text = `Join NexaFya - Professional Healthcare, Anytime You Need It! Use my code: ${referralCode} and get 15% off!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareViaEmail = () => {
    const subject = 'Join NexaFya - Professional Healthcare';
    const body = `Hi!\n\nI'd like to invite you to join NexaFya - Professional Healthcare, Anytime You Need It!\n\nUse my referral code: ${referralCode} and get 15% off your first consultation!\n\n${referralLink}\n\nBest regards!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Admin Management View
  if (user?.role === UserRole.ADMIN) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold font-display mb-2">Referral Program Management</h2>
              <p className="text-blue-100 text-lg">Configure and manage the referral program</p>
            </div>
            <button
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <Settings size={18} />
              {isEditingSettings ? 'Cancel' : 'Edit Settings'}
            </button>
          </div>
        </div>

        {isEditingSettings ? (
          <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Referral Program Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">Enable Referral Program</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Turn referral program on or off for all users</p>
                </div>
                <button
                  onClick={() => setSettingsForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className="flex items-center"
                >
                  {settingsForm.enabled ? (
                    <Power size={40} className="text-blue-600" />
                  ) : (
                    <PowerOff size={40} className="text-gray-400" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Referrer Reward (%)</label>
                  <input
                    type="number"
                    value={settingsForm.referrerReward}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, referrerReward: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reward for the person who refers</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Referred User Reward (%)</label>
                  <input
                    type="number"
                    value={settingsForm.referredReward}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, referredReward: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reward for the new user</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Minimum Referrals for Reward</label>
                  <input
                    type="number"
                    value={settingsForm.minReferralsForReward}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, minReferralsForReward: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum successful referrals needed</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Max Referrals Per User (0 = unlimited)</label>
                  <input
                    type="number"
                    value={settingsForm.maxReferralsPerUser}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, maxReferralsPerUser: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Limit referrals per user (0 for unlimited)</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsEditingSettings(false)}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveReferralSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Current Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <p className={`text-lg font-bold ${referralSettings?.enabled !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                  {referralSettings?.enabled !== false ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Referrer Reward</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {referralSettings?.referrerReward || 20}%
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Referred User Reward</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {referralSettings?.referredReward || 15}%
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Min Referrals for Reward</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {referralSettings?.minReferralsForReward || 1}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Program Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">Total Referrals</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">-</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all users</p>
            </div>
            
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-emerald-600 dark:text-emerald-400" size={24} />
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Rewards</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">-</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Distributed</p>
            </div>
            
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="text-purple-600 dark:text-purple-400" size={24} />
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase">Active Users</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">-</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">With referrals</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular User View
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 rounded-3xl shadow-xl">
        <h2 className="text-3xl font-bold font-display mb-2">Referral Program</h2>
        <p className="text-blue-100 text-lg">Invite friends and earn rewards!</p>
      </div>

      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Your Referral Code</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share this code with friends</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
            <Gift className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
        </div>
        
        <div className="flex gap-3 mb-4">
          <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl border border-gray-200 dark:border-gray-700/50">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Code</p>
            <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">{referralCode}</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl border border-gray-200 dark:border-gray-700/50">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Referral Link</p>
          <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{referralLink}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Gift className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">You Get</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">20% Off</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">On your next consultation when your friend signs up</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Users className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Friend Gets</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">15% Off</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">On their first consultation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Share via</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={shareViaWhatsApp}
            className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl border border-green-200 dark:border-green-800/50 transition-colors"
          >
            <MessageCircle className="text-green-600 dark:text-green-400" size={24} />
            <span className="text-sm font-bold text-gray-900 dark:text-white">WhatsApp</span>
          </button>

          <button
            onClick={shareViaFacebook}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-800/50 transition-colors"
          >
            <Facebook className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Facebook</span>
          </button>

          <button
            onClick={shareViaTwitter}
            className="flex flex-col items-center gap-2 p-4 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-2xl border border-sky-200 dark:border-sky-800/50 transition-colors"
          >
            <Twitter className="text-sky-600 dark:text-sky-400" size={24} />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Twitter</span>
          </button>

          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-2xl border border-purple-200 dark:border-purple-800/50 transition-colors"
          >
            <Mail className="text-purple-600 dark:text-purple-400" size={24} />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Email</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Referrals</h3>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Users className="text-blue-600 dark:text-blue-400" size={18} />
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{referralStats.totalReferrals}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You've successfully referred {referralStats.totalReferrals} {referralStats.totalReferrals === 1 ? 'person' : 'people'}. Keep sharing to earn more rewards!
        </p>
      </div>
    </div>
  );
};
