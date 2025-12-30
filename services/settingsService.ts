/**
 * System Settings Service
 * Manages platform-wide settings stored in Firestore
 */

import { db as firestore } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

export interface SystemSettings {
  // Platform Info
  appName: string;
  appLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Commission & Fees
  consultationCommissionRate: number; // Percentage
  pharmacyCommissionRate: number;
  transactionFee: number; // Fixed amount
  transactionFeePercentage: number; // Percentage
  
  // Payment Limits
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  minPaymentAmount: number;
  maxPaymentAmount: number;
  
  // Payment Gateway Settings
  mpesaEnabled: boolean;
  tigoPesaEnabled: boolean;
  airtelMoneyEnabled: boolean;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  
  // Notification Settings
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  
  // Feature Flags
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  articleVerificationRequired: boolean;
  doctorVerificationRequired: boolean;
  pharmacyVerificationRequired: boolean;
  courierVerificationRequired: boolean;
  
  // SMS/Email Templates
  smsTemplates: Record<string, string>;
  emailTemplates: Record<string, { subject: string; body: string }>;
  
  // Other Settings
  defaultCurrency: string;
  supportedCurrencies: string[];
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Metadata
  updatedAt?: any;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'NexaFya',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  consultationCommissionRate: 10,
  pharmacyCommissionRate: 5,
  transactionFee: 0,
  transactionFeePercentage: 2.5,
  minWithdrawalAmount: 1000,
  maxWithdrawalAmount: 1000000,
  minPaymentAmount: 100,
  maxPaymentAmount: 10000000,
  mpesaEnabled: true,
  tigoPesaEnabled: true,
  airtelMoneyEnabled: true,
  stripeEnabled: false,
  paypalEnabled: false,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: true,
  pushNotificationsEnabled: true,
  maintenanceMode: false,
  registrationEnabled: true,
  articleVerificationRequired: true,
  doctorVerificationRequired: true,
  pharmacyVerificationRequired: true,
  courierVerificationRequired: true,
  smsTemplates: {
    appointment_reminder: 'Reminder: You have an appointment with {{doctorName}} on {{date}} at {{time}}.',
    payment_success: 'Payment of {{amount}} {{currency}} successful. Reference: {{reference}}',
    order_ready: 'Your order #{{orderNumber}} is ready for pickup.',
  },
  emailTemplates: {
    welcome: {
      subject: 'Welcome to NexaFya',
      body: 'Welcome to NexaFya! We\'re excited to have you on board.',
    },
    password_reset: {
      subject: 'Reset Your Password',
      body: 'Click the link to reset your password: {{resetLink}}',
    },
  },
  defaultCurrency: 'TZS',
  supportedCurrencies: ['TZS', 'USD', 'KES'],
  timezone: 'Africa/Dar_es_Salaam',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
};

class SettingsService {
  private settingsCache: SystemSettings | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get system settings
   */
  async getSettings(): Promise<SystemSettings> {
    // Check cache
    if (this.settingsCache && Date.now() < this.cacheExpiry) {
      return this.settingsCache;
    }

    try {
      const settingsRef = doc(firestore, 'systemSettings', 'main');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        this.settingsCache = { ...DEFAULT_SETTINGS, ...settingsSnap.data() } as SystemSettings;
      } else {
        // Initialize with default settings
        await this.initializeSettings();
        this.settingsCache = DEFAULT_SETTINGS;
      }

      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return this.settingsCache!;
    } catch (error) {
      console.error('Get settings error:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Initialize settings with defaults
   */
  async initializeSettings(): Promise<void> {
    try {
      const settingsRef = doc(firestore, 'systemSettings', 'main');
      await setDoc(settingsRef, cleanFirestoreData({
        ...DEFAULT_SETTINGS,
        updatedAt: serverTimestamp(),
      }));
    } catch (error) {
      console.error('Initialize settings error:', error);
      throw error;
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(
    updates: Partial<SystemSettings>,
    updatedBy?: string
  ): Promise<void> {
    try {
      const settingsRef = doc(firestore, 'systemSettings', 'main');
      await updateDoc(settingsRef, cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || 'system',
      }));

      // Invalidate cache
      this.settingsCache = null;
      this.cacheExpiry = 0;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting value
   */
  async getSetting<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Update a specific setting
   */
  async updateSetting<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K],
    updatedBy?: string
  ): Promise<void> {
    await this.updateSettings({ [key]: value } as Partial<SystemSettings>, updatedBy);
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(feature: keyof SystemSettings): Promise<boolean> {
    const settings = await this.getSettings();
    return settings[feature] === true;
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceMode(): Promise<boolean> {
    return await this.getSetting('maintenanceMode');
  }

  /**
   * Get commission rate for a service type
   */
  async getCommissionRate(serviceType: 'consultation' | 'pharmacy'): Promise<number> {
    const settings = await this.getSettings();
    return serviceType === 'consultation'
      ? settings.consultationCommissionRate
      : settings.pharmacyCommissionRate;
  }

  /**
   * Calculate transaction fee
   */
  async calculateTransactionFee(amount: number): Promise<number> {
    const settings = await this.getSettings();
    const fixedFee = settings.transactionFee;
    const percentageFee = (amount * settings.transactionFeePercentage) / 100;
    return fixedFee + percentageFee;
  }

  /**
   * Get SMS template
   */
  async getSMSTemplate(templateName: string, variables?: Record<string, string>): Promise<string> {
    const settings = await this.getSettings();
    let template = settings.smsTemplates[templateName] || '';

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }

    return template;
  }

  /**
   * Get email template
   */
  async getEmailTemplate(templateName: string, variables?: Record<string, string>): Promise<{ subject: string; body: string }> {
    const settings = await this.getSettings();
    let template = settings.emailTemplates[templateName] || { subject: '', body: '' };

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        template.subject = template.subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
        template.body = template.body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }

    return template;
  }
}

export const settingsService = new SettingsService();
export default settingsService;

