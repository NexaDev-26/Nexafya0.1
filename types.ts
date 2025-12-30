
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN',
  CHW = 'CHW',
  COURIER = 'COURIER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  phone?: string;
  location?: string;
  points: number;
  referralCode?: string;
  referralCount?: number;
  referralCredits?: number;
  referredBy?: string;
  isActive?: boolean;
}

export interface Doctor extends User {
  specialty: string;
  rating: number;
  availability: string[];
  price: number;
  experience: number;
  trustTier?: 'Basic' | 'Premium' | 'VIP'; // Trust tier assigned by admin
  isTrusted?: boolean; // Whether doctor is trusted/verified
  canVerifyArticles?: boolean; // Whether doctor can verify other doctors' articles
  bio?: string;
  // Verification fields
  verificationStatus?: 'Unverified' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected' | 'Suspended';
  medicalLicenseNumber?: string;
  medicalCouncilRegistration?: string;
  workplace?: string;
  yearsOfExperience?: number;
}

export interface Appointment {
  id: string;
  doctorName: string;
  patientName: string;
  date: string;
  time: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'HELD_IN_ESCROW' | 'RELEASED'; 
  type: 'VIDEO' | 'AUDIO' | 'CHAT' | 'IN_PERSON';
  doctorId?: string;
  patientId?: string;
  fee?: number;
  meetingLink?: string;
  notes?: string; // Added for clinical notes storage
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  inStock: boolean;
  stock?: number;
  category: string;
  pharmacyName: string;
  pharmacyId?: string;
  genericName?: string;
  unit?: string;
  buyingPrice?: number;
  // Extended properties for Pharmacy Management
  groupId?: string;
  branchId?: string; 
  batches?: MedicineBatch[];
  reorderLevel?: number;
}

export interface InventoryItem {
    id: string;
    pharmacy_id?: string;
    name: string;
    description: string;
    category: string;
    selling_price: number;
    stock: number;
    image_url: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface SalesRecord {
  id: string;
  date: string;
  customerName: string;
  items: any[];
  total: number;
  paymentMethod: string;
  status: 'Completed' | 'Pending';
}

export interface ArticleImage {
  url: string;
  caption: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  category: string;
  readTime: number;
  date: string;
  likes: number;
  image: string; 
  additionalImages?: ArticleImage[];
  isPremium: boolean;
  price?: number;
  currency?: string;
  status: 'draft' | 'pending_verification' | 'verified' | 'published' | 'archived' | 'rejected';
  highlights?: string;
  views?: number;
  shares?: number;
  ratingAvg?: number;
  ratingCount?: number;
  verifiedBy?: string; // Admin or verifying doctor ID
  verifiedByName?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  pendingVerificationBy?: string; // Doctor ID who needs to verify
  rejectionReason?: string;
}

export interface HealthRecord {
  id: string;
  type: 'Prescription' | 'Lab Result' | 'Diagnosis' | 'Imaging';
  title: string;
  doctor: string;
  date: string;
  fileUrl: string;
  status: 'Active' | 'Archived';
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  avatar: string;
  isCaregiver?: boolean; // Can act as caregiver
  linkedPatientId?: string; // If this member is linked to a patient
}

export interface Prescription {
  id?: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  appointmentId?: string;
  items: PrescriptionItem[];
  status: 'ISSUED' | 'LOCKED_BY_PHARMACY' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';
  pharmacyId?: string; // Pharmacy that locked/dispensed
  pharmacyName?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  notes?: string;
  issuedAt?: any;
  lockedAt?: any;
  dispensedAt?: any;
  expiresAt?: any;
  createdAt?: any;
  isExternal?: boolean; // Uploaded by patient
  externalFileUrl?: string; // If external prescription
}

export interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
}

export interface Courier {
  id: string;
  name: string;
  vehicle: 'Motorcycle' | 'Bicycle' | 'Van';
  status: 'Available' | 'Busy' | 'Offline';
  currentLocation: string;
  ordersDelivered: number;
  rating: number;
  trustTier?: 'Basic' | 'Premium' | 'VIP'; // Trust tier assigned by admin
  isTrusted?: boolean; // Whether courier is trusted/verified
  // Verification fields
  verificationStatus?: 'Unverified' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected' | 'Suspended';
  nationalIdNumber?: string;
  drivingLicenseNumber?: string;
  vehicleRegistrationNumber?: string;
  backgroundCheckStatus?: 'Pending' | 'Passed' | 'Failed';
}

export interface HouseholdVisit {
  id: string;
  chw_id?: string;
  head_of_household: string;
  location_name: string;
  visit_date: string;
  risk_level: 'Routine' | 'Urgent' | 'Follow-up';
  notes: string;
  maternal_status?: 'Pregnant' | 'Lactating' | 'None';
  location_lat?: number;
  location_lng?: number;
}

