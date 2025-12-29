/**
 * Consent Management Service
 * Handles patient consent for data access and sharing
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
  serverTimestamp,
} from 'firebase/firestore';

export type ConsentType =
  | 'DATA_COLLECTION'
  | 'DATA_SHARING'
  | 'TREATMENT'
  | 'RESEARCH'
  | 'MARKETING'
  | 'PHARMACY_SHARING'
  | 'FAMILY_ACCESS';

export type ConsentStatus = 'GRANTED' | 'DENIED' | 'REVOKED' | 'PENDING';

export interface ConsentRecord {
  id?: string;
  patientId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  grantedTo?: string; // User ID or role (e.g., 'DOCTOR', 'PHARMACY', specific user ID)
  grantedToName?: string;
  description: string;
  grantedAt?: any;
  revokedAt?: any;
  expiresAt?: any;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

class ConsentService {
  /**
   * Grant consent
   */
  async grantConsent(consent: Omit<ConsentRecord, 'id' | 'status' | 'grantedAt' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const consentRef = await addDoc(collection(firestore, 'consents'), {
        ...consent,
        status: 'GRANTED',
        grantedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return consentRef.id;
    } catch (error) {
      console.error('Grant consent error:', error);
      throw error;
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(consentId: string, reason?: string): Promise<boolean> {
    try {
      const consentRef = doc(firestore, 'consents', consentId);
      await updateDoc(consentRef, {
        status: 'REVOKED',
        revokedAt: serverTimestamp(),
        notes: reason,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Revoke consent error:', error);
      throw error;
    }
  }

  /**
   * Get patient consents
   */
  async getPatientConsents(patientId: string): Promise<ConsentRecord[]> {
    try {
      const q = query(
        collection(firestore, 'consents'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ConsentRecord[];
    } catch (error) {
      console.error('Get patient consents error:', error);
      return [];
    }
  }

  /**
   * Check if consent is granted
   */
  async hasConsent(
    patientId: string,
    consentType: ConsentType,
    grantedTo?: string
  ): Promise<boolean> {
    try {
      let q = query(
        collection(firestore, 'consents'),
        where('patientId', '==', patientId),
        where('consentType', '==', consentType),
        where('status', '==', 'GRANTED')
      );

      if (grantedTo) {
        q = query(q, where('grantedTo', '==', grantedTo));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }

      // Check if consent has expired
      const consent = querySnapshot.docs[0].data() as ConsentRecord;
      if (consent.expiresAt) {
        const expiresAt = consent.expiresAt.toDate ? consent.expiresAt.toDate() : new Date(consent.expiresAt);
        if (expiresAt < new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Check consent error:', error);
      return false;
    }
  }

  /**
   * Grant consent to doctor
   */
  async grantDoctorAccess(patientId: string, doctorId: string, doctorName: string): Promise<string> {
    return this.grantConsent({
      patientId,
      consentType: 'TREATMENT',
      grantedTo: doctorId,
      grantedToName: doctorName,
      description: `Consent for ${doctorName} to access medical records for treatment purposes`,
    });
  }

  /**
   * Grant consent to pharmacy
   */
  async grantPharmacyAccess(patientId: string, pharmacyId: string, pharmacyName: string): Promise<string> {
    return this.grantConsent({
      patientId,
      consentType: 'PHARMACY_SHARING',
      grantedTo: pharmacyId,
      grantedToName: pharmacyName,
      description: `Consent for ${pharmacyName} to access prescription information`,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });
  }

  /**
   * Grant consent to family member/caregiver
   */
  async grantFamilyAccess(
    patientId: string,
    familyMemberId: string,
    familyMemberName: string
  ): Promise<string> {
    return this.grantConsent({
      patientId,
      consentType: 'FAMILY_ACCESS',
      grantedTo: familyMemberId,
      grantedToName: familyMemberName,
      description: `Consent for ${familyMemberName} to access health information`,
    });
  }

  /**
   * Get consent dashboard data
   */
  async getConsentDashboard(patientId: string): Promise<{
    activeConsents: ConsentRecord[];
    revokedConsents: ConsentRecord[];
    pendingConsents: ConsentRecord[];
    summary: {
      total: number;
      active: number;
      revoked: number;
      expired: number;
    };
  }> {
    try {
      const allConsents = await this.getPatientConsents(patientId);
      const now = new Date();

      const activeConsents = allConsents.filter(c => {
        if (c.status !== 'GRANTED') return false;
        if (c.expiresAt) {
          const expiresAt = c.expiresAt.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
          return expiresAt >= now;
        }
        return true;
      });

      const revokedConsents = allConsents.filter(c => c.status === 'REVOKED');
      const pendingConsents = allConsents.filter(c => c.status === 'PENDING');

      const expiredConsents = allConsents.filter(c => {
        if (c.status !== 'GRANTED') return false;
        if (c.expiresAt) {
          const expiresAt = c.expiresAt.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
          return expiresAt < now;
        }
        return false;
      });

      return {
        activeConsents,
        revokedConsents,
        pendingConsents,
        summary: {
          total: allConsents.length,
          active: activeConsents.length,
          revoked: revokedConsents.length,
          expired: expiredConsents.length,
        },
      };
    } catch (error) {
      console.error('Get consent dashboard error:', error);
      return {
        activeConsents: [],
        revokedConsents: [],
        pendingConsents: [],
        summary: {
          total: 0,
          active: 0,
          revoked: 0,
          expired: 0,
        },
      };
    }
  }
}

export const consentService = new ConsentService();
export default consentService;

