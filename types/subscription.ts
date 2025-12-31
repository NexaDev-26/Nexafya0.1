/**
 * Subscription Types
 * Strictly typed subscription system for Nexafya
 * Currently only PHARMACY role uses subscriptions
 */

import { UserRole } from './user';

/**
 * Subscription status enum
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

/**
 * Subscription plan enum
 * Only for PHARMACY subscriptions
 */
export enum SubscriptionPlan {
  BASIC = 'Basic',
  PROFESSIONAL = 'Professional',
  ENTERPRISE = 'Enterprise',
  PREMIUM = 'Premium',
}

/**
 * Subscription limits interface
 */
export interface SubscriptionLimits {
  consultations?: number; // -1 for unlimited
  articles?: number; // -1 for unlimited
  storageGB?: number; // -1 for unlimited
  branches?: number; // -1 for unlimited
}

/**
 * Subscription interface
 * Represents a user's active subscription
 */
export interface Subscription {
  id: string;
  userId: string;
  userRole: UserRole;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  autoRenew: boolean;
  price: number;
  currency: string;
  paymentMethod?: string;
  lastPaymentDate?: string; // ISO date string
  nextPaymentDate?: string; // ISO date string
  features: readonly string[];
  limits: SubscriptionLimits;
  createdAt?: string; // ISO date string or Firestore timestamp
  updatedAt?: string; // ISO date string or Firestore timestamp
  cancelledAt?: string; // ISO date string or Firestore timestamp
}

/**
 * Subscription package interface
 * Used for displaying available plans (only PHARMACY)
 */
export interface SubscriptionPackage {
  id: string;
  role: 'PHARMACY'; // Only pharmacy has subscriptions
  name: string;
  price: string; // Display price (e.g., "50,000")
  description: string;
  features: readonly string[];
  allowedMethods: readonly string[];
  isPopular?: boolean;
  currency?: string;
  period?: string;
}

/**
 * Subscription feature interface
 * Defines available features for subscription plans
 */
export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  plan: readonly SubscriptionPlan[];
}

/**
 * Subscription plan details interface
 * Internal structure for plan configuration
 */
export interface SubscriptionPlanDetails {
  name: SubscriptionPlan;
  price: number;
  currency: string;
  period: 'month' | 'year';
  features: readonly string[];
  limits: SubscriptionLimits;
}

/**
 * Subscription usage information
 */
export interface SubscriptionUsage {
  allowed: number; // -1 for unlimited
  used: number;
  remaining: number; // -1 for unlimited
}

/**
 * Subscription history entry
 */
export interface SubscriptionHistory {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  price: number;
  currency: string;
  createdAt: string;
}
