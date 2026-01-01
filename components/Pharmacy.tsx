
import React, { useState, useEffect } from 'react';
import { Medicine, CartItem, UserRole, PharmacyBranch, SalesRecord, InventoryItem } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, Store, X, ArrowRight, LayoutDashboard, Package, Truck, Scan, BarChart2, QrCode, MapPin, Save, Upload, RefreshCw, Check, AlertTriangle, Building2, FileText, Calendar, Shield, Clock, Star, Filter, Heart, TrendingUp, Award, Zap, CheckCircle2, Sparkles, Gift, CreditCard, Lock, RotateCcw, Eye, User as UserIcon } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../hooks/useFirestore';
import { updateDoc, doc, serverTimestamp, collection, getDocs, query, where, getDoc, onSnapshot } from 'firebase/firestore';
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

export const Pharmacy: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  // Real-time inventory sync
  const { data: inventoryData, loading: inventoryLoading } = useInventory(user?.id || '');
  
  // -- PATIENT SHOP STATE --
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'name' | 'popular'>('default');
  
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
                          snapshot.docs.map(async (doc) => {
                              const data = doc.data();
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
                                          pharmacyName = pharmacyDoc.data().name || 'Pharmacy';
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
                                  id: doc.id,
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

  if (user?.role === UserRole.PHARMACY) {
      return (
          <>
              {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
              <PullToRefresh onRefresh={handlePharmacyRefresh} disabled={loadingOrders}>
              <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
              
              {/* Sidebar */}
              <div className="w-full md:w-64 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="p-4 mb-4 border-b border-gray-100 dark:border-gray-700/50">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">My Pharmacy</h2>
                  </div>
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
                  ].map(item => (
                      <button 
                          key={item.id} 
                          onClick={() => setMgmtTab(item.id as any)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${mgmtTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                          <item.icon size={18} /> {item.label}
                      </button>
                  ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col p-6">
                  
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
                      <div className="space-y-8">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Prescription Fulfillment</h2>
                          
                          <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-700/50 flex flex-col items-center justify-center text-center">
                              <QrCode size={48} className="text-gray-400 mb-4" />
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Scan Patient QR Code</h3>
                              <p className="text-sm text-gray-500 mb-6 max-w-xs">Enter the code found on the patient's app to view and dispense medicines.</p>
                              
                              <div className="flex gap-2 w-full max-w-md">
                                  <input 
                                      type="text" 
                                      value={qrInput}
                                      onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                                      placeholder="e.g. RX-17382..."
                                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                                  />
                                  <button 
                                    onClick={handleVerifyQR} 
                                    disabled={isVerifying}
                                    className="bg-blue-600 text-white px-6 rounded-xl font-bold disabled:opacity-50"
                                  >
                                      {isVerifying ? 'Checking...' : 'Verify'}
                                  </button>
                              </div>
                          </div>

                          {claimingRx && (
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-bottom-4">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <h4 className="font-bold text-lg text-emerald-800 dark:text-emerald-300">Valid Prescription Found</h4>
                                          <p className="text-sm text-emerald-600 dark:text-emerald-400">Patient: {claimingRx.patient} • Dr. {claimingRx.doctor}</p>
                                          <p className="text-xs text-gray-500 mt-1">ID: {claimingRx.qr_code}</p>
                                      </div>
                                      <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-xs font-bold">{claimingRx.status}</span>
                                  </div>
                                  
                                  <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 mb-6">
                                      {claimingRx.items && claimingRx.items.length > 0 ? claimingRx.items.map((item: any, i: number) => (
                                          <div key={i} className="flex justify-between border-b border-gray-100 dark:border-gray-700/50 last:border-0 py-2">
                                              <span className="font-medium">{item.name} <span className="text-gray-500 text-sm">({item.dosage})</span></span>
                                              <span className="font-bold">x{item.qty || item.quantity || 1}</span>
                                          </div>
                                      )) : (
                                          <p className="text-gray-500 italic">No items listed in prescription.</p>
                                      )}
                                      {claimingRx.notes && <p className="mt-4 text-sm text-gray-600 italic">Doctor Notes: {claimingRx.notes}</p>}
                                  </div>

                                  <div className="flex gap-4">
                                      <button onClick={() => setClaimingRx(null)} className="flex-1 py-3 bg-white dark:bg-[#0F172A] text-gray-700 dark:text-gray-300 font-bold rounded-xl border border-gray-200 dark:border-gray-700/50">Cancel</button>
                                      <button 
                                        onClick={handleClaimRx} 
                                        disabled={isDispensing}
                                        className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-70"
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
                              <div className="bg-gray-50 dark:bg-[#0A1B2E]/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 mb-6 animate-in slide-in-from-top-2">
                                  <h3 className="font-bold mb-4">New Branch Details</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <input type="text" placeholder="Branch Name" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A]" />
                                      <input type="text" placeholder="Location" value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A]" />
                                      <input type="text" placeholder="License Number" value={newBranch.license} onChange={e => setNewBranch({...newBranch, license: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A]" />
                                      <input type="text" placeholder="Phone Contact" value={newBranch.phone} onChange={e => setNewBranch({...newBranch, phone: e.target.value})} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A]" />
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                      <button onClick={() => setShowAddBranch(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                                      <button onClick={handleCreateBranch} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Save Branch</button>
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

  // Order Details Modal
  const OrderDetailsModal = ({ order, onClose }: { order: any, onClose: () => void }) => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative">
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

              {/* Order Summary */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-bold text-gray-900 dark:text-white">TZS {order.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">TZS {order.total.toLocaleString()}</span>
                  </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {order.status === 'PENDING' && (
                      <button
                          onClick={async () => {
                              try {
                                  const orderRef = doc(firestore, 'orders', order.id);
                                  await updateDoc(orderRef, {
                                      status: 'PROCESSING',
                                      processing_at: serverTimestamp(),
                                      updatedAt: serverTimestamp()
                                  });
                                  notify('Order status updated to Processing', 'success');
                                  onClose();
                              } catch (error) {
                                  notify('Failed to update order status', 'error');
                              }
                          }}
                          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                      >
                          Start Processing
                      </button>
                  )}
                  {order.status === 'PROCESSING' && (
                      <button
                          onClick={async () => {
                              try {
                                  const orderRef = doc(firestore, 'orders', order.id);
                                  await updateDoc(orderRef, {
                                      status: 'DISPATCHED',
                                      dispatched_at: serverTimestamp(),
                                      updatedAt: serverTimestamp()
                                  });
                                  notify('Order dispatched successfully', 'success');
                                  onClose();
                              } catch (error) {
                                  notify('Failed to update order status', 'error');
                              }
                          }}
                          className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                          <Truck size={18} /> Dispatch Order
                      </button>
                  )}
                  {order.status === 'DISPATCHED' && (
                      <button
                          onClick={async () => {
                              try {
                                  const orderRef = doc(firestore, 'orders', order.id);
                                  await updateDoc(orderRef, {
                                      status: 'DELIVERED',
                                      delivered_at: serverTimestamp(),
                                      updatedAt: serverTimestamp()
                                  });
                                  notify('Order marked as delivered', 'success');
                                  onClose();
                              } catch (error) {
                                  notify('Failed to update order status', 'error');
                              }
                          }}
                          className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                          <Check size={18} /> Mark Delivered
                      </button>
                  )}
                  <button
                      onClick={onClose}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                      Close
                  </button>
              </div>
          </div>
      </div>
  );

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
      setCart([...cart, { 
        id: medicine.id, 
        name: medicine.name, 
        price: medicine.price, 
        quantity: 1,
        image: medicine.image 
      }]);
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
      const pharmacyBranch = firstItem?.pharmacyBranch || '';
      const pharmacyLocation = firstItem?.pharmacyLocation || '';
      
      const orderData = {
        patient_id: user.id,
        patient_name: user.name,
        pharmacy_id: pharmacyId,
        pharmacy_name: pharmacyName,
        pharmacy_branch: pharmacyBranch,
        pharmacy_location: pharmacyLocation,
        items: cart.map(item => ({
          medicine_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: total,
        status: 'PENDING',
        payment_status: 'PENDING',
        delivery_status: 'PENDING',
        delivery_address: user.location || 'Not specified',
        createdAt: serverTimestamp()
      };
      await db.createOrder(orderData);
      setCart([]);
      setShowCart(false);
      setShowCheckout(false);
      notify('Order placed successfully! You will receive a confirmation soon.', 'success');
    } catch (error) {
      console.error('Checkout error:', error);
      notify('Failed to place order. Please try again.', 'error');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ['All', ...new Set(medicines.map(m => m.category))];
  
  // Calculate price range from medicines
  const maxPrice = medicines.length > 0 ? Math.max(...medicines.map(m => m.price || 0)) : 1000000;
  const minPrice = medicines.length > 0 ? Math.min(...medicines.map(m => m.price || 0)) : 0;
  
  // Enhanced filtering with price range
  let filteredMedicines = medicines.filter(med => {
    const matchesSearch = !searchTerm || 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      med.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.description && med.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (med.pharmacyName && med.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    const matchesPrice = (med.price || 0) >= priceRange[0] && (med.price || 0) <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
  });
  
  // Sorting
  filteredMedicines = [...filteredMedicines].sort((a, b) => {
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

  // Patient View - Redesigned with Conversion Focus
  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Hero Section with Trust Signals */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-yellow-300" size={24} />
            <span className="text-yellow-200 font-bold text-sm uppercase tracking-wider">Trusted by 10,000+ Patients</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Your Health, Delivered to Your Door
          </h1>
          <p className="text-blue-100 text-lg mb-6 max-w-2xl">
            Get authentic medicines from verified pharmacies. Fast delivery, secure payment, and expert care—all in one place.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
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
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
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
              />
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedicines.map(med => (
              <div 
                key={med.id} 
                className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 hover:shadow-xl transition-all hover:-translate-y-1 group flex flex-col"
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
                  {(med.pharmacyName || med.pharmacyBranch || med.pharmacyLocation) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-3 border border-blue-100 dark:border-blue-800">
                      {med.pharmacyName && (
                        <div className="flex items-center gap-2 mb-1">
                          <Store size={14} className="text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{med.pharmacyName}</span>
                        </div>
                      )}
                      {med.pharmacyBranch && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <Building2 size={12} />
                          {med.pharmacyBranch}
                        </p>
                      )}
                      {med.pharmacyLocation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {med.pharmacyLocation}
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
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white dark:bg-[#0F172A] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={24} />
                Shopping Cart ({cart.length})
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">Your cart is empty</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Add medicines to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-4 flex gap-4">
                      <img 
                        src={item.image || 'https://placehold.co/100x100?text=Medicine'} 
                        className="w-20 h-20 object-cover rounded-lg"
                        alt={item.name}
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          TZS {item.price.toLocaleString()} each
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold mb-3">
                          TZS {(item.price * item.quantity).toLocaleString()} total
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            title="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-bold text-gray-900 dark:text-white min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            title="Increase quantity"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="ml-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors active:scale-95"
                            title="Remove from cart"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-gradient-to-b from-transparent to-blue-50/50 dark:to-blue-900/10">
                <div className="space-y-2 pb-2">
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'}):</span>
                    <span>TZS {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>Delivery:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Free</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    TZS {cartTotal.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={20} />
                  Secure Checkout
                  <ArrowRight size={20} />
                </button>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 justify-center">
                  <Shield size={14} />
                  <span>Secure payment • Fast delivery • Money-back guarantee</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
