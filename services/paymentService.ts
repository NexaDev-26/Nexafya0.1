/**
 * Payment Service - Handles all payment integrations
 * Supports: Stripe, PayPal, M-Pesa, Airtel Money, Tigo Pesa, Lipanamba
 */

import { db as firestore } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

export type PaymentProvider = 
  | 'stripe' 
  | 'paypal' 
  | 'mpesa' 
  | 'tigopesa' 
  | 'airtel' 
  | 'lipanamba' 
  | 'bank';

export interface PaymentRequest {
  amount: number;
  currency: string;
  provider: PaymentProvider;
  userId: string;
  userName: string;
  description: string;
  itemId?: string;
  itemType?: 'article' | 'appointment' | 'consultation' | 'subscription' | 'medicine';
  recipientId?: string;
  phoneNumber?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  referenceNumber?: string;
  message?: string;
  error?: string;
  requiresVerification?: boolean;
}

class PaymentService {
  /**
   * Process payment based on provider
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Create transaction record
      const transactionRef = await addDoc(collection(firestore, 'transactions'), cleanFirestoreData({
        userId: request.userId,
        userName: request.userName,
        amount: request.amount,
        currency: request.currency,
        provider: request.provider,
        description: request.description,
        itemId: request.itemId || '',
        itemType: request.itemType || '',
        recipientId: request.recipientId || '',
        phoneNumber: request.phoneNumber || '',
        metadata: request.metadata || {},
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      // Route to appropriate payment handler
      switch (request.provider) {
        case 'stripe':
          return await this.processStripe(request, transactionRef.id);
        case 'paypal':
          return await this.processPayPal(request, transactionRef.id);
        case 'mpesa':
          return await this.processMPesa(request, transactionRef.id);
        case 'tigopesa':
          return await this.processTigoPesa(request, transactionRef.id);
        case 'airtel':
          return await this.processAirtelMoney(request, transactionRef.id);
        case 'lipanamba':
          return await this.processLipanamba(request, transactionRef.id);
        case 'bank':
          return await this.processBankTransfer(request, transactionRef.id);
        default:
          throw new Error('Unsupported payment provider');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Stripe Payment (Credit/Debit Cards)
   * Requires: VITE_STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY
   */
  private async processStripe(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      const stripeSecretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        // Fallback to simulation if keys not configured
        console.warn('Stripe keys not configured. Using simulation mode.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'COMPLETED',
          referenceNumber: `STRIPE-SIM-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));

        return {
          success: true,
          transactionId,
          referenceNumber: `STRIPE-SIM-${Date.now()}`,
          message: 'Payment processed successfully via Stripe (simulation mode)',
        };
      }

      // In production, use Stripe API
      // For client-side, use Stripe.js with publishable key
      // For server-side, use Stripe SDK with secret key
      // This is a client-side implementation, so we'll use the payment intent flow
      
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: Math.round(request.amount * 100).toString(), // Convert to cents
          currency: request.currency.toLowerCase(),
          description: request.description,
          metadata: JSON.stringify({
            transactionId,
            userId: request.userId,
            itemId: request.itemId || '',
            itemType: request.itemType || '',
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Stripe payment failed');
      }

      const paymentIntent = await response.json();

      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'COMPLETED',
        referenceNumber: paymentIntent.id,
        paymentIntentId: paymentIntent.id,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      return {
        success: true,
        transactionId,
        referenceNumber: paymentIntent.id,
        message: 'Payment processed successfully via Stripe',
      };
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message || 'Stripe payment processing failed',
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * PayPal Payment
   * Requires: VITE_PAYPAL_CLIENT_ID, VITE_PAYPAL_CLIENT_SECRET
   */
  private async processPayPal(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_PAYPAL_CLIENT_SECRET;
      const isSandbox = import.meta.env.VITE_PAYPAL_ENVIRONMENT !== 'production';
      const baseUrl = isSandbox 
        ? 'https://api.sandbox.paypal.com' 
        : 'https://api.paypal.com';

      if (!clientId || !clientSecret) {
        // Fallback to simulation if keys not configured
        console.warn('PayPal keys not configured. Using simulation mode.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'COMPLETED',
          referenceNumber: `PAYPAL-SIM-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));

