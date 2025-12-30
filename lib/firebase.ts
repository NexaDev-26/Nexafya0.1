// Enhanced Firebase configuration with all services
import { initializeApp } from "firebase/app";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with custom database name
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Initialize Firestore with persistent cache (new API to avoid deprecation warning)
let db;
if (typeof window !== 'undefined') {
  try {
    // Try new API first
    db = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    }, 'nexafyadb');
  } catch (error: any) {
    // If already initialized or fails, fallback to regular initialization
    db = getFirestore(app, 'nexafyadb');
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
