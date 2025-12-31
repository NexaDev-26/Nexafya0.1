/**
 * Subscription Management Service
 * Handles subscription plans, activation, renewal, and upgrades
 * Strictly typed using types/subscription.ts
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {

  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionPlanDetails,
  SubscriptionLimits,
  SubscriptionUsage,
  SubscriptionHistory,
} from '../types/subscription';
import { UserRole } from '../types/user';

class SubscriptionService {
  /**
   * Get subscription plan details
   */
  async getPlanDetails(plan: SubscriptionPlan, role: UserRole): Promise<SubscriptionPlanDetails> {
    try {
      const planRef = doc(firestore, 'subscriptionPackages', plan.toLowerCase());
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        const data = planSnap.data();
        return {
          name: plan,
          price: data.price || 0,
          currency: data.currency || 'TZS',
          period: (data.period || 'month') as 'month' | 'year',
          features: data.features || [],
          limits: data.limits || {},
        };
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
  private getDefaultPlan(plan: SubscriptionPlan, role: UserRole): SubscriptionPlanDetails {
    const plans: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
      [SubscriptionPlan.BASIC]: {
        name: SubscriptionPlan.BASIC,
        price: 0,
        currency: 'TZS',
        period: 'month',
        features: [
          'Basic consultations',
          'Health articles access',
          'Medicine ordering',
        ] as const,
        limits: {
          consultations: role === UserRole.DOCTOR ? 10 : 2,
          articles: role === UserRole.DOCTOR ? 5 : 0,
          storageGB: 1,
          branches: 1,
        },
      },
      [SubscriptionPlan.PROFESSIONAL]: {
        name: SubscriptionPlan.PROFESSIONAL,
        price: role === UserRole.DOCTOR ? 50000 : 25000,
        currency: 'TZS',
        period: 'month',
        features: [
          'Unlimited consultations',
          'Priority support',
          'Advanced analytics',
          'Article publishing',
        ] as const,
        limits: {
          consultations: -1, // Unlimited
          articles: role === UserRole.DOCTOR ? 20 : 0,
          storageGB: 10,
          branches: role === UserRole.PHARMACY ? 3 : 1,
        },
      },
      [SubscriptionPlan.ENTERPRISE]: {
        name: SubscriptionPlan.ENTERPRISE,
        price: role === UserRole.DOCTOR ? 150000 : 50000,
        currency: 'TZS',
        period: 'month',
        features: [
          'Everything in Professional',
          'Custom branding',
          'API access',
          'Dedicated support',
          'Custom integrations',
        ] as const,
        limits: {
          consultations: -1,
          articles: -1,
          storageGB: 100,
          branches: -1,
        },
      },
      [SubscriptionPlan.PREMIUM]: {
        name: SubscriptionPlan.PREMIUM,
        price: role === UserRole.DOCTOR ? 200000 : 100000,
        currency: 'TZS',
        period: 'month',
        features: [
          'Everything in Enterprise',
          'White-label solution',
          'Custom development',
          '24/7 priority support',
        ] as const,
        limits: {
          consultations: -1,
          articles: -1,
          storageGB: -1,
          branches: -1,
        },
      },
    };

    return plans[plan] || plans[SubscriptionPlan.BASIC];
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

      const data = subSnap.data();
      
      // Convert Firestore timestamps to ISO strings
      const convertTimestamp = (ts: unknown): string | undefined => {
        if (!ts) return undefined;
        if (ts instanceof Timestamp) {
          return ts.toDate().toISOString();
        }
        if (typeof ts === 'string') {
          return ts;
        }
        return undefined;
      };

      return {
        id: subSnap.id,
        userId: data.userId as string,
        userRole: data.userRole as UserRole,
        plan: data.plan as SubscriptionPlan,
        status: data.status as SubscriptionStatus,
        startDate: data.startDate as string,
        endDate: data.endDate as string,
        autoRenew: Boolean(data.autoRenew),
        price: Number(data.price) || 0,
        currency: (data.currency as string) || 'TZS',
        paymentMethod: data.paymentMethod as string | undefined,
        lastPaymentDate: convertTimestamp(data.lastPaymentDate),
        nextPaymentDate: convertTimestamp(data.nextPaymentDate),
        features: (data.features || []) as readonly string[],
        limits: (data.limits || {}) as SubscriptionLimits,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        cancelledAt: convertTimestamp(data.cancelledAt),
      };
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

      const subscription: Omit<Subscription, 'id'> = {
        userId,

        plan,
        status: SubscriptionStatus.ACTIVE,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew,
        price: planDetails.price,
        currency: planDetails.currency,
        paymentMethod,
        lastPaymentDate: now.toISOString(),
        nextPaymentDate: autoRenew ? endDate.toISOString() : undefined,
        features: planDetails.features,
        limits: planDetails.limits,
      };

      const subRef = doc(firestore, 'subscriptions', userId);
      await setDoc(subRef, {
        ...subscription,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: false });

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
        status: SubscriptionStatus.CANCELLED,
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
    
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
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
    
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    return subscription.features.includes(feature);
  }

  /**
   * Check usage limits
   */
  async checkUsageLimit(
    userId: string,
    limitType: keyof SubscriptionLimits
  ): Promise<SubscriptionUsage> {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription) {
      return { allowed: 0, used: 0, remaining: 0 };
    }

    const allowed = subscription.limits[limitType] || 0;
    
    // Get usage count (this would query actual usage data)
    // For now, return mock data - TODO: implement real usage tracking
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
        status: SubscriptionStatus.ACTIVE,
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
  async getSubscriptionHistory(userId: string): Promise<SubscriptionHistory[]> {
    try {
      // In production, this would query a subscription history collection
      // For now, return current subscription as history
      const subscription = await this.getSubscription(userId);
      if (!subscription) {
        return [];
      }
      
      return [{
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        price: subscription.price,
        currency: subscription.currency,
        createdAt: subscription.createdAt || subscription.startDate,
      }];
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
        where('status', '==', SubscriptionStatus.ACTIVE),
        where('autoRenew', '==', true),
        where('endDate', '<=', now.toISOString())
      );

      const querySnapshot = await getDocs(q);
      // Note: This would need proper type conversion like in getSubscription
      // For now, we'll get the subscription using getSubscription for type safety
      const renewalPromises = querySnapshot.docs.map(doc => 
        this.getSubscription(doc.id)
      );
      const renewals = (await Promise.all(renewalPromises)).filter(
        (sub): sub is Subscription => sub !== null
      );

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

// Re-export types for convenience
export type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionPlanDetails,
  SubscriptionLimits,
  SubscriptionUsage,
  SubscriptionHistory,
} from '../types/subscription';
import { UserRole } from '../types/user';
