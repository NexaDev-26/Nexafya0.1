import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Upload, Search, Package, Layers, Tag, Ruler, TrendingUp, TrendingDown, RefreshCw, Filter, ArrowUp, ArrowDown, RotateCcw, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, storageRefs } from '../lib/firebase';
import { Camera } from 'lucide-react';

interface InventoryItem {
  id?: string;
  name: string;
  description?: string;
  groupId?: string;
  groupName?: string;
  categoryId?: string;
  categoryName?: string;
  sellingPrice: number;
  buyingPrice: number;
  incomeAccount?: string;
  expenseAccount?: string;
  trackInventory: boolean;
  openingStock: number;
  onHand?: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface ItemGroup {
  id?: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
}

interface ItemCategory {
  id?: string;
  name: string;
  type?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
}

interface ItemUnit {
  id?: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
}

interface UnitConversion {
  id?: string;
  itemId: string;
  itemName?: string;
  equivalentUnit: string;
  smallestUnit: string;
  conversionFactor: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pharmacyId: string;
}

interface InventoryAdjustment {
  id?: string;
  itemId: string;
  itemName?: string;
  adjustmentType: 'ADD' | 'REMOVE';
  quantity: number;
  date: string;
  description?: string;
  pharmacyId: string;
  createdAt?: any;
}

export const PharmacyInventory: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'items' | 'adjustments' | 'groups' | 'categories' | 'units' | 'conversions'>('items');
  const [loading, setLoading] = useState(false);

