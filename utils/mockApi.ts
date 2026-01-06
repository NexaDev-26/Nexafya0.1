/**
 * Mock API Utility
 * Provides mock implementations for all external APIs
 * Automatically used when API keys are not configured
 */

// Check if we should use mock mode
export const isMockMode = (serviceName: string, requiredEnvVars: string[]): boolean => {
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`[${serviceName}] Using mock mode - Missing env vars: ${missingVars.join(', ')}`);
    return true;
  }
  return false;
};

// Simulate API delay
export const mockDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock success response
export const mockSuccess = <T>(data: T, delay: number = 1000): Promise<T> => {
  return mockDelay(delay).then(() => data);
};

// Mock error response
export const mockError = (message: string, delay: number = 500): Promise<never> => {
  return mockDelay(delay).then(() => Promise.reject(new Error(message)));
};

// Generate mock transaction ID
export const generateMockTransactionId = (prefix: string = 'MOCK'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// Mock payment response
export interface MockPaymentResponse {
  success: boolean;
  transactionId: string;
  referenceNumber: string;
  message: string;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export const mockPaymentResponse = (
  success: boolean = true,
  provider: string = 'MOCK'
): MockPaymentResponse => {
  const transactionId = generateMockTransactionId(provider);
  return {
    success,
    transactionId,
    referenceNumber: transactionId,
    message: success 
      ? `Payment processed successfully via ${provider} (mock mode)`
      : `Payment failed via ${provider} (mock mode)`,
    status: success ? 'COMPLETED' : 'FAILED',
  };
};

// Mock SMS response
export interface MockSMSResponse {
  success: boolean;
  messageId: string;
  message: string;
}

export const mockSMSResponse = (phoneNumber: string, message: string): MockSMSResponse => {
  return {
    success: true,
    messageId: generateMockTransactionId('SMS'),
    message: `SMS sent to ${phoneNumber} (mock mode): ${message.substring(0, 50)}...`,
  };
};

// Mock email response
export interface MockEmailResponse {
  success: boolean;
  messageId: string;
  message: string;
}

export const mockEmailResponse = (to: string, subject: string): MockEmailResponse => {
  return {
    success: true,
    messageId: generateMockTransactionId('EMAIL'),
    message: `Email sent to ${to} (mock mode): ${subject}`,
  };
};

// Mock API verification response
export interface MockVerificationResponse {
  success: boolean;
  verified: boolean;
  data?: any;
  message: string;
}

export const mockVerificationResponse = (
  verified: boolean = true,
  data?: any
): MockVerificationResponse => {
  return {
    success: true,
    verified,
    data,
    message: verified 
      ? 'Verification successful (mock mode)'
      : 'Verification failed (mock mode)',
  };
};

// Mock health data
export const mockHealthData = {
  heartRate: () => Math.floor(Math.random() * 40) + 60, // 60-100 bpm
  bloodPressure: () => ({
    systolic: Math.floor(Math.random() * 30) + 110, // 110-140
    diastolic: Math.floor(Math.random() * 20) + 70, // 70-90
  }),
  steps: () => Math.floor(Math.random() * 10000) + 5000, // 5000-15000
  sleepHours: () => (Math.random() * 3 + 6).toFixed(1), // 6-9 hours
  calories: () => Math.floor(Math.random() * 1000) + 1500, // 1500-2500
};

// Mock lab results
export const mockLabResults = {
  bloodTest: () => ({
    hemoglobin: (Math.random() * 3 + 12).toFixed(1),
    glucose: Math.floor(Math.random() * 40) + 70,
    cholesterol: Math.floor(Math.random() * 50) + 150,
    status: 'NORMAL',
  }),
  urinalysis: () => ({
    ph: (Math.random() * 2 + 5).toFixed(1),
    protein: 'NEGATIVE',
    glucose: 'NEGATIVE',
    status: 'NORMAL',
  }),
};

// Store mock data in memory (for testing)
const mockDataStore = new Map<string, any>();

export const mockDataStoreUtils = {
  set: (key: string, value: any) => mockDataStore.set(key, value),
  get: (key: string) => mockDataStore.get(key),
  delete: (key: string) => mockDataStore.delete(key),
  clear: () => mockDataStore.clear(),
};
