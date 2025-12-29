/**
 * Supplier Service
 * Manages pharmacy suppliers and purchase records
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

export interface Supplier {
  id?: string;
  pharmacyId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  rating?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface PurchaseRecord {
  id?: string;
  pharmacyId: string;
  branchId?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  currency: string;
  invoiceNumber?: string;
  purchaseDate: string;
  deliveryDate?: string;
  status: 'PENDING' | 'ORDERED' | 'DELIVERED' | 'CANCELLED';
  notes?: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PurchaseItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

class SupplierService {
  /**
   * Create a new supplier
   */
  async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const supplierRef = await addDoc(collection(firestore, 'suppliers'), {
        ...supplier,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return supplierRef.id;
    } catch (error) {
      console.error('Create supplier error:', error);
      throw error;
    }
  }

  /**
   * Get suppliers for a pharmacy
   */
  async getSuppliers(pharmacyId: string): Promise<Supplier[]> {
    try {
      const q = query(
        collection(firestore, 'suppliers'),
        where('pharmacyId', '==', pharmacyId),
        where('isActive', '==', true),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Supplier[];
    } catch (error) {
      console.error('Get suppliers error:', error);
      return [];
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<boolean> {
    try {
      const supplierRef = doc(firestore, 'suppliers', supplierId);
      await updateDoc(supplierRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Update supplier error:', error);
      throw error;
    }
  }

  /**
   * Delete supplier (soft delete)
   */
  async deleteSupplier(supplierId: string): Promise<boolean> {
    try {
      await this.updateSupplier(supplierId, { isActive: false });
      return true;
    } catch (error) {
      console.error('Delete supplier error:', error);
      throw error;
    }
  }

  /**
   * Create a purchase record
   */
  async createPurchaseRecord(purchase: Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const purchaseRef = await addDoc(collection(firestore, 'purchaseRecords'), {
        ...purchase,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return purchaseRef.id;
    } catch (error) {
      console.error('Create purchase record error:', error);
      throw error;
    }
  }

  /**
   * Get purchase records for a pharmacy
   */
  async getPurchaseRecords(
    pharmacyId: string,
    branchId?: string,
    status?: string
  ): Promise<PurchaseRecord[]> {
    try {
      let q = query(
        collection(firestore, 'purchaseRecords'),
        where('pharmacyId', '==', pharmacyId),
        orderBy('purchaseDate', 'desc')
      );

      if (branchId) {
        q = query(q, where('branchId', '==', branchId));
      }

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PurchaseRecord[];
    } catch (error) {
      console.error('Get purchase records error:', error);
      return [];
    }
  }

  /**
   * Update purchase record status
   */
  async updatePurchaseStatus(
    purchaseId: string,
    status: PurchaseRecord['status'],
    notes?: string
  ): Promise<boolean> {
    try {
      const purchaseRef = doc(firestore, 'purchaseRecords', purchaseId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === 'DELIVERED' && !updateData.deliveryDate) {
        updateData.deliveryDate = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await updateDoc(purchaseRef, updateData);

      return true;
    } catch (error) {
      console.error('Update purchase status error:', error);
      throw error;
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(supplierId: string): Promise<Supplier | null> {
    try {
      const supplierRef = doc(firestore, 'suppliers', supplierId);
      const supplierSnap = await getDoc(supplierRef);

      if (!supplierSnap.exists()) {
        return null;
      }

      return {
        id: supplierSnap.id,
        ...supplierSnap.data(),
      } as Supplier;
    } catch (error) {
      console.error('Get supplier error:', error);
      return null;
    }
  }

  /**
   * Get purchase analytics for a pharmacy
   */
  async getPurchaseAnalytics(pharmacyId: string, startDate?: Date, endDate?: Date): Promise<{
    totalPurchases: number;
    totalAmount: number;
    averagePurchase: number;
    topSuppliers: { supplierId: string; supplierName: string; totalAmount: number; count: number }[];
  }> {
    try {
      const purchases = await this.getPurchaseRecords(pharmacyId);

      let filteredPurchases = purchases;
      if (startDate || endDate) {
        filteredPurchases = purchases.filter(p => {
          const purchaseDate = new Date(p.purchaseDate);
          if (startDate && purchaseDate < startDate) return false;
          if (endDate && purchaseDate > endDate) return false;
          return true;
        });
      }

      const totalPurchases = filteredPurchases.length;
      const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const averagePurchase = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

      // Top suppliers
      const supplierMap = new Map<string, { name: string; total: number; count: number }>();
      filteredPurchases.forEach(p => {
        const existing = supplierMap.get(p.supplierId) || { name: p.supplierName, total: 0, count: 0 };
        supplierMap.set(p.supplierId, {
          name: p.supplierName,
          total: existing.total + p.totalAmount,
          count: existing.count + 1,
        });
      });

      const topSuppliers = Array.from(supplierMap.entries())
        .map(([supplierId, data]) => ({
          supplierId,
          supplierName: data.name,
          totalAmount: data.total,
          count: data.count,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      return {
        totalPurchases,
        totalAmount,
        averagePurchase,
        topSuppliers,
      };
    } catch (error) {
      console.error('Get purchase analytics error:', error);
      return {
        totalPurchases: 0,
        totalAmount: 0,
        averagePurchase: 0,
        topSuppliers: [],
      };
    }
  }
}

export const supplierService = new SupplierService();
export default supplierService;

