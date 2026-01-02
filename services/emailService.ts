/**
 * Email Service - Supports SendGrid and AWS SES
 * Requires: VITE_SENDGRID_API_KEY
 * OR: VITE_AWS_SES_ACCESS_KEY, VITE_AWS_SES_SECRET_KEY, VITE_AWS_SES_REGION
 */

interface EmailConfig {
  provider: 'sendgrid' | 'ses';
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    accessKey: string;
    secretKey: string;
    region: string;
  };
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
}

class EmailService {
  private config: EmailConfig | null = null;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = import.meta.env.VITE_EMAIL_FROM || 'noreply@nexafya.com';
  }

  /**
   * Initialize email service
   */
  initialize(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Auto-initialize from environment variables
   * Returns true if initialized, false if credentials not available
   */
  private async autoInitialize(): Promise<boolean> {
    if (this.config) return true;

    const sendgridApiKey = import.meta.env.VITE_SENDGRID_API_KEY;
    const sesAccessKey = import.meta.env.VITE_AWS_SES_ACCESS_KEY;
    const sesSecretKey = import.meta.env.VITE_AWS_SES_SECRET_KEY;
    const sesRegion = import.meta.env.VITE_AWS_SES_REGION;

    if (sendgridApiKey) {
      this.config = {
        provider: 'sendgrid',
        sendgrid: {
          apiKey: sendgridApiKey,
        },
      };
      return true;
    } else if (sesAccessKey && sesSecretKey && sesRegion) {
      this.config = {
        provider: 'ses',
        ses: {
          accessKey: sesAccessKey,
          secretKey: sesSecretKey,
          region: sesRegion,
        },
      };
      return true;
    } else {
      // Email service is optional - don't throw error, just return false
      console.warn('Email service not configured. Email features will be disabled.');
      return false;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.sendgrid) {
      throw new Error('SendGrid not configured');
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const fromEmail = options.from || this.defaultFrom;
      const fromName = options.fromName || 'NexaFya';

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.sendgrid.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: recipients.map((email) => ({ email })),
              subject: options.subject,
            },
          ],
          from: {
            email: fromEmail,
            name: fromName,
          },
          content: [
            {
              type: options.html ? 'text/html' : 'text/plain',
              value: options.html || options.text || '',
            },
          ],
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: error || 'Failed to send email',
        };
      }
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via SendGrid',
      };
    }
  }

  /**
   * Send email via AWS SES
   * Note: This is a simplified version. For production, use AWS SDK
   */
  private async sendViaSES(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.ses) {
      throw new Error('AWS SES not configured');
    }

    try {
      // For client-side, we'd need to use a backend proxy or AWS SDK
      // This is a placeholder - in production, use AWS SDK or backend API
      console.warn('AWS SES requires backend implementation. Use SendGrid for client-side or implement backend proxy.');
      
      return {
        success: false,
        error: 'AWS SES requires backend implementation. Please use SendGrid or implement a backend proxy.',
      };
    } catch (error: any) {
      console.error('AWS SES email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via AWS SES',
      };
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const initialized = await this.autoInitialize();

      if (!initialized || !this.config) {
        return {
          success: false,
          error: 'Email service is not configured. Please add email credentials to environment variables.',
        };
      }

      if (this.config.provider === 'sendgrid') {
        return await this.sendViaSendGrid(options);
      } else {
        return await this.sendViaSES(options);
      }
    } catch (error: any) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send bulk email
   */
  async sendBulkEmail(recipients: string[], subject: string, text: string, html?: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
      recipients.map((email) => this.sendEmail({ to: email, subject, text, html }))
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to send to ${recipients[index]}: ${result.status === 'rejected' ? result.reason : result.value.error}`);
      }
    });

    return { success, failed, errors };
  }

  /**
   * Send template email (for notifications)
   */
  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NexaFya</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${title}</h2>
            <p style="color: #666; font-size: 16px;">${message}</p>
            ${actionUrl && actionText ? `
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">${actionText}</a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message from NexaFya. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: title,
      html,
      text: message,
    });
  }
}

export const emailService = new EmailService();
export default emailService;

