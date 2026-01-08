
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { debounce } from 'lodash-es';
import { Medicine, CartItem, UserRole, PharmacyBranch, SalesRecord, InventoryItem } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, Store, X, ArrowRight, LayoutDashboard, Package, Truck, Scan, BarChart2, QrCode, MapPin, Save, Upload, RefreshCw, Check, AlertTriangle, Building2, FileText, Calendar, Shield, Clock, Star, Filter, Heart, TrendingUp, Award, Zap, CheckCircle2, Sparkles, Gift, CreditCard, Lock, RotateCcw, Eye, User as UserIcon, Menu, MessageSquare } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { orderSchema, validateAndSanitize, formatValidationError } from '../utils/validation';
import { handleError, logger } from '../utils/errorHandler';
import { useInventory } from '../hooks/useFirestore';
import { updateDoc, doc, serverTimestamp, collection, getDocs, query, where, getDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { PharmacyInventory } from './PharmacyInventory';
import { PharmacyPOS } from './PharmacyPOS';
import { PharmacyPurchases } from './PharmacyPurchases';
import { PharmacySales } from './PharmacySales';
import { PharmacyDashboard } from './PharmacyDashboard';
import { PurchaseManagement } from './PurchaseManagement';
import { ReportsDashboard } from './ReportsDashboard';
import { BatchExpiryTracker } from './BatchExpiryTracker';
import { UnitConverter } from './UnitConverter';
import { SupplierManagement } from './SupplierManagement';
import { InvoiceGenerator } from './InvoiceGenerator';
import { StockAlerts } from './StockAlerts';
import { SkeletonLoader } from './SkeletonLoader';
import { PullToRefresh } from './PullToRefresh';
import PaymentModal from './PaymentModal';
import { generateWhatsAppOrderLink, sendOrderConfirmation } from '../services/whatsappService';

export const Pharmacy: React.FC = memo(() => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  // Real-time inventory sync
  const { data: inventoryData, loading: inventoryLoading } = useInventory(user?.id || '');
  
  // -- PATIENT SHOP STATE --
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'name' | 'popular'>('default');
  
  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);
  
  // -- PHARMACY MANAGEMENT STATE --
  const [mgmtTab, setMgmtTab] = useState<'dashboard' | 'prescriptions' | 'inventory' | 'pos' | 'branches' | 'purchases' | 'sales' | 'reports' | 'batch-expiry' | 'unit-converter' | 'suppliers' | 'invoices' | 'stock-alerts' | 'orders'>('dashboard');
  const [pharmacyOrders, setPharmacyOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Inventory Edit
  const [showAddInv, setShowAddInv] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ name: '', category: 'General', selling_price: 0, stock: 0 });
  const [myInventory, setMyInventory] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Prescription Handling
  const [qrInput, setQrInput] = useState('');
  const [claimingRx, setClaimingRx] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);
  
  // Branches
  const [branches, setBranches] = useState<PharmacyBranch[]>([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '', license: '', phone: '' });

  // Sync real-time inventory data
  useEffect(() => {
    if (user?.role === UserRole.PHARMACY && inventoryData) {
      setMyInventory(inventoryData);
    }
  }, [inventoryData, user]);

  // Load pharmacy orders
  useEffect(() => {
    if (user?.role === UserRole.PHARMACY && user.id) {
      setLoadingOrders(true);
      const ordersRef = collection(firestore, 'orders');
      const q = query(ordersRef, where('pharmacy_id', '==', user.id));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const ordersData = snapshot.docs.map((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || (data.created_at?.toDate?.()) || new Date();
            
            return {
              id: doc.id,
              orderId: doc.id.slice(0, 8).toUpperCase(),
              customer: data.patient_name || 'Customer',
              patient_id: data.patient_id,
              items: Array.isArray(data.items) ? data.items : [],
              total: data.total_amount || data.total || 0,
              status: data.status || 'PENDING',
              payment_status: data.payment_status || 'PENDING',
              date: createdAt.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              createdAt: createdAt,
              location: data.delivery_address || data.location || 'Not specified',
              delivery_status: data.delivery_status || data.status || 'PENDING',
              status_timestamps: {
                placed: createdAt,
                processing: data.processing_at?.toDate?.() || null,
                dispatched: data.dispatched_at?.toDate?.() || null,
                delivered: data.delivered_at?.toDate?.() || null
              }
            };
          }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          setPharmacyOrders(ordersData);
          setLoadingOrders(false);
        },
        (error) => {
          console.error('Orders listener error:', error);
          setLoadingOrders(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user]);

  // Refresh function for pharmacy orders
  const handlePharmacyRefresh = useCallback(async () => {
    setLoadingOrders(true);
    // The useEffect will automatically reload when loadingOrders changes
  }, []);

  // Order Details Modal - defined early to avoid hoisting issues
  const OrderDetailsModal = ({ order, onClose }: { order: any, onClose: () => void }) => {
    const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
    const [loadingCouriers, setLoadingCouriers] = useState(false);
    const [showCourierSelect, setShowCourierSelect] = useState(false);
    const [selectedCourierId, setSelectedCourierId] = useState<string | null>(order.courier_id || null);

    // Load available couriers when modal opens
    useEffect(() => {
      const loadCouriers = async () => {
        setLoadingCouriers(true);
        try {
          const couriersData = await db.getCouriers();
          // Filter to show only Available or Busy couriers (not Offline)
          const activeCouriers = couriersData.filter((c: any) => 
            c.status === 'Available' || c.status === 'Busy'
          );
          setAvailableCouriers(activeCouriers);
        } catch (error) {
          console.error('Failed to load couriers:', error);
          notify('Failed to load couriers', 'error');
        } finally {
          setLoadingCouriers(false);
        }
      };
      
      if (order.payment_status === 'PAID' && order.status === 'PROCESSING') {
        loadCouriers();
      }
    }, [order.payment_status, order.status, notify]);

    const handleAssignCourier = async (courierId: string) => {
      try {
        const orderRef = doc(firestore, 'orders', order.id);
        await updateDoc(orderRef, {
          courier_id: courierId,
          courier_name: availableCouriers.find(c => c.id === courierId)?.name || 'Courier',
          status: 'DISPATCHED',
          dispatched_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setSelectedCourierId(courierId);
        setShowCourierSelect(false);
        notify('Courier assigned and order dispatched!', 'success');
        onClose();
      } catch (error) {
        handleError(error, notify);
      }
    };

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in safe-area-inset-bottom">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl relative mb-16 md:mb-0 pb-20 md:pb-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
          <X size={24} />
        </button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Details</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
              #{order.orderId || order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              order.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-4 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UserIcon size={18} /> Customer Information
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Name:</span>
              <p className="font-bold text-gray-900 dark:text-white">{order.customer || order.patient_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Order Date:</span>
              <p className="font-bold text-gray-900 dark:text-white">{order.date}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Delivery Address:</span>
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <MapPin size={14} /> {order.location}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Order Items</h3>
          <div className="space-y-2">
            {order.items && order.items.length > 0 ? (
              order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-[#0A1B2E] p-3 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {item.quantity}x {item.name || item.medicine_name || 'Medicine'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      TZS {item.price?.toLocaleString() || '0'} each
                    </p>
                  </div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    TZS {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No items found</p>
            )}
          </div>
        </div>

        {/* Payment Status */}
        {order.payment_status && (
          <div className="mb-4">
            <div className={`p-4 rounded-xl border-2 ${
              order.payment_status === 'PROCESSING' || order.payment_status === 'PENDING_VERIFICATION' 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">Payment Status</p>
                  <p className={`text-lg font-bold ${
                    order.payment_status === 'PROCESSING' || order.payment_status === 'PENDING_VERIFICATION'
                      ? 'text-yellow-700 dark:text-yellow-400'
                      : order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {order.payment_status === 'PENDING_VERIFICATION' ? 'Pending Verification' :
                     order.payment_status === 'PROCESSING' ? 'Processing' :
                     order.payment_status === 'PAID' ? 'Paid' :
                     order.payment_status === 'COMPLETED' ? 'Completed' :
                     order.payment_status}
                  </p>
                </div>
                {(order.payment_status === 'PROCESSING' || order.payment_status === 'PENDING_VERIFICATION') && (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const orderRef = doc(firestore, 'orders', order.id);
                          await updateDoc(orderRef, {
                            payment_status: 'PAID',
                            status: 'PROCESSING',
                            updated_at: serverTimestamp(),
                            updatedAt: serverTimestamp()
                          });
                          
                          // Update transaction if exists (with error handling)
                          try {
                            if (order.transaction_ref || order.transactionRef) {
                              const transQuery = query(
                                collection(firestore, 'transactions'),
                                where('orderId', '==', order.id),
                                where('referenceId', '==', (order.transaction_ref || order.transactionRef))
                              );
                              const transSnapshot = await getDocs(transQuery);
                              if (!transSnapshot.empty) {
                                await updateDoc(doc(firestore, 'transactions', transSnapshot.docs[0].id), {
                                  status: 'COMPLETED',
                                  completedAt: serverTimestamp(),
                                  updatedAt: serverTimestamp()
                                });
                              }
                            }
                          } catch (transError) {
                            console.warn('Failed to update transaction, continuing:', transError);
                            // Don't fail the whole operation if transaction update fails
                          }
                          
                          notify('Payment verified! Order status updated to Processing.', 'success');
                          onClose();
                        } catch (error) {
                          handleError(error, notify);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      Verify Payment
                    </button>
                    <button
                      onClick={async () => {
                        const reason = prompt('Please provide reason for rejection:');
                        if (reason) {
                          try {
                            const orderRef = doc(firestore, 'orders', order.id);
                            await updateDoc(orderRef, {
                              payment_status: 'REJECTED',
                              status: 'CANCELLED',
                              rejection_reason: reason,
                              updated_at: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });
                            notify('Payment rejected. Order cancelled.', 'info');
                            onClose();
                          } catch (error) {
                            handleError(error, notify);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-bold text-gray-900 dark:text-white">TZS {order.total?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">TZS {order.total?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Courier Assignment Section */}
        {order.payment_status === 'PAID' && order.status === 'PROCESSING' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            {order.courier_id || selectedCourierId ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assigned Courier</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {order.courier_name || availableCouriers.find(c => c.id === (order.courier_id || selectedCourierId))?.name || 'Courier'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCourierSelect(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <button
                  onClick={() => setShowCourierSelect(true)}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Assign Courier & Dispatch
                </button>
              </div>
            )}

            {/* Courier Selection Modal */}
            {showCourierSelect && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Courier</h3>
                    <button
                      onClick={() => setShowCourierSelect(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {loadingCouriers ? (
                    <div className="text-center py-8">
                      <Loader2 className="mx-auto animate-spin text-blue-600" size={32} />
                      <p className="text-gray-500 dark:text-gray-400 mt-2">Loading couriers...</p>
                    </div>
                  ) : availableCouriers.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                      <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No couriers available</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        No registered couriers are currently available. Make sure couriers sign up with the COURIER role.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableCouriers.map((courier) => (
                        <button
                          key={courier.id}
                          onClick={() => handleAssignCourier(courier.id)}
                          disabled={courier.status !== 'Available'}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            courier.status === 'Available'
                              ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Truck size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{courier.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{courier.vehicle}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              courier.status === 'Available'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {courier.status}
                            </span>
                          </div>
                          {courier.currentLocation && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                              <MapPin size={12} /> {courier.currentLocation}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    );
  };

  useEffect(() => {
      const loadData = async () => {
          try {
              if (user?.role === UserRole.PHARMACY) {
                  const [inv, myBranches] = await Promise.all([
                      db.getInventory(user.id),
                      db.getPharmacyBranches(user.id)
                  ]);
                  setMyInventory(inv);
                  setBranches(myBranches);
              } else {
                  // For patients, fetch all inventory items from all pharmacies
                  try {
                      const inventoryRef = collection(firestore, 'inventory');
                      const q = query(inventoryRef, where('status', '==', 'ACTIVE'));
                      const snapshot = await getDocs(q);
                      
                      const medsWithPharmacy = await Promise.all(
                          snapshot.docs.map(async (docSnapshot) => {
                              const data = docSnapshot.data();
                              const pharmacyId = data.pharmacy_id;
                              
                              // Get pharmacy details
                              let pharmacyName = 'Pharmacy';
                              let pharmacyBranch = '';
                              let pharmacyLocation = '';
                              
                              if (pharmacyId) {
                                  try {
                                      // Get pharmacy user details
                                      const pharmacyDoc = await getDoc(doc(firestore, 'users', pharmacyId));
                                      if (pharmacyDoc.exists()) {
                                          const pharmacyData = pharmacyDoc.data() as { name?: string };
                                          pharmacyName = pharmacyData.name || 'Pharmacy';
                                      }
                                      
                                      // Get pharmacy branches
                                      const branchesRef = collection(firestore, 'pharmacyBranches');
                                      const branchesQuery = query(branchesRef, where('owner_id', '==', pharmacyId));
                                      const branchesSnapshot = await getDocs(branchesQuery);
                                      
                                      if (!branchesSnapshot.empty) {
                                          const mainBranch = branchesSnapshot.docs.find(d => d.data().is_main_branch) || branchesSnapshot.docs[0];
                                          const branchData = mainBranch.data();
                                          pharmacyBranch = branchData.name || '';
                                          pharmacyLocation = branchData.location || '';
                                      }
                                  } catch (e) {
                                      console.error('Failed to load pharmacy details:', e);
                                  }
                              }
                              
                              return {
                                  id: docSnapshot.id,
                                  name: data.name || 'Unknown Medicine',
                                  category: data.category || 'General',
                                  price: Number(data.selling_price || data.price || 0),
                                  stock: Number(data.stock || 0),
                                  inStock: Number(data.stock || 0) > 0,
                                  description: data.description || '',
                                  image: data.image_url || data.image || 'https://placehold.co/400x400?text=Medicine',
                                  pharmacyName: pharmacyName,
                                  pharmacyId: pharmacyId,
                                  pharmacyBranch: pharmacyBranch,
                                  pharmacyLocation: pharmacyLocation
                              } as Medicine & { pharmacyBranch?: string; pharmacyLocation?: string };
                          })
                      );
                      
                      setMedicines(medsWithPharmacy);
                  } catch (e) {
                      console.error('Failed to load medicines with pharmacy info:', e);
                      // Fallback to simple medicines
                  const meds = await db.getMedicines();
                  setMedicines(meds);
                  }
              }
          } catch (e) {
              console.error(e);
          }
      };
      loadData();
  }, [user]);

  // -- INVENTORY HANDLERS --
  const handleUpdateStock = async (itemId: string, newStock: number) => {
    setSyncing(true);
    try {
      const itemRef = doc(firestore, 'inventory', itemId);
      await updateDoc(itemRef, {
        stock: newStock,
        lastUpdated: serverTimestamp()
      });
      notify('Stock updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update stock:', error);
      notify('Failed to update stock', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveInventory = async () => {
      if (!newItem.name || !newItem.selling_price) {
          notify("Name and Price are required", "error");
          return;
      }
      try {
          const added = await db.addInventoryItem({
              pharmacy_id: user?.id,
              name: newItem.name,
              category: newItem.category,
              selling_price: Number(newItem.selling_price),
              stock: Number(newItem.stock),
              image_url: newItem.image_url || 'https://placehold.co/150',
              status: 'ACTIVE',
              description: newItem.description
          });
          if(added) {
              // Real-time sync will update myInventory automatically
              setShowAddInv(false);
              setNewItem({ name: '', category: 'General', selling_price: 0, stock: 0 });
              notify("Medicine added to inventory (synced)", "success");
          }
      } catch (e) {
          notify("Failed to add item", "error");
      }
  };

  const handleDeleteItem = async (id: string) => {
      if(!confirm("Remove this item?")) return;
      try {
          await db.deleteInventoryItem(id);
          // Real-time sync will update myInventory automatically
          notify("Item removed (synced)", "info");
      } catch (error) {
          console.error('Failed to delete item:', error);
          notify("Failed to remove item", "error");
      }
  };

  // -- PRESCRIPTION HANDLERS --
  const handleVerifyQR = async () => {
      if (!qrInput) return;
      setIsVerifying(true);
      notify("Verifying Prescription...", "info");
      
      try {
          const rx = await db.verifyPrescription(qrInput.trim());
          if (rx) {
              if (rx.status === 'DISPENSED') {
                  notify("This prescription has already been dispensed.", "error");
                  setClaimingRx(null);
              } else {
                  setClaimingRx({
                      id: rx.id || '',
                      patient: (rx as any).patient?.name || rx.patientName || 'Unknown Patient',
                      doctor: rx.doctorName || 'Dr. Specialist',
                      items: typeof rx.items === 'string' ? JSON.parse(rx.items) : (rx.items || []),
                      status: rx.status || 'ISSUED',
                      notes: rx.notes || '',
                      qr_code: rx.qrCode || rx.qrCodeUrl || (rx as any).qr_code || ''
                  });
                  notify("Prescription Verified!", "success");
              }
          } else {
              notify("Invalid QR Code", "error");
              setClaimingRx(null);
          }
      } catch (e) {
          notify("Verification Failed", "error");
      } finally {
          setIsVerifying(false);
      }
  };

  const handleClaimRx = async () => {
      if (!claimingRx || !user) return;
      setIsDispensing(true);
      try {
          const success = await db.dispensePrescription(claimingRx.id, user.id);
          if (success) {
              notify("Medicines Dispensed", "success");
              setClaimingRx(null);
              setQrInput('');
          } else {
              notify("Failed to dispense.", "error");
          }
      } catch (e) {
          notify("System Error", "error");
      } finally {
          setIsDispensing(false);
      }
  };

  // -- BRANCH HANDLERS --
  const handleCreateBranch = async () => {
      if(!newBranch.name || !newBranch.location) {
          notify("Name and Location are required", "error");
          return;
      }
      try {
          const created = await db.createPharmacyBranch({
              owner_id: user?.id,
              name: newBranch.name,
              location: newBranch.location,
              license_number: newBranch.license,
              phone_contact: newBranch.phone,
              is_main_branch: branches.length === 0
          });
          if(created) {
              setBranches([...branches, created]);
              setShowAddBranch(false);
              setNewBranch({ name: '', location: '', license: '', phone: '' });
              notify("Branch added successfully", "success");
          }
      } catch (e) {
          notify("Failed to create branch", "error");
      }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (user?.role === UserRole.PHARMACY) {
      return (
          <>
              {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
              <PullToRefresh onRefresh={handlePharmacyRefresh} disabled={loadingOrders}>
          <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-140px)] gap-4 md:gap-6 animate-in fade-in duration-500">
              
              {/* Mobile Sidebar Toggle Button - Better Positioning */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="md:hidden fixed top-20 left-4 z-40 p-3 bg-white dark:bg-[#0F172A] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-110"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>

              {/* Mobile Sidebar Overlay - Enhanced */}
              {isMobileSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
              )}
              
              {/* Sidebar - Enhanced Mobile Design */}
              <div className={`w-72 md:w-64 bg-white dark:bg-[#0F172A] rounded-2xl md:rounded-2xl shadow-xl md:shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 md:p-4 mb-4 md:mb-0 fixed md:static top-0 left-0 h-full md:h-auto z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
              } overflow-y-auto pb-20 md:pb-4`}>
                  {/* Sidebar Header */}
                  <div className="p-4 mb-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Pharmacy</h2>
                      <button
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Close sidebar"
                      >
                        <X size={18} className="text-gray-500" />
                      </button>
                  </div>
                  
                  {/* Navigation Items - Enhanced */}
                  <nav className="space-y-1">
                  {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { id: 'orders', label: 'Orders', icon: Package },
                      { id: 'pos', label: 'POS', icon: ShoppingCart },
                      { id: 'inventory', label: 'Inventory', icon: Package },
                      { id: 'stock-alerts', label: 'Stock Alerts', icon: AlertTriangle },
                      { id: 'purchases', label: 'Purchases', icon: Truck },
                      { id: 'suppliers', label: 'Suppliers', icon: Building2 },
                      { id: 'sales', label: 'Sales', icon: BarChart2 },
                      { id: 'invoices', label: 'Invoices', icon: FileText },
                      { id: 'reports', label: 'Reports', icon: BarChart2 },
                      { id: 'batch-expiry', label: 'Batch/Expiry', icon: Calendar },
                      { id: 'unit-converter', label: 'Unit Converter', icon: ArrowRight },
                      { id: 'prescriptions', label: 'Prescriptions', icon: QrCode },
                      { id: 'branches', label: 'Branches', icon: Store },
                    ].map(item => {
                      const isActive = mgmtTab === item.id;
                      return (
                      <button 
                          key={item.id} 
                          onClick={() => {
                            setMgmtTab(item.id as any);
                            setIsMobileSidebarOpen(false); // Close mobile sidebar on selection
                          }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                              isActive 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                            }`}
                        >
                            <item.icon size={18} className={isActive ? 'scale-110' : ''} />
                            <span className="flex-1 text-left">{item.label}</span>
                            {isActive && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            )}
                      </button>
                      );
                    })}
                  </nav>
              </div>

              {/* Main Content - Enhanced Mobile with Safe Area */}
              <div className="flex-1 bg-white dark:bg-[#0F172A] rounded-2xl md:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col p-4 md:p-6 min-w-0" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
                  
                  {/* INVENTORY TAB */}
                  {mgmtTab === 'inventory' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <PharmacyInventory />
                      </div>
                  )}

                  {/* ORDERS TAB */}
                  {mgmtTab === 'orders' && (
                      <div className="h-full overflow-y-auto pr-2 space-y-6">
                          <div className="flex justify-between items-center">
                              <div>
                                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Orders Management</h2>
                                  <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage incoming orders from patients</p>
                              </div>
                          </div>

                          {loadingOrders ? (
                              <SkeletonLoader type="list" count={3} />
                          ) : pharmacyOrders.length === 0 ? (
                              <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-12 border border-gray-200 dark:border-gray-700/50 text-center">
                                  <Package className="mx-auto text-gray-300 mb-4" size={48} />
                                  <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">No orders yet</p>
                                  <p className="text-sm text-gray-400 dark:text-gray-500">Orders from patients will appear here</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 gap-4">
                                  {pharmacyOrders.map((order) => (
                                      <div 
                                          key={order.id} 
                                          className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:shadow-lg transition-all cursor-pointer"
                                          onClick={() => setSelectedOrder(order)}
                                      >
                                          <div className="flex justify-between items-start mb-4">
                                              <div>
                                                  <div className="flex items-center gap-3 mb-2">
                                                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                                                          #{order.orderId || order.id.slice(0, 8).toUpperCase()}
                                                      </span>
                                                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                          order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                          order.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                      }`}>
                                                          {order.status}
                                                      </span>
                                                  </div>
                                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                                                      {order.customer || order.patient_name || 'Customer'}
                                                  </h3>
                                                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                      <Clock size={14} /> {order.date}
                                                  </p>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                      TZS {order.total.toLocaleString()}
                                                  </p>
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          setSelectedOrder(order);
                                                      }}
                                                      className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline flex items-center gap-1"
                                                  >
                                                      <Eye size={14} /> View Details
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* PRESCRIPTIONS TAB */}
                  {mgmtTab === 'prescriptions' && (
                      <div className="space-y-6 md:space-y-8 pb-24 md:pb-6">
                          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white font-display">Prescription Fulfillment</h2>
                          
                          <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-4 md:p-8 border-2 border-dashed border-gray-300 dark:border-gray-700/50 flex flex-col items-center justify-center text-center">
                              <QrCode size={48} className="text-gray-400 mb-4" />
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Scan Patient QR Code</h3>
                              <p className="text-sm text-gray-500 mb-6 max-w-xs">Enter the code found on the patient's app to view and dispense medicines.</p>
                              
                              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                                  <input 
                                      type="text" 
                                      value={qrInput}
                                      onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                                      placeholder="e.g. RX-17382..."
                                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase text-sm md:text-base"
                                  />
                                  <button 
                                    onClick={handleVerifyQR} 
                                    disabled={isVerifying}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors whitespace-nowrap"
                                  >
                                      {isVerifying ? 'Checking...' : 'Verify'}
                                  </button>
                              </div>
                          </div>

                          {claimingRx && (
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 md:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-bottom-4 pb-24 md:pb-6">
                                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                      <div className="flex-1">
                                          <h4 className="font-bold text-base md:text-lg text-emerald-800 dark:text-emerald-300">Valid Prescription Found</h4>
                                          <p className="text-xs md:text-sm text-emerald-600 dark:text-emerald-400">Patient: {claimingRx.patient} • Dr. {claimingRx.doctor}</p>
                                          <p className="text-xs text-gray-500 mt-1 break-all">ID: {claimingRx.qr_code}</p>
                                      </div>
                                      <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">{claimingRx.status}</span>
                                  </div>
                                  
                                  <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 mb-6">
                                      {claimingRx.items && claimingRx.items.length > 0 ? claimingRx.items.map((item: any, i: number) => (
                                          <div key={i} className="flex justify-between border-b border-gray-100 dark:border-gray-700/50 last:border-0 py-2 text-sm md:text-base">
                                              <span className="font-medium flex-1 pr-2">{item.name} <span className="text-gray-500 text-xs md:text-sm">({item.dosage})</span></span>
                                              <span className="font-bold whitespace-nowrap">x{item.qty || item.quantity || 1}</span>
                                          </div>
                                      )) : (
                                          <p className="text-gray-500 italic text-sm">No items listed in prescription.</p>
                                      )}
                                      {claimingRx.notes && <p className="mt-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 italic break-words">Doctor Notes: {claimingRx.notes}</p>}
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-3">
                                      <button onClick={() => setClaimingRx(null)} className="flex-1 py-3 bg-white dark:bg-[#0F172A] text-gray-700 dark:text-gray-300 font-bold rounded-xl border border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                      <button 
                                        onClick={handleClaimRx} 
                                        disabled={isDispensing}
                                        className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-70 transition-colors"
                                      >
                                          {isDispensing ? 'Processing...' : 'Dispense Medicines'}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* BRANCHES TAB */}
                  {mgmtTab === 'branches' && (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Manage Branches</h2>
                              <button onClick={() => setShowAddBranch(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
                                  <Plus size={16} /> Add Branch
                              </button>
                          </div>

                          {showAddBranch && (
                              <div className="bg-gray-50 dark:bg-[#0A1B2E]/50 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 mb-6 animate-in slide-in-from-top-2 pb-24 md:pb-6">
                                  <h3 className="font-bold mb-4 text-lg">New Branch Details</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <input type="text" placeholder="Branch Name" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white" />
                                      <input type="text" placeholder="Location" value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white" />
                                      <input type="text" placeholder="License Number" value={newBranch.license} onChange={e => setNewBranch({...newBranch, license: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white" />
                                      <input type="text" placeholder="Phone Contact" value={newBranch.phone} onChange={e => setNewBranch({...newBranch, phone: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white" />
                                  </div>
                                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                                      <button onClick={() => setShowAddBranch(false)} className="px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                                      <button onClick={handleCreateBranch} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Save Branch</button>
                                  </div>
                              </div>
                          )}

                          <div className="grid gap-4">
                              {branches.map(branch => (
                                  <div key={branch.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 flex justify-between items-center bg-gray-50 dark:bg-[#0A1B2E]/20">
                                      <div className="flex gap-4 items-center">
                                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${branch.is_main_branch ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                              <Store size={24} />
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                  {branch.name}
                                                  {branch.is_main_branch && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Main</span>}
                                              </h4>
                                              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={12}/> {branch.location}</p>
                                          </div>
                                      </div>
                                      <div className="text-right text-sm text-gray-500">
                                          <p>License: {branch.license_number || 'N/A'}</p>
                                          <p>{branch.phone_contact}</p>
                                      </div>
                                  </div>
                              ))}
                              {branches.length === 0 && (
                                  <p className="text-center text-gray-500 py-10">No branches found.</p>
                              )}
                          </div>
                      </div>
                  )}

                  {/* DASHBOARD TAB */}
                  {mgmtTab === 'dashboard' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <PharmacyDashboard onNavigate={(view) => {
                              if (view === 'sales') setMgmtTab('sales');
                          }} />
                      </div>
                  )}

                  {/* POS TAB */}
                  {mgmtTab === 'pos' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <PharmacyPOS user={user} />
                      </div>
                  )}

                  {/* PURCHASES TAB */}
                  {mgmtTab === 'purchases' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <PurchaseManagement />
                      </div>
                  )}

                  {/* SALES TAB */}
                  {mgmtTab === 'sales' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <PharmacySales />
                      </div>
                  )}

                  {/* REPORTS TAB */}
                  {mgmtTab === 'reports' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <ReportsDashboard />
                      </div>
                  )}

                  {/* BATCH/EXPIRY TAB */}
                  {mgmtTab === 'batch-expiry' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <BatchExpiryTracker />
                      </div>
                  )}

                  {/* UNIT CONVERTER TAB */}
                  {mgmtTab === 'unit-converter' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <UnitConverter />
                      </div>
                  )}

                  {/* SUPPLIERS TAB */}
                  {mgmtTab === 'suppliers' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <SupplierManagement />
                      </div>
                  )}

                  {/* INVOICES TAB */}
                  {mgmtTab === 'invoices' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <InvoiceGenerator />
                      </div>
                  )}

                  {/* STOCK ALERTS TAB */}
                  {mgmtTab === 'stock-alerts' && (
                      <div className="h-full overflow-y-auto pr-2">
                          <StockAlerts />
                      </div>
                  )}
              </div>
          </div>
          </PullToRefresh>
          </>
      );
  }

  // Cart handlers
  const handleAddToCart = (medicine: Medicine) => {
    const existingItem = cart.find(item => item.id === medicine.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === medicine.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const cartItem: CartItem = {
        ...medicine,
        quantity: 1
      };
      setCart([...cart, cartItem]);
    }
    notify(`${medicine.name} added to cart`, 'success');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }
    setCart(cart.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    
    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Get pharmacy details from first item (assuming all items from same pharmacy)
      const firstItem = medicines.find(m => m.id === cart[0].id);
      const pharmacyId = firstItem?.pharmacyId || '';
      const pharmacyName = firstItem?.pharmacyName || 'Pharmacy';
      // pharmacyBranch and pharmacyLocation are dynamically added but not in Medicine type
      const pharmacyBranch = (firstItem as any)?.pharmacyBranch || '';
      const pharmacyLocation = (firstItem as any)?.pharmacyLocation || '';
      
      // Prepare order data
      const orderData = {
        patient_id: user.id,
        patient_name: user.name,
        pharmacy_id: pharmacyId,
        pharmacy_name: pharmacyName,
        pharmacy_branch: pharmacyBranch,
        pharmacy_location: pharmacyLocation,
        items: cart.map(item => ({
          inventory_id: item.id, // Use inventory_id for transaction
          medicine_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: total,
        total_amount: total,
        location: user.location || 'Not specified',
        delivery_address: user.location || 'Not specified',
        payment_method: 'mpesa', // Default payment method
        status: 'PENDING',
        payment_status: 'PENDING',
        delivery_status: 'PENDING',
        createdAt: serverTimestamp()
      };
      
      // Validate order data
      const validation = validateAndSanitize(orderSchema, orderData);
      if (!validation.success) {
        const errorMessage = formatValidationError(validation.errors!);
        notify(errorMessage, 'error');
        logger.warn('Order validation failed', { orderData, errors: validation.errors });
        return;
      }
      
      // Store pending order data and show payment modal
      setPendingOrderData(validation.data!);
      setShowPaymentModal(true);
      setShowCheckout(false);
    } catch (error: any) {
      handleError(error, notify, { userId: user.id, cartItems: cart.length });
    }
  };

  // Complete order creation after payment success
  const handlePaymentSuccess = async () => {
    if (!pendingOrderData) return;
    
    try {
      // Update payment status to PROCESSING since payment was submitted
      const orderDataWithPayment = {
        ...pendingOrderData,
        payment_status: 'PROCESSING' // Payment submitted, awaiting verification
      };
      
      // Create order with validated data
      const orderId = await db.createOrder(orderDataWithPayment);
      setCart([]);
      setShowCart(false);
      setShowCheckout(false);
      setPendingOrderData(null);
      notify('Order placed successfully! Payment submitted. You will receive a confirmation soon.', 'success');
      logger.info('Order created successfully after payment', { userId: user?.id });
      
      // Send WhatsApp notification if configured (with mock fallback)
      try {
        const orderDoc = await getDoc(doc(firestore, 'orders', orderId));
        if (orderDoc.exists()) {
          const orderData = { id: orderId, ...orderDoc.data() };
          const firstItem = medicines.find(m => m.id === cart[0]?.id);
          const pharmacyId = firstItem?.pharmacyId || pendingOrderData.pharmacy_id;
          
          // Get pharmacy phone (with mock fallback)
          let pharmacyPhone = null;
          try {
            if (pharmacyId) {
              const pharmacyDoc = await getDoc(doc(firestore, 'users', pharmacyId));
              if (pharmacyDoc.exists()) {
                pharmacyPhone = pharmacyDoc.data().phone;
              } else {
                // Mock phone if pharmacy not found
                pharmacyPhone = '+255712345678';
                console.log('[Mock] Using mock pharmacy phone number');
              }
            } else {
              // Mock phone if no pharmacy ID
              pharmacyPhone = '+255712345678';
              console.log('[Mock] Using mock pharmacy phone number');
            }
          } catch (phoneError) {
            console.warn('Failed to get pharmacy phone, using mock:', phoneError);
            pharmacyPhone = '+255712345678';
          }
          
          // Send WhatsApp notification (will use mock if API unavailable)
          if (pharmacyPhone) {
            await sendOrderConfirmation(
              orderData,
              { fullName: user?.name || 'Customer', phone: user?.phone || '+255700000000' },
              pharmacyPhone
            );
          }
        }
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed, continuing without it:', whatsappError);
        // Don't fail the order if WhatsApp fails - it will use mock mode automatically
      }
    } catch (error: any) {
      handleError(error, notify, { userId: user?.id, cartItems: cart.length });
      // Keep payment modal open if order creation fails
      setShowPaymentModal(true);
    }
  };

  // Handle WhatsApp ordering
  const handleWhatsAppOrder = async () => {
    if (!user || cart.length === 0) return;
    
    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Get pharmacy details from first item
      const firstItem = medicines.find(m => m.id === cart[0].id);
      const pharmacyId = firstItem?.pharmacyId || '';
      const pharmacyName = firstItem?.pharmacyName || 'Pharmacy';
      
      // Get pharmacy phone (with mock fallback)
      let pharmacyPhone = null;
      try {
        if (pharmacyId) {
          const pharmacyDoc = await getDoc(doc(firestore, 'users', pharmacyId));
          if (pharmacyDoc.exists()) {
            pharmacyPhone = pharmacyDoc.data().phone;
          }
        }
      } catch (e) {
        console.warn('Failed to get pharmacy phone, using mock:', e);
      }
      
      // Use mock phone if not available (for testing/demo)
      if (!pharmacyPhone) {
        pharmacyPhone = '+255712345678';
        console.log('[Mock] Using mock pharmacy phone number for WhatsApp ordering');
      }
      
      // Build order message
      const itemsList = cart.map((item, index) => 
        `${index + 1}. ${item.name} x${item.quantity} - TZS ${(item.price * item.quantity).toLocaleString()}`
      ).join('\n');
      
      const message = `🛒 *NEW ORDER REQUEST*\n\n` +
        `*Customer Details:*\n` +
        `Name: ${user.name}\n` +
        (user.phone ? `Phone: ${user.phone}\n` : '') +
        (user.location ? `Location: ${user.location}\n` : '') +
        `\n*Order Details:*\n` +
        `\n*Items:*\n${itemsList}\n` +
        `\n*Total: TZS ${total.toLocaleString()}*\n` +
        `\nPlease confirm this order. Thank you! 🙏`;
      
      // Generate WhatsApp link and open
      const whatsappUrl = generateWhatsAppOrderLink(pharmacyPhone, message);
      window.open(whatsappUrl, '_blank');
      
      notify('Opening WhatsApp to place your order...', 'info');
      
      // Create order with viaWhatsapp flag
      const orderData = {
        patient_id: user.id,
        patient_name: user.name,
        pharmacy_id: pharmacyId,
        pharmacy_name: pharmacyName,
        items: cart.map(item => ({
          inventory_id: item.id,
          medicine_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: total,
        total_amount: total,
        location: user.location || 'Not specified',
        delivery_address: user.location || 'Not specified',
        payment_method: 'whatsapp',
        status: 'PENDING',
        payment_status: 'PENDING',
        delivery_status: 'PENDING',
        viaWhatsapp: true,
        createdAt: serverTimestamp()
      };
      
      // Validate and create order (with error handling and mock fallback)
      try {
        const validation = validateAndSanitize(orderSchema, orderData);
        if (validation.success) {
          try {
            await db.createOrder(validation.data!);
            setCart([]);
            setShowCart(false);
            logger.info('WhatsApp order created', { userId: user.id });
          } catch (orderError: any) {
            console.warn('Failed to create order in database, continuing gracefully:', orderError);
            // Continue - WhatsApp message was sent which is the main action
            setCart([]);
            setShowCart(false);
            notify('WhatsApp order sent! Order will be processed manually.', 'info');
          }
        } else {
          const errorMessage = formatValidationError(validation.errors!);
          notify(errorMessage, 'error');
        }
      } catch (orderError) {
        console.warn('Order validation/creation error, continuing:', orderError);
        // Don't block user - WhatsApp was opened
        setCart([]);
        setShowCart(false);
        notify('WhatsApp opened. Please complete your order there.', 'info');
      }
    } catch (error: any) {
      console.warn('WhatsApp order error, continuing gracefully:', error);
      // Don't show error to user - WhatsApp link was opened which is the main action
      notify('WhatsApp opened. Please complete your order there.', 'info');
    }
  };

  const categories = ['All', ...new Set(medicines.map(m => m.category))];
  
  // Calculate price range from medicines
  const maxPrice = medicines.length > 0 ? Math.max(...medicines.map(m => m.price || 0)) : 1000000;
  const minPrice = medicines.length > 0 ? Math.min(...medicines.map(m => m.price || 0)) : 0;
  
  // Enhanced filtering with price range
  // Memoize filtered medicines with debounced search
  const filteredMedicines = useMemo(() => {
    let filtered = medicines.filter(med => {
      const matchesSearch = !debouncedSearchTerm || 
        med.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        med.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (med.description && med.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (med.pharmacyName && med.pharmacyName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
      const matchesPrice = (med.price || 0) >= priceRange[0] && (med.price || 0) <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          // Sort by stock availability (in stock first)
          if (a.inStock && !b.inStock) return -1;
          if (!a.inStock && b.inStock) return 1;
          return 0;
        default:
          return 0;
      }
    });
  }, [medicines, debouncedSearchTerm, selectedCategory, priceRange, sortBy]);
  
  // Memoize cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const medicine = medicines.find(m => m.id === item.id);
      return sum + (medicine?.price || 0) * item.quantity;
    }, 0);
  }, [cart, medicines]);

  // Patient View - Redesigned with Conversion Focus
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 relative pb-24 md:pb-6">
      {/* Payment Modal for Medicine Checkout */}
      {pendingOrderData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingOrderData(null);
          }}
          amount={pendingOrderData.total || pendingOrderData.total_amount || 0}
          currency="TZS"
          description={`Medicine order: ${pendingOrderData.items?.length || 0} item(s)`}
          itemType="medicine"
          itemId={`order-${Date.now()}`}
          recipientId={pendingOrderData.pharmacy_id}
          onSuccess={handlePaymentSuccess}
        />
      )}
      
      {/* Hero Section with Trust Signals */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl md:rounded-[2.5rem] p-6 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-yellow-300" size={24} />
            <span className="text-yellow-200 font-bold text-sm uppercase tracking-wider">Trusted by 10,000+ Patients</span>
                    </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 leading-tight">
            Your Health, Delivered to Your Door
          </h1>
          <p className="text-blue-100 text-sm md:text-lg mb-4 md:mb-6 max-w-2xl">
            Get authentic medicines from verified pharmacies. Fast delivery, secure payment, and expert care—all in one place.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Shield size={18} className="text-yellow-300" />
              <span className="text-sm font-bold">100% Authentic</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Truck size={18} className="text-yellow-300" />
              <span className="text-sm font-bold">Fast Delivery</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Lock size={18} className="text-yellow-300" />
              <span className="text-sm font-bold">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Clock size={18} className="text-yellow-300" />
              <span className="text-sm font-bold">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Top Row: Search, Category, Sort, Cart */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search medicines, symptoms, pharmacies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
                aria-label="Search for medicines"
                aria-describedby="pharmacy-search-description"
              />
              <span id="pharmacy-search-description" className="sr-only">Search for medicines by name, category, description, or pharmacy name</span>
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-10 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full md:w-48 pl-4 pr-10 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
                <option value="popular">In Stock First</option>
              </select>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 hover:scale-105"
            >
              <ShoppingCart size={20} />
              Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                  {cart.length}
                </span>
              )}
                        </button>
          </div>
          
          {/* Price Range Filter */}
          {medicines.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Price Range:</span>
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-24 px-3 py-2 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-24 px-3 py-2 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">TZS</span>
                  <button
                    onClick={() => setPriceRange([minPrice, maxPrice])}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benefits Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-24 md:pb-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center mb-4">
            <Award className="text-emerald-600 dark:text-emerald-400" size={24} />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Verified Quality</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">All medicines are verified and sourced from licensed pharmacies</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
            <Zap className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Fast Delivery</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Same-day delivery available in major cities across Tanzania</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mb-4">
            <CreditCard className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Easy Payment</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pay with M-Pesa, Tigo Pesa, Airtel Money, or card</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center mb-4">
            <Gift className="text-amber-600 dark:text-amber-400" size={24} />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Special Offers</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Exclusive discounts and offers for regular customers</p>
        </div>
      </div>

      {/* Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Browse Medicines</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {filteredMedicines.length} {filteredMedicines.length === 1 ? 'medicine' : 'medicines'} available
            </p>
          </div>
        </div>
        
        {filteredMedicines.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-gray-100 dark:border-gray-700/50 text-center">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">No medicines found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-24 md:pb-6">
            {filteredMedicines.map((med, index) => (
              <div 
                key={med.id} 
                className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 hover:shadow-xl transition-all hover:-translate-y-1 group flex flex-col"
                role="listitem"
                aria-posinset={index + 1}
                aria-setsize={filteredMedicines.length}
                id={`medicine-${med.id}-description`}
              >
                {/* Product Image */}
                <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 group-hover:shadow-lg transition-shadow">
                  <img 
                    src={med.image || 'https://placehold.co/400x400?text=Medicine'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={med.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/400x400?text=Medicine';
                    }}
                  />
                  {!med.inStock && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    {med.category}
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {med.name}
                  </h3>
                  {med.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 flex-1">
                      {med.description}
                    </p>
                  )}
                  
                  {/* Pharmacy Info */}
                  {(med.pharmacyName || (med as any).pharmacyBranch || (med as any).pharmacyLocation) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-3 border border-blue-100 dark:border-blue-800">
                      {med.pharmacyName && (
                        <div className="flex items-center gap-2 mb-1">
                          <Store size={14} className="text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{med.pharmacyName}</span>
                        </div>
                      )}
                      {(med as any).pharmacyBranch && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <Building2 size={12} />
                          {(med as any).pharmacyBranch}
                        </p>
                      )}
                      {(med as any).pharmacyLocation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {(med as any).pharmacyLocation}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Price and Add Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        TZS {med.price.toLocaleString()}
                      </p>
                      {med.stock !== undefined && (
                        <div className="mt-2">
                          {med.stock > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    med.stock > 10 ? 'bg-emerald-500' : 
                                    med.stock > 5 ? 'bg-yellow-500' : 
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${Math.min((med.stock / 50) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {med.stock} left
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-red-500 font-medium">Out of stock</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(med)}
                      disabled={!med.inStock}
                      aria-label={`Add ${med.name} to cart`}
                      aria-describedby={`medicine-${med.id}-description`}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                    </div>
                </div>
            ))}
        </div>
        )}
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white dark:bg-[#0F172A] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 safe-area-inset-bottom">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={20} className="md:w-6 md:h-6" />
                Shopping Cart ({cart.length})
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">Your cart is empty</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Add medicines to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="group bg-white dark:bg-[#0A1B2E] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all duration-200 flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={item.image || 'https://placehold.co/100x100?text=Medicine'} 
                          className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700 group-hover:scale-105 transition-transform duration-200"
                          alt={item.name}
                        />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                          {item.quantity}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-sm md:text-base line-clamp-2">{item.name}</h4>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            TZS {item.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400">×</span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            TZS {(item.price * item.quantity).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-1 border border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all active:scale-95"
                                title="Decrease quantity"
                              >
                                <Minus size={14} className="text-gray-600 dark:text-gray-300" />
                              </button>
                              <span className="font-bold text-gray-900 dark:text-white min-w-[1.5rem] text-center text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all active:scale-95"
                                title="Increase quantity"
                              >
                                <Plus size={14} className="text-gray-600 dark:text-gray-300" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                              title="Remove from cart"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 space-y-5 bg-gradient-to-b from-transparent via-white/50 to-blue-50/50 dark:via-[#0F172A]/50 dark:to-blue-900/10 pb-20 md:pb-6 safe-area-inset-bottom backdrop-blur-sm">
                {/* Order Summary */}
                <div className="bg-white dark:bg-[#0A1B2E] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText size={16} />
                    Order Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        TZS {cartTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Fee</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        Free
                      </span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700 my-3"></div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-base font-bold text-gray-900 dark:text-white">Total Amount</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                        TZS {cartTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full group relative overflow-hidden py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    <Lock size={20} className="relative z-10" />
                    <span className="relative z-10">Secure Checkout</span>
                    <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={handleWhatsAppOrder}
                    className="w-full group relative overflow-hidden py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    <MessageSquare size={20} className="relative z-10" />
                    <span className="relative z-10">Order via WhatsApp</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-[#0A1B2E]/50 rounded-full border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    <Shield size={12} className="text-blue-500" />
                    <span>Secure & Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-[#0A1B2E]/50 rounded-full border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    <Zap size={12} className="text-amber-500" />
                    <span>Fast Delivery</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

Pharmacy.displayName = 'Pharmacy';
