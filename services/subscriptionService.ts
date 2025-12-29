/**
 * Subscription Management Service
 * Handles subscription plans, activation, renewal, and upgrades
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { UserRole } from '../types';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'PENDING';

export type SubscriptionPlan = 'Basic' | 'Professional' | 'Enterprise' | 'Premium';

export interface Subscription {
  id?: string;
  userId: string;
  userRole: UserRole;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number;
  currency: string;
  paymentMethod?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  features: string[];
  limits: {
    consultations?: number;
    articles?: number;
    storageGB?: number;
    branches?: number;
  };
  createdAt?: any;
  updatedAt?: any;
  cancelledAt?: any;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  plan: SubscriptionPlan[];
}

class SubscriptionService {
  /**
   * Get subscription plan details
   */
  async getPlanDetails(plan: SubscriptionPlan, role: UserRole): Promise<any> {
    try {
      const planRef = doc(firestore, 'subscriptionPackages', plan.toLowerCase());
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        return planSnap.data();
      }

      // Fallback to default plans
      return this.getDefaultPlan(plan, role);
    } catch (error) {
      console.error('Get plan details error:', error);
      return this.getDefaultPlan(plan, role);
    }
  }

  /**
   * Get default plan details
   */
  private getDefaultPlan(plan: SubscriptionPlan, role: UserRole): any {
    const plans: Record<string, any> = {
      Basic: {
        name: 'Basic',
        price: role === 'DOCTOR' ? 0 : 0,
        currency: 'TZS',
        period: 'month',
        features: [
          'Basic consultations',
          'Health articles access',
          'Medicine ordering',
        ],
        limits: {
          consultations: role === 'DOCTOR' ? 10 : 2,
          articles: role === 'DOCTOR' ? 5 : 0,
          storageGB: 1,
          branches: 1,
        },
      },
      Professional: {
        name: 'Professional',
        price: role === 'DOCTOR' ? 50000 : 25000,
        currency: 'TZS',
        period: 'month',
        features: [
          'Unlimited consultations',
          'Priority support',
          'Advanced analytics',
          'Article publishing',
        ],
        limits: {
          consultations: -1, // Unlimited
          articles: role === 'DOCTOR' ? 20 : 0,
          storageGB: 10,
          branches: role === 'PHARMACY' ? 3 : 1,
        },
      },
      Enterprise: {
        name: 'Enterprise',
        price: role === 'DOCTOR' ? 150000 : 50000,
        currency: 'TZS',
        period: 'month',
        features: [
          'Everything in Professional',
          'Custom branding',
          'API access',
          'Dedicated support',
          'Custom integrations',
        ],
        limits: {
          consultations: -1,
          articles: -1,
          storageGB: 100,
          branches: -1,
        },
      },
    };

    return plans[plan] || plans.Basic;
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subRef = doc(firestore, 'subscriptions', userId);
      const subSnap = await getDoc(subRef);

      if (!subSnap.exists()) {
        return null;
      }

      return {
        id: subSnap.id,
        ...subSnap.data(),
      } as Subscription;
    } catch (error) {
      console.error('Get subscription error:', error);
      return null;
    }
  }

  /**
   * Create or update subscription
   */
  async subscribe(
    userId: string,
    userRole: UserRole,
    plan: SubscriptionPlan,
    paymentMethod: string,
    autoRenew: boolean = true
  ): Promise<string> {
    try {
      const planDetails = await this.getPlanDetails(plan, userRole);
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const subscription: Subscription = {
        userId,
        userRole,
        plan,
        status: 'ACTIVE',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew,
        price: planDetails.price,
        currency: planDetails.currency || 'TZS',
        paymentMethod,
        lastPaymentDate: now.toISOString(),
        nextPaymentDate: autoRenew ? endDate.toISOString() : undefined,
        features: planDetails.features || [],
        limits: planDetails.limits || {},
      };

      const subRef = doc(firestore, 'subscriptions', userId);
      await setDoc(subRef, {
        ...subscription,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return subRef.id;
    } catch (error) {
      console.error('Subscribe error:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subRef = doc(firestore, 'subscriptions', userId);
      await updateDoc(subRef, {
        status: 'CANCELLED',
        autoRenew: false,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(
    userId: string,
    newPlan: SubscriptionPlan,
    paymentMethod: string
  ): Promise<void> {
    try {
      const currentSub = await this.getSubscription(userId);
      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      const planDetails = await this.getPlanDetails(newPlan, currentSub.userRole);

      const subRef = doc(firestore, 'subscriptions', userId);
      await updateDoc(subRef, {
        plan: newPlan,
        price: planDetails.price,
        features: planDetails.features,
        limits: planDetails.limits,
        lastPaymentDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      throw error;
    }
  }

  /**
   * Check if subscription is active
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      return false;
    }

    const endDate = new Date(subscription.endDate);
    const now = new Date();

    return now < endDate;
  }

  /**
   * Check feature access
   */
  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      return false;
    }

    return subscription.features.includes(feature);
  }

  /**
   * Check usage limits
   */
  async checkUsageLimit(
    userId: string,
    limitType: 'consultations' | 'articles' | 'storageGB' | 'branches'
  ): Promise<{ allowed: number; used: number; remaining: number }> {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription) {
      return { allowed: 0, used: 0, remaining: 0 };
    }

    const allowed = subscription.limits[limitType] || 0;
    
    // Get usage count (this would query actual usage data)
    // For now, return mock data
    const used = 0;
    const remaining = allowed === -1 ? -1 : Math.max(0, allowed - used);

    return { allowed, used, remaining };
  }

  /**
   * Renew subscription
   */
  async renewSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found');
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const subRef = doc(firestore, 'subscriptions', userId);
      await updateDoc(subRef, {
        status: 'ACTIVE',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        lastPaymentDate: now.toISOString(),
        nextPaymentDate: subscription.autoRenew ? endDate.toISOString() : undefined,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Renew subscription error:', error);
      throw error;
    }
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      // In production, this would query a subscription history collection
      // For now, return current subscription
      const subscription = await this.getSubscription(userId);
      return subscription ? [subscription] : [];
    } catch (error) {
      console.error('Get subscription history error:', error);
      return [];
    }
  }

  /**
   * Process subscription renewal (called by cron job)
   */
  async processRenewals(): Promise<void> {
    try {
      const now = new Date();
      const q = query(
        collection(firestore, 'subscriptions'),
        where('status', '==', 'ACTIVE'),
        where('autoRenew', '==', true),
        where('endDate', '<=', now.toISOString())
      );

      const querySnapshot = await getDocs(q);
      const renewals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscription[];

      for (const subscription of renewals) {
        // In production, process payment first
        // Then renew subscription
        await this.renewSubscription(subscription.userId);
      }
    } catch (error) {
      console.error('Process renewals error:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;

