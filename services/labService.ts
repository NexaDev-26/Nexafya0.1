/**
 * Lab Integration Service
 * Handles lab test bookings, results, and partner management
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface LabTest {
  id?: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  currency: string;
  duration?: string; // e.g., "24 hours"
  preparation?: string;
  labPartnerId?: string;
  labPartnerName?: string;
  isAvailable: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface LabBooking {
  id?: string;
  userId: string;
  userName: string;
  testId: string;
  testName: string;
  labPartnerId: string;
  labPartnerName: string;
  status: 'PENDING' | 'CONFIRMED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  appointmentDate?: any;
  appointmentTime?: string;
  sampleCollectionDate?: any;
  resultReadyDate?: any;
  resultUrl?: string;
  resultNotes?: string;
  doctorNotes?: string;
  price: number;
  currency: string;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  transactionId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LabPartner {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  location?: { lat: number; lng: number };
  specialties: string[];
  isActive: boolean;
  rating?: number;
  ratingCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface LabResult {
  id?: string;
  bookingId: string;
  testName: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  resultData: Record<string, any>;
  resultFileUrl?: string;
  interpretation?: string;
  status: 'PENDING' | 'REVIEWED' | 'SHARED';
  reviewedBy?: string;
  reviewedAt?: any;
  sharedWith?: string[];
  createdAt?: any;
  updatedAt?: any;
}

class LabService {
  /**
   * Get all available lab tests
   */
  async getLabTests(category?: string): Promise<LabTest[]> {
    try {
      let q = query(
        collection(firestore, 'labTests'),
        where('isAvailable', '==', true),
        orderBy('name', 'asc')
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LabTest[];
    } catch (error) {
      console.error('Get lab tests error:', error);
      return [];
    }
  }

  /**
   * Get lab test by ID
   */
  async getLabTest(testId: string): Promise<LabTest | null> {
    try {
      const testRef = doc(firestore, 'labTests', testId);
      const testSnap = await getDoc(testRef);

      if (testSnap.exists()) {
        return { id: testSnap.id, ...testSnap.data() } as LabTest;
      }
      return null;
    } catch (error) {
      console.error('Get lab test error:', error);
      return null;
    }
  }

  /**
   * Get all lab partners
   */
  async getLabPartners(): Promise<LabPartner[]> {
    try {
      const q = query(
        collection(firestore, 'labPartners'),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LabPartner[];
    } catch (error) {
      console.error('Get lab partners error:', error);
      return [];
    }
  }

  /**
   * Book a lab test
   */
  async bookLabTest(booking: Omit<LabBooking, 'id' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const bookingRef = await addDoc(collection(firestore, 'labBookings'), {
        ...booking,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return bookingRef.id;
    } catch (error) {
      console.error('Book lab test error:', error);
      throw error;
    }
  }

  /**
   * Get user's lab bookings
   */
  async getUserLabBookings(userId: string): Promise<LabBooking[]> {
    try {
      const q = query(
        collection(firestore, 'labBookings'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LabBooking[];
    } catch (error) {
      console.error('Get user lab bookings error:', error);
      return [];
    }
  }

  /**
   * Update lab booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: LabBooking['status'],
    notes?: string
  ): Promise<void> {
    try {
      const bookingRef = doc(firestore, 'labBookings', bookingId);
      const updates: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (notes) {
        if (status === 'COMPLETED') {
          updates.resultNotes = notes;
          updates.resultReadyDate = serverTimestamp();
        } else if (status === 'SAMPLE_COLLECTED') {
          updates.sampleCollectionDate = serverTimestamp();
          updates.doctorNotes = notes;
        }
      }

      await updateDoc(bookingRef, updates);
    } catch (error) {
      console.error('Update booking status error:', error);
      throw error;
    }
  }

  /**
   * Upload lab result
   */
  async uploadLabResult(
    bookingId: string,
    resultData: Record<string, any>,
    resultFileUrl?: string,
    interpretation?: string
  ): Promise<string> {
    try {
      // Get booking info
      const bookingRef = doc(firestore, 'labBookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }

      const booking = bookingSnap.data() as LabBooking;

      // Create result document
      const resultRef = await addDoc(collection(firestore, 'labResults'), {
        bookingId,
        testName: booking.testName,
        patientId: booking.userId,
        patientName: booking.userName,
        resultData,
        resultFileUrl,
        interpretation,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update booking status
      await updateDoc(bookingRef, {
        status: 'COMPLETED',
        resultUrl: resultFileUrl,
        resultReadyDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return resultRef.id;
    } catch (error) {
      console.error('Upload lab result error:', error);
      throw error;
    }
  }

  /**
   * Get lab results for a patient
   */
  async getPatientResults(patientId: string): Promise<LabResult[]> {
    try {
      const q = query(
        collection(firestore, 'labResults'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LabResult[];
    } catch (error) {
      console.error('Get patient results error:', error);
      return [];
    }
  }

  /**
   * Share lab result with doctor
   */
  async shareResultWithDoctor(resultId: string, doctorId: string): Promise<void> {
    try {
      const resultRef = doc(firestore, 'labResults', resultId);
      const resultSnap = await getDoc(resultRef);

      if (!resultSnap.exists()) {
        throw new Error('Result not found');
      }

      const result = resultSnap.data() as LabResult;
      const sharedWith = result.sharedWith || [];

      if (!sharedWith.includes(doctorId)) {
        sharedWith.push(doctorId);
      }

      await updateDoc(resultRef, {
        sharedWith,
        status: 'SHARED',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Share result error:', error);
      throw error;
    }
  }

  /**
   * Add lab partner
   */
  async addLabPartner(partner: Omit<LabPartner, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const partnerRef = await addDoc(collection(firestore, 'labPartners'), {
        ...partner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return partnerRef.id;
    } catch (error) {
      console.error('Add lab partner error:', error);
      throw error;
    }
  }

  /**
   * Add lab test
   */
  async addLabTest(test: Omit<LabTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const testRef = await addDoc(collection(firestore, 'labTests'), {
        ...test,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return testRef.id;
    } catch (error) {
      console.error('Add lab test error:', error);
      throw error;
    }
  }
}

export const labService = new LabService();
export default labService;