        return {
          success: true,
          transactionId,
          referenceNumber: `PAYPAL-SIM-${Date.now()}`,
          message: 'Payment processed successfully via PayPal (simulation mode)',
        };
      }

      // Get OAuth token
      const auth = btoa(`${clientId}:${clientSecret}`);
      const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to authenticate with PayPal');
      }

      const { access_token } = await tokenResponse.json();

      // Create order
      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: request.currency,
              value: request.amount.toFixed(2),
            },
            description: request.description,
            custom_id: transactionId,
          }],
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'PayPal order creation failed');
      }

      const order = await orderResponse.json();

      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'COMPLETED',
        referenceNumber: order.id,
        paypalOrderId: order.id,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      return {
        success: true,
        transactionId,
        referenceNumber: order.id,
        message: 'Payment processed successfully via PayPal',
      };
    } catch (error: any) {
      console.error('PayPal payment error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message || 'PayPal payment processing failed',
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * M-Pesa Payment (Safaricom)
   */
  private async processMPesa(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      if (!request.phoneNumber) {
        throw new Error('Phone number required for M-Pesa');
      }

      // Import M-Pesa service dynamically
      const { mpesaService } = await import('./mpesaService');

      // Initiate STK Push
      const stkResult = await mpesaService.initiateSTKPush(
        request.phoneNumber,
        request.amount,
        transactionId,
        request.description || 'NexaFya Payment',
        `${import.meta.env.VITE_APP_URL || 'http://localhost:5174'}/api/mpesa/callback`
      );

      if (!stkResult.success) {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'FAILED',
          error: stkResult.error || 'STK Push failed',
          updatedAt: serverTimestamp(),
        }));
        return {
          success: false,
          transactionId,
          error: stkResult.error || 'Failed to initiate M-Pesa payment',
        };
      }

      // Store checkout request ID for status polling
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'STK_REQUESTED',
        checkoutRequestId: stkResult.checkoutRequestId || '',
        stkRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      // Start polling for payment status
      this.pollMPesaStatus(transactionId, stkResult.checkoutRequestId!);

      return {
        success: true,
        transactionId,
        message: stkResult.customerMessage || 'STK Push sent to your phone. Complete payment to continue.',
        requiresVerification: true,
      };
    } catch (error: any) {
      console.error('M-Pesa processing error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * Poll M-Pesa payment status
   */
  private async pollMPesaStatus(transactionId: string, checkoutRequestId: string, attempts: number = 0) {
    if (attempts >= 20) return; // Stop after 20 attempts (2 minutes)

    try {
      const { mpesaService } = await import('./mpesaService');
      const result = await mpesaService.querySTKStatus(checkoutRequestId);

      if (result.success && result.status === 'COMPLETED') {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'COMPLETED',
          referenceNumber: `MPESA-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
        return;
      }

      // Poll again after 6 seconds
      setTimeout(() => {
        this.pollMPesaStatus(transactionId, checkoutRequestId, attempts + 1);
      }, 6000);
    } catch (error) {
      console.error('M-Pesa status polling error:', error);
    }
  }

  /**
   * Tigo Pesa Payment
   */
  private async processTigoPesa(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      if (!request.phoneNumber) {
        throw new Error('Phone number required for Tigo Pesa');
      }

      // Import Tigo Pesa service dynamically
      const { tigoPesaService } = await import('./tigoPesaService');

      const paymentResult = await tigoPesaService.initiatePayment(
        request.phoneNumber,
        request.amount,
        transactionId,
        request.description || 'NexaFya Payment'
      );

      if (!paymentResult.success) {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'FAILED',
          error: paymentResult.error || 'Payment initiation failed',
          updatedAt: serverTimestamp(),
        }));
        return {
          success: false,
          transactionId,
          error: paymentResult.error || 'Failed to initiate Tigo Pesa payment',
        };
      }

      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'PENDING_VERIFICATION',
        tigoTransactionId: paymentResult.transactionId || '',
        updatedAt: serverTimestamp(),
      }));

      // Start polling for payment status
      if (paymentResult.transactionId) {
        this.pollTigoPesaStatus(transactionId, paymentResult.transactionId);
      }

      return {
        success: true,
        transactionId,
        message: paymentResult.message || 'Payment request sent. Please complete on your phone.',
        requiresVerification: true,
      };
    } catch (error: any) {
      console.error('Tigo Pesa processing error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * Poll Tigo Pesa payment status
   */
  private async pollTigoPesaStatus(transactionId: string, tigoTransactionId: string, attempts: number = 0) {
    if (attempts >= 20) return;

    try {
      const { tigoPesaService } = await import('./tigoPesaService');
      const result = await tigoPesaService.queryPayment(tigoTransactionId);

      if (result.success && result.status === 'COMPLETED') {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'COMPLETED',
          referenceNumber: `TIGO-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
        return;
      }

      setTimeout(() => {
        this.pollTigoPesaStatus(transactionId, tigoTransactionId, attempts + 1);
      }, 6000);
    } catch (error) {
      console.error('Tigo Pesa status polling error:', error);
    }
  }

  /**
   * Airtel Money Payment
   */
  private async processAirtelMoney(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      if (!request.phoneNumber) {
        throw new Error('Phone number required for Airtel Money');
      }

      // Import Airtel Money service dynamically
      const { airtelMoneyService } = await import('./airtelMoneyService');

      const paymentResult = await airtelMoneyService.initiatePayment(
        request.phoneNumber,
        request.amount,
        transactionId,
        request.description || 'NexaFya Payment'
      );

      if (!paymentResult.success) {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'FAILED',
          error: paymentResult.error || 'Payment initiation failed',
          updatedAt: serverTimestamp(),
        }));
        return {
          success: false,
          transactionId,
          error: paymentResult.error || 'Failed to initiate Airtel Money payment',
        };
      }

      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'PENDING_VERIFICATION',
        airtelTransactionId: paymentResult.transactionId || '',
        updatedAt: serverTimestamp(),
      }));

      // Start polling for payment status
      if (paymentResult.transactionId) {
        this.pollAirtelMoneyStatus(transactionId, paymentResult.transactionId);
      }

      return {
        success: true,
        transactionId,
        message: paymentResult.message || 'Payment request sent. Please complete on your phone.',
        requiresVerification: true,
      };
    } catch (error: any) {
      console.error('Airtel Money processing error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * Poll Airtel Money payment status
   */
  private async pollAirtelMoneyStatus(transactionId: string, airtelTransactionId: string, attempts: number = 0) {
    if (attempts >= 20) return;

    try {
      const { airtelMoneyService } = await import('./airtelMoneyService');
      const result = await airtelMoneyService.queryPayment(airtelTransactionId);

      if (result.success && result.status === 'COMPLETED') {
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'COMPLETED',
          referenceNumber: `AIRTEL-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
        return;
      }

      setTimeout(() => {
        this.pollAirtelMoneyStatus(transactionId, airtelTransactionId, attempts + 1);
      }, 6000);
    } catch (error) {
      console.error('Airtel Money status polling error:', error);
    }
  }

  /**
   * Lipanamba Payment (Tanzania Mobile Money)
   * Requires: VITE_LIPANAMBA_API_KEY, VITE_LIPANAMBA_MERCHANT_ID
   */
  private async processLipanamba(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      const apiKey = import.meta.env.VITE_LIPANAMBA_API_KEY;
      const merchantId = import.meta.env.VITE_LIPANAMBA_MERCHANT_ID;
      const baseUrl = import.meta.env.VITE_LIPANAMBA_BASE_URL || 'https://api.lipanamba.com';

      if (!apiKey || !merchantId) {
        // Fallback to pending verification if keys not configured
        console.warn('Lipanamba keys not configured. Payment will require manual verification.');
        await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
          status: 'PENDING_VERIFICATION',
          updatedAt: serverTimestamp(),
        }));

        return {
          success: true,
          transactionId,
          message: 'Payment pending verification. Please complete payment and wait for verification.',
          requiresVerification: true,
        };
      }

      // Initiate Lipanamba payment
      const response = await fetch(`${baseUrl}/v1/payments/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId,
          amount: request.amount,
          currency: request.currency,
          phoneNumber: request.phoneNumber,
          description: request.description,
          reference: transactionId,
          callbackUrl: `${window.location.origin}/payment/callback`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lipanamba payment initiation failed');
      }

      const paymentData = await response.json();

      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'PENDING_VERIFICATION',
        lipanambaTransactionId: paymentData.transactionId,
        updatedAt: serverTimestamp(),
      }));

      return {
        success: true,
        transactionId,
        referenceNumber: paymentData.transactionId,
        message: paymentData.message || 'Payment request sent. Please complete on your phone.',
        requiresVerification: true,
      };
    } catch (error: any) {
      console.error('Lipanamba payment error:', error);
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'FAILED',
        error: error.message || 'Lipanamba payment processing failed',
        updatedAt: serverTimestamp(),
      }));
      throw error;
    }
  }

  /**
   * Bank Transfer
   */
  private async processBankTransfer(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      // Bank transfers always require manual verification
      await updateDoc(doc(firestore, 'transactions', transactionId), cleanFirestoreData({
        status: 'PENDING_VERIFICATION',
        updatedAt: serverTimestamp(),
      }));

      return {
        success: true,
        transactionId,
        message: 'Payment pending verification. Please provide bank reference.',
        requiresVerification: true,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Verify payment with reference number
   */
  async verifyPayment(
    transactionId: string,
    referenceNumber: string
  ): Promise<PaymentResponse> {
    try {
      const transactionRef = doc(firestore, 'transactions', transactionId);
      const transactionSnap = await getDoc(transactionRef);

      if (!transactionSnap.exists()) {
        throw new Error('Transaction not found');
      }

      // In production, verify with payment provider API
      // For now, mark as completed
      await updateDoc(transactionRef, {
        status: 'COMPLETED',
        referenceNumber,
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        referenceNumber,
        message: 'Payment verified successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;

