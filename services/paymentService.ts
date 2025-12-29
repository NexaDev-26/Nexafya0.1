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

      // TODO: Integrate with M-Pesa Daraja API
      // const mpesa = require('mpesa-api');
      // const stkPush = await mpesa.stkPush({...});

      // For STK Push, mark as pending verification
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'STK_REQUESTED',
        stkRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Simulate STK push callback (in production, this comes from M-Pesa webhook)
      setTimeout(async () => {
        await updateDoc(doc(firestore, 'transactions', transactionId), {
          status: 'COMPLETED',
          referenceNumber: `MPESA-${Date.now()}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }, 3000);

      return {
        success: true,
        transactionId,
        referenceNumber: `MPESA-${Date.now()}`,
        message: 'STK Push sent to your phone. Complete payment to continue.',
        requiresVerification: true,
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

      // TODO: Integrate with Tigo Pesa API
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        message: 'Payment pending verification. Please enter reference number.',
        requiresVerification: true,
      };
    } catch (error: any) {
      throw error;
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

      // TODO: Integrate with Airtel Money API
      await updateDoc(doc(firestore, 'transactions', transactionId), {
        status: 'PENDING_VERIFICATION',
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        transactionId,
        message: 'Payment pending verification. Please enter reference number.',
        requiresVerification: true,
      };
    } catch (error: any) {
      throw error;
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

