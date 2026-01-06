/**
 * M-Pesa Daraja API Service
 * Requires: VITE_MPESA_CONSUMER_KEY, VITE_MPESA_CONSUMER_SECRET, VITE_MPESA_SHORTCODE, VITE_MPESA_PASSKEY
 */

const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Use production URL in production

interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passKey: string;
  environment?: 'sandbox' | 'production';
}

class MPesaService {
  private config: MPesaConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Initialize M-Pesa service with credentials
   */
  initialize(config: MPesaConfig) {
    this.config = config;
    if (config.environment === 'production') {
      // Update base URL for production
      // MPESA_BASE_URL = 'https://api.safaricom.co.ke';
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
      throw new Error('M-Pesa service not initialized. Please add VITE_MPESA_CONSUMER_KEY and VITE_MPESA_CONSUMER_SECRET to .env');
    }

    try {
      const auth = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);
      const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      return this.accessToken;
    } catch (error: any) {
      console.error('M-Pesa OAuth error:', error);
      throw new Error(`M-Pesa authentication failed: ${error.message}`);
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(shortCode: string, passKey: string): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${shortCode}${passKey}${timestamp}`);
    return password;
  }

  /**
   * Initiate STK Push (Lipa na M-Pesa Online)
   */
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
    callbackUrl?: string
  ): Promise<{ success: boolean; checkoutRequestId?: string; customerMessage?: string; error?: string }> {
    try {
      if (!this.config) {
        // Try to initialize from env
        const consumerKey = import.meta.env.VITE_MPESA_CONSUMER_KEY;
        const consumerSecret = import.meta.env.VITE_MPESA_CONSUMER_SECRET;
        const shortCode = import.meta.env.VITE_MPESA_SHORTCODE;
        const passKey = import.meta.env.VITE_MPESA_PASSKEY;

        if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
          // Mock mode - simulate M-Pesa payment
          console.warn('M-Pesa credentials not found. Using mock mode.');
          const { mockDelay, generateMockTransactionId } = await import('../utils/mockApi');
          await mockDelay(1500);
          const mockTransactionId = generateMockTransactionId('MPESA');
          return {
            success: true,
            checkoutRequestId: mockTransactionId,
            customerMessage: 'STK Push sent to your phone. Please complete payment (mock mode).',
          };
        }

        this.initialize({
          consumerKey,
          consumerSecret,
          shortCode,
          passKey,
          environment: import.meta.env.VITE_MPESA_ENVIRONMENT as 'sandbox' | 'production' || 'sandbox',
        });
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(this.config!.shortCode, this.config!.passKey);

      // Format phone number (254XXXXXXXXX)
      const formattedPhone = phoneNumber.startsWith('0') 
        ? `254${phoneNumber.slice(1)}` 
        : phoneNumber.startsWith('+') 
        ? phoneNumber.slice(1) 
        : phoneNumber;

      const requestBody = {
        BusinessShortCode: this.config!.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.config!.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl || `${import.meta.env.VITE_APP_URL || 'http://localhost:5174'}/api/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID,
          customerMessage: data.CustomerMessage,
        };
      } else {
        return {
          success: false,
          error: data.errorMessage || data.errorDescription || 'STK Push failed',
        };
      }
    } catch (error: any) {
      // If error is about missing credentials, use mock mode
      if (error.message?.includes('credentials not found')) {
        console.warn('M-Pesa credentials not found. Using mock mode.');
        const { mockDelay, generateMockTransactionId } = await import('../utils/mockApi');
        await mockDelay(1500);
        const mockTransactionId = generateMockTransactionId('MPESA');
        return {
          success: true,
          checkoutRequestId: mockTransactionId,
          customerMessage: 'STK Push sent to your phone. Please complete payment (mock mode).',
        };
      }
      
      console.error('M-Pesa STK Push error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate M-Pesa payment',
      };
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKStatus(checkoutRequestId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      if (!this.config) {
        // Mock mode - simulate completed payment
        console.warn('M-Pesa service not initialized. Using mock mode.');
        const { mockDelay } = await import('../utils/mockApi');
        await mockDelay(500);
        return {
          success: true,
          status: 'COMPLETED',
        };
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(this.config.shortCode, this.config.passKey);

      const requestBody = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        return {
          success: true,
          status: data.ResultCode === '0' ? 'COMPLETED' : 'PENDING',
        };
      } else {
        return {
          success: false,
          error: data.errorMessage || 'Query failed',
        };
      }
    } catch (error: any) {
      console.error('M-Pesa query error:', error);
      return {
        success: false,
        error: error.message || 'Failed to query payment status',
      };
    }
  }
}

export const mpesaService = new MPesaService();
export default mpesaService;

