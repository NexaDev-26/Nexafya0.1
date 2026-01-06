// Enhanced Firebase configuration with all services
import { initializeApp, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase configuration
// Uses environment variables if available, falls back to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA6R40s-SVIKfjOQ-7-q8fXNBD7TrwQ9qo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexafya.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexafya",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexafya.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123250180152",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123250180152:web:5718f4ba4bb477ef0d66cd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5QL5G79198"
};

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  // If app already initialized, get existing instance
  if (error.code === 'app/already-initialized') {
    try {
      app = getApp();
    } catch (getAppError) {
      // If getApp fails, try with a named app
      console.warn('Firebase app already initialized, using default instance');
      app = getApp('[DEFAULT]');
    }
  } else {
    console.error('Failed to initialize Firebase:', error);
    // In production, try to continue with fallback
    try {
      // Try with a different app name to avoid conflicts
      app = initializeApp(firebaseConfig, 'nexafya-fallback');
    } catch (fallbackError) {
      console.error('Firebase initialization failed completely:', fallbackError);
      // Re-throw only in development
      if (import.meta.env.DEV) {
        throw error;
      }
      // In production, try to get existing app or create minimal one
      try {
        app = getApp();
      } catch {
        // Last resort - this should not happen but prevents complete failure
        console.error('Critical: Firebase cannot be initialized');
        throw new Error('Firebase initialization failed. Please check your configuration.');
      }
    }
  }
}

// Initialize Firebase services with custom database name
export const analytics = typeof window !== 'undefined' ? (() => {
  try {
    return getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
    return null;
  }
})() : null;

export const auth = getAuth(app);

// Initialize Firestore with persistent cache (new API to avoid deprecation warning)
let db;
if (typeof window !== 'undefined') {
  try {
    // Try new API first - persistentLocalCache enables multi-tab sync by default in v9+
    db = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    }, 'nexafyadb');
  } catch (error: any) {
    // If already initialized or fails (e.g., another tab has exclusive access), 
    // fallback to regular initialization which will use memory cache
    console.warn('Firestore persistence initialization failed, using memory cache:', error.message);
    try {
      db = getFirestore(app, 'nexafyadb');
    } catch (fallbackError: any) {
      // If that also fails, try without database name
      db = getFirestore(app);
    }
  }
} else {
  db = getFirestore(app, 'nexafyadb');
}

export { db };
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development (optional)
const USE_EMULATORS = false; // Set to true for local development with emulators

if (USE_EMULATORS && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🔧 Connecting to Firebase emulators...');
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Storage bucket references
export const storageRefs = {
  avatars: 'avatars',
  healthRecords: 'health-records',
  prescriptions: 'prescriptions',
  articleImages: 'articles',
  verificationDocs: 'verifications',
  proofOfDelivery: 'delivery-proofs',
};

console.log('🔥 Firebase initialized for NexaFya');

export default app;
