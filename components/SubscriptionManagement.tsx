/**
 * Subscription Management Component
 * NOTE: This is now only for PHARMACY subscriptions.
 * Doctors and Couriers use Trust Tier system managed by Admin (see TrustTierManagement)
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, ArrowUp, Calendar, Zap, Crown, Sparkles } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService, Subscription, SubscriptionPlan } from '../services/subscriptionService';
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

  const plans: SubscriptionPlan[] = ['Basic', 'Professional', 'Enterprise'];
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

  const isActive = subscription && subscription.status === 'ACTIVE';
  const daysUntilExpiry = subscription && subscription.endDate
    ? Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
        <div className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-nexafya-blue/10 rounded-full flex items-center justify-center">
                  <CreditCard className="text-nexafya-blue" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-800">{subscription.plan} Plan</h3>
                  <p className={`text-sm font-medium ${
                    subscription.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {subscription.status}
                  </p>
                </div>
              </div>
              {isActive && (
                <p className="text-sm text-gray-500">
                  {subscription.autoRenew
                    ? `Auto-renewal enabled • Renews in ${daysUntilExpiry} days`
                    : `Expires in ${daysUntilExpiry} days`}
                </p>
              )}
            </div>
            {isActive && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

      {/* Available Plans */}
      {(!subscription || subscription.status !== 'ACTIVE') && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-800 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = planIcons[plan];
              const isCurrentPlan = subscription?.plan === plan;
              
              return (
                <div
                  key={plan}
                  className={`bg-white dark:bg-white rounded-2xl p-6 border-2 ${
                    isCurrentPlan
                      ? 'border-nexafya-blue'
                      : 'border-gray-200 dark:border-gray-600 hover:border-nexafya-blue/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="text-nexafya-blue" size={24} />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-800">{plan}</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-800 mb-2">
                    {plan === 'Basic' ? 'Free' : `TZS ${plan === 'Professional' ? '50,000' : '150,000'}`}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={upgrading || isCurrentPlan}
                    className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-nexafya-blue text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

