/**
 * Subscription Management Component
 * NOTE: This is now only for PHARMACY subscriptions.
 * Doctors and Couriers use Trust Tier system managed by Admin (see TrustTierManagement)
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, ArrowUp, ArrowDown, Calendar, Zap, Crown, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../types/subscription';
import { usePreferences } from '../contexts/PreferencesContext';
import { paymentService } from '../services/paymentService';

export const SubscriptionManagement: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t, currency } = usePreferences();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    }
  }, [user?.id]);

  const loadSubscription = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const sub = await subscriptionService.getSubscription(user.id);
      setSubscription(sub);
    } catch (error) {
      console.error('Load subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;

    setUpgrading(true);
    try {
      // In production, this would open payment modal first
      // For now, we'll simulate subscription creation
      await subscriptionService.subscribe(
        user.id,
        user.role,
        plan,
        'mpesa',
        true
      );
      
      await loadSubscription();
      notify(`Subscribed to ${plan} plan successfully`, 'success');
    } catch (error: any) {
      notify(error.message || 'Subscription failed', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleUpgradeDowngrade = async (newPlan: SubscriptionPlan) => {
    if (!user?.id || !subscription) return;

    const currentPlanIndex = plans.indexOf(subscription.plan);
    const newPlanIndex = plans.indexOf(newPlan);
    const isUpgrade = newPlanIndex > currentPlanIndex;
    const isDowngrade = newPlanIndex < currentPlanIndex;

    if (!isUpgrade && !isDowngrade) {
      notify('This is your current plan', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to ${isUpgrade ? 'upgrade' : 'downgrade'} to ${newPlan} plan?`)) {
      return;
    }

    setUpgrading(true);
    try {
      if (isUpgrade) {
        await subscriptionService.upgradeSubscription(user.id, newPlan, subscription.paymentMethod || 'mpesa');
        notify(`Upgraded to ${newPlan} plan successfully`, 'success');
      } else {
        // For downgrade, use the downgrade function
        await subscriptionService.downgradeSubscription(user.id, newPlan, subscription.paymentMethod || 'mpesa');
        notify(`Downgraded to ${newPlan} plan. Changes will take effect on next renewal.`, 'success');
      }
      
      await loadSubscription();
    } catch (error: any) {
      notify(error.message || `${isUpgrade ? 'Upgrade' : 'Downgrade'} failed`, 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!user?.id || !subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      await subscriptionService.cancelSubscription(user.id);
      await loadSubscription();
      notify('Subscription cancelled', 'info');
    } catch (error: any) {
      notify(error.message || 'Cancellation failed', 'error');
    }
  };

  const plans: SubscriptionPlan[] = [
    SubscriptionPlan.BASIC,
    SubscriptionPlan.PROFESSIONAL,
    SubscriptionPlan.ENTERPRISE,
  ];
  const planIcons = {
    Basic: Sparkles,
    Professional: Zap,
    Enterprise: Crown,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <CreditCard className="animate-pulse mx-auto mb-4 text-nexafya-blue" size={32} />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const isActive = subscription && subscription.status === SubscriptionStatus.ACTIVE;
  const daysUntilExpiry = subscription && subscription.endDate
    ? Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!subscription || !subscription.endDate || subscription.status !== SubscriptionStatus.ACTIVE) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endDate = new Date(subscription.endDate).getTime();
      const difference = endDate - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscription]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-800">Subscription</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your subscription plan</p>
        </div>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-600/10 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{subscription.plan} Plan</h3>
                  <p className={`text-sm font-medium ${
                    subscription.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {subscription.status}
                  </p>
                </div>
              </div>
              
              {/* Expiration Date & Countdown */}
              {isActive && subscription.endDate && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-blue-600 dark:text-blue-400" size={18} />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Expiration Date:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(subscription.endDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  {timeRemaining && (
                    <div className="flex items-center gap-2">
                      <Clock className="text-blue-600 dark:text-blue-400" size={18} />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Time Remaining:</span>
                      <div className="flex items-center gap-3 text-sm font-bold">
                        {timeRemaining.days > 0 && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-lg">
                            {timeRemaining.days}d
                          </span>
                        )}
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-lg">
                          {String(timeRemaining.hours).padStart(2, '0')}h
                        </span>
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-lg">
                          {String(timeRemaining.minutes).padStart(2, '0')}m
                        </span>
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-lg">
                          {String(timeRemaining.seconds).padStart(2, '0')}s
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle size={16} />
                      <span className="text-xs font-medium">Subscription expires soon! Renew to continue service.</span>
                    </div>
                  )}
                  
                  {daysUntilExpiry <= 0 && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                      <AlertCircle size={16} />
                      <span className="text-xs font-medium">Subscription has expired. Please renew to continue.</span>
                    </div>
                  )}
                </div>
              )}
              
              {isActive && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {subscription.autoRenew
                    ? `Auto-renewal enabled • ${daysUntilExpiry} days until renewal`
                    : `Manual renewal • ${daysUntilExpiry} days remaining`}
                </p>
              )}
            </div>
            {isActive && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                {currency} {subscription.price.toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                {new Date(subscription.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                {subscription.paymentMethod || 'N/A'}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-gray-800 mb-3">Plan Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-600">
                  <Check className="text-green-500" size={16} />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Plans - Always show for upgrade/downgrade */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {subscription && subscription.status === 'ACTIVE' ? 'Change Plan' : 'Available Plans'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = planIcons[plan];
            const isCurrentPlan = subscription?.plan === plan;
            const currentPlanIndex = subscription ? plans.indexOf(subscription.plan) : -1;
            const planIndex = plans.indexOf(plan);
            const isUpgrade = planIndex > currentPlanIndex;
            const isDowngrade = planIndex < currentPlanIndex;
            
            return (
              <div
                key={plan}
                className={`bg-white dark:bg-[#0F172A] rounded-2xl p-6 border-2 transition-all ${
                  isCurrentPlan
                    ? 'border-blue-600 dark:border-blue-500 shadow-lg shadow-blue-600/20'
                    : 'border-gray-200 dark:border-gray-700/50 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan}</h4>
                  </div>
                  {isCurrentPlan && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Current</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {plan === SubscriptionPlan.BASIC 
                    ? 'Free' 
                    : `TZS ${plan === SubscriptionPlan.PROFESSIONAL ? '150,000' : '300,000'}`}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span>
                </p>
                
                {subscription && subscription.status === 'ACTIVE' ? (
                  <button
                    onClick={() => handleUpgradeDowngrade(plan)}
                    disabled={upgrading || isCurrentPlan}
                    className={`w-full mt-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : isUpgrade
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20'
                    }`}
                  >
                    {isCurrentPlan ? (
                      <>Current Plan</>
                    ) : isUpgrade ? (
                      <>
                        <ArrowUp size={16} /> Upgrade
                      </>
                    ) : (
                      <>
                        <ArrowDown size={16} /> Downgrade
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={upgrading}
                    className="w-full mt-4 py-2.5 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                  >
                    Subscribe
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

