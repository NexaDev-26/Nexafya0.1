/**
 * Utility function to add sample doctors to Firestore
 * Can be called from the browser console or admin panel
 */

import { db as firestore } from '../lib/firebase';

export const sampleDoctors = [
  {
    name: "Dr. Sarah Mushi",
    email: "sarah.mushi@nexafya.com",
    phone: "+255 712 345 678",
    specialty: "Cardiologist",
    rating: 4.9,
    ratingCount: 127,
    consultationFee: 50000,
    experienceYears: 12,
    avatar: "https://ui-avatars.com/api/?name=Sarah+Mushi&background=10b981&color=fff&size=200",
    location: "Dar es Salaam",
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    trustTier: "Premium",
    points: 2500,
    isTrusted: true,
    verificationStatus: "Verified",
    workplace: "Muhimbili National Hospital",
    medicalLicenseNumber: "TMC-2012-0456",
    medicalCouncilRegistration: "TMC-REG-2012-0456",
    bio: "Experienced cardiologist with over 12 years of practice specializing in heart disease prevention and treatment. Committed to providing comprehensive cardiac care with a focus on patient education and preventive medicine. Board-certified by the Tanzania Medical Council.",
    isActive: true
  },
  {
    name: "Dr. John Kiswaga",
    email: "john.kiswaga@nexafya.com",
    phone: "+255 713 456 789",
    specialty: "Pediatrician",
    rating: 4.8,
    ratingCount: 89,
    consultationFee: 45000,
    experienceYears: 10,
    avatar: "https://ui-avatars.com/api/?name=John+Kiswaga&background=3b82f6&color=fff&size=200",
    location: "Arusha",
    availability: ["Monday", "Wednesday", "Friday", "Saturday"],
    trustTier: "Premium",
    points: 1800,
    isTrusted: true,
    verificationStatus: "Verified",
    workplace: "Arusha Regional Hospital",
    medicalLicenseNumber: "TMC-2014-0789",
    medicalCouncilRegistration: "TMC-REG-2014-0789",
    bio: "Dedicated pediatrician with 10 years of experience caring for children from infancy through adolescence. Specializes in childhood development, vaccinations, and common pediatric conditions. Passionate about child health and wellness.",
    isActive: true
  },
  {
    name: "Dr. Grace Ndosi",
    email: "grace.ndosi@nexafya.com",
    phone: "+255 714 567 890",
    specialty: "General Practitioner",
    rating: 4.7,
    ratingCount: 156,
    consultationFee: 35000,
    experienceYears: 8,
    avatar: "https://ui-avatars.com/api/?name=Grace+Ndosi&background=f59e0b&color=fff&size=200",
    location: "Mwanza",
    availability: ["Monday", "Tuesday", "Thursday", "Saturday", "Sunday"],
    trustTier: "Basic",
    points: 1200,
    isTrusted: true,
    verificationStatus: "Verified",
    workplace: "Bugando Medical Centre",
    medicalLicenseNumber: "TMC-2016-0123",
    medicalCouncilRegistration: "TMC-REG-2016-0123",
    bio: "Compassionate general practitioner with 8 years of experience providing primary healthcare services. Focuses on preventive care, health education, and managing common medical conditions for patients of all ages.",
    isActive: true
  },
  {
    name: "Dr. Zero",
    email: "doctor.zero@nexafya.com",
    phone: "+255 715 678 901",
    specialty: "General Practitioner",
    rating: 4.9,
    ratingCount: 203,
    consultationFee: 40000,
    experienceYears: 15,
    avatar: "https://ui-avatars.com/api/?name=Doctor+Zero&background=06b6d4&color=fff&size=200",
    location: "Dar es Salaam",
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    trustTier: "VIP",
    points: 3500,
    isTrusted: true,
    verificationStatus: "Verified",
    workplace: "Aga Khan Hospital",
    medicalLicenseNumber: "TMC-2009-0234",
    medicalCouncilRegistration: "TMC-REG-2009-0234",
    bio: "Renowned general practitioner with 15 years of comprehensive medical experience. Known for excellent patient care, thorough diagnosis, and commitment to improving community health outcomes in Tanzania.",
    isActive: true
  }
];

/**
 * Add sample doctors to Firestore
 * Checks if doctors already exist before adding
 */
/**
 * Add sample doctors to Firestore
 * Checks if doctors already exist before adding
 */
export const addSampleDoctors = async (): Promise<{ success: boolean; message: string; added: number }> => {
  try {
    // Use dynamic import to ensure Firebase functions are available at runtime
    const { collection, addDoc, serverTimestamp, getDocs, query, where } = await import('firebase/firestore');
    
    const doctorsRef = collection(firestore, 'doctors');
    let added = 0;
    let skipped = 0;

    for (const doctor of sampleDoctors) {
      // Check if doctor with same email already exists
      const existingQuery = query(doctorsRef, where('email', '==', doctor.email));
      const existingDocs = await getDocs(existingQuery);

      if (existingDocs.empty) {
        await addDoc(doctorsRef, {
          ...doctor,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        added++;
        console.log(`✅ Added: ${doctor.name}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped: ${doctor.name} (already exists)`);
      }
    }

    return {
      success: true,
      message: `Successfully added ${added} doctors. ${skipped} already existed.`,
      added
    };
  } catch (error: any) {
    console.error('Error adding doctors:', error);
    return {
      success: false,
      message: `Failed to add doctors: ${error.message}`,
      added: 0
    };
  }
};

// Make it available globally for console access
// Only register when explicitly called or when window is ready
// This avoids issues with module loading in production builds
const registerGlobally = () => {
  if (typeof window !== 'undefined') {
    try {
      (window as any).addSampleDoctors = addSampleDoctors;
      // Only log in development to avoid console noise in production
      if (import.meta.env.DEV) {
        console.log('💡 Tip: Run addSampleDoctors() in the console to add sample doctors');
      }
    } catch (error) {
      // Silently fail in production
      if (import.meta.env.DEV) {
        console.warn('Failed to register addSampleDoctors globally:', error);
      }
    }
  }
};

// Register immediately if window is available, otherwise wait for DOM
// Use a safer approach that doesn't cause errors if DOM isn't ready
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', registerGlobally);
    } else {
      // Use requestIdleCallback if available, otherwise setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(registerGlobally);
      } else {
        setTimeout(registerGlobally, 100);
      }
    }
  } catch (error) {
    // Silently fail if registration fails
    if (import.meta.env.DEV) {
      console.warn('Failed to set up addSampleDoctors registration:', error);
    }
  }
}

