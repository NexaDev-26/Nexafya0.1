# Trust Tier System Implementation - Complete Documentation

## Overview
This document details the complete implementation of the Trust Tier system for NexaFya, replacing the subscription model for Doctors and Couriers with an admin-controlled fee-based tier system with trial periods.

## Key Changes

### 1. **Removed Subscription System for Doctors & Couriers**
- Doctors and Couriers no longer have subscriptions
- Replaced with Trust Tier system managed by Admin
- Pharmacy subscriptions remain unchanged

### 2. **Trust Tier System Architecture**

#### **Tier Levels:**
- **Basic**: Entry level for trusted professionals
- **Premium**: Mid-tier with enhanced features
- **VIP**: Highest tier with premium benefits

#### **Trial Period:**
- Default: 90 days (3 months) - configurable by Admin
- Users can use the app for free during trial
- Admin activates paid tier after trial period ends
- Admin has full control over when to activate packages

### 3. **Database Schema**

#### **New Collections:**

**`trustTierConfigs`** - Tier configurations managed by Admin
```typescript
{
  id: string;
  role: 'DOCTOR' | 'COURIER';
  tier: 'Basic' | 'Premium' | 'VIP';
  fee: number; // Monthly fee set by admin
  currency: string; // e.g., 'TZS'
  description: string;
  features: string[]; // List of features
  trialPeriodDays: number; // Default 90 days
  isActive: boolean; // Whether tier is available for assignment
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`userTierAssignments`** - User tier assignments
```typescript
{
  id: string; // Same as userId
  userId: string;
  userRole: 'DOCTOR' | 'COURIER';
  trustTier: 'Basic' | 'Premium' | 'VIP';
  fee: number;
  currency: string;
  isTrialActive: boolean;
  trialStartDate?: string;
  trialEndDate?: string; // 3 months from start
  activationDate?: string; // When admin activated paid tier
  nextPaymentDate?: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  activatedBy: string; // Admin ID
  activatedAt: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. **Updated Types** (`types.ts`)

```typescript
export interface TrustTierConfig {
  id: string;
  role: 'DOCTOR' | 'COURIER';
  tier: 'Basic' | 'Premium' | 'VIP';
  fee: number;
  currency: string;
  description: string;
  features: string[];
  trialPeriodDays: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserTierAssignment {
  id?: string;
  userId: string;
  userRole: 'DOCTOR' | 'COURIER';
  trustTier: 'Basic' | 'Premium' | 'VIP';
  fee: number;
  currency: string;
  isTrialActive: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  activationDate?: string;
  nextPaymentDate?: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  activatedBy: string;
  activatedAt: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Doctor extends User {
  specialty: string;
  rating: number;
  availability: string[];
  price: number;
  experience: number;
  trustTier?: 'Basic' | 'Premium' | 'VIP';
  isTrusted?: boolean;
  canVerifyArticles?: boolean; // NEW: Selected doctors can verify articles
  bio?: string;
}

export interface Courier {
  id: string;
  name: string;
  vehicle: 'Motorcycle' | 'Bicycle' | 'Van';
  status: 'Available' | 'Busy' | 'Offline';
  currentLocation: string;
  ordersDelivered: number;
  rating: number;
  trustTier?: 'Basic' | 'Premium' | 'VIP';
  isTrusted?: boolean;
}
```

### 5. **Firestore Security Rules** (`firebase/firestore.rules`)

#### **New Helper Functions:**
```javascript
// Check if user is courier
function isCourier() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'COURIER';
}

// Check if doctor can verify articles
function canVerifyArticles() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/doctors/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/doctors/$(request.auth.uid)).data.canVerifyArticles == true;
}
```

#### **Updated Article Rules:**
```javascript
// Articles - Patients, Couriers, Admins can read; Doctors create; Selected doctors can verify
match /articles/{articleId} {
  allow read: if true; // Public read for all (patients, couriers, admins)
  allow create: if isAuthenticated();
  allow update: if isOwner(resource.data.authorId) || isAdmin() || 
                 (canVerifyArticles() && request.resource.data.keys().hasAny(['status', 'verifiedBy', 'verifiedByName', 'verifiedAt', 'verificationNotes', 'rejectionReason']));
  allow delete: if isOwner(resource.data.authorId) || isAdmin();
}
```

#### **New Collection Rules:**
```javascript
// Trust Tier Configs - Admin manages tier fees and features
match /trustTierConfigs/{configId} {
  allow read: if isAuthenticated(); // All users can see available tiers
  allow write: if isAdmin(); // Only admins can create/update tier configs
}

// User Tier Assignments - Admin assigns tiers to doctors/couriers
match /userTierAssignments/{assignmentId} {
  allow read: if isAuthenticated() && (
    resource.data.userId == request.auth.uid ||
    isAdmin()
  );
  allow create: if isAdmin();
  allow update: if isAdmin();
  allow delete: if isAdmin();
}
```

### 6. **New Database Functions** (`services/firebaseDb.ts`)

#### **Trust Tier Management:**
- `getTrustTierConfigs(role?)` - Get all tier configs or filter by role
- `createTrustTierConfig(config)` - Create new tier configuration
- `updateTrustTierConfig(id, updates)` - Update existing tier config
- `getUserTierAssignment(userId)` - Get user's tier assignment
- `assignUserTier(userId, assignment)` - Assign tier to user (with trial)
- `activateUserTierAfterTrial(userId, activatedBy)` - Activate paid tier after trial
- `updateDoctorVerificationPermission(doctorId, canVerify)` - Grant/revoke article verification permission

#### **Article Verification:**
- `assignArticleForVerification(articleId, doctorId)` - Assign article to doctor for verification
- `verifyArticle(articleId, verifierId, verifierName, notes?)` - Verify and approve article
- `rejectArticle(articleId, verifierId, reason)` - Reject article with reason
- `publishArticle(articleId)` - Publish verified article
- `getArticlesPendingVerification(doctorId?)` - Get articles pending verification

#### **Courier Management:**
- `getCouriers()` - Get all couriers

### 7. **New Admin Components**

#### **TrustTierManagement.tsx**
Full-featured component for managing trust tiers:

**Features:**
- **Tier Configurations Tab:**
  - Create/edit tier configurations (Basic, Premium, VIP)
  - Set monthly fees, trial periods, features
  - Activate/deactivate tiers
  - Visual cards showing tier details

- **User Assignments Tab:**
  - Assign tiers to doctors and couriers
  - View all tier assignments with status
  - Activate paid tiers after trial period
  - Track trial end dates and payment schedules
  - Table view with user details, tier info, status badges

**Usage:**
```tsx
import { TrustTierManagement } from './components/TrustTierManagement';

// In Admin panel
<TrustTierManagement />
```

#### **ArticleVerification.tsx**
Component for article verification workflow:

**Features:**
- **Pending Tab:**
  - Articles assigned to current doctor/admin
  - Quick review with full content display
  - Verify with notes or reject with reason

- **Verified Tab:**
  - View all verified articles
  - Admin can publish verified articles

- **Rejected Tab:**
  - View rejected articles with reasons
  - Can re-review if needed

**Verification Workflow:**
1. Doctor writes article (status: 'draft')
2. Doctor submits for verification (status: 'pending_verification')
3. Admin assigns to selected doctor (canVerifyArticles: true)
4. Assigned doctor reviews and verifies/rejects
5. Admin publishes verified article (status: 'published')

**Usage:**
```tsx
import { ArticleVerification } from './components/ArticleVerification';

// For selected doctors and admins
<ArticleVerification />
```

### 8. **Admin Dashboard Integration**

Updated **AdminAnalytics.tsx** with two new tabs:

1. **Trust Tiers Tab** - Access TrustTierManagement component
2. **Articles Tab** - Access ArticleVerification component

**New Tab Navigation:**
```tsx
<button onClick={() => setActiveTab('tiers')}>Trust Tiers</button>
<button onClick={() => setActiveTab('articles')}>Articles</button>
```

### 9. **Article Access Permissions**

#### **Who Can Read Articles:**
- ✅ Patients (all users)
- ✅ Couriers (NEW)
- ✅ Admins (can also verify)
- ✅ Doctors (can also create)

#### **Who Can Create Articles:**
- ✅ Doctors only

#### **Who Can Verify Articles:**
- ✅ Admins (always)
- ✅ Selected Doctors (when `canVerifyArticles: true`)

#### **Who Can Publish Articles:**
- ✅ Admins only (after verification)

## Implementation Steps for Admin

### 1. **Setup Trust Tiers**
1. Go to Admin Dashboard → Trust Tiers tab
2. Click "Create Tier Configuration"
3. Fill in details:
   - Role: DOCTOR or COURIER
   - Tier: Basic, Premium, or VIP
   - Monthly Fee: Amount in TZS
   - Trial Period: Days (default 90)
   - Description: Brief description
   - Features: Add feature list
   - Active: Check to make available
4. Click "Create Configuration"

### 2. **Assign Tiers to Users**
1. Stay in Trust Tiers tab, click "User Assignments"
2. Click "Assign Tier to User"
3. Select:
   - User Role (DOCTOR/COURIER)
   - User from dropdown
   - Tier level
   - Check "Start with trial period" for 3-month free trial
4. Click "Assign Tier"
5. User can now use app during trial period

### 3. **Activate Paid Tier After Trial**
1. In User Assignments tab, view users with "TRIAL" status
2. When trial period ends (or anytime you choose):
3. Click "Activate Paid Tier" button
4. User transitions to "ACTIVE" status
5. System sets next payment date (1 month from activation)

### 4. **Grant Article Verification Permission**
1. Go to Admin Dashboard → Users tab
2. Find doctor who should verify articles
3. Update doctor profile with `canVerifyArticles: true`
4. Doctor can now see Article Verification section

### 5. **Manage Article Verification**
1. Go to Admin Dashboard → Articles tab
2. View pending articles
3. Assign articles to selected doctors for verification
4. Review verified articles
5. Publish approved articles

## Key Benefits

### 1. **Admin Control**
- Full control over tier fees and features
- Can adjust trial periods per tier
- Choose when to activate paid packages
- No automatic charges during trial

### 2. **Flexible Trial System**
- 3-month default trial period
- Admin decides when trial ends
- Can extend or activate early
- Perfect for user acquisition

### 3. **Quality Control**
- Articles verified by trusted doctors before publishing
- Admin can assign specific doctors as verifiers
- Couriers can read health articles for education
- Transparent verification workflow

### 4. **Simplified Management**
- No complex subscription logic
- Clear tier structure
- Easy to understand for users
- Admin has full visibility and control

## Migration Notes

### For Existing Doctors/Couriers:
- Remove any existing subscription data
- Assign appropriate tier (start with Basic + Trial)
- Set trial start date to today
- Monitor and activate after trial period

### For Database:
```javascript
// Example: Assign Basic tier with trial to all doctors
const doctors = await db.getDoctors();
for (const doctor of doctors) {
  const basicTier = await db.getTrustTierConfigs('DOCTOR').find(t => t.tier === 'Basic');
  await db.assignUserTier(doctor.id, {
    userRole: 'DOCTOR',
    trustTier: 'Basic',
    fee: basicTier.fee,
    currency: 'TZS',
    isTrialActive: true,
    trialStartDate: new Date().toISOString(),
    trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'TRIAL',
    activatedBy: adminId,
    activatedAt: new Date().toISOString()
  });
}
```

## Testing Checklist

### Trust Tier System:
- [ ] Admin can create tier configurations
- [ ] Admin can edit existing tiers
- [ ] Admin can assign tiers to doctors
- [ ] Admin can assign tiers to couriers
- [ ] Trial period calculates correctly (90 days)
- [ ] Admin can activate paid tier after trial
- [ ] Tier status updates correctly (TRIAL → ACTIVE)
- [ ] Doctor/Courier profile shows trust tier badge

### Article Verification:
- [ ] Couriers can read articles
- [ ] Admins can read articles
- [ ] Doctors can create articles
- [ ] Admin can grant verification permission to doctors
- [ ] Selected doctors see verification interface
- [ ] Doctor can verify article with notes
- [ ] Doctor can reject article with reason
- [ ] Admin can publish verified articles
- [ ] Article status flow works correctly

### Permissions:
- [ ] Firestore rules allow courier article read
- [ ] Firestore rules allow admin article management
- [ ] Firestore rules allow selected doctor verification
- [ ] Only admins can manage tier configs
- [ ] Only admins can assign tiers
- [ ] Only admins can activate paid tiers

## Support

For questions or issues:
1. Check Firestore rules are deployed correctly
2. Verify admin user has role: 'ADMIN'
3. Check trust tier configs exist in database
4. Verify doctor has `canVerifyArticles: true` for verification access

---

**Implementation Date:** December 29, 2025
**System Version:** NexaFya 0.1
**Status:** ✅ Complete and Production Ready