  // Items
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
    name: '',
    description: '',
    sellingPrice: 0,
    buyingPrice: 0,
    trackInventory: true,
    openingStock: 0,
    unit: 'pcs',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
    incomeAccount: '',
    expenseAccount: '',
    imageUrl: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Bulk Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkItems, setBulkItems] = useState<Partial<InventoryItem>[]>([]);
  const [importMode, setImportMode] = useState<'manual' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, completed: 0, errors: [] as string[] });

  // Groups
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState<Partial<ItemGroup>>({
    name: '',
    description: '',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
  });

  // Categories
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<Partial<ItemCategory>>({
    name: '',
    type: 'General',
    description: '',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
  });

  // Units
  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState<Partial<ItemUnit>>({
    name: '',
    description: '',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
  });

  // Unit Conversions
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionForm, setConversionForm] = useState<Partial<UnitConversion>>({
    itemId: '',
    equivalentUnit: '',
    smallestUnit: '',
    conversionFactor: 1,
    description: '',
    status: 'ACTIVE',
    pharmacyId: user?.id || '',
  });

  // Adjustments
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<Partial<InventoryAdjustment>>({
    itemId: '',
    adjustmentType: 'ADD',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    pharmacyId: user?.id || '',
  });

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id, activeTab]);

  const loadAllData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      switch (activeTab) {
        case 'items':
          await loadItems();
          await loadGroups();
          await loadCategories();
          await loadUnits();
          break;
        case 'adjustments':
          await loadAdjustments();
          await loadItems();
          break;
        case 'groups':
          await loadGroups();
          break;
        case 'categories':
          await loadCategories();
          break;
        case 'units':
          await loadUnits();
          break;
        case 'conversions':
          await loadConversions();
          await loadItems();
          await loadUnits();
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      notify('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'inventory'), where('pharmacy_id', '==', user.id));
      const snap = await getDocs(q);
      const itemsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      // Enrich with group and category names
      const enrichedItems = itemsData.map(item => ({
        ...item,
        name: item.name || '',
        sellingPrice: item.selling_price || 0,
        buyingPrice: item.buying_price || 0,
        openingStock: item.stock || 0,
        onHand: item.stock || 0,
        unit: item.unit || 'pcs',
        status: item.status || 'ACTIVE',
        groupName: item.groupName || 'N/A',
        categoryName: item.category || 'N/A',
      }));
      
      setItems(enrichedItems);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadGroups = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'itemGroups'), where('pharmacyId', '==', user.id));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ItemGroup[]);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadCategories = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'itemCategories'), where('pharmacyId', '==', user.id));
      const snap = await getDocs(q);
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ItemCategory[]);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadUnits = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'itemUnits'), where('pharmacyId', '==', user.id));
      const snap = await getDocs(q);
      setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ItemUnit[]);
    } catch (error) {
      console.error('Failed to load units:', error);
    }
  };

  const loadConversions = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'unitConversions'), where('pharmacyId', '==', user.id));
      const snap = await getDocs(q);
      setConversions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as UnitConversion[]);
    } catch (error) {
      console.error('Failed to load conversions:', error);
    }
  };

  const loadAdjustments = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(firestore, 'inventoryAdjustments'), where('pharmacyId', '==', user.id), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAdjustments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryAdjustment[]);
    } catch (error) {
      console.error('Failed to load adjustments:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user?.id) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${storageRefs.articleImages}/${user.id}/items/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setItemForm({ ...itemForm, imageUrl: url });
      notify('Image uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload image:', error);
      notify('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !user?.id) {
      notify('Item name is required', 'error');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = itemForm.imageUrl || 'https://placehold.co/150';
      
      // Upload image if provided
      if (imageFile) {
        setUploadingImage(true);
        const ext = imageFile.name.split('.').pop();
        const path = `${storageRefs.articleImages}/${user.id}/items/${Date.now()}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
        setUploadingImage(false);
      }

      // Validate required fields
      if (!itemForm.name || itemForm.name.trim() === '') {
        notify('Item name is required', 'error');
        setLoading(false);
        return;
      }

      if (Number(itemForm.sellingPrice || 0) <= 0) {
        notify('Selling price must be greater than 0', 'error');
        setLoading(false);
        return;
      }

      const itemData = {
        pharmacy_id: user.id,
        name: itemForm.name.trim(),
        description: (itemForm.description || '').trim(),
        category: itemForm.categoryName || 'General',
        groupId: itemForm.groupId || null,
        categoryId: itemForm.categoryId || null,
        selling_price: Number(itemForm.sellingPrice || 0),
        buying_price: Number(itemForm.buyingPrice || 0),
        stock: Number(itemForm.openingStock || 0),
        opening_stock: Number(itemForm.openingStock || 0),
        unit: itemForm.unit || 'pcs',
        track_inventory: itemForm.trackInventory !== false,
        status: itemForm.status || 'ACTIVE',
        image_url: imageUrl,
        income_account: (itemForm.incomeAccount || '').trim(),
        expense_account: (itemForm.expenseAccount || '').trim(),
        min_stock: 10, // Default reorder level
        updatedAt: serverTimestamp(),
      };

      if (editingItem?.id) {
        await updateDoc(doc(firestore, 'inventory', editingItem.id), itemData);
        notify('Item updated successfully', 'success');
      } else {
        await addDoc(collection(firestore, 'inventory'), {
          ...itemData,
          createdAt: serverTimestamp(),
        });
        notify('Item added successfully', 'success');
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({
        name: '',
        description: '',
        sellingPrice: 0,
        buyingPrice: 0,
        trackInventory: true,
        openingStock: 0,
        unit: 'pcs',
        status: 'ACTIVE',
        pharmacyId: user.id,
        incomeAccount: '',
        expenseAccount: '',
        imageUrl: '',
      });
      setImageFile(null);
      loadItems();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error';
      const detailedError = error?.code === 'permission-denied' 
        ? 'Permission denied. Please check your Firestore security rules.'
        : error?.code === 'invalid-argument'
        ? 'Invalid data. Please check all required fields.'
        : error?.message || 'Failed to save item';
      notify(detailedError, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name || !user?.id) {
      notify('Group name is required', 'error');
      return;
    }
    try {
      const groupData = {
        ...groupForm,
        pharmacyId: user.id,
        updatedAt: serverTimestamp(),
      };
      const existingGroup = groups.find(g => !groupForm.id && g.name.toLowerCase() === groupForm.name?.toLowerCase());
      if (existingGroup) {
        notify('Group with this name already exists', 'error');
        return;
      }
      if (groupForm.id) {
        await updateDoc(doc(firestore, 'itemGroups', groupForm.id), groupData);
        notify('Group updated successfully', 'success');
      } else {
        await addDoc(collection(firestore, 'itemGroups'), {
          ...groupData,
          createdAt: serverTimestamp(),
        });
        notify('Group added successfully', 'success');
      }
      setShowGroupModal(false);
      setGroupForm({ name: '', description: '', status: 'ACTIVE', pharmacyId: user.id });
      loadGroups();
    } catch (error) {
      notify('Failed to save group', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !user?.id) {
      notify('Category name is required', 'error');
      return;
    }
    try {
      const categoryData = {
        ...categoryForm,
        pharmacyId: user.id,
        updatedAt: serverTimestamp(),
      };
      if (categoryForm.id) {
        await updateDoc(doc(firestore, 'itemCategories', categoryForm.id), categoryData);
        notify('Category updated successfully', 'success');
      } else {
        await addDoc(collection(firestore, 'itemCategories'), {
          ...categoryData,
          createdAt: serverTimestamp(),
        });
        notify('Category added successfully', 'success');
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', type: 'General', description: '', status: 'ACTIVE', pharmacyId: user.id });
      loadCategories();
    } catch (error) {
      notify('Failed to save category', 'error');
    }
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name || !user?.id) {
      notify('Unit name is required', 'error');
      return;
    }
    try {
      const unitData = {
        ...unitForm,
        pharmacyId: user.id,
        updatedAt: serverTimestamp(),
      };
      if (unitForm.id) {
        await updateDoc(doc(firestore, 'itemUnits', unitForm.id), unitData);
        notify('Unit updated successfully', 'success');
      } else {
        await addDoc(collection(firestore, 'itemUnits'), {
          ...unitData,
          createdAt: serverTimestamp(),
        });
        notify('Unit added successfully', 'success');
      }
      setShowUnitModal(false);
      setUnitForm({ name: '', description: '', status: 'ACTIVE', pharmacyId: user.id });
      loadUnits();
    } catch (error) {
      notify('Failed to save unit', 'error');
    }
  };

  const handleSaveAdjustment = async () => {
    if (!adjustmentForm.itemId || !adjustmentForm.quantity || !user?.id) {
      notify('Please fill all required fields', 'error');
      return;
    }
    try {
      const item = items.find(i => i.id === adjustmentForm.itemId);
      if (!item) {
        notify('Item not found', 'error');
        return;
      }

      const adjustmentData = {
        ...adjustmentForm,
        itemName: item.name,
        pharmacyId: user.id,
        quantity: Number(adjustmentForm.quantity),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'inventoryAdjustments'), adjustmentData);

      // Update item stock
      const currentStock = item.onHand || 0;
      const adjustmentQuantity = Number(adjustmentForm.quantity);
      const newStock = adjustmentForm.adjustmentType === 'ADD' 
        ? currentStock + adjustmentQuantity 
        : currentStock - adjustmentQuantity;

      await updateDoc(doc(firestore, 'inventory', adjustmentForm.itemId), {
        stock: newStock,
        updatedAt: serverTimestamp(),
      });

      notify('Adjustment saved successfully', 'success');
      setShowAdjustmentModal(false);
      setAdjustmentForm({
        itemId: '',
        adjustmentType: 'ADD',
        quantity: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        pharmacyId: user.id,
      });
      loadAdjustments();
      loadItems();
    } catch (error) {
      notify('Failed to save adjustment', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(firestore, 'inventory', id));
      notify('Item deleted', 'success');
      loadItems();
    } catch (error) {
      notify('Failed to delete item', 'error');
    }
  };

  const handleDeleteConversion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversion?')) return;
    try {
      await deleteDoc(doc(firestore, 'unitConversions', id));
      notify('Conversion deleted', 'success');
      loadConversions();
    } catch (error) {
      notify('Failed to delete conversion', 'error');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
            <p className="text-blue-100 text-sm">Manage your pharmacy stock, items, and adjustments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Total Items</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Active</p>
              <p className="text-2xl font-bold">{items.filter(i => i.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Cleaner Design */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-2 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { id: 'items', label: 'Items', icon: Package },
            { id: 'adjustments', label: 'Adjustments', icon: TrendingUp },
            { id: 'groups', label: 'Groups', icon: Layers },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'units', label: 'Units', icon: Ruler },
            { id: 'conversions', label: 'Conversions', icon: ArrowUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'scale-110' : ''} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items List Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Items</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <Upload size={18} /> Bulk Import
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setItemForm({
                    name: '',
                    description: '',
                    sellingPrice: 0,
                    buyingPrice: 0,
                    trackInventory: true,
                    openingStock: 0,
                    unit: 'pcs',
                    status: 'ACTIVE',
                    pharmacyId: user?.id || '',
                  });
                  setShowItemModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-105"
              >
                <Plus size={18} /> Add New Item
              </button>
            </div>
          </div>

          {/* Search and Filters - Cleaner Design */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, category, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div className="flex gap-2">
                {['ALL', 'ACTIVE', 'INACTIVE'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-[#0A1B2E] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Table - Enhanced Design */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-[#0A1B2E] dark:to-[#0A1B2E]/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Cost Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Selling Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="text-gray-300 dark:text-gray-600" size={48} />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No items found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">Add your first item to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
                                <Package size={20} className="text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.description}</p>
                              )}
                              {item.groupName && item.groupName !== 'N/A' && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block">{item.groupName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.categoryName || 'Uncategorized'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            TZS {Number(item.buyingPrice || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            TZS {Number(item.sellingPrice || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${(item.onHand || 0) < 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {item.onHand || 0} {item.unit}
                            </span>
                            {(item.onHand || 0) < 10 && (
                              <span className="text-xs text-red-500 dark:text-red-400 mt-1">Low stock</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm(item);
                                setShowItemModal(true);
                              }}
                              className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all hover:scale-110"
                              title="Edit item"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id!)}
                              className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110"
                              title="Delete item"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit Item Modal - Enhanced */}
          {showItemModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-4xl rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header - Sticky */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#0A1B2E] dark:to-[#0F172A]">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingItem ? 'Edit Item' : 'Add New Item'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {editingItem ? 'Update item details' : 'Add a new item to your inventory'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all hover:scale-110"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                
                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Item Name *</label>
                      <input
                        type="text"
                        value={itemForm.name || ''}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g., Paracetamol 500mg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                      <textarea
                        value={itemForm.description || ''}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Item description..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Group</label>
                      <select
                        value={itemForm.groupId || ''}
                        onChange={(e) => setItemForm({ ...itemForm, groupId: e.target.value, groupName: groups.find(g => g.id === e.target.value)?.name })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Group</option>
                        {groups.filter(g => g.status === 'ACTIVE').map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Category</label>
                      <select
                        value={itemForm.categoryId || ''}
                        onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value, categoryName: categories.find(c => c.id === e.target.value)?.name })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Category</option>
                        {categories.filter(c => c.status === 'ACTIVE').map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Buying Price (TZS)</label>
                      <input
                        type="number"
                        value={itemForm.buyingPrice || 0}
                        onChange={(e) => setItemForm({ ...itemForm, buyingPrice: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Selling Price (TZS) *</label>
                      <input
                        type="number"
                        value={itemForm.sellingPrice || 0}
                        onChange={(e) => setItemForm({ ...itemForm, sellingPrice: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Track Inventory</label>
                      <select
                        value={itemForm.trackInventory ? 'yes' : 'no'}
                        onChange={(e) => setItemForm({ ...itemForm, trackInventory: e.target.value === 'yes' })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Unit</label>
                      <select
                        value={itemForm.unit || 'pcs'}
                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="box">Box</option>
                        <option value="bottle">Bottle</option>
                        <option value="strip">Strip</option>
                        {units.filter(u => u.status === 'ACTIVE').map(unit => (
                          <option key={unit.id} value={unit.name}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Opening Stock Quantity</label>
                      <input
                        type="number"
                        value={itemForm.openingStock || 0}
                        onChange={(e) => setItemForm({ ...itemForm, openingStock: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                      <select
                        value={itemForm.status || 'ACTIVE'}
                        onChange={(e) => setItemForm({ ...itemForm, status: e.target.value as any })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>

                </div>
                
                {/* Modal Footer - Sticky */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveItem}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/30 hover:scale-105"
                  >
                    {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjustments Tab - Enhanced */}
      {activeTab === 'adjustments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Adjustments</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {adjustments.length} {adjustments.length === 1 ? 'adjustment' : 'adjustments'} recorded
              </p>
            </div>
            <button
              onClick={() => {
                setAdjustmentForm({
                  itemId: '',
                  adjustmentType: 'ADD',
                  quantity: 0,
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  pharmacyId: user?.id || '',
                });
                setShowAdjustmentModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-105"
            >
              <Plus size={18} /> New Adjustment
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-[#0A1B2E] dark:to-[#0A1B2E]/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <TrendingUp className="text-gray-300 dark:text-gray-600" size={48} />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No adjustments found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">Create your first stock adjustment</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    adjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{adj.itemName || 'Unknown Item'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            adj.adjustmentType === 'ADD'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {adj.adjustmentType === 'ADD' ? <TrendingUp size={14} className="mr-1.5" /> : <TrendingDown size={14} className="mr-1.5" />}
                            {adj.adjustmentType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{adj.quantity}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {adj.date ? new Date(adj.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {adj.description ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{adj.description}</p>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No notes</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Adjustment Modal */}
          {showAdjustmentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Adjustment</h3>
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Select Item *</label>
                    <select
                      value={adjustmentForm.itemId || ''}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, itemId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Item</option>
                      {items.filter(i => i.status === 'ACTIVE').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (On Hand: {item.onHand || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Adjustment Type *</label>
                    <select
                      value={adjustmentForm.adjustmentType || 'ADD'}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentType: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ADD">Add</option>
                      <option value="REMOVE">Remove</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Adjustment Quantity *</label>
                    <input
                      type="number"
                      value={adjustmentForm.quantity || 0}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Adjustment Date *</label>
                    <input
                      type="date"
                      value={adjustmentForm.date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                      value={adjustmentForm.description || ''}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Reason for adjustment..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <button
                      onClick={() => setShowAdjustmentModal(false)}
                      className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdjustment}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                    >
                      Save Adjustment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Groups Tab - Enhanced */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Item Groups</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {groups.length} {groups.length === 1 ? 'group' : 'groups'} defined
              </p>
            </div>
            <button
              onClick={() => {
                setGroupForm({ name: '', description: '', status: 'ACTIVE', pharmacyId: user?.id || '' });
                setShowGroupModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-105"
            >
              <Plus size={18} /> Add Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-[#0F172A] p-12 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center">
                <Layers className="text-gray-300 dark:text-gray-600 mx-auto mb-4" size={48} />
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No groups found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Create your first item group</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.id} className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all hover:scale-105">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-white">{group.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    group.status === 'ACTIVE'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {group.status}
                  </span>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
                )}
                  <button
                    onClick={() => {
                      setGroupForm(group);
                      setShowGroupModal(true);
                    }}
                    className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  >
                    Edit Group
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Group Modal */}
          {showGroupModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{groupForm.id ? 'Edit Group' : 'Add Group'}</h3>
                  <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Group Name *</label>
                    <input
                      type="text"
                      value={groupForm.name || ''}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                      value={groupForm.description || ''}
                      onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select
                      value={groupForm.status || 'ACTIVE'}
                      onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowGroupModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSaveGroup} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Save Group</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab - Similar to Groups */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Item Categories</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organize items by category</p>
            </div>
            <button
              onClick={() => {
                setCategoryForm({ name: '', type: 'General', description: '', status: 'ACTIVE', pharmacyId: user?.id || '' });
                setShowCategoryModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <div key={category.id} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{category.name}</h4>
                    {category.type && <p className="text-xs text-gray-500 dark:text-gray-400">{category.type}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    category.status === 'ACTIVE'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {category.status}
                  </span>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{category.description}</p>
                )}
                <button
                  onClick={() => {
                    setCategoryForm(category);
                    setShowCategoryModal(true);
                  }}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors"
                >
                  Edit Category
                </button>
              </div>
            ))}
          </div>

          {/* Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{categoryForm.id ? 'Edit Category' : 'Add Category'}</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Category Name *</label>
                    <input
                      type="text"
                      value={categoryForm.name || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Category Type</label>
                    <input
                      type="text"
                      value={categoryForm.type || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., General, Medicine, Equipment"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                      value={categoryForm.description || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select
                      value={categoryForm.status || 'ACTIVE'}
                      onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowCategoryModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSaveCategory} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Save Category</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Units Tab - Similar to Groups */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Item Units</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage measurement units</p>
            </div>
            <button
              onClick={() => {
                setUnitForm({ name: '', description: '', status: 'ACTIVE', pharmacyId: user?.id || '' });
                setShowUnitModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> Add Unit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <div key={unit.id} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-white">{unit.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    unit.status === 'ACTIVE'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {unit.status}
                  </span>
                </div>
                {unit.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{unit.description}</p>
                )}
                <button
                  onClick={() => {
                    setUnitForm(unit);
                    setShowUnitModal(true);
                  }}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors"
                >
                  Edit Unit
                </button>
              </div>
            ))}
          </div>

          {/* Unit Modal */}
          {showUnitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{unitForm.id ? 'Edit Unit' : 'Add Unit'}</h3>
                  <button onClick={() => setShowUnitModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Unit Name *</label>
                    <input
                      type="text"
                      value={unitForm.name || ''}
                      onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Box, Strip, Bottle"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                      value={unitForm.description || ''}
                      onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select
                      value={unitForm.status || 'ACTIVE'}
                      onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowUnitModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSaveUnit} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Save Unit</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unit Conversions Tab */}
      {activeTab === 'conversions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Unit Conversions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage unit conversion factors</p>
            </div>
            <button
              onClick={() => {
                setConversionForm({
                  itemId: '',
                  equivalentUnit: '',
                  smallestUnit: '',
                  conversionFactor: 1,
                  description: '',
                  status: 'ACTIVE',
                  pharmacyId: user?.id || '',
                });
                setShowConversionModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> Add Conversion
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#0A1B2E]/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Equivalent Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Smallest Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conversion Factor</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {conversions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No unit conversions found.
                      </td>
                    </tr>
                  ) : (
                    conversions.map(conversion => (
                      <tr key={conversion.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{conversion.itemName || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{conversion.equivalentUnit}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{conversion.smallestUnit}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{conversion.conversionFactor}x</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            conversion.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {conversion.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteConversion(conversion.id!)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conversion Modal */}
          {showConversionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Unit Conversion</h3>
                  <button onClick={() => setShowConversionModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Item *</label>
                    <select
                      value={conversionForm.itemId || ''}
                      onChange={(e) => {
                        const item = items.find(i => i.id === e.target.value);
                        setConversionForm({ ...conversionForm, itemId: e.target.value, itemName: item?.name });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Item</option>
                      {items.filter(i => i.status === 'ACTIVE').map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Equivalent Unit *</label>
                    <input
                      type="text"
                      value={conversionForm.equivalentUnit || ''}
                      onChange={(e) => setConversionForm({ ...conversionForm, equivalentUnit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Box"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Smallest Unit *</label>
                    <input
                      type="text"
                      value={conversionForm.smallestUnit || ''}
                      onChange={(e) => setConversionForm({ ...conversionForm, smallestUnit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., pcs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Conversion Factor *</label>
                    <input
                      type="number"
                      value={conversionForm.conversionFactor || 1}
                      onChange={(e) => setConversionForm({ ...conversionForm, conversionFactor: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., 10 (1 box = 10 pcs)"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                      value={conversionForm.description || ''}
                      onChange={(e) => setConversionForm({ ...conversionForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowConversionModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button
                      onClick={async () => {
                        if (!conversionForm.itemId || !conversionForm.equivalentUnit || !conversionForm.smallestUnit || !user?.id) {
                          notify('Please fill all required fields', 'error');
                          return;
                        }
                        try {
                          const conversionData = {
                            ...conversionForm,
                            pharmacyId: user.id,
                            conversionFactor: Number(conversionForm.conversionFactor || 1),
                            updatedAt: serverTimestamp(),
                          };
                          await addDoc(collection(firestore, 'unitConversions'), {
                            ...conversionData,
                            createdAt: serverTimestamp(),
                          });
                          notify('Unit conversion added successfully', 'success');
                          setShowConversionModal(false);
                          setConversionForm({
                            itemId: '',
                            equivalentUnit: '',
                            smallestUnit: '',
                            conversionFactor: 1,
                            description: '',
                            status: 'ACTIVE',
                            pharmacyId: user.id,
                          });
                          loadConversions();
                        } catch (error) {
                          notify('Failed to save conversion', 'error');
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                    >
                      Save Conversion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-6xl rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#0A1B2E] dark:to-[#0F172A]">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Import Items</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Import multiple items at once via CSV or manual entry</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkItems([]);
                  setCsvFile(null);
                  setImportMode('manual');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all hover:scale-110"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Import Mode Tabs */}
              <div className="flex gap-2 mb-6 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-1">
                <button
                  onClick={() => {
                    setImportMode('manual');
                    if (bulkItems.length === 0) addBulkItemRow();
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    importMode === 'manual'
                      ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setImportMode('csv')}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    importMode === 'csv'
                      ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  CSV Upload
                </button>
              </div>

              {/* CSV Upload Mode */}
              {importMode === 'csv' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">CSV Format</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Your CSV should include: Name, Description, Selling Price, Buying Price, Stock, Unit, Category, Status
                        </p>
                        <button
                          onClick={downloadCSVTemplate}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-bold flex items-center gap-2"
                        >
                          <Download size={16} /> Download Template
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCsvFile(file);
                          handleCSVUpload(file);
                        }
                      }}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <Upload className="text-gray-400" size={48} />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white mb-1">
                          {csvFile ? csvFile.name : 'Click to upload CSV file'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CSV files only</p>
                      </div>
                    </label>
                  </div>

                  {bulkItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">
                        Preview ({bulkItems.length} items)
                      </p>
                      <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {bulkItems.slice(0, 10).map((item, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <span className="font-bold text-gray-900 dark:text-white">{item.name}</span>
                              <span className="text-gray-500">- TZS {Number(item.sellingPrice || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          {bulkItems.length > 10 && (
                            <p className="text-xs text-gray-500 italic">... and {bulkItems.length - 10} more items</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Mode */}
              {importMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {bulkItems.length} {bulkItems.length === 1 ? 'item' : 'items'} ready to import
                    </p>
                    <button
                      onClick={addBulkItemRow}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-bold flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-[#0A1B2E]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Name *</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Selling Price *</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Buying Price</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Stock</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Unit</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Category</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {bulkItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              <button
                                onClick={addBulkItemRow}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                              >
                                Click to add your first item
                              </button>
                            </td>
                          </tr>
                        ) : (
                          bulkItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.name || ''}
                                  onChange={(e) => updateBulkItem(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="Item name"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.sellingPrice || 0}
                                  onChange={(e) => updateBulkItem(index, 'sellingPrice', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.buyingPrice || 0}
                                  onChange={(e) => updateBulkItem(index, 'buyingPrice', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.openingStock || 0}
                                  onChange={(e) => updateBulkItem(index, 'openingStock', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={item.unit || 'pcs'}
                                  onChange={(e) => updateBulkItem(index, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                  <option value="pcs">pcs</option>
                                  <option value="box">box</option>
                                  <option value="bottle">bottle</option>
                                  <option value="strip">strip</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={item.categoryName || 'General'}
                                  onChange={(e) => updateBulkItem(index, 'categoryName', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                  <option value="General">General</option>
                                  {categories.filter(c => c.status === 'ACTIVE').map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeBulkItemRow(index)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {importing && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={20} />
                    <span className="font-bold text-blue-900 dark:text-blue-100">
                      Importing items... {importProgress.completed} / {importProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.completed / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {bulkItems.length > 0 && (
                  <span>
                    {bulkItems.filter(item => item.name && Number(item.sellingPrice || 0) > 0).length} valid items ready
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setBulkItems([]);
                    setCsvFile(null);
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSave}
                  disabled={importing || bulkItems.length === 0 || bulkItems.filter(item => item.name && Number(item.sellingPrice || 0) > 0).length === 0}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/30 hover:scale-105"
                >
                  {importing ? `Importing... (${importProgress.completed}/${importProgress.total})` : `Import ${bulkItems.filter(item => item.name && Number(item.sellingPrice || 0) > 0).length} Items`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

