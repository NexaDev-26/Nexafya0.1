/**
 * SMS Service - Supports Twilio and AfricasTalking
 * Requires: VITE_TWILIO_ACCOUNT_SID, VITE_TWILIO_AUTH_TOKEN, VITE_TWILIO_PHONE_NUMBER
 * OR: VITE_AFRICASTALKING_API_KEY, VITE_AFRICASTALKING_USERNAME
 */

interface SMSConfig {
  provider: 'twilio' | 'africastalking';
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  africastalking?: {
    apiKey: string;
    username: string;
  };
}

class SMSService {
  private config: SMSConfig | null = null;

  /**
   * Initialize SMS service
   */
  initialize(config: SMSConfig) {
    this.config = config;
  }

  /**
   * Auto-initialize from environment variables
   */
  private async autoInitialize(): Promise<void> {
    if (this.config) return;

    const twilioAccountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const twilioAuthToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

    const atApiKey = import.meta.env.VITE_AFRICASTALKING_API_KEY;
    const atUsername = import.meta.env.VITE_AFRICASTALKING_USERNAME;

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      this.config = {
        provider: 'twilio',
        twilio: {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          phoneNumber: twilioPhoneNumber,
        },
      };
    } else if (atApiKey && atUsername) {
      this.config = {
        provider: 'africastalking',
        africastalking: {
          apiKey: atApiKey,
          username: atUsername,
        },
      };
    } else {
      throw new Error('SMS credentials not found. Please add Twilio or AfricasTalking credentials to .env');
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.twilio) {
      throw new Error('Twilio not configured');
    }

    try {
      const auth = btoa(`${this.config.twilio.accountSid}:${this.config.twilio.authToken}`);
      
      // Format phone number (E.164 format)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : phoneNumber.startsWith('0')
        ? `+255${phoneNumber.slice(1)}`
        : `+${phoneNumber}`;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilio.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.config.twilio.phoneNumber,
            To: formattedPhone,
            Body: message,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.sid) {
        return { success: true };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send SMS',
        };
      }
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Twilio',
      };
    }
  }

  /**
   * Send SMS via AfricasTalking
   */
  private async sendViaAfricasTalking(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.africastalking) {
      throw new Error('AfricasTalking not configured');
    }

    try {
      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber.slice(1)
        : phoneNumber.startsWith('0')
        ? `255${phoneNumber.slice(1)}`
        : phoneNumber;

      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'ApiKey': this.config.africastalking.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.config.africastalking.username,
          to: formattedPhone,
          message: message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.SMSMessageData?.Recipients?.[0]?.statusCode === '101') {
        return { success: true };
      } else {
        return {
          success: false,
          error: data.SMSMessageData?.Recipients?.[0]?.status || 'Failed to send SMS',
        };
      }
    } catch (error: any) {
      console.error('AfricasTalking SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via AfricasTalking',
      };
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.autoInitialize();

      if (!this.config) {
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      if (this.config.provider === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, message);
      } else {
        return await this.sendViaAfricasTalking(phoneNumber, message);
      }
    } catch (error: any) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
      phoneNumbers.map((phone) => this.sendSMS(phone, message))
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to send to ${phoneNumbers[index]}: ${result.status === 'rejected' ? result.reason : result.value.error}`);
      }
    });

    return { success, failed, errors };
  }
}

export const smsService = new SMSService();
export default smsService;

