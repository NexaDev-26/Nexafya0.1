import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db as firestore } from '../lib/firebase';
import { User, UserRole } from '../types';
import { useNotification } from '../components/NotificationSystem';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<boolean>; 
  signUp: (email: string, password: string, name: string, role: string) => Promise<boolean>;
  signInWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOTP: (confirmationResult: ConfirmationResult, code: string, name?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  setupRecaptcha: (elementId: string) => RecaptchaVerifier;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  const refreshProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error("User profile not found in Firestore");
        notify("User profile not found. Please contact support.", "error");
          return null;
        }

      const userData = userDoc.data();
      const userProfile: User = {
        id: firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        role: userData.role as UserRole || UserRole.PATIENT,
        avatar: userData.avatar || firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${userData.name || 'User'}&background=random`,
        location: userData.location || 'Tanzania',
        phone: userData.phone || '',
        points: userData.points || 0,
        referralCode: userData.referralCode || `REF${firebaseUser.uid.slice(0, 8).toUpperCase()}`,
        referralCount: userData.referralCount || 0,
        referralCredits: userData.referralCredits || 0
          };

      setUser(userProfile);
      return userProfile;
    } catch (e: any) {
        console.error("Auth Exception:", e);
      notify("Failed to load user profile", "error");
        return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await refreshProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password?: string): Promise<boolean> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password || '');
      const profile = await refreshProfile(userCredential.user);
      setLoading(false);
      return !!profile;
    } catch(e: any) {
      notify(e.message || 'Sign in failed', 'error');
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await firebaseUpdateProfile(firebaseUser, {
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${name}&background=random`
      });

      // Generate referral code
      const referralCode = `REF${firebaseUser.uid.slice(0, 8).toUpperCase()}`;

      // Create Firestore user document
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        name,
        email,
        role: role || 'PATIENT',
        avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
        location: 'Tanzania',
        phone: '',
        points: 0,
        referralCode,
        referralCount: 0,
        referralCredits: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      notify('Account created successfully!', 'success');
      await refreshProfile(firebaseUser);
      setLoading(false);
      return true;
    } catch (e: any) {
      notify(e.message || 'Sign up failed', 'error');
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      const userDocRef = doc(firestore, 'users', user.id);
      await updateDoc(userDocRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
        setUser({ ...user, ...updates });
        notify("Profile updated!", "success");
    } catch (e: any) {
      notify(e.message || 'Update failed', "error");
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      notify('Password reset email sent!', 'success');
    } catch (e: any) {
      notify(e.message || 'Failed to send reset email', 'error');
    }
  };

  // Setup reCAPTCHA verifier for phone authentication
  const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
    return new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber
      }
    });
  };

  // Sign in with phone number
  const signInWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    try {
      setLoading(true);
      // Ensure phone number is in international format (e.g., +255...)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setLoading(false);
      notify('OTP sent to your phone!', 'success');
      return confirmationResult;
    } catch (e: any) {
      setLoading(false);
      notify(e.message || 'Failed to send OTP', 'error');
      throw e;
    }
  };

  // Verify phone OTP and complete sign in/sign up
  const verifyPhoneOTP = async (confirmationResult: ConfirmationResult, code: string, name?: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;

      // Check if user profile exists
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // New user - create profile
        const displayName = name || firebaseUser.phoneNumber || 'User';
        await firebaseUpdateProfile(firebaseUser, {
          displayName,
          photoURL: `https://ui-avatars.com/api/?name=${displayName}&background=random`
        });

        // Generate referral code
        const referralCode = `REF${firebaseUser.uid.slice(0, 8).toUpperCase()}`;

        await setDoc(userDocRef, {
          name: displayName,
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          role: 'PATIENT',
          avatar: `https://ui-avatars.com/api/?name=${displayName}&background=random`,
          location: 'Tanzania',
          points: 0,
          referralCode,
          referralCount: 0,
          referralCredits: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        notify('Account created successfully!', 'success');
      } else {
        notify('Signed in successfully!', 'success');
      }

      await refreshProfile(firebaseUser);
      setLoading(false);
      return true;
    } catch (e: any) {
      setLoading(false);
      notify(e.message || 'Invalid OTP', 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signInWithPhone,
      verifyPhoneOTP,
      signOut, 
      updateProfile, 
      sendPasswordReset,
      setupRecaptcha
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
