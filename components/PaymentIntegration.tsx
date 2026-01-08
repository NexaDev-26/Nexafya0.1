import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  CheckCircle, 
  X, 
  ArrowRight,
  Lock,
  Shield,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';
import { paymentService } from '../services/paymentService';
import { db as firestore } from '../lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

interface PaymentMethod {
  id: string;
  type: 'MPESA' | 'TIGO_PESA' | 'AIRTEL_MONEY' | 'CARD' | 'BANK';
  name: string;
  icon: any;
  accountNumber?: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  date: string;
  reference: string;
}

export const PaymentIntegration: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      // Load payment methods and transactions from database
      const methods = await loadPaymentMethods();
      const txs = await loadTransactions();
      setPaymentMethods(methods);
      setTransactions(txs);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async (): Promise<PaymentMethod[]> => {
    // Mock data - replace with actual database call
    return [
      { id: '1', type: 'MPESA', name: 'M-Pesa', icon: Smartphone, accountNumber: '255712345678', isDefault: true },
      { id: '2', type: 'TIGO_PESA', name: 'Tigo Pesa', icon: Smartphone, accountNumber: '255712345679', isDefault: false },
    ];
  };

  const loadTransactions = async (): Promise<Transaction[]> => {
    try {
      if (!user?.id) return [];
      const txRef = collection(firestore, 'transactions');
      const q = query(txRef, where('userId', '==', user.id), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data: any = d.data();
        return {
          id: d.id,
          amount: Number(data.amount || 0),
          currency: data.currency || 'TZS',
          method: (data.provider || 'unknown').toString(),
          status: (data.status || 'PENDING') as any,
          description: data.description || 'Payment',
          date: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          reference: data.referenceNumber || data.reference || '',
        } satisfies Transaction;
      });
    } catch (e) {
      console.error('Failed to load transactions from Firestore:', e);
      return [];
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!selectedMethod || !phoneNumber) {
      notify('Please select a payment method and enter phone number', 'warning');
      return;
    }

    try {
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: selectedMethod as any,
        name: selectedMethod === 'MPESA' ? 'M-Pesa' : selectedMethod === 'TIGO_PESA' ? 'Tigo Pesa' : 'Airtel Money',
        icon: Smartphone,
        accountNumber: phoneNumber,
        isDefault: paymentMethods.length === 0,
      };

      // Save to database
      // await db.addPaymentMethod(newMethod);
      
      setPaymentMethods([...paymentMethods, newMethod]);
      setShowAddMethod(false);
      setSelectedMethod('');
      setPhoneNumber('');
      notify('Payment method added successfully', 'success');
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleMakePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      notify('Please enter a valid amount', 'warning');
      return;
    }

    const defaultMethod = paymentMethods.find(m => m.isDefault);
    if (!defaultMethod) {
      notify('Please add a payment method first', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const mapMethodToProvider = (type: PaymentMethod['type']) => {
        switch (type) {
          case 'MPESA':
            return 'mpesa' as const;
          case 'TIGO_PESA':
            return 'tigopesa' as const;
          case 'AIRTEL_MONEY':
            return 'airtel' as const;
          case 'CARD':
            return 'stripe' as const;
          case 'BANK':
            return 'bank' as const;
          default:
            return 'bank' as const;
        }
      };

      const provider = mapMethodToProvider(defaultMethod.type);
      const amount = parseFloat(paymentAmount);

      const result = await paymentService.processPayment({
        amount,
        currency: 'TZS',
        provider,
        userId: user?.id || '',
        userName: user?.name || 'User',
        description: paymentDescription || 'Payment',
        phoneNumber: defaultMethod.accountNumber,
        metadata: {
          paymentMethodId: defaultMethod.id,
          paymentMethodName: defaultMethod.name,
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      const transaction: Transaction = {
        id: result.transactionId || Date.now().toString(),
        amount,
        currency: 'TZS',
        method: defaultMethod.name,
        status: result.requiresVerification ? 'PENDING' : 'COMPLETED',
        description: paymentDescription || 'Payment',
        date: new Date().toISOString(),
        reference: result.referenceNumber || '',
      };

      setTransactions([transaction, ...transactions]);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDescription('');
      notify(result.message || 'Payment processed successfully!', result.requiresVerification ? 'info' : 'success');
    } catch (error) {
      handleError(error, notify);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setPaymentMethods(methods =>
        methods.map(m => ({
          ...m,
          isDefault: m.id === methodId,
        }))
      );
      // Update in database
      // await db.updatePaymentMethod(methodId, { isDefault: true });
      notify('Default payment method updated', 'success');
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      setPaymentMethods(methods => methods.filter(m => m.id !== methodId));
      // Remove from database
      // await db.deletePaymentMethod(methodId);
      notify('Payment method removed', 'success');
    } catch (error) {
      handleError(error, notify);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'FAILED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Methods</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your payment methods and transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddMethod(true)}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Add Method
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
          >
            <Wallet size={20} />
            Make Payment
          </button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Payment Methods</h2>
        {paymentMethods.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payment methods"
            description="Add a payment method to get started"
            action={
              <button
                onClick={() => setShowAddMethod(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Add Payment Method
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className={`p-6 rounded-2xl border-2 ${
                  method.isDefault
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A0F1C]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white dark:bg-[#0F172A] rounded-xl">
                    <method.icon className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Default</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{method.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {method.accountNumber}
                </p>
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="flex-1 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMethod(method.id)}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No transactions yet"
            description="Your payment history will appear here"
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map(transaction => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <CreditCard className="text-gray-600 dark:text-gray-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{transaction.description}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{transaction.method}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-mono">{transaction.reference}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {transaction.currency} {transaction.amount.toLocaleString()}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Payment Method</h2>
              <button
                onClick={() => {
                  setShowAddMethod(false);
                  setSelectedMethod('');
                  setPhoneNumber('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'MPESA', name: 'M-Pesa', icon: Smartphone },
                    { type: 'TIGO_PESA', name: 'Tigo Pesa', icon: Smartphone },
                    { type: 'AIRTEL_MONEY', name: 'Airtel Money', icon: Smartphone },
                  ].map(option => (
                    <button
                      key={option.type}
                      onClick={() => setSelectedMethod(option.type)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedMethod === option.type
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <option.icon className="text-blue-600 dark:text-blue-400 mx-auto mb-2" size={24} />
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{option.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="255712345678"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your mobile money number (format: 255712345678)
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Shield className="text-blue-600 dark:text-blue-400" size={20} />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAddMethod(false);
                  setSelectedMethod('');
                  setPhoneNumber('');
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPaymentMethod}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors"
              >
                Add Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Make Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                  setPaymentDescription('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Amount (TZS) *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-2xl font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="e.g., Consultation fee"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {paymentMethods.find(m => m.isDefault)?.name || 'None'}
                  </span>
                </div>
                {paymentMethods.find(m => m.isDefault)?.accountNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account</span>
                    <span className="font-mono text-sm text-gray-900 dark:text-white">
                      {paymentMethods.find(m => m.isDefault)?.accountNumber}
                    </span>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Clock className="text-blue-600 dark:text-blue-400 animate-spin" size={20} />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Processing payment... Please wait
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                  setPaymentDescription('');
                }}
                disabled={isProcessing}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMakePayment}
                disabled={isProcessing || !paymentAmount}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Clock className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Pay {paymentAmount && `TZS ${parseFloat(paymentAmount).toLocaleString()}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

