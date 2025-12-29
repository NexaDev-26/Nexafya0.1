import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  Package, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Clock
} from 'lucide-react';
import { Medicine, MedicineBatch } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface BatchExpiryItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  daysUntilExpiry: number;
  status: 'SAFE' | 'WARNING' | 'EXPIRED' | 'CRITICAL';
}

export const BatchExpiryTracker: React.FC = () => {
  const { notify } = useNotification();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<BatchExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchExpiryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDays, setFilterDays] = useState<number>(30);

  // Form state
  const [formData, setFormData] = useState({
    medicineId: '',
    batchNumber: '',
    expiryDate: '',
    quantity: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check expiry status periodically
    const interval = setInterval(() => {
      updateExpiryStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [batches]);

  const loadData = async () => {
    try {
      setLoading(true);
      const medicinesData = await db.getMedicines();
      setMedicines(medicinesData);

      // Load batches from inventory
      const batchesData = await loadBatches();
      setBatches(batchesData);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (): Promise<BatchExpiryItem[]> => {
    try {
      // Get batches from database
      const allBatches = await db.getBatches?.() || [];
      
      return allBatches.map((batch: any) => {
        const medicine = medicines.find(m => m.id === batch.medicineId);
        const expiryDate = new Date(batch.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'SAFE' | 'WARNING' | 'EXPIRED' | 'CRITICAL' = 'SAFE';
        if (daysUntilExpiry < 0) {
          status = 'EXPIRED';
        } else if (daysUntilExpiry <= 7) {
          status = 'CRITICAL';
        } else if (daysUntilExpiry <= 30) {
          status = 'WARNING';
        }

        return {
          id: batch.id,
          medicineId: batch.medicineId,
          medicineName: medicine?.name || 'Unknown',
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantity: batch.quantity,
          daysUntilExpiry,
          status,
        };
      });
    } catch (error) {
      handleError(error, notify);
      return [];
    }
  };

  const updateExpiryStatus = () => {
    setBatches(prevBatches => 
      prevBatches.map(batch => {
        const expiryDate = new Date(batch.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'SAFE' | 'WARNING' | 'EXPIRED' | 'CRITICAL' = 'SAFE';
        if (daysUntilExpiry < 0) {
          status = 'EXPIRED';
        } else if (daysUntilExpiry <= 7) {
          status = 'CRITICAL';
        } else if (daysUntilExpiry <= 30) {
          status = 'WARNING';
        }

        return {
          ...batch,
          daysUntilExpiry,
          status,
        };
      })
    );
  };

  const handleSubmit = async () => {
    if (!formData.medicineId || !formData.batchNumber || !formData.expiryDate) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const batchData: MedicineBatch = {
        id: editingBatch?.id || Date.now().toString(),
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate,
        quantity: formData.quantity,
      };

      if (editingBatch) {
        await db.updateBatch?.(editingBatch.medicineId, batchData);
        notify('Batch updated successfully', 'success');
      } else {
        await db.addBatch?.(formData.medicineId, batchData);
        notify('Batch added successfully', 'success');
      }

      setShowForm(false);
      setEditingBatch(null);
      resetForm();
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      medicineId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: 1,
    });
  };

  const handleEdit = (batch: BatchExpiryItem) => {
    setEditingBatch(batch);
    setFormData({
      medicineId: batch.medicineId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, medicineId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      await db.deleteBatch?.(medicineId, id);
      notify('Batch deleted', 'success');
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || batch.status === filterStatus;
    
    const matchesDays = batch.daysUntilExpiry <= filterDays;

    return matchesSearch && matchesStatus && matchesDays;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'CRITICAL':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'EXPIRED' || status === 'CRITICAL') {
      return <AlertTriangle size={16} />;
    }
    return <Clock size={16} />;
  };

  const criticalBatches = batches.filter(b => b.status === 'CRITICAL' || b.status === 'EXPIRED');
  const warningBatches = batches.filter(b => b.status === 'WARNING');

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Batch & Expiry Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor medicine batches and expiry dates</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingBatch(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Batch
        </button>
      </div>

      {/* Alerts Summary */}
      {(criticalBatches.length > 0 || warningBatches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalBatches.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase">Critical</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{criticalBatches.length}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Expired or expiring soon</p>
              </div>
            </div>
          )}
          {warningBatches.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase">Warning</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{warningBatches.length}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Expiring within 30 days</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by medicine or batch number..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        >
          <option value="ALL">All Status</option>
          <option value="SAFE">Safe</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select
          value={filterDays}
          onChange={(e) => setFilterDays(Number(e.target.value))}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        >
          <option value={7}>Next 7 days</option>
          <option value={30}>Next 30 days</option>
          <option value={90}>Next 90 days</option>
          <option value={365}>Next year</option>
          <option value={9999}>All</option>
        </select>
      </div>

      {/* Batches List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredBatches.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No batches found"
            description={searchQuery || filterStatus !== 'ALL' 
              ? "Try adjusting your search or filters" 
              : "Add batches to track expiry dates"}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Add Batch
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A0F1C] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Medicine</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Batch Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Expiry Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Days Left</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBatches.map((batch) => (
                  <tr 
                    key={batch.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors ${
                      batch.status === 'EXPIRED' || batch.status === 'CRITICAL' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {batch.medicineName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {batch.quantity} units
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${
                        batch.daysUntilExpiry < 0 
                          ? 'text-red-600 dark:text-red-400'
                          : batch.daysUntilExpiry <= 7
                          ? 'text-orange-600 dark:text-orange-400'
                          : batch.daysUntilExpiry <= 30
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {batch.daysUntilExpiry < 0 
                          ? `Expired ${Math.abs(batch.daysUntilExpiry)} days ago`
                          : `${batch.daysUntilExpiry} days`
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${getStatusColor(batch.status)}`}>
                        {getStatusIcon(batch.status)}
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(batch)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(batch.id, batch.medicineId)}
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

      {/* Batch Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingBatch ? 'Edit Batch' : 'Add Batch'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingBatch(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Medicine *
                </label>
                <select
                  value={formData.medicineId}
                  onChange={(e) => setFormData({ ...formData, medicineId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  disabled={!!editingBatch}
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
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g., BATCH-2024-001"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingBatch(null);
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
                {editingBatch ? 'Update Batch' : 'Add Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

