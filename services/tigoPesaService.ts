/**
 * Tigo Pesa API Service
 * Requires: VITE_TIGO_PESA_API_KEY, VITE_TIGO_PESA_API_SECRET, VITE_TIGO_PESA_MERCHANT_ID
 */

interface TigoPesaConfig {
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  environment?: 'sandbox' | 'production';
}

class TigoPesaService {
  private config: TigoPesaConfig | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_TIGO_PESA_ENVIRONMENT === 'production'
      ? 'https://api.tigopesa.com'
      : 'https://sandbox.tigopesa.com';
  }

  /**
   * Initialize Tigo Pesa service
   */
  initialize(config: TigoPesaConfig) {
    this.config = config;
    if (config.environment === 'production') {
      this.baseUrl = 'https://api.tigopesa.com';
    }
  }

  /**
   * Initiate payment request
   */
  async initiatePayment(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ): Promise<{ success: boolean; transactionId?: string; message?: string; error?: string }> {
    try {
      if (!this.config) {
        const apiKey = import.meta.env.VITE_TIGO_PESA_API_KEY;
        const apiSecret = import.meta.env.VITE_TIGO_PESA_API_SECRET;
        const merchantId = import.meta.env.VITE_TIGO_PESA_MERCHANT_ID;

        if (!apiKey || !apiSecret || !merchantId) {
          // Mock mode - simulate Tigo Pesa payment
          console.warn('Tigo Pesa credentials not found. Using mock mode.');
          const { mockDelay, generateMockTransactionId } = await import('../utils/mockApi');
          await mockDelay(1500);
          const mockTransactionId = generateMockTransactionId('TIGO');
          return {
            success: true,
            transactionId: mockTransactionId,
            message: 'Payment request sent. Please complete on your phone (mock mode).',
          };
        }

        this.initialize({
          apiKey,
          apiSecret,
          merchantId,
          environment: import.meta.env.VITE_TIGO_PESA_ENVIRONMENT as 'sandbox' | 'production' || 'sandbox',
        });
      }

      // Format phone number (255XXXXXXXXX for Tanzania)
      const formattedPhone = phoneNumber.startsWith('0')
        ? `255${phoneNumber.slice(1)}`
        : phoneNumber.startsWith('+')
        ? phoneNumber.slice(1)
        : phoneNumber;

      const requestBody = {
        merchantId: this.config!.merchantId,
        phoneNumber: formattedPhone,
        amount: amount,
        currency: 'TZS',
        reference: reference,
        description: description,
        callbackUrl: `${import.meta.env.VITE_APP_URL || 'http://localhost:5174'}/api/tigopesa/callback`,
      };

      const auth = btoa(`${this.config!.apiKey}:${this.config!.apiSecret}`);

      const response = await fetch(`${this.baseUrl}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          transactionId: data.transactionId,
          message: data.message || 'Payment request sent',
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Payment initiation failed',
        };
      }
    } catch (error: any) {
      console.error('Tigo Pesa payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate Tigo Pesa payment',
      };
    }
  }

  /**
   * Query payment status
   */
  async queryPayment(transactionId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      if (!this.config) {
        // Mock mode - simulate completed payment
        console.warn('Tigo Pesa service not initialized. Using mock mode.');
        const { mockDelay } = await import('../utils/mockApi');
        await mockDelay(500);
        return {
          success: true,
          status: 'COMPLETED',
        };
      }

      const auth = btoa(`${this.config.apiKey}:${this.config.apiSecret}`);

      const response = await fetch(`${this.baseUrl}/api/v1/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: data.status || 'PENDING',
        };
      } else {
        return {
          success: false,
          error: data.error || 'Query failed',
        };
      }
    } catch (error: any) {
      console.error('Tigo Pesa query error:', error);
      return {
        success: false,
        error: error.message || 'Failed to query payment status',
      };
    }
  }
}

export const tigoPesaService = new TigoPesaService();
export default tigoPesaService;