export interface Transaction {
    id: string;
    user_id?: string;
    amount: number;
    currency: string;
    type: 'CONSULTATION_FEE' | 'WITHDRAWAL' | 'DEPOSIT' | 'COMMISSION' | 'REFUND'; 
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    description?: string;
    created_at?: string;
    reference_id?: string;
}

export interface DoctorPaymentDetail {
  id: string;
  provider: 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'Bank';
  number: string;
  name: string;
  bankName?: string; 
}

export interface VerificationDocument {
  id: string;
  userId: string;
  userRole: UserRole;
  type: 'Medical License' | 'Pharmacy License' | 'National ID' | 'Professional Certificate' | 'Business Registration' | 'Driving License' | 'Background Check';
  name: string;
  documentNumber?: string; // License number, ID number, etc.
  issuingAuthority?: string; // e.g., "Tanzania Medical Council", "Tanzania Pharmacy Board"
  issueDate?: string;
  expiryDate?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Expired';
  uploadDate: string;
  reviewedBy?: string; // Admin ID who reviewed
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string; // Admin notes
}

export interface UserVerification {
  userId: string;
  userRole: UserRole;
  verificationStatus: 'Unverified' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected' | 'Suspended';
  verificationLevel: 'Basic' | 'Standard' | 'Premium'; // Based on documents submitted
  documents: VerificationDocument[];
  requiredDocuments: string[]; // Types of documents required for this role
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string; // Admin ID
  rejectionReason?: string;
  nextReviewDate?: string; // For periodic re-verification
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Partner {
  id: string;
  name: string;
  logoUrl: string; 
  type: 'Insurance' | 'Payment' | 'Hospital' | 'Other';
  active: boolean;
}

export interface TrustTierConfig {
  id: string;
  role: 'DOCTOR' | 'COURIER';
  tier: 'Basic' | 'Premium' | 'VIP';
  fee: number; // Monthly fee set by admin
  currency: string;
  description: string;
  features: string[];
  trialPeriodDays: number; // Default 90 days (3 months)
  isActive: boolean; // Whether this tier is currently active/available for assignment
  createdAt?: any;
  updatedAt?: any;
}

export interface UserTierAssignment {
  id?: string;
  userId: string;
  userRole: 'DOCTOR' | 'COURIER';
  trustTier: 'Basic' | 'Premium' | 'VIP';
  fee: number; // Fee amount at time of assignment
  currency: string;
  isTrialActive: boolean; // Whether trial period is active
  trialStartDate?: string;
  trialEndDate?: string; // 3 months from start
  activationDate?: string; // When admin activated paid tier (after trial)
  nextPaymentDate?: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  activatedBy: string; // Admin ID who activated
  activatedAt: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CartItem extends Medicine {
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  provider: string;
  icon: string;
}

export interface PharmacyProfile {
  id: string;
  name: string;
  licenseNumber: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  // Verification fields
  verificationStatus?: 'Unverified' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected' | 'Suspended';
  pharmacyBoardRegistration?: string;
  businessRegistrationNumber?: string;
  ownerName?: string;
  ownerNationalId?: string;
  subscription: {
      plan: string;
      status: string;
      expireDate: string;
      activationDate: string;
      supportCode: string;
  };
  branches: PharmacyBranch[];
}

export interface PharmacyBranch {
  id: string;
  owner_id?: string;
  name: string;
  location: string;
  license_number?: string;
  phone_contact?: string;
  is_main_branch: boolean;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  rating?: number;
}

export interface InventoryGroup {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export interface InventoryCategory {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export interface InventoryUnit {
  id: string;
  name: string; // e.g., Box, Piece, Bottle
  description: string;
  status: 'Active' | 'Inactive';
}

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  type: 'Add' | 'Remove';
  date: string;
  description: string;
}

export interface MedicineBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface Metric {
  label: string;
  value: string;
  icon: string;
  trend?: string;
}

export interface HealthMetric {
    id: string;
    patient_id?: string;
    type: 'HEART_RATE' | 'BLOOD_PRESSURE' | 'SPO2' | 'WEIGHT' | 'GLUCOSE';
    value: number;
    unit: string;
    source: 'MANUAL' | 'AI_SCAN' | 'WEARABLE';
    recorded_at: string;
}

export interface MedicationSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  patientName?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  currentDay: number;
  joined: boolean;
  icon: string;
  rewardPoints: number;
  category: string;
}

export interface HealthPlan {
  id: string;
  title: string;
  description: string;
  duration: string;
  progress: number;
  dailyTask: string;
  pointsPerTask: number;
  completedToday: boolean;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface SubscriptionPackage {
  id: string;
  role: 'PHARMACY'; // Only pharmacy has subscriptions now
  name: string;
  price: string;
  description: string;
  features: string[];
  allowedMethods: string[];
}
