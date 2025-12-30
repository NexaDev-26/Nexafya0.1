
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Article, FamilyMember, Transaction, DoctorPaymentDetail, VerificationDocument } from '../types';
// Added MapPin to the lucide-react imports
import { User as UserIcon, Edit2, Camera, ShieldCheck, Wallet, Plus, Trash2, Users, FileText, Shield, Check, X, Banknote, Upload, CheckCircle, Smartphone, Key, Loader2, Stethoscope, Briefcase, DollarSign, MapPin, CreditCard, HeartPulse, Share2, Gift, Crown, Award } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { usePreferences } from '../contexts/PreferencesContext';
import { db } from '../services/db';
import { Settings } from './Settings';
import { SubscriptionManagement } from './SubscriptionManagement';
import { NHIFIntegration } from './NHIFIntegration';
import { ReferralProgram } from './ReferralProgram';
import { VerificationDocumentUpload } from './VerificationDocumentUpload';
import { storage, storageRefs, db as firestore } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTransactions } from '../hooks/useFirestore';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, getDoc, Timestamp } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';
import { SubscriptionPackage } from '../types';
import { firebaseDb } from '../services/firebaseDb';
import { notificationService } from '../services/notificationService';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  articles: Article[];
  onNavigate: (view: string) => void;
  onViewArticle?: (id: string) => void;
  familyMembers: FamilyMember[];
  onAddFamilyMember: (member: Omit<FamilyMember, 'id' | 'avatar'>) => void;
  onRemoveFamilyMember?: (id: string) => void;
  onUpdateUser?: (updates: Partial<User>) => void;
  initialTab?: string;
}

