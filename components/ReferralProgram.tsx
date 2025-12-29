import React, { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Users, Gift, MessageCircle, Facebook, Twitter, Mail } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';

interface ReferralProgramProps {
  onClose?: () => void;
}

export const ReferralProgram: React.FC<ReferralProgramProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, referrals: [] });

  useEffect(() => {
    if (user?.id) {
      loadReferralStats();
    }
  }, [user?.id]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 rounded-3xl shadow-xl">
        <h2 className="text-3xl font-bold font-display mb-2">Referral Program</h2>
        <p className="text-blue-100 text-lg">Invite friends and earn rewards!</p>
      </div>

      {/* Referral Code Card */}
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

      {/* Rewards Info */}
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

      {/* Share Options */}
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

      {/* Referral Stats */}
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

