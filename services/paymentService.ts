/**
 * Payment Service - Handles all payment integrations
 * Supports: Stripe, PayPal, M-Pesa, Airtel Money, Tigo Pesa, Lipanamba
 */

import { db as firestore } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

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
      const transactionRef = await addDoc(collection(firestore, 'transactions'), {
        userId: request.userId,
        userName: request.userName,
        amount: request.amount,
        currency: request.currency,
        provider: request.provider,
        description: request.description,
        itemId: request.itemId,
        itemType: request.itemType,
        recipientId: request.recipientId,
        phoneNumber: request.phoneNumber,
        metadata: request.metadata || {},
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
   */
  private async processStripe(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    // In production, integrate with Stripe API
    // For now, simulate successful payment
    try {
      // TODO: Integrate with Stripe Checkout or Payment Intents API
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const paymentIntent = await stripe.paymentIntents.create({...});

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'COMPLETED',
        referenceNumber: `STRIPE-${Date.now()}`,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        referenceNumber: `STRIPE-${Date.now()}`,
        message: 'Payment processed successfully via Stripe',
      };
    } catch (error: any) {
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
      throw error;
    }
  }

  /**
   * PayPal Payment
   */
  private async processPayPal(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    // In production, integrate with PayPal SDK
    try {
      // TODO: Integrate with PayPal REST API
      // const paypal = require('@paypal/checkout-server-sdk');
      // const order = await paypal.orders.create({...});

      await new Promise(resolve => setTimeout(resolve, 1500));

      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'COMPLETED',
        referenceNumber: `PAYPAL-${Date.now()}`,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        referenceNumber: `PAYPAL-${Date.now()}`,
        message: 'Payment processed successfully via PayPal',
      };
    } catch (error: any) {
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'FAILED',
          error: stkResult.error || 'STK Push failed',
          updatedAt: serverTimestamp(),
        });
        return {
          success: false,
          transactionId,
          error: stkResult.error || 'Failed to initiate M-Pesa payment',
        };
      }

      // Store checkout request ID for status polling
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'STK_REQUESTED',
        checkoutRequestId: stkResult.checkoutRequestId,
        stkRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'COMPLETED',
          referenceNumber: `MPESA-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'FAILED',
          error: paymentResult.error || 'Payment initiation failed',
          updatedAt: serverTimestamp(),
        });
        return {
          success: false,
          transactionId,
          error: paymentResult.error || 'Failed to initiate Tigo Pesa payment',
        };
      }

      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        tigoTransactionId: paymentResult.transactionId,
        updatedAt: serverTimestamp(),
      });

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
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'COMPLETED',
          referenceNumber: `TIGO-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'FAILED',
          error: paymentResult.error || 'Payment initiation failed',
          updatedAt: serverTimestamp(),
        });
        return {
          success: false,
          transactionId,
          error: paymentResult.error || 'Failed to initiate Airtel Money payment',
        };
      }

      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        airtelTransactionId: paymentResult.transactionId,
        updatedAt: serverTimestamp(),
      });

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
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'FAILED',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
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
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'COMPLETED',
          referenceNumber: `AIRTEL-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
   * Lipanamba Payment
   */
  private async processLipanamba(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    try {
      // TODO: Integrate with Lipanamba API
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        message: 'Payment pending verification.',
        requiresVerification: true,
      };
    } catch (error: any) {
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
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        updatedAt: serverTimestamp(),
      });

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

