/**
 * Payment Modal Component
 * Handles payments for premium articles, appointments, and subscriptions
 */

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Building2, Shield, CheckCircle, Loader2, Zap, Copy, Check, User, FileText } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { UserRole } from '../types';
import { paymentService } from '../services/paymentService';
import { handleError } from '../utils/errorHandler';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  description: string;
  itemId?: string;
  itemType?: 'article' | 'appointment' | 'consultation' | 'subscription' | 'medicine';
  recipientId?: string; // doctor/pharmacy receiving funds
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'TZS',
  description,
  itemId,
  itemType = 'article',
  recipientId,
  onSuccess
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { currency: userCurrency } = usePreferences();
  
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [recipientPaymentMethods, setRecipientPaymentMethods] = useState<any[]>([]);
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [loadingRecipient, setLoadingRecipient] = useState(false);
  const [copiedField, setCopiedField] = useState<string>('');
  const [autoReference, setAutoReference] = useState('');

  const paymentMethods = [
    { id: 'mpesa_stk', name: 'M-Pesa STK Push', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'mpesa', name: 'M-Pesa', icon: Smartphone, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'tigopesa', name: 'Tigo Pesa', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'airtel', name: 'Airtel Money', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'bank', name: 'Bank Transfer', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' }
  ];

  // Generate auto reference number
  useEffect(() => {
    if (isOpen) {
      const ref = `${itemType?.toUpperCase().slice(0, 3) || 'PAY'}-${Date.now().toString().slice(-8)}`;
      setAutoReference(ref);
      setReferenceNumber(ref);
    }
  }, [isOpen, itemType]);

  // Load recipient payment methods and info
  useEffect(() => {
    if (isOpen && recipientId) {
      loadRecipientPaymentInfo();
    } else {
      setRecipientPaymentMethods([]);
      setRecipientInfo(null);
    }
  }, [isOpen, recipientId]);

  const loadRecipientPaymentInfo = async () => {
    if (!recipientId) return;
    
    setLoadingRecipient(true);
    try {
      // Determine if recipient is doctor or pharmacy
      const userDoc = await getDoc(doc(firestore, 'users', recipientId));
      const doctorDoc = await getDoc(doc(firestore, 'doctors', recipientId));
      
      let recipientRole: UserRole | null = null;
      if (userDoc.exists()) {
        recipientRole = userDoc.data().role as UserRole;
      } else if (doctorDoc.exists()) {
        recipientRole = UserRole.DOCTOR;
      }

      if (recipientRole === UserRole.DOCTOR || doctorDoc.exists()) {
        // Load doctor payment methods
        const pmQuery = query(
          collection(firestore, 'doctorPaymentMethods'),
          where('doctorId', '==', recipientId)
        );
        const pmSnapshot = await getDocs(pmQuery);
        setRecipientPaymentMethods(pmSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Load doctor info
        const docData = doctorDoc.exists() ? doctorDoc.data() : userDoc.data();
        setRecipientInfo({
          name: docData?.name || 'Doctor',
          role: 'DOCTOR'
        });
      } else if (recipientRole === UserRole.PHARMACY) {
        // Load pharmacy payment methods
        const pmQuery = query(
          collection(firestore, 'pharmacyPaymentMethods'),
          where('pharmacyId', '==', recipientId)
        );
        const pmSnapshot = await getDocs(pmQuery);
        setRecipientPaymentMethods(pmSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Load pharmacy info
        const pharmData = userDoc.data();
        setRecipientInfo({
          name: pharmData?.name || 'Pharmacy',
          role: 'PHARMACY'
        });
      }
    } catch (error) {
      console.error('Failed to load recipient payment info:', error);
    } finally {
      setLoadingRecipient(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    notify('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const getRecipientPaymentForMethod = (method: string) => {
    if (!selectedMethod || !recipientPaymentMethods.length) return null;
    
    const methodMap: Record<string, string> = {
      'mpesa': 'M-Pesa',
      'mpesa_stk': 'M-Pesa',
      'tigopesa': 'Tigo Pesa',
      'airtel': 'Airtel Money',
      'bank': 'Bank'
    };
    
    const providerName = methodMap[selectedMethod] || selectedMethod;
    return recipientPaymentMethods.find(pm => 
      pm.provider === providerName || 
      pm.provider?.includes(providerName) ||
      providerName.includes(pm.provider)
    );
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      notify('Please select a payment method', 'info');
      return;
    }

    if ((selectedMethod === 'mpesa_stk' || selectedMethod === 'mpesa' || selectedMethod === 'tigopesa' || selectedMethod === 'airtel') && !phoneNumber) {
      notify('Please enter your phone number', 'info');
      return;
    }

    if (selectedMethod === 'bank' && !accountNumber) {
      notify('Please enter your account number', 'info');
      return;
    }

    // STK is automatic; no manual reference is required
    if (selectedMethod !== 'mpesa_stk' && !referenceNumber.trim()) {
      notify('Please enter a payment reference number', 'info');
      return;
    }

    setIsProcessing(true);

    try {
      const autoRef = selectedMethod === 'mpesa_stk'
        ? `STK-${Date.now().toString().slice(-8)}`
        : referenceNumber.trim();

      // Use paymentService which handles mock mode automatically
      const paymentProvider = selectedMethod === 'mpesa_stk' || selectedMethod === 'mpesa' ? 'mpesa' 
        : selectedMethod === 'tigopesa' ? 'tigopesa'
        : selectedMethod === 'airtel' ? 'airtel'
        : selectedMethod === 'bank' ? 'bank'
        : selectedMethod === 'card' ? 'stripe' : 'mpesa';

      const paymentResult = await paymentService.processPayment({
        amount,
        currency: currency || userCurrency || 'TZS',
        provider: paymentProvider,
        userId: user?.id || '',
        userName: user?.name || '',
        description,
        itemId,
        itemType,
        recipientId,
        phoneNumber: (selectedMethod.includes('pesa') || selectedMethod === 'airtel') ? phoneNumber : undefined,
        metadata: {
          referenceNumber: autoRef,
          accountNumber: selectedMethod === 'bank' ? accountNumber : undefined,
        }
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }

      if (paymentResult.requiresVerification) {
        notify(paymentResult.message || 'Payment submitted. Awaiting verification.', 'info');
      } else {
        notify(paymentResult.message || 'Payment processed successfully!', 'success');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      setSelectedMethod('');
      setPhoneNumber('');
      setAccountNumber('');
      setReferenceNumber('');
    } catch (error) {
      handleError(error, notify);
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-white dark:bg-[#0A1B2E] w-full max-w-md rounded-2xl sm:rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 my-auto">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-gray-100 dark:bg-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 z-10"
        >
          <X size={18} className="sm:w-5 sm:h-5" />
        </button>

        <div className="p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-nexafya-blue/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CreditCard className="text-nexafya-blue sm:w-8 sm:h-8" size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-800 mb-1 sm:mb-2">Complete Payment</h2>
            <p className="text-gray-500 text-xs sm:text-sm px-2">{description}</p>
            <p className="text-2xl sm:text-3xl font-bold text-nexafya-blue mt-3 sm:mt-4">
              {currency === 'TZS' ? 'TZS' : '$'} {amount.toLocaleString()}
            </p>
          </div>

          {/* Recipient Payment Details */}
          {recipientId && recipientInfo && (
            <div className="mb-4 sm:mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <User size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  Pay to: <span className="break-words">{recipientInfo.name}</span> ({recipientInfo.role === 'DOCTOR' ? 'Doctor' : 'Pharmacy'})
                </h3>
              </div>
              
              {loadingRecipient ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                  Loading payment details...
                </div>
              ) : recipientPaymentMethods.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">
                    Available Payment Methods:
                  </p>
                  {recipientPaymentMethods.map((pm) => (
                    <div key={pm.id} className="bg-white dark:bg-[#0F172A] rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">{pm.provider}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1 break-words">
                            <span className="font-mono">{pm.number}</span>
                            {pm.name && <span> • {pm.name}</span>}
                            {pm.bankName && <span> • {pm.bankName}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(pm.number, `pm-${pm.id}`)}
                          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                          title="Copy payment number"
                        >
                          {copiedField === `pm-${pm.id}` ? (
                            <Check size={14} className="sm:w-4 sm:h-4 text-green-600" />
                          ) : (
                            <Copy size={14} className="sm:w-4 sm:h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Payment methods will be shown after you select a payment method.
                </p>
              )}
            </div>
          )}

          {/* Payment Instructions */}
          {selectedMethod && recipientId && (
            <div className="mb-4 sm:mb-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-amber-200 dark:border-amber-800/50">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                <FileText size={16} className="sm:w-[18px] sm:h-[18px] text-amber-600 dark:text-amber-400 flex-shrink-0" />
                Payment Instructions
              </h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                {getRecipientPaymentForMethod(selectedMethod) ? (
                  <div className="bg-white dark:bg-[#0F172A] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-2">
                      Send payment to:
                    </p>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Payment Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white break-all sm:break-normal">
                            {getRecipientPaymentForMethod(selectedMethod)?.number}
                          </span>
                          <button
                            onClick={() => copyToClipboard(
                              getRecipientPaymentForMethod(selectedMethod)?.number || '',
                              'payment-number'
                            )}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
                          >
                            {copiedField === 'payment-number' ? (
                              <Check size={14} className="sm:w-4 sm:h-4 text-green-600" />
                            ) : (
                              <Copy size={14} className="sm:w-4 sm:h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Account Name:</span>
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white break-words sm:break-normal text-right sm:text-left">
                          {getRecipientPaymentForMethod(selectedMethod)?.name}
                        </span>
                      </div>
                      {getRecipientPaymentForMethod(selectedMethod)?.bankName && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Bank:</span>
                          <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white break-words sm:break-normal text-right sm:text-left">
                            {getRecipientPaymentForMethod(selectedMethod)?.bankName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Please select a payment method to see payment details.
                  </p>
                )}
                
                <div className="bg-white dark:bg-[#0F172A] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-2">
                    Use this Reference Number:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm sm:text-base md:text-lg text-blue-600 dark:text-blue-400 break-all sm:break-normal">
                      {autoReference}
                    </span>
                    <button
                      onClick={() => copyToClipboard(autoReference, 'reference')}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedField === 'reference' ? (
                        <Check size={16} className="sm:w-[18px] sm:h-[18px] text-green-600" />
                      ) : (
                        <Copy size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Include this reference when making payment for verification
                  </p>
                </div>

                {phoneNumber && (
                  <div className="bg-white dark:bg-[#0F172A] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-2">
                      Your Phone Number:
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white break-all sm:break-normal">
                        {phoneNumber}
                      </span>
                      <button
                        onClick={() => copyToClipboard(phoneNumber, 'phone')}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                      >
                        {copiedField === 'phone' ? (
                          <Check size={16} className="sm:w-[18px] sm:h-[18px] text-green-600" />
                        ) : (
                          <Copy size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Use this number when making payment
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-600 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${
                      selectedMethod === method.id
                        ? 'border-nexafya-blue bg-nexafya-blue/10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mx-auto mb-1 sm:mb-2 sm:w-6 sm:h-6 ${selectedMethod === method.id ? 'text-nexafya-blue' : method.color}`} size={20} />
                    <p className={`text-[10px] sm:text-xs font-bold leading-tight ${selectedMethod === method.id ? 'text-nexafya-blue' : 'text-gray-600 dark:text-gray-600'}`}>
                      {method.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {(selectedMethod === 'mpesa_stk' || selectedMethod === 'mpesa' || selectedMethod === 'tigopesa' || selectedMethod === 'airtel') && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-600 mb-1.5 sm:mb-2">
                Phone Number {selectedMethod === 'mpesa_stk' ? '(for STK Push)' : ''}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="255712345678"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-nexafya-blue focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {selectedMethod === 'bank' && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-600 mb-1.5 sm:mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter account number"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-nexafya-blue focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {selectedMethod !== 'mpesa_stk' && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-600 mb-1.5 sm:mb-2">
                Payment Reference Number (from your payment confirmation)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Enter reference (e.g. MPESA1234...)"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-nexafya-blue focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
                <button
                  onClick={() => copyToClipboard(referenceNumber, 'ref-input')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Copy reference"
                >
                  {copiedField === 'ref-input' ? (
                    <Check size={14} className="sm:w-4 sm:h-4 text-green-600" />
                  ) : (
                    <Copy size={14} className="sm:w-4 sm:h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                After making payment, enter the reference number you received. Access will be granted after {recipientInfo?.role === 'DOCTOR' ? 'doctor' : 'pharmacy'} verifies your payment.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
            <Shield size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span>Your payment is secure and encrypted</span>
          </div>

          <button
            onClick={handlePayment}
            disabled={isProcessing || !selectedMethod}
            className="w-full py-3 sm:py-4 bg-nexafya-blue hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-nexafya-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} className="sm:w-5 sm:h-5" />
                <span>Pay {currency === 'TZS' ? 'TZS' : '$'} {amount.toLocaleString()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

