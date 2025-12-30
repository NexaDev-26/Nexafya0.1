import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Package, 
  Truck,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Supplier, Medicine } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
}

interface PurchaseItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const PurchaseManagement: React.FC = () => {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    supplierId: '',
    items: [],
    orderDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppliersData, medicinesData, purchasesData] = await Promise.all([
        db.getSuppliers?.(),
        db.getMedicines(),
        db.getPurchases?.(),
      ]);
      setSuppliers(suppliersData || []);
      setMedicines(medicinesData || []);
      setPurchases(purchasesData || []);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: PurchaseItem = {
      medicineId: '',
      medicineName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = {
      ...items[index],
      [field]: value,
    };

    // Calculate total for item
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }

    // Update medicine name if medicineId changes
    if (field === 'medicineId') {
      const medicine = medicines.find(m => m.id === value);
      items[index].medicineName = medicine?.name || '';
      items[index].unitPrice = medicine?.buyingPrice || 0;
      items[index].total = items[index].quantity * items[index].unitPrice;
    }

    // Calculate total for purchase
    const total = items.reduce((sum, item) => sum + item.total, 0);

    setFormData({
      ...formData,
      items,
      total,
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = formData.items?.filter((_, i) => i !== index) || [];
    const total = items.reduce((sum, item) => sum + item.total, 0);
    setFormData({
      ...formData,
      items,
      total,
    });
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.items || formData.items.length === 0) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      const purchaseData: PurchaseOrder = {
        id: editingPurchase?.id || Date.now().toString(),
        supplierId: formData.supplierId!,
        supplierName: supplier?.name || '',
        items: formData.items,
        total: formData.total || 0,
        status: formData.status || 'PENDING',
        orderDate: formData.orderDate || new Date().toISOString(),
        expectedDate: formData.expectedDate,
        notes: formData.notes,
      };

      if (editingPurchase) {
        await db.updatePurchase(editingPurchase.id, purchaseData);
        notify('Purchase order updated successfully', 'success');
      } else {
        await db.createPurchase?.(purchaseData);
        notify('Purchase order created successfully', 'success');
      }

      setShowForm(false);
      setEditingPurchase(null);
      resetForm();
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [],
      orderDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      notes: '',
    });
  };

  const handleEdit = (purchase: PurchaseOrder) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierId: purchase.supplierId,
      items: purchase.items,
      orderDate: purchase.orderDate,
      status: purchase.status,
      expectedDate: purchase.expectedDate,
      notes: purchase.notes,
      total: purchase.total,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      await db.deletePurchase?.(id);
      notify('Purchase order deleted', 'success');
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleReceive = async (purchase: PurchaseOrder) => {
    try {
      const updatedPurchase: PurchaseOrder = {
        ...purchase,
        status: 'RECEIVED',
        receivedDate: new Date().toISOString(),
      };
      await db.updatePurchase(updatedPurchase.id, updatedPurchase);
      
      // Update inventory
      for (const item of purchase.items) {
        await db.updateMedicineStock?.(item.medicineId, item.quantity);
      }

      notify('Purchase order received and inventory updated', 'success');
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || purchase.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage supplier orders and inventory purchases</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPurchase(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier or order ID..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No purchase orders found"
            description={searchQuery || filterStatus !== 'ALL' 
              ? "Try adjusting your search or filters" 
              : "Create your first purchase order to get started"}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Create Purchase Order
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A0F1C] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      #{purchase.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {purchase.supplierName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {purchase.items.length} items
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      TZS {purchase.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        purchase.status === 'RECEIVED' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : purchase.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(purchase.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {purchase.status === 'PENDING' && (
                          <button
                            onClick={() => handleReceive(purchase)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Mark as received"
                          >
                            <Package size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingPurchase ? 'Edit Purchase Order' : 'New Purchase Order'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPurchase(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Supplier *
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Items *
                  </label>
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items?.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Medicine
                          </label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          >
                            <option value="">Select Medicine</option>
                            {medicines.map(medicine => (
                              <option key={medicine.id} value={medicine.id}>
                                {medicine.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          Total: TZS {item.total.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {(!formData.items || formData.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No items added. Click "Add Item" to start.
                  </div>
                )}
              </div>

              {/* Total */}
              {formData.items && formData.items.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      TZS {formData.total?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPurchase(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                {editingPurchase ? 'Update Order' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

