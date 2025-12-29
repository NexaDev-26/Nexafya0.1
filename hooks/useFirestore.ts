/**
 * Real-time Firebase Firestore hooks
 * Provides live data synchronization using onSnapshot listeners
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  QueryConstraint,
  DocumentData
} from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

/**
 * Generic hook for real-time collection listening
 */
export function useFirestoreCollection<T = DocumentData>(
  collectionName: string,
  queryConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const collectionRef = collection(firestore, collectionName);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints)
      : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints)]);

  return { data, loading, error };
}

/**
 * Generic hook for real-time document listening
 */
export function useFirestoreDocument<T = DocumentData>(
  collectionName: string,
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(firestore, collectionName, documentId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}/${documentId}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId]);

  return { data, loading, error };
}

/**
 * Hook for real-time appointments (patient or doctor specific)
 */
export function useAppointments(userId: string, role: 'patient' | 'doctor') {
  const field = role === 'doctor' ? 'doctorId' : 'patientId';
  
  return useFirestoreCollection(
    'appointments',
    [
      where(field, '==', userId),
      orderBy('scheduledAt', 'desc')
    ]
  );
}

/**
 * Hook for real-time messages in a chat
 */
export function useMessages(chatId: string) {
  return useFirestoreCollection(
    'messages',
    [
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    ]
  );
}

/**
 * Hook for real-time orders (patient or pharmacy specific)
 */
export function useOrders(userId: string, userType: 'patient' | 'pharmacy') {
  const field = userType === 'pharmacy' ? 'pharmacyId' : 'userId';
  
  return useFirestoreCollection(
    'orders',
    [
      where(field, '==', userId),
      orderBy('createdAt', 'desc')
    ]
  );
}

/**
 * Hook for real-time health records
 */
export function useHealthRecords(userId: string) {
  return useFirestoreCollection(
    'healthRecords',
    [
      where('userId', '==', userId),
      orderBy('recordedAt', 'desc')
    ]
  );
}

/**
 * Hook for real-time health metrics
 */
export function useHealthMetrics(userId: string, metricType?: string) {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('recordedAt', 'desc')
  ];
  
  if (metricType) {
    constraints.unshift(where('type', '==', metricType));
  }
  
  return useFirestoreCollection('healthMetrics', constraints);
}

/**
 * Hook for real-time household visits (CHW specific)
 */
export function useHouseholdVisits(chwId: string) {
  return useFirestoreCollection(
    'householdVisits',
    [
      where('chwId', '==', chwId),
      orderBy('visitDate', 'desc')
    ]
  );
}

/**
 * Hook for real-time inventory (pharmacy specific)
 */
export function useInventory(pharmacyId: string) {
  return useFirestoreCollection(
    'inventory',
    [
      where('pharmacyId', '==', pharmacyId),
      orderBy('name', 'asc')
    ]
  );
}

/**
 * Hook for real-time transactions
 */
export function useTransactions(userId: string) {
  return useFirestoreCollection(
    'transactions',
    [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    ]
  );
}

/**
 * Hook for real-time articles (public or premium)
 */
export function useArticles(filterPremium?: boolean) {
  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc')
  ];
  
  if (filterPremium !== undefined) {
    constraints.unshift(where('isPremium', '==', filterPremium));
  }
  
  return useFirestoreCollection('articles', constraints);
}

/**
 * Hook for real-time doctors list
 */
export function useDoctors(specialty?: string) {
  const constraints: QueryConstraint[] = [
    orderBy('rating', 'desc')
  ];
  
  if (specialty) {
    constraints.unshift(where('specialty', '==', specialty));
  }
  
  return useFirestoreCollection('doctors', constraints);
}

/**
 * Hook for real-time single doctor
 */
export function useDoctor(doctorId: string | null) {
  return useFirestoreDocument('doctors', doctorId);
}

/**
 * Hook for real-time user profile
 */
export function useUserProfile(userId: string | null) {
  return useFirestoreDocument('users', userId);
}

/**
 * Hook for real-time SOS alerts (admin view)
 */
export function useSOSAlerts(adminId?: string) {
  return useFirestoreCollection(
    'sosAlerts',
    [
      where('status', '==', 'ACTIVE'),
      orderBy('createdAt', 'desc')
    ]
  );
}

/**
 * Hook for real-time courier tracking
 */
export function useCourierTracking(orderId: string) {
  return useFirestoreDocument('orders', orderId);
}

