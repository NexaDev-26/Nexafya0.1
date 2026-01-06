/**
 * Airtel Money API Service
 * Requires: VITE_AIRTEL_MONEY_CLIENT_ID, VITE_AIRTEL_MONEY_CLIENT_SECRET, VITE_AIRTEL_MONEY_MERCHANT_ID
 */

interface AirtelMoneyConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  environment?: 'sandbox' | 'production';
}

class AirtelMoneyService {
  private config: AirtelMoneyConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_AIRTEL_MONEY_ENVIRONMENT === 'production'
      ? 'https://openapiuat.airtel.africa'
      : 'https://openapiuat.airtel.africa'; // Sandbox URL
  }

  /**
   * Initialize Airtel Money service
   */
  initialize(config: AirtelMoneyConfig) {
    this.config = config;
    if (config.environment === 'production') {
      this.baseUrl = 'https://openapi.airtel.africa';
    }
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.config) {
      const clientId = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        // Will be handled in initiatePayment with mock mode
        console.warn('Airtel Money credentials not found. Will use mock mode.');
      }

      this.initialize({
        clientId,
        clientSecret,
        merchantId: import.meta.env.VITE_AIRTEL_MONEY_MERCHANT_ID || '',
        environment: import.meta.env.VITE_AIRTEL_MONEY_ENVIRONMENT as 'sandbox' | 'production' || 'sandbox',
      });
    }

    try {
      const auth = btoa(`${this.config!.clientId}:${this.config!.clientSecret}`);
      const response = await fetch(`${this.baseUrl}/auth/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch (error: any) {
      console.error('Airtel Money OAuth error:', error);
      throw new Error(`Airtel Money authentication failed: ${error.message}`);
    }
  }

  /**
   * Initiate payment
   */
  async initiatePayment(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ): Promise<{ success: boolean; transactionId?: string; message?: string; error?: string }> {
    try {
      // Check if credentials are available
      const clientId = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        // Mock mode - simulate Airtel Money payment
        console.warn('Airtel Money credentials not found. Using mock mode.');
        const { mockDelay, generateMockTransactionId } = await import('../utils/mockApi');
        await mockDelay(1500);
        const mockTransactionId = generateMockTransactionId('AIRTEL');
        return {
          success: true,
          transactionId: mockTransactionId,
          message: 'Payment request sent. Please complete on your phone (mock mode).',
        };
      }
      
      const accessToken = await this.getAccessToken();

      // Format phone number (255XXXXXXXXX for Tanzania)
      const formattedPhone = phoneNumber.startsWith('0')
        ? `255${phoneNumber.slice(1)}`
        : phoneNumber.startsWith('+')
        ? phoneNumber.slice(1)
        : phoneNumber;

      const requestBody = {
        payee: {
          msisdn: formattedPhone,
        },
        reference: reference,
        transaction: {
          amount: amount,
          id: reference,
        },
      };

      const response = await fetch(`${this.baseUrl}/merchant/v1/payments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Country': 'TZ',
          'X-Currency': 'TZS',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.status?.success) {
        return {
          success: true,
          transactionId: data.data?.transaction?.id || reference,
          message: data.status.message || 'Payment initiated',
        };
      } else {
        return {
          success: false,
          error: data.status?.message || data.error || 'Payment initiation failed',
        };
      }
    } catch (error: any) {
      console.error('Airtel Money payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate Airtel Money payment',
      };
    }
  }

  /**
   * Query payment status
   */
  async queryPayment(transactionId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      // Check if credentials are available
      const clientId = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_AIRTEL_MONEY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        // Mock mode - simulate completed payment
        console.warn('Airtel Money credentials not found. Using mock mode.');
        const { mockDelay } = await import('../utils/mockApi');
        await mockDelay(500);
        return {
          success: true,
          status: 'COMPLETED',
        };
      }
      
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/standard/v1/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Country': 'TZ',
          'X-Currency': 'TZS',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: data.data?.transaction?.status || 'PENDING',
        };
      } else {
        return {
          success: false,
          error: data.status?.message || 'Query failed',
        };
      }
    } catch (error: any) {
      console.error('Airtel Money query error:', error);
      return {
        success: false,
        error: error.message || 'Failed to query payment status',
      };
    }
  }
}

export const airtelMoneyService = new AirtelMoneyService();
export default airtelMoneyService;