export const Profile: React.FC<ProfileProps> = ({ 
    user, 
    onLogout, 
    onNavigate, 
    familyMembers = [], 
    onAddFamilyMember, 
    onRemoveFamilyMember,
    onUpdateUser,
    initialTab = 'overview' 
}) => {
  const { notify } = useNotification();
  const { currency } = usePreferences();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      name: user.name,
      location: user.location || 'Dar es Salaam',
  });

  // Doctor-specific state
  const [doctorDetails, setDoctorDetails] = useState({
      specialty: '',
      experience: 0,
      price: 0,
      bio: '',
      workplace: ''
  });

  // Finance state (doctor/pharmacy)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [showAddPayMethod, setShowAddPayMethod] = useState(false);
  const [newPayMethod, setNewPayMethod] = useState({ provider: 'M-Pesa', number: '', name: '', bankName: '' });
  const [isSavingPaymentMethod, setIsSavingPaymentMethod] = useState(false);
  
  // Package subscription state
  const [availablePackages, setAvailablePackages] = useState<SubscriptionPackage[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showPackagePayment, setShowPackagePayment] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);
  
  // Trust Tier state (for Doctors and Couriers)
  const [trustTierAssignment, setTrustTierAssignment] = useState<any>(null);
  const [trustTierConfigs, setTrustTierConfigs] = useState<any[]>([]);
  const [loadingTrustTier, setLoadingTrustTier] = useState(false);
  
  // Family member form state
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    relation: '',
    age: 0,
    gender: 'Other' as 'Male' | 'Female' | 'Other'
  });

  useEffect(() => {
      if (user.role === UserRole.DOCTOR) {
          const fetchDoctorInfo = async () => {
              const data = await db.getDoctorDetails(user.id);
              if (data) {
                  setDoctorDetails({
                      specialty: (data as any).specialty || '',
                      experience: (data as any).experience_years || (data as any).experience || 0,
                      price: (data as any).consultation_fee || (data as any).price || 0,
                      bio: (data as any).bio || '',
                      workplace: (data as any).workplace || ''
                  });
              }
          };
          fetchDoctorInfo();
      }
  }, [user.id, user.role]);

  useEffect(() => {
      const loadFinance = async () => {
          if (user.role !== UserRole.DOCTOR && user.role !== UserRole.PHARMACY) return;
          try {
              // Load payment methods - different collections for doctor vs pharmacy
              const paymentMethodCollection = user.role === UserRole.DOCTOR 
                  ? 'doctorPaymentMethods' 
                  : 'pharmacyPaymentMethods';
              const userIdField = user.role === UserRole.DOCTOR ? 'doctorId' : 'pharmacyId';
              
              const pmSnap = await getDocs(query(collection(firestore, paymentMethodCollection), where(userIdField, '==', user.id)));
              setPaymentMethods(pmSnap.docs.map(d => ({ id: d.id, ...d.data() })));

              // Load pending payments - for pharmacy, filter by order itemType
              const txQuery = user.role === UserRole.PHARMACY
                  ? query(
                      collection(firestore, 'transactions'),
                      where('recipientId', '==', user.id),
                      where('status', '==', 'PENDING_VERIFICATION'),
                      where('itemType', '==', 'order')
                  )
                  : query(
                      collection(firestore, 'transactions'),
                      where('recipientId', '==', user.id),
                      where('status', '==', 'PENDING_VERIFICATION')
                  );
              
              const txSnap = await getDocs(txQuery);
              setPendingPayments(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
              
              // Load available packages for user's role
              const packages = await firebaseDb.getPackages();
              const rolePackages = packages.filter(pkg => pkg.role === user.role);
              setAvailablePackages(rolePackages);
              
              // Load current subscription
              const subQuery = query(
                  collection(firestore, 'subscriptions'),
                  where('userId', '==', user.id),
                  where('status', '==', 'ACTIVE'),
                  where('role', '==', user.role)
              );
              const subSnap = await getDocs(subQuery);
              if (!subSnap.empty) {
                  setCurrentSubscription({ id: subSnap.docs[0].id, ...subSnap.docs[0].data() });
              }
          } catch (e) {
              console.error('Failed to load finance data', e);
          }
      };
      loadFinance();
  }, [user.id, user.role]);

  // Load Trust Tier information for Doctors and Couriers
  useEffect(() => {
      if ((user.role === UserRole.DOCTOR || user.role === UserRole.COURIER) && user.id) {
          const loadTrustTier = async () => {
              try {
                  setLoadingTrustTier(true);
                  // Load user's tier assignment
                  const assignmentQuery = query(
                      collection(firestore, 'userTierAssignments'),
                      where('userId', '==', user.id),
                      where('userRole', '==', user.role)
                  );
                  const assignmentSnap = await getDocs(assignmentQuery);
                  if (!assignmentSnap.empty) {
                      const assignment = { id: assignmentSnap.docs[0].id, ...assignmentSnap.docs[0].data() };
                      setTrustTierAssignment(assignment);
                  }
                  
                  // Load available tier configs for this role
                  const configs = await firebaseDb.getTrustTierConfigs(user.role === UserRole.DOCTOR ? 'DOCTOR' : user.role === UserRole.COURIER ? 'COURIER' : undefined);
                  setTrustTierConfigs(configs);
              } catch (e) {
                  console.error('Failed to load trust tier data', e);
              } finally {
                  setLoadingTrustTier(false);
              }
          };
          loadTrustTier();
      }
  }, [user.id, user.role]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
          try {
              setIsUploading(true);
              notify('Uploading your new profile photo...', 'info');
              const fileExt = file.name.split('.').pop();
              const filePath = `${storageRefs.avatars}/${user.id}/${Date.now()}.${fileExt}`;
              
              // Upload to Firebase Storage
              const storageRef = ref(storage, filePath);
              await uploadBytes(storageRef, file);
              
              // Get download URL
              const downloadURL = await getDownloadURL(storageRef);
              
              setAvatarPreview(downloadURL);
              
              if (onUpdateUser) {
                  onUpdateUser({ avatar: downloadURL });
              }

              notify("Avatar updated successfully!", "success");
          } catch (error: any) {
              notify(`Upload failed: ${error.message}`, "error");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleSaveProfile = async () => {
      setIsEditing(false);
      
      try {
          // Save general profile updates
          if (onUpdateUser) {
              onUpdateUser({ 
                  name: formData.name, 
                  location: formData.location,
                  avatar: avatarPreview 
              });
          }

          // If doctor, save specialty and fees
          if (user.role === UserRole.DOCTOR) {
              setIsSavingDoctor(true);
              try {
                  await db.updateDoctorDetails(user.id, {
                      specialty: doctorDetails.specialty,
                      experience_years: doctorDetails.experience,
                      consultation_fee: doctorDetails.price,
                      bio: doctorDetails.bio,
                      workplace: doctorDetails.workplace
                  });
              } catch (err: any) {
                  setIsSavingDoctor(false);
                  throw new Error(err.message || "Failed to save professional details.");
              }
              setIsSavingDoctor(false);
          }

          notify(user.role === UserRole.DOCTOR ? 'Profile and professional details updated.' : 'Profile updated successfully.', 'success');
      } catch (err: any) {
          notify(err.message, 'error');
          setIsSavingDoctor(false);
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 relative">
        <input type="file" ref={profileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />

        <div className="flex flex-col items-center justify-center pt-10 pb-12 mb-8">
            <div className="relative group mb-6">
                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-emerald-500 shadow-xl overflow-hidden relative ${isUploading ? 'opacity-50' : ''}`}>
                    <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover rounded-full border-4 border-white dark:border-gray-900" />
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Loader2 className="animate-spin text-white" size={32} />
                        </div>
                    )}
                </div>
                <button 
                  onClick={() => profileInputRef.current?.click()} 
                  disabled={isUploading}
                  className="absolute bottom-1 right-1 z-20 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                >
                    <Camera size={18} />
                </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-display">{user.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{user.role} • {user.location}</p>
            {user.role === UserRole.DOCTOR && doctorDetails.bio && (
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 max-w-md text-center italic leading-relaxed">{doctorDetails.bio}</p>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-2 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-row lg:flex-col overflow-x-auto gap-2">
                    <button onClick={() => setActiveTab('overview')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                        <UserIcon size={18} /> Overview
                    </button>
                    {user.role === UserRole.PATIENT && (
                        <button onClick={() => setActiveTab('family')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'family' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                            <Users size={18} /> Family Profiles
                        </button>
                    )}
                    {user.role === UserRole.PATIENT && (
                        <button onClick={() => setActiveTab('nhif')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'nhif' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                            <Shield size={18} /> NHIF
                        </button>
                    )}
                    <button onClick={() => setActiveTab('referral')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'referral' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                        <Gift size={18} /> Referral
                    </button>
                    {/* Hide subscription tab for Doctors and Couriers - they use Trust Tiers instead */}
                    {(user.role !== UserRole.DOCTOR && user.role !== UserRole.COURIER) && (
                        <button onClick={() => setActiveTab('subscription')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'subscription' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                            <CreditCard size={18} /> Subscription
                        </button>
                    )}
                    {user.role !== UserRole.PATIENT && (
                        <button onClick={() => setActiveTab('finance')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                            <Wallet size={18} /> Finance
                        </button>
                    )}
                    <button onClick={() => setActiveTab('settings')} className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                        <Key size={18} /> Settings
                    </button>
                </div>
            </div>

            <div className="lg:col-span-3">
                {activeTab === 'overview' && (
                    <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Details</h2>
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"><Edit2 size={16}/> Edit</button>}
                        </div>
                        
                        {isEditing ? (
                            <div className="space-y-8 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Full Name</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {user.role === UserRole.DOCTOR && (
                                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50">
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-blue-600" /> Professional Setup
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Medical Specialty</label>
                                                <div className="relative">
                                                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <select 
                                                        value={doctorDetails.specialty} 
                                                        onChange={e => setDoctorDetails({...doctorDetails, specialty: e.target.value})}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="">Select Specialty</option>
                                                        <option value="General Practitioner">General Practitioner</option>
                                                        <option value="Cardiologist">Cardiologist</option>
                                                        <option value="Pediatrician">Pediatrician</option>
                                                        <option value="Dermatologist">Dermatologist</option>
                                                        <option value="Neurologist">Neurologist</option>
                                                        <option value="Psychiatrist">Psychiatrist</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Years of Experience</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <input 
                                                        type="number" 
                                                        value={doctorDetails.experience || ''} 
                                                        onChange={e => setDoctorDetails({...doctorDetails, experience: parseInt(e.target.value) || 0})}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                        placeholder="e.g. 5"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Consultation Fee (TZS)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <input 
                                                        type="number" 
                                                        value={doctorDetails.price || ''} 
                                                        onChange={e => setDoctorDetails({...doctorDetails, price: parseInt(e.target.value) || 0})}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                        placeholder="e.g. 25000"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 mt-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Bio</label>
                                                <textarea
                                                    value={doctorDetails.bio}
                                                    onChange={e => setDoctorDetails({ ...doctorDetails, bio: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none min-h-[110px]"
                                                    placeholder="Short professional bio..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Current Hospital / Workplace</label>
                                                <input
                                                    type="text"
                                                    value={doctorDetails.workplace}
                                                    onChange={e => setDoctorDetails({ ...doctorDetails, workplace: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="e.g. Muhimbili National Hospital"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                    <button 
                                        onClick={handleSaveProfile} 
                                        disabled={isSavingDoctor}
                                        className="px-8 py-2.5 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                                    >
                                        {isSavingDoctor ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                        {user.role === UserRole.DOCTOR ? 'Save Professional Profile' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Name</label><p className="font-bold text-lg text-gray-900 dark:text-white">{user.name}</p></div>
                                    <div><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Email</label><p className="font-bold text-lg text-gray-900 dark:text-white">{user.email}</p></div>
                                    <div><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Role</label><p className="font-bold text-lg text-gray-900 dark:text-white capitalize">{user.role.toLowerCase().replace('_', ' ')}</p></div>
                                    <div><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Location</label><p className="font-bold text-lg text-gray-900 dark:text-white">{user.location || 'Not set'}</p></div>
                                </div>

                                {user.role === UserRole.DOCTOR && (
                                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50">
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Professional Status</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Specialty</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{doctorDetails.specialty || 'Not set'}</p>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Experience</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{doctorDetails.experience} Years</p>
                                            </div>
                                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/50">
                                                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Session Fee</p>
                                                <p className="font-bold text-gray-900 dark:text-white">TZS {doctorDetails.price.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'family' && user.role === UserRole.PATIENT && (
                    <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Family Profiles</h2>
                            <button 
                                onClick={() => {
                                    setNewMemberForm({ name: '', relation: '', age: 0, gender: 'Other' });
                                    setShowAddMemberForm(true);
                                }}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={18} /> Add Member
                            </button>
                        </div>
                        
                        {familyMembers.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="mx-auto text-gray-300 mb-4" size={48} />
                                <p className="text-gray-500 dark:text-gray-400 mb-4">No family members added yet</p>
                                <button 
                                    onClick={() => {
                                        setNewMemberForm({ name: '', relation: '', age: 0, gender: 'Other' });
                                        setShowAddMemberForm(true);
                                    }}
                                    className="btn-primary"
                                >
                                    Add First Member
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {familyMembers.map((member) => (
                                    <div key={member.id} className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-4">
                                            <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" />
                                            {onRemoveFamilyMember && (
                                                <button 
                                                    onClick={() => {
                                                        if (confirm(`Remove ${member.name} from your family?`)) {
                                                            onRemoveFamilyMember(member.id);
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{member.relation}</p>
                                        {member.age > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-bold">Age: {member.age}</p>}
                                        {member.gender && member.gender !== 'Other' && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{member.gender}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Family Member Modal */}
                        {showAddMemberForm && (
                            <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] w-full max-w-md p-6 border border-gray-100 dark:border-gray-700/50 shadow-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Family Member</h3>
                                        <button 
                                            onClick={() => {
                                                setShowAddMemberForm(false);
                                                setNewMemberForm({ name: '', relation: '', age: 0, gender: 'Other' });
                                            }}
                                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newMemberForm.name}
                                                onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Enter full name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                                                Relationship *
                                            </label>
                                            <select
                                                value={newMemberForm.relation}
                                                onChange={(e) => setNewMemberForm({ ...newMemberForm, relation: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Select relationship</option>
                                                <option value="Spouse">Spouse</option>
                                                <option value="Child">Child</option>
                                                <option value="Parent">Parent</option>
                                                <option value="Sibling">Sibling</option>
                                                <option value="Grandparent">Grandparent</option>
                                                <option value="Grandchild">Grandchild</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                                                    Age
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newMemberForm.age || ''}
                                                    onChange={(e) => setNewMemberForm({ ...newMemberForm, age: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Age"
                                                    min="0"
                                                    max="150"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                                                    Gender
                                                </label>
                                                <select
                                                    value={newMemberForm.gender}
                                                    onChange={(e) => setNewMemberForm({ ...newMemberForm, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    setShowAddMemberForm(false);
                                                    setNewMemberForm({ name: '', relation: '', age: 0, gender: 'Other' });
                                                }}
                                                className="px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!newMemberForm.name.trim() || !newMemberForm.relation.trim()) {
                                                        notify('Please fill in name and relationship', 'error');
                                                        return;
                                                    }
                                                    onAddFamilyMember({
                                                        name: newMemberForm.name.trim(),
                                                        relation: newMemberForm.relation,
                                                        age: newMemberForm.age,
                                                        gender: newMemberForm.gender
                                                    });
                                                    setShowAddMemberForm(false);
                                                    setNewMemberForm({ name: '', relation: '', age: 0, gender: 'Other' });
                                                    notify('Family member added successfully', 'success');
                                                }}
                                                className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                <Check size={18} />
                                                Add Member
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'finance' && (user.role === UserRole.DOCTOR || user.role === UserRole.PHARMACY) && (
                    <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Financial Overview</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Total Earnings</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'TZS' ? 'TZS' : '$'} {user.points?.toLocaleString() || '0'}
                                </p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Pending</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'TZS' ? 'TZS' : '$'} 0
                                </p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-800/50 shadow-sm">
                                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">This Month</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'TZS' ? 'TZS' : '$'} 0
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
                            <div className="space-y-10">
                                {(user.role === UserRole.DOCTOR || user.role === UserRole.PHARMACY) && (
                                    <div className="bg-gray-50 dark:bg-[#0A1B2E]/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                Payment Methods {user.role === UserRole.DOCTOR ? '(patients use these)' : '(customers use these)'}
                                            </h4>
                                            <button onClick={() => setShowAddPayMethod(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">Add</button>
                                        </div>

                                        {paymentMethods.length === 0 ? (
                                            <p className="text-sm text-gray-500">No payment methods added yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {paymentMethods.map(pm => (
                                                    <div key={pm.id} className="flex items-center justify-between bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white">{pm.provider}</p>
                                                            <p className="text-xs text-gray-500">{pm.number} • {pm.name}{pm.bankName ? ` • ${pm.bankName}` : ''}</p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const paymentMethodCollection = user.role === UserRole.DOCTOR 
                                                                        ? 'doctorPaymentMethods' 
                                                                        : 'pharmacyPaymentMethods';
                                                                    await deleteDoc(doc(firestore, paymentMethodCollection, pm.id));
                                                                    setPaymentMethods(prev => prev.filter(x => x.id !== pm.id));
                                                                    notify('Payment method removed', 'info');
                                                                } catch (error) {
                                                                    console.error('Failed to remove payment method:', error);
                                                                    notify('Failed to remove payment method', 'error');
                                                                }
                                                            }}
                                                            className="text-red-600 dark:text-red-400 font-bold text-sm hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-gray-50 dark:bg-[#0A1B2E]/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {user.role === UserRole.PHARMACY ? 'Pending Order Payments' : 'Pending Payment Verifications'}
                                        </h4>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{pendingPayments.length} pending</span>
                                    </div>

                                    {pendingPayments.length === 0 ? (
                                        <p className="text-sm text-gray-500">No pending payments.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {pendingPayments.map((pay) => (
                                                <div key={pay.id} className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 dark:text-white truncate">
                                                                {pay.userName || 'Patient'} • {pay.userLocation || 'Unknown location'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Service: <span className="font-bold">{pay.itemType === 'order' ? 'Order Payment' : pay.itemType}</span> • Ref: <span className="font-mono font-bold">{pay.referenceNumber || pay.id.slice(0, 8)}</span>
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                Amount: <span className="font-bold">{pay.currency || 'TZS'} {Number(pay.amount || 0).toLocaleString()}</span>
                                                            </p>
                                                            {user.role === UserRole.PHARMACY && pay.itemType === 'order' && pay.orderId && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    Order ID: <span className="font-mono font-bold">{pay.orderId}</span>
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc(doc(firestore, 'transactions', pay.id), cleanFirestoreData({ 
                                                                            status: 'REJECTED', 
                                                                            verifiedAt: serverTimestamp(),
                                                                            verifiedBy: user.id
                                                                        }));
                                                                        setPendingPayments(prev => prev.filter(p => p.id !== pay.id));
                                                                        notify('Payment rejected', 'info');
                                                                    } catch (error) {
                                                                        console.error('Failed to reject payment:', error);
                                                                        notify('Failed to reject payment', 'error');
                                                                    }
                                                                }}
                                                                className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc(doc(firestore, 'transactions', pay.id), cleanFirestoreData({ 
                                                                            status: 'VERIFIED', 
                                                                            verifiedAt: serverTimestamp(),
                                                                            verifiedBy: user.id
                                                                        }));

                                                                        // Grant article access after verification (for doctors)
                                                                        if (pay.itemType === 'article' && pay.itemId && pay.userId) {
                                                                            const accessId = `${pay.itemId}_${pay.userId}`;
                                                                            await updateDoc(doc(firestore, 'transactions', pay.id), cleanFirestoreData({ accessId }));
                                                                            await addDoc(collection(firestore, 'articleAccess'), {
                                                                                articleId: pay.itemId,
                                                                                userId: pay.userId,
                                                                                doctorId: user.id,
                                                                                transactionId: pay.id,
                                                                                grantedAt: serverTimestamp(),
                                                                                status: 'PAID'
                                                                            });
                                                                            
                                                                            // Send notification to user
                                                                            await notificationService.sendPaymentNotification(
                                                                                pay.userId,
                                                                                'PAYMENT_SUCCESS',
                                                                                Number(pay.amount) || 0,
                                                                                pay.currency || 'TZS',
                                                                                pay.id
                                                                            );
                                                                            
                                                                            // Also send specific article access notification
                                                                            await notificationService.createNotification({
                                                                                userId: pay.userId,
                                                                                type: 'PAYMENT_SUCCESS',
                                                                                title: 'Article Access Granted',
                                                                                message: `Your payment for the article has been verified. You now have full access!`,
                                                                                priority: 'NORMAL',
                                                                                data: { 
                                                                                    articleId: pay.itemId,
                                                                                    transactionId: pay.id,
                                                                                    type: 'article'
                                                                                },
                                                                                actionUrl: `/articles?article=${pay.itemId}`
                                                                            });
                                                                        }

                                                                        // Mark consultation as paid after verification (for doctors)
                                                                        if ((pay.itemType === 'consultation' || pay.itemType === 'appointment') && pay.itemId && pay.userId) {
                                                                            await updateDoc(doc(firestore, 'appointments', pay.itemId), cleanFirestoreData({
                                                                                paymentStatus: 'PAID',
                                                                                paidAt: serverTimestamp(),
                                                                                updatedAt: serverTimestamp()
                                                                            }));
                                                                            
                                                                            // Send notification to user
                                                                            await notificationService.sendPaymentNotification(
                                                                                pay.userId,
                                                                                'PAYMENT_SUCCESS',
                                                                                Number(pay.amount) || 0,
                                                                                pay.currency || 'TZS',
                                                                                pay.id
                                                                            );
                                                                            
                                                                            // Also send appointment confirmation notification
                                                                            await notificationService.createNotification({
                                                                                userId: pay.userId,
                                                                                type: 'APPOINTMENT_CONFIRMED',
                                                                                title: 'Consultation Payment Verified',
                                                                                message: `Your consultation payment has been verified. Your appointment is confirmed!`,
                                                                                priority: 'NORMAL',
                                                                                data: { 
                                                                                    appointmentId: pay.itemId,
                                                                                    transactionId: pay.id,
                                                                                    type: 'consultation'
                                                                                },
                                                                                actionUrl: `/consultations?appointment=${pay.itemId}`
                                                                            });
                                                                        }

                                                                        // Mark order as paid after verification (for pharmacy)
                                                                        if (user.role === UserRole.PHARMACY && pay.itemType === 'order' && pay.orderId && pay.userId) {
                                                                            try {
                                                                                // Update order status to paid
                                                                                const orderRef = doc(firestore, 'orders', pay.orderId);
                                                                                await updateDoc(orderRef, cleanFirestoreData({
                                                                                    paymentStatus: 'PAID',
                                                                                    paidAt: serverTimestamp(),
                                                                                    updatedAt: serverTimestamp()
                                                                                }));
                                                                                
                                                                                // Also update transaction with order reference
                                                                                await updateDoc(doc(firestore, 'transactions', pay.id), cleanFirestoreData({
                                                                                    orderId: pay.orderId
                                                                                }));
                                                                                
                                                                                // Send notification to user
                                                                                await notificationService.sendPaymentNotification(
                                                                                    pay.userId,
                                                                                    'PAYMENT_SUCCESS',
                                                                                    Number(pay.amount) || 0,
                                                                                    pay.currency || 'TZS',
                                                                                    pay.id
                                                                                );
                                                                                
                                                                                // Also send order update notification
                                                                                await notificationService.sendOrderUpdate(
                                                                                    pay.userId,
                                                                                    pay.orderId,
                                                                                    'Paid',
                                                                                    pay.orderId.slice(0, 8).toUpperCase()
                                                                                );
                                                                            } catch (error) {
                                                                                console.error('Failed to update order status:', error);
                                                                            }
                                                                        }

                                                                        setPendingPayments(prev => prev.filter(p => p.id !== pay.id));
                                                                        const successMessage = user.role === UserRole.PHARMACY 
                                                                            ? 'Order payment verified successfully! User has been notified.' 
                                                                            : 'Payment verified. Access granted. User has been notified.';
                                                                        notify(successMessage, 'success');
                                                                    } catch (error: any) {
                                                                        console.error('Payment verification error:', error);
                                                                        notify(`Failed to verify payment: ${error.message}`, 'error');
                                                                    }
                                                                }}
                                                                className="px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-lg shadow-emerald-600/20 transition-all"
                                                            >
                                                                Verify
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Package Subscriptions */}
                                    <div className="bg-gray-50 dark:bg-[#0A1B2E]/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                Subscription Packages
                                            </h4>
                                        </div>

                                        {currentSubscription ? (
                                            <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 mb-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{currentSubscription.packageName || 'Current Package'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Status: <span className="font-bold text-emerald-600">Active</span>
                                                            {currentSubscription.endDate && (
                                                                <> • Expires: {new Date(currentSubscription.endDate.toDate ? currentSubscription.endDate.toDate() : currentSubscription.endDate).toLocaleDateString()}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const pkg = availablePackages.find(p => p.id === currentSubscription.packageId);
                                                            if (pkg) {
                                                                setSelectedPackage(pkg);
                                                                setShowPackagePayment(true);
                                                            }
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                                                    >
                                                        Upgrade/Change
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No active subscription. Select a package below to subscribe.</p>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {availablePackages.map((pkg) => (
                                                <div
                                                    key={pkg.id}
                                                    className={`bg-white dark:bg-[#0F172A] rounded-2xl p-4 border-2 ${
                                                        currentSubscription?.packageId === pkg.id
                                                            ? 'border-blue-600 dark:border-blue-500'
                                                            : 'border-gray-200 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h5 className="font-bold text-gray-900 dark:text-white">{pkg.name}</h5>
                                                        {pkg.isPopular && (
                                                            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">Popular</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{pkg.description}</p>
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                                        {pkg.price === '0' ? 'Free' : `${pkg.currency || 'TZS'} ${Number(pkg.price).toLocaleString()}${pkg.period || '/mo'}`}
                                                    </p>
                                                    {pkg.features && pkg.features.length > 0 && (
                                                        <ul className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                                                            {pkg.features.slice(0, 3).map((feature, idx) => (
                                                                <li key={idx}>• {feature}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPackage(pkg);
                                                            setShowPackagePayment(true);
                                                        }}
                                                        disabled={currentSubscription?.packageId === pkg.id}
                                                        className={`w-full py-2 rounded-xl font-bold text-sm transition-colors ${
                                                            currentSubscription?.packageId === pkg.id
                                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        {currentSubscription?.packageId === pkg.id ? 'Current Package' : 'Subscribe Now'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {showAddPayMethod && (
                                    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                        <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] w-full max-w-md p-6 border border-gray-100 dark:border-gray-700/50 shadow-2xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-gray-900 dark:text-white">Add Payment Method</h4>
                                                <button onClick={() => setShowAddPayMethod(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 block">Provider</label>
                                                    <select value={newPayMethod.provider} onChange={e => setNewPayMethod(prev => ({ ...prev, provider: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none text-gray-900 dark:text-white">
                                                        {['M-Pesa STK','M-Pesa','Tigo Pesa','Airtel Money','Bank'].map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 block">{newPayMethod.provider === 'Bank' ? 'Account Number' : 'Phone Number'}</label>
                                                    <input value={newPayMethod.number} onChange={e => setNewPayMethod(prev => ({ ...prev, number: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 block">Account Name</label>
                                                    <input value={newPayMethod.name} onChange={e => setNewPayMethod(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none text-gray-900 dark:text-white" />
                                                </div>
                                                {newPayMethod.provider === 'Bank' && (
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 block">Bank Name</label>
                                                        <input value={newPayMethod.bankName} onChange={e => setNewPayMethod(prev => ({ ...prev, bankName: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none text-gray-900 dark:text-white" />
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-3 pt-2">
                                                    <button 
                                                        onClick={() => {
                                                            setShowAddPayMethod(false);
                                                            setNewPayMethod({ provider: 'M-Pesa', number: '', name: '', bankName: '' });
                                                        }} 
                                                        disabled={isSavingPaymentMethod}
                                                        className="px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!newPayMethod.number || !newPayMethod.name) { 
                                                                notify('Please fill all required fields', 'error'); 
                                                                return; 
                                                            }
                                                            setIsSavingPaymentMethod(true);
                                                            try {
                                                                const paymentMethodCollection = user.role === UserRole.DOCTOR 
                                                                    ? 'doctorPaymentMethods' 
                                                                    : 'pharmacyPaymentMethods';
                                                                const userIdField = user.role === UserRole.DOCTOR ? 'doctorId' : 'pharmacyId';
                                                                
                                                                const docRef = await addDoc(collection(firestore, paymentMethodCollection), {
                                                                    [userIdField]: user.id,
                                                                    provider: newPayMethod.provider,
                                                                    number: newPayMethod.number,
                                                                    name: newPayMethod.name,
                                                                    bankName: newPayMethod.bankName || '',
                                                                    createdAt: serverTimestamp()
                                                                });
                                                                setPaymentMethods(prev => [{ id: docRef.id, [userIdField]: user.id, ...newPayMethod, createdAt: new Date() }, ...prev]);
                                                                setShowAddPayMethod(false);
                                                                setNewPayMethod({ provider: 'M-Pesa', number: '', name: '', bankName: '' });
                                                                notify('Payment method added successfully', 'success');
                                                            } catch (error: any) {
                                                                console.error('Error saving payment method:', error);
                                                                notify(`Failed to save payment method: ${error.message}`, 'error');
                                                            } finally {
                                                                setIsSavingPaymentMethod(false);
                                                            }
                                                        }}
                                                        disabled={isSavingPaymentMethod}
                                                        className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {isSavingPaymentMethod ? (
                                                            <>
                                                                <Loader2 size={18} className="animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            'Save'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Package Payment Modal */}
                                {showPackagePayment && selectedPackage && (
                                    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                        <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] w-full max-w-md p-6 border border-gray-100 dark:border-gray-700/50 shadow-2xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-gray-900 dark:text-white">Subscribe to {selectedPackage.name}</h4>
                                                <button 
                                                    onClick={() => {
                                                        setShowPackagePayment(false);
                                                        setSelectedPackage(null);
                                                        setSelectedPaymentMethod('');
                                                    }} 
                                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="space-y-4 mb-6">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Package Price</p>
                                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                        {selectedPackage.price === '0' ? 'Free' : `${selectedPackage.currency || 'TZS'} ${Number(selectedPackage.price).toLocaleString()}${selectedPackage.period || '/mo'}`}
                                                    </p>
                                                </div>

                                                {selectedPackage.price !== '0' && (
                                                    <>
                                                        {paymentMethods.length === 0 ? (
                                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                                                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                                                    Please add a payment method first to complete your subscription.
                                                                </p>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowPackagePayment(false);
                                                                        setShowAddPayMethod(true);
                                                                    }}
                                                                    className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-xl font-bold text-sm hover:bg-yellow-700"
                                                                >
                                                                    Add Payment Method
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 block">Select Payment Method</label>
                                                                <div className="space-y-2">
                                                                    {paymentMethods
                                                                        .filter(pm => !selectedPackage.allowedMethods || selectedPackage.allowedMethods.includes(pm.provider))
                                                                        .map(pm => (
                                                                            <label
                                                                                key={pm.id}
                                                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                                                                                    selectedPaymentMethod === pm.id
                                                                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="radio"
                                                                                    name="paymentMethod"
                                                                                    value={pm.id}
                                                                                    checked={selectedPaymentMethod === pm.id}
                                                                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                                                    className="w-4 h-4 text-blue-600"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="font-bold text-gray-900 dark:text-white">{pm.provider}</p>
                                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{pm.number} • {pm.name}</p>
                                                                                </div>
                                                                            </label>
                                                                        ))}
                                                                </div>
                                                                {paymentMethods.filter(pm => !selectedPackage.allowedMethods || selectedPackage.allowedMethods.includes(pm.provider)).length === 0 && (
                                                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                                                        No compatible payment methods. This package requires: {selectedPackage.allowedMethods?.join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setShowPackagePayment(false);
                                                        setSelectedPackage(null);
                                                        setSelectedPaymentMethod('');
                                                    }}
                                                    disabled={isProcessingSubscription}
                                                    className="px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (selectedPackage.price !== '0' && !selectedPaymentMethod) {
                                                            notify('Please select a payment method', 'error');
                                                            return;
                                                        }

                                                        setIsProcessingSubscription(true);
                                                        try {
                                                            const packagePrice = Number(selectedPackage.price) || 0;
                                                            
                                                            // Create subscription
                                                            const subscriptionData = {
                                                                userId: user.id,
                                                                role: user.role,
                                                                packageId: selectedPackage.id,
                                                                packageName: selectedPackage.name,
                                                                price: packagePrice,
                                                                currency: selectedPackage.currency || 'TZS',
                                                                status: packagePrice === 0 ? 'ACTIVE' : 'PENDING',
                                                                startDate: serverTimestamp(),
                                                                endDate: packagePrice === 0 ? null : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
                                                                createdAt: serverTimestamp(),
                                                            };
                                                            
                                                            const subRef = await addDoc(collection(firestore, 'subscriptions'), subscriptionData);

                                                            // If paid package, create payment transaction
                                                            if (packagePrice > 0 && selectedPaymentMethod) {
                                                                const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
                                                                const transactionData = {
                                                                    userId: user.id,
                                                                    recipientId: 'system', // System receives subscription payments
                                                                    amount: packagePrice,
                                                                    currency: selectedPackage.currency || 'TZS',
                                                                    type: 'SUBSCRIPTION',
                                                                    status: 'PENDING_VERIFICATION',
                                                                    itemType: 'subscription',
                                                                    itemId: subRef.id,
                                                                    paymentMethod: paymentMethod?.provider || 'Unknown',
                                                                    paymentReference: `SUB-${Date.now()}`,
                                                                    description: `Subscription payment for ${selectedPackage.name}`,
                                                                    createdAt: serverTimestamp(),
                                                                };
                                                                await addDoc(collection(firestore, 'transactions'), transactionData);
                                                                notify('Subscription created! Payment pending verification.', 'success');
                                                            } else {
                                                                notify('Free subscription activated successfully!', 'success');
                                                            }

                                                            // Update local state
                                                            setCurrentSubscription({ id: subRef.id, ...subscriptionData });
                                                            setShowPackagePayment(false);
                                                            setSelectedPackage(null);
                                                            setSelectedPaymentMethod('');
                                                        } catch (error: any) {
                                                            console.error('Error creating subscription:', error);
                                                            notify(`Failed to create subscription: ${error.message}`, 'error');
                                                        } finally {
                                                            setIsProcessingSubscription(false);
                                                        }
                                                    }}
                                                    disabled={isProcessingSubscription || (selectedPackage.price !== '0' && !selectedPaymentMethod)}
                                                    className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isProcessingSubscription ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        selectedPackage.price === '0' ? 'Activate Free Plan' : 'Subscribe & Pay'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'nhif' && user.role === UserRole.PATIENT && (
                    <NHIFIntegration />
                )}
                {activeTab === 'subscription' && (
                    <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        {user.role === UserRole.PATIENT ? (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscription & Payments</h2>
                                    <p className="text-gray-500 dark:text-gray-400">No app subscription required - pay only for services you use</p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800/50">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-green-600 rounded-xl">
                                            <CheckCircle className="text-white" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                Free App Access
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                The NexaFya app is completely free for patients. You don't need to pay any subscription fees to use the platform.
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CheckCircle className="text-green-600" size={16} />
                                                    <span>Free account and profile management</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CheckCircle className="text-green-600" size={16} />
                                                    <span>Free health records storage</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CheckCircle className="text-green-600" size={16} />
                                                    <span>Free access to basic health articles</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CheckCircle className="text-green-600" size={16} />
                                                    <span>Free family health profiles</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CheckCircle className="text-green-600" size={16} />
                                                    <span>Free appointment scheduling</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-600 rounded-xl">
                                            <DollarSign className="text-white" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                Pay Only for Services You Use
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                You only pay when you use specific services. No hidden fees, no subscriptions required.
                                            </p>
                                            <div className="space-y-3">
                                                <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Medical Consultations</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pay per consultation</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Video, audio, chat, or in-person consultations with doctors
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Medicines & Prescriptions</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pay per order</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Purchase prescribed medicines and health products from pharmacies
                                                    </p>
                                                </div>

                                                <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Delivery Services</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pay per delivery</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Fast and secure delivery of medicines and health products to your location
                                                    </p>
                                                </div>

                                                <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Premium Articles</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pay per article</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Access in-depth premium health articles written by medical experts
                                                    </p>
                                                </div>

                                                <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Lab Services</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pay per test</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Laboratory tests and diagnostic services (when available)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <Shield size={18} className="text-blue-600" />
                                        Transparent Pricing
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        All service prices are clearly displayed before you make a purchase. You'll see the exact cost for consultations, medicines, delivery, and premium content before confirming your order.
                                    </p>
                                </div>
                            </div>
                        ) : (user.role === UserRole.DOCTOR || user.role === UserRole.COURIER) ? (
                            // Trust Tier display for Doctors and Couriers
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trust Tier Status</h2>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Your trust tier is managed by the administrator. You'll have a 3-month trial period before any fees apply.
                                    </p>
                                </div>

                                {loadingTrustTier ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                    </div>
                                ) : trustTierAssignment ? (
                                    <div className="space-y-6">
                                        {/* Current Tier Status */}
                                        <div className={`rounded-2xl p-6 border-2 ${
                                            trustTierAssignment.trustTier === 'VIP' 
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' 
                                                : trustTierAssignment.trustTier === 'Premium'
                                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50'
                                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                                        }`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${
                                                    trustTierAssignment.trustTier === 'VIP' 
                                                        ? 'bg-amber-600' 
                                                        : trustTierAssignment.trustTier === 'Premium'
                                                        ? 'bg-purple-600'
                                                        : 'bg-blue-600'
                                                }`}>
                                                    <Crown className="text-white" size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                            {trustTierAssignment.trustTier} Tier
                                                        </h3>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                            trustTierAssignment.status === 'TRIAL' 
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : trustTierAssignment.status === 'ACTIVE'
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {trustTierAssignment.status === 'TRIAL' ? 'Trial Period' : trustTierAssignment.status}
                                                        </span>
                                                    </div>
                                                    
                                                    {trustTierAssignment.isTrialActive && trustTierAssignment.trialEndDate && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                            Trial period ends: {new Date(trustTierAssignment.trialEndDate).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    
                                                    {trustTierAssignment.status === 'ACTIVE' && trustTierAssignment.activationDate && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                            Activated on: {new Date(trustTierAssignment.activationDate).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    
                                                    {trustTierAssignment.status === 'ACTIVE' && (
                                                        <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                                Monthly Fee: <span className="font-bold text-gray-900 dark:text-white">
                                                                    {trustTierAssignment.currency} {Number(trustTierAssignment.fee).toLocaleString()}
                                                                </span>
                                                            </p>
                                                            {trustTierAssignment.nextPaymentDate && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                    Next payment: {new Date(trustTierAssignment.nextPaymentDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tier Features */}
                                        {trustTierConfigs.find(c => c.tier === trustTierAssignment.trustTier) && (
                                            <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                                                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <Award size={18} className="text-blue-600" />
                                                    Tier Benefits
                                                </h4>
                                                <div className="space-y-2">
                                                    {trustTierConfigs.find(c => c.tier === trustTierAssignment.trustTier)?.features?.map((feature: string, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                            <CheckCircle className="text-green-600" size={16} />
                                                            <span>{feature}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gray-600 rounded-xl">
                                                <ShieldCheck className="text-white" size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                    No Trust Tier Assigned
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    You haven't been assigned a trust tier yet. Please contact the administrator to get assigned to a tier (Basic, Premium, or VIP). You'll receive a 3-month trial period before any fees apply.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <SubscriptionManagement />
                        )}
                    </div>
                )}
                {activeTab === 'referral' && (
                    <ReferralProgram />
                )}
                {activeTab === 'verification' && (
                    <VerificationDocumentUpload />
                )}
                {activeTab === 'settings' && (
                    <Settings />
                )}
            </div>
        </div>
    </div>
  );
};
