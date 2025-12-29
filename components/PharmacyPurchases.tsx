import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, Package, Truck, Calendar, DollarSign, User } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
}

interface PurchaseRecord {
  id?: string;
  supplierId: string;
  supplierName?: string;
  purchaseDate: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL';
  paymentMethod?: string;
  notes?: string;
  pharmacyId: string;
  createdAt?: any;
}

export const PharmacyPurchases: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [loading, setLoading] = useState(false);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'NET_30',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
  });

  // Purchases
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<Partial<PurchaseRecord>>({
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    paymentStatus: 'PENDING',
    pharmacyId: user?.id || '',
  });

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, activeTab]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (activeTab === 'suppliers') {
        await loadSuppliers();
      } else {
        await loadPurchases();
        await loadSuppliers();
        await loadInventory();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      notify('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'suppliers'), where('pharmacyId', '==', user.id));
      const snap = await getDocs(q);
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supplier[]);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadPurchases = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'purchaseRecords'), where('pharmacyId', '==', user.id), orderBy('purchaseDate', 'desc'));
      const snap = await getDocs(q);
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PurchaseRecord[]);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    }
  };

  const loadInventory = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'inventory'), where('pharmacy_id', '==', user.id));
      const snap = await getDocs(q);
      setInventoryItems(snap.docs.map(d => ({ id: d.id, name: d.data().name || '', ...d.data() })));
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name || !user?.id) {
      notify('Supplier name is required', 'error');
      return;
    }
    try {
      const supplierData = {
        ...supplierForm,
        pharmacyId: user.id,
        updatedAt: serverTimestamp(),
      };
      if (supplierForm.id) {
        await updateDoc(doc(firestore, 'suppliers', supplierForm.id), supplierData);
        notify('Supplier updated successfully', 'success');
      } else {
        await addDoc(collection(firestore, 'suppliers'), {
          ...supplierData,
          createdAt: serverTimestamp(),
        });
        notify('Supplier added successfully', 'success');
      }
      setShowSupplierModal(false);
      setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: 'NET_30', status: 'ACTIVE', pharmacyId: user.id });
      loadSuppliers();
    } catch (error) {
      notify('Failed to save supplier', 'error');
    }
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.supplierId || !purchaseForm.items || purchaseForm.items.length === 0 || !user?.id) {
      notify('Please fill all required fields', 'error');
      return;
    }
    try {
      const supplier = suppliers.find(s => s.id === purchaseForm.supplierId);
      const purchaseData = {
        ...purchaseForm,
        supplierName: supplier?.name,
        pharmacyId: user.id,
        createdAt: serverTimestamp(),
      };

      const purchaseRef = await addDoc(collection(firestore, 'purchaseRecords'), purchaseData);

      // Update inventory stock
      for (const item of purchaseForm.items || []) {
        const itemRef = doc(firestore, 'inventory', item.itemId);
        const currentItem = inventoryItems.find(i => i.id === item.itemId);
        if (currentItem) {
          await updateDoc(itemRef, {
            stock: (currentItem.stock || 0) + item.quantity,
            buying_price: item.unitPrice, // Update buying price
            updatedAt: serverTimestamp(),
          });
        }
      }

      notify('Purchase record added successfully', 'success');
      setShowPurchaseModal(false);
      setPurchaseForm({
        supplierId: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentStatus: 'PENDING',
        pharmacyId: user.id,
      });
      loadPurchases();
      loadInventory();
    } catch (error) {
      notify('Failed to save purchase record', 'error');
    }
  };

  const addPurchaseItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...(purchaseForm.items || []), { itemId: '', itemName: '', quantity: 0, unitPrice: 0, total: 0 }],
    });
  };

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    const items = [...(purchaseForm.items || [])];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }
    if (field === 'itemId') {
      const item = inventoryItems.find(i => i.id === value);
      items[index].itemName = item?.name || '';
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    setPurchaseForm({ ...purchaseForm, items, subtotal, tax, total });
  };

  const removePurchaseItem = (index: number) => {
    const items = purchaseForm.items?.filter((_, i) => i !== index) || [];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    setPurchaseForm({ ...purchaseForm, items, subtotal, tax, total });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700/50">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'purchases'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Purchase Records
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Suppliers
        </button>
      </div>

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Purchase Records</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track purchases from suppliers</p>
            </div>
            <button
              onClick={() => {
                setPurchaseForm({
                  supplierId: '',
                  purchaseDate: new Date().toISOString().split('T')[0],
                  items: [],
                  subtotal: 0,
                  tax: 0,
                  total: 0,
                  paymentStatus: 'PENDING',
                  pharmacyId: user?.id || '',
                });
                setShowPurchaseModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> New Purchase
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#0A1B2E]/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No purchase records found.
                      </td>
                    </tr>
                  ) : (
                    purchases.map(purchase => (
                      <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{purchase.supplierName || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {purchase.items?.length || 0} items
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 dark:text-white">
                            TZS {Number(purchase.total || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            purchase.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : purchase.paymentStatus === 'PARTIAL'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {purchase.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purchase Modal */}
          {showPurchaseModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-4xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between sticky top-0 bg-white dark:bg-[#0F172A] z-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Purchase Record</h3>
                  <button onClick={() => setShowPurchaseModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Supplier *</label>
                      <select
                        value={purchaseForm.supplierId || ''}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.filter(s => s.status === 'ACTIVE').map(supplier => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Purchase Date *</label>
                      <input
                        type="date"
                        value={purchaseForm.purchaseDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Items *</label>
                      <button onClick={addPurchaseItem} className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1">
                        <Plus size={14} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {purchaseForm.items?.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
                          <div className="col-span-4">
                            <select
                              value={item.itemId}
                              onChange={(e) => updatePurchaseItem(index, 'itemId', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white text-sm"
                            >
                              <option value="">Select Item</option>
                              {inventoryItems.map(invItem => (
                                <option key={invItem.id} value={invItem.id}>{invItem.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updatePurchaseItem(index, 'quantity', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              placeholder="Unit Price"
                              value={item.unitPrice}
                              onChange={(e) => updatePurchaseItem(index, 'unitPrice', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">TZS {item.total.toLocaleString()}</span>
                          </div>
                          <div className="col-span-1">
                            <button onClick={() => removePurchaseItem(index)} className="text-red-600 dark:text-red-400">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Status</label>
                      <select
                        value={purchaseForm.paymentStatus || 'PENDING'}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentStatus: e.target.value as any })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="PAID">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Method</label>
                      <select
                        value={purchaseForm.paymentMethod || 'CASH'}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-[#0A1B2E] p-4 rounded-xl">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-bold text-gray-900 dark:text-white">TZS {Number(purchaseForm.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tax (18%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">TZS {Number(purchaseForm.tax || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-lg text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-xl text-blue-600 dark:text-blue-400">TZS {Number(purchaseForm.total || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowPurchaseModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSavePurchase} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Save Purchase</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Suppliers</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your suppliers</p>
            </div>
            <button
              onClick={() => {
                setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: 'NET_30', status: 'ACTIVE', pharmacyId: user?.id || '' });
                setShowSupplierModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(supplier => (
              <div key={supplier.id} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-white">{supplier.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    supplier.status === 'ACTIVE'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {supplier.status}
                  </span>
                </div>
                {supplier.contactPerson && <p className="text-sm text-gray-600 dark:text-gray-400">Contact: {supplier.contactPerson}</p>}
                {supplier.phone && <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {supplier.phone}</p>}
                {supplier.email && <p className="text-sm text-gray-600 dark:text-gray-400">Email: {supplier.email}</p>}
                <button
                  onClick={() => {
                    setSupplierForm(supplier);
                    setShowSupplierModal(true);
                  }}
                  className="w-full mt-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors"
                >
                  Edit Supplier
                </button>
              </div>
            ))}
          </div>

          {/* Supplier Modal */}
          {showSupplierModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{supplierForm.id ? 'Edit Supplier' : 'Add Supplier'}</h3>
                  <button onClick={() => setShowSupplierModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Supplier Name *</label>
                    <input
                      type="text"
                      value={supplierForm.name || ''}
                      onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Contact Person</label>
                    <input
                      type="text"
                      value={supplierForm.contactPerson || ''}
                      onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Phone</label>
                      <input
                        type="tel"
                        value={supplierForm.phone || ''}
                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Email</label>
                      <input
                        type="email"
                        value={supplierForm.email || ''}
                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Address</label>
                    <textarea
                      value={supplierForm.address || ''}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Terms</label>
                    <select
                      value={supplierForm.paymentTerms || 'NET_30'}
                      onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="CASH">Cash on Delivery</option>
                      <option value="NET_15">Net 15</option>
                      <option value="NET_30">Net 30</option>
                      <option value="NET_60">Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select
                      value={supplierForm.status || 'ACTIVE'}
                      onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowSupplierModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSaveSupplier} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Save Supplier</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

