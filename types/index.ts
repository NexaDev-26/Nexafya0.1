/**
 * Centralized Type Exports
 * This file re-exports all types for easy importing
 * Import from './types' instead of './types/user', './types/subscription', etc.
 * 
 * NOTE: This is a gradual migration. Legacy types.ts still exists.
 * New types are in types/ subdirectory with strict typing.
 */

// Core types - NEW (strictly typed)
export * from './user';

// Re-export User and Doctor for backward compatibility
export type { User, Doctor } from './user';
export { UserRole, TrustTier, VerificationStatus } from './user';

// Subscription types - NEW (strictly typed)
export * from './subscription';

// Appointment types - NEW (strictly typed)
export * from './appointment';

// Legacy types - still using types.ts for backward compatibility
// These will be gradually migrated to the new structure
// Note: Appointment is now exported from ./appointment
export type {
  Medicine,
  InventoryItem,
  SalesRecord,
  ArticleImage,
  Article,
  HealthRecord,
  FamilyMember,
  Prescription,
  PrescriptionItem,
  Courier,
  HouseholdVisit,
  Transaction,
  DoctorPaymentDetail,
  VerificationDocument,
  UserVerification,
  Partner,
  TrustTierConfig,
  UserTierAssignment,
  CartItem,
  PaymentMethod,
  PharmacyProfile,
  PharmacyBranch,
  Supplier,
  InventoryGroup,
  InventoryCategory,
  InventoryUnit,
  InventoryAdjustment,
  MedicineBatch,
  Metric,
  HealthMetric,
  MedicationSchedule,
  Challenge,
  HealthPlan,
  ChatMessage,
} from '../types';

// Note: User, Doctor, and UserRole are now exported from ./user
// Legacy types.ts still has these for backward compatibility during migration
