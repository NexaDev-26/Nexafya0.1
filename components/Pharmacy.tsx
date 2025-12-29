
import React, { useState, useEffect } from 'react';
import { Medicine, CartItem, UserRole, PharmacyBranch, SalesRecord, InventoryItem } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, Store, X, ArrowRight, LayoutDashboard, Package, Truck, Scan, BarChart2, QrCode, MapPin, Save, Upload, RefreshCw, Check, AlertTriangle, Building2, FileText, Calendar } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../hooks/useFirestore';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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

export const Pharmacy: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  // Real-time inventory sync
  const { data: inventoryData, loading: inventoryLoading } = useInventory(user?.id || '');
  
  // -- PATIENT SHOP STATE --
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // -- PHARMACY MANAGEMENT STATE --
  const [mgmtTab, setMgmtTab] = useState<'dashboard' | 'prescriptions' | 'inventory' | 'pos' | 'branches' | 'purchases' | 'sales' | 'reports' | 'batch-expiry' | 'unit-converter' | 'suppliers' | 'invoices' | 'stock-alerts'>('dashboard');
  
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
                  const meds = await db.getMedicines();
                  setMedicines(meds);
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
      await db.deleteInventoryItem(id);
      // Real-time sync will update myInventory automatically
      notify("Item removed (synced)", "info");
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
                      id: rx.id,
                      patient: rx.patient?.name || 'Unknown Patient',
                      doctor: rx.doctorName || 'Dr. Specialist',
                      items: typeof rx.items === 'string' ? JSON.parse(rx.items) : rx.items,
                      status: rx.status,
                      notes: rx.notes,
                      qr_code: rx.qr_code
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
          <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
              
              {/* Sidebar */}
              <div className="w-full md:w-64 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="p-4 mb-4 border-b border-gray-100 dark:border-gray-700/50">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">My Pharmacy</h2>
                  </div>
                  {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
                          <PharmacyPOS />
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
      );
  }

  // Patient View Stub (Simplified)
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Online Pharmacy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {medicines.map(med => (
                <div key={med.id} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 group hover:shadow-md transition-all">
                    <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
                        <img src={med.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={med.name} />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{med.name}</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{med.category}</p>
                    <div className="flex justify-between items-center mt-auto">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">TZS {med.price.toLocaleString()}</span>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm">
                            <Plus size={18}/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
