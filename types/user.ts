/**
 * User Types
 * Core user-related types and enums
 * Strictly typed user system for Nexafya
 */

/**
 * User role enum
 */
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN',
  CHW = 'CHW',
  COURIER = 'COURIER',
}

/**
 * Trust tier enum
 * Used for Doctors and Couriers
 */
export enum TrustTier {
  BASIC = 'Basic',
  PREMIUM = 'Premium',
  VIP = 'VIP',
}

/**
 * Verification status enum
 */
export enum VerificationStatus {
  UNVERIFIED = 'Unverified',
  PENDING = 'Pending',
  UNDER_REVIEW = 'Under Review',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
  SUSPENDED = 'Suspended',
}

/**
 * Base user interface
 */
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

/**
 * Doctor interface
 * Extends User with doctor-specific properties
 */
export interface Doctor extends User {
  specialty: string;
  rating: number;
  availability: readonly string[];
  price: number;
  experience: number;
  trustTier?: TrustTier;
  isTrusted?: boolean;
  canVerifyArticles?: boolean;
  bio?: string;
  verificationStatus?: VerificationStatus;
  medicalLicenseNumber?: string;
  medicalCouncilRegistration?: string;
  workplace?: string;
  yearsOfExperience?: number;
}
