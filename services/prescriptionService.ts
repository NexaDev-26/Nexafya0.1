/**
 * Prescription Service
 * Handles prescription chain of custody and lifecycle management
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Prescription, PrescriptionItem } from '../types';

class PrescriptionService {
  /**
   * Create a new prescription (issued by doctor)
   */
  async createPrescription(prescription: Omit<Prescription, 'id' | 'status' | 'issuedAt' | 'createdAt'>): Promise<string> {
    try {
      const prescriptionRef = await addDoc(collection(firestore, 'prescriptions'), {
        ...prescription,
        status: 'ISSUED',
        issuedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return prescriptionRef.id;
    } catch (error) {
      console.error('Create prescription error:', error);
      throw error;
    }
  }

  /**
   * Lock prescription by pharmacy (prevent double dispensing)
   */
  async lockPrescription(
    prescriptionId: string,
    pharmacyId: string,
    pharmacyName: string
  ): Promise<boolean> {
    try {
      const prescriptionRef = doc(firestore, 'prescriptions', prescriptionId);
      const prescriptionSnap = await getDoc(prescriptionRef);

      if (!prescriptionSnap.exists()) {
        throw new Error('Prescription not found');
      }

      const currentStatus = prescriptionSnap.data().status;

      // Can only lock if status is ISSUED
      if (currentStatus !== 'ISSUED') {
        throw new Error(`Cannot lock prescription. Current status: ${currentStatus}`);
      }

      await updateDoc(prescriptionRef, {
        status: 'LOCKED_BY_PHARMACY',
        pharmacyId,
        pharmacyName,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error: any) {
      console.error('Lock prescription error:', error);
      throw error;
    }
  }

  /**
   * Dispense prescription (after locking)
   */
  async dispensePrescription(prescriptionId: string): Promise<boolean> {
    try {
      const prescriptionRef = doc(firestore, 'prescriptions', prescriptionId);
      const prescriptionSnap = await getDoc(prescriptionRef);

      if (!prescriptionSnap.exists()) {
        throw new Error('Prescription not found');
      }

      const currentStatus = prescriptionSnap.data().status;

      // Can only dispense if locked by pharmacy
      if (currentStatus !== 'LOCKED_BY_PHARMACY') {
        throw new Error(`Cannot dispense prescription. Current status: ${currentStatus}`);
      }

      await updateDoc(prescriptionRef, {
        status: 'DISPENSED',
        dispensedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error: any) {
      console.error('Dispense prescription error:', error);
      throw error;
    }
  }

  /**
   * Get prescription by ID
   */
  async getPrescription(prescriptionId: string): Promise<Prescription | null> {
    try {
      const prescriptionRef = doc(firestore, 'prescriptions', prescriptionId);
      const prescriptionSnap = await getDoc(prescriptionRef);

      if (!prescriptionSnap.exists()) {
        return null;
      }

      return {
        id: prescriptionSnap.id,
        ...prescriptionSnap.data(),
      } as Prescription;
    } catch (error) {
      console.error('Get prescription error:', error);
      return null;
    }
  }

  /**
   * Get prescriptions for a patient
   */
  async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    try {
      const q = query(
        collection(firestore, 'prescriptions'),
        where('patientId', '==', patientId),
        orderBy('issuedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Prescription[];
    } catch (error) {
      console.error('Get patient prescriptions error:', error);
      return [];
    }
  }

  /**
   * Get prescriptions for a doctor
   */
  async getDoctorPrescriptions(doctorId: string): Promise<Prescription[]> {
    try {
      const q = query(
        collection(firestore, 'prescriptions'),
        where('doctorId', '==', doctorId),
        orderBy('issuedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Prescription[];
    } catch (error) {
      console.error('Get doctor prescriptions error:', error);
      return [];
    }
  }

  /**
   * Get prescriptions locked by a pharmacy
   */
  async getPharmacyPrescriptions(pharmacyId: string, status?: string): Promise<Prescription[]> {
    try {
      let q = query(
        collection(firestore, 'prescriptions'),
        where('pharmacyId', '==', pharmacyId),
        orderBy('lockedAt', 'desc')
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Prescription[];
    } catch (error) {
      console.error('Get pharmacy prescriptions error:', error);
      return [];
    }
  }

  /**
   * Verify prescription by QR code
   */
  async verifyPrescriptionByQR(qrCode: string): Promise<Prescription | null> {
    try {
      const q = query(
        collection(firestore, 'prescriptions'),
        where('qrCode', '==', qrCode),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Prescription;
    } catch (error) {
      console.error('Verify prescription by QR error:', error);
      return null;
    }
  }

  /**
   * Send prescription to pharmacy
   */
  async sendToPharmacy(prescriptionId: string, pharmacyId: string, pharmacyName: string): Promise<boolean> {
    try {
      // This will lock the prescription for the pharmacy
      return await this.lockPrescription(prescriptionId, pharmacyId, pharmacyName);
    } catch (error) {
      console.error('Send to pharmacy error:', error);
      throw error;
    }
  }

  /**
   * Upload external prescription (patient uploads)
   */
  async uploadExternalPrescription(
    patientId: string,
    patientName: string,
    fileUrl: string,
    items?: PrescriptionItem[]
  ): Promise<string> {
    try {
      const prescriptionRef = await addDoc(collection(firestore, 'prescriptions'), {
        patientId,
        patientName,
        status: 'ISSUED',
        isExternal: true,
        externalFileUrl: fileUrl,
        items: items || [],
        issuedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return prescriptionRef.id;
    } catch (error) {
      console.error('Upload external prescription error:', error);
      throw error;
    }
  }

  /**
   * Check if prescription can be dispensed (not already dispensed)
   */
  async canDispense(prescriptionId: string): Promise<boolean> {
    try {
      const prescription = await this.getPrescription(prescriptionId);
      if (!prescription) return false;

      return prescription.status === 'LOCKED_BY_PHARMACY' || prescription.status === 'ISSUED';
    } catch (error) {
      return false;
    }
  }

  /**
   * Cancel prescription
   */
  async cancelPrescription(prescriptionId: string, reason?: string): Promise<boolean> {
    try {
      const prescriptionRef = doc(firestore, 'prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
        cancelReason: reason,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Cancel prescription error:', error);
      throw error;
    }
  }
}

export const prescriptionService = new PrescriptionService();
export default prescriptionService;

