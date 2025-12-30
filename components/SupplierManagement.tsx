import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Phone,
  Mail,
  Star,
  Search,
  Package
} from 'lucide-react';
import { Supplier } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

export const SupplierManagement: React.FC = () => {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    rating: 5,
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await db.getSuppliers?.() || [];
      setSuppliers(data);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const supplierData: Supplier = {
        id: editingSupplier?.id || Date.now().toString(),
        name: formData.name,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        rating: formData.rating,
      };

      if (editingSupplier) {
        await db.updateSupplier(editingSupplier.id, supplierData);
        notify('Supplier updated successfully', 'success');
      } else {
        await db.createSupplier?.(supplierData);
        notify('Supplier created successfully', 'success');
      }

      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      loadSuppliers();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      rating: 5,
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email || '',
      rating: supplier.rating || 5,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await db.deleteSupplier?.(id);
      notify('Supplier deleted', 'success');
      loadSuppliers();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone.includes(searchQuery)
  );

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your supplier network</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingSupplier(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        />
      </div>

      {/* Suppliers List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No suppliers found"
            description={searchQuery 
              ? "Try adjusting your search" 
              : "Add your first supplier to get started"}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Add Supplier
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-gray-50 dark:bg-[#0A0F1C] rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Building2 className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < (supplier.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {supplier.name}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={14} />
                    {supplier.phone}
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail size={14} />
                      {supplier.email}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    Contact: {supplier.contactPerson}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supplier Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingSupplier(null);
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
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., MedSupply Co."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+255 7XX XXX XXX"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="supplier@example.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating })}
                      className={`p-2 rounded-lg transition-colors ${
                        formData.rating >= rating
                          ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    >
                      <Star size={24} className={formData.rating >= rating ? 'fill-current' : ''} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {formData.rating} / 5
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingSupplier(null);
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
                {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

