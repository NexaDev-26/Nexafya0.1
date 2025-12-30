import { 
  collection as firestoreCollection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QueryConstraint,
  increment
} from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { 
  Appointment, 
  Doctor, 
  Medicine, 
  UserRole, 
  InventoryItem, 
  Article, 
  HealthRecord, 
  HouseholdVisit, 
  Transaction, 
  Partner, 
  SubscriptionPackage, 
  TrustTierConfig, 
  UserTierAssignment,
  PharmacyBranch, 
  HealthMetric,
  Courier 
} from '../types';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

/**
 * Firebase Database Service
 * Provides both one-time fetch operations and real-time listeners
 * For real-time React hooks, see hooks/useFirestore.ts
 */
export const firebaseDb = {
  // --- DOCTORS ---
  getDoctors: async (): Promise<Doctor[]> => {
    try {
      const doctorsRef = firestoreCollection(firestore, 'doctors');
      const querySnapshot = await getDocs(query(doctorsRef, orderBy('rating', 'desc')));
      
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Doctor',
          role: UserRole.DOCTOR,
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Doctor')}&background=random&size=200`,
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || 'Tanzania',
          specialty: data.specialty || 'General Practitioner',
          rating: Number(data.rating) || 5.0,
          price: data.consultationFee || data.consultation_fee || data.price || 0,
          experience: data.experienceYears || data.experience_years || data.experience || 0,
          availability: data.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          trustTier: data.trustTier || data.subscriptionTier || undefined,
          isTrusted: data.isTrusted || data.verificationStatus === 'Verified' || false,
          canVerifyArticles: data.canVerifyArticles || false,
          points: data.points || 0,
          bio: data.bio || '',
          workplace: data.workplace || data.hospital || data.clinic || undefined,
          yearsOfExperience: data.experienceYears || data.experience_years || data.experience || 0,
          verificationStatus: data.verificationStatus || undefined,
          medicalLicenseNumber: data.medicalLicenseNumber || data.licenseNumber || undefined,
          medicalCouncilRegistration: data.medicalCouncilRegistration || data.councilRegistration || undefined,
          isActive: data.isActive !== false,
        };
      });
    } catch (e) {
      console.error("DB: Failed to fetch doctors", e);
      return [];
    }
  },

  getDoctorDetails: async (doctorId: string): Promise<Doctor | null> => {
    try {
      const docRef = doc(firestore, 'doctors', doctorId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || 'Doctor',
        role: UserRole.DOCTOR,
        avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Doctor')}&background=random&size=200`,
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || 'Tanzania',
        points: data.points || 0,
        specialty: data.specialty || 'General Practitioner',
        rating: Number(data.rating) || 5.0,
        price: data.consultationFee || data.consultation_fee || data.price || 0,
        experience: data.experienceYears || data.experience_years || data.experience || 0,
        availability: data.availability || [],
        trustTier: data.trustTier || undefined,
        isTrusted: data.isTrusted || false,
        canVerifyArticles: data.canVerifyArticles || false,
        bio: data.bio || '',
        workplace: data.workplace || '',
        verificationStatus: data.verificationStatus || undefined,
        medicalLicenseNumber: data.medicalLicenseNumber || undefined,
        medicalCouncilRegistration: data.medicalCouncilRegistration || undefined,
        yearsOfExperience: data.yearsOfExperience || undefined
      } as Doctor;
    } catch (e) {
      console.error("DB: Failed to fetch doctor details", e);
      return null;
    }
  },

  updateDoctorDetails: async (doctorId: string, details: any) => {
    try {
      const docRef = doc(firestore, 'doctors', doctorId);
      const docSnap = await getDoc(docRef);
      
      // If document doesn't exist, create it; otherwise update it
      if (!docSnap.exists()) {
        // Get user data to include basic info
        const userRef = doc(firestore, 'users', doctorId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        
        // Create new doctor document with user data and professional details
        await setDoc(docRef, cleanFirestoreData({
          ...userData,
          ...details,
          id: doctorId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      } else {
        // Update existing document
        await updateDoc(docRef, cleanFirestoreData({ 
          ...details, 
          updatedAt: serverTimestamp() 
        }));
      }
      return true;
    } catch (e: any) {
      console.error("Doctor detail update failed", e);
      // Log the actual error for debugging
      console.error("Error details:", e.message, e.code);
      throw new Error(e.message || "Failed to save professional details");
    }
  },

  // --- DOCTOR REVIEWS & RATINGS ---
  submitReview: async (doctorId: string, patientId: string, rating: number, comment: string, patientName?: string) => {
    try {
      // Check if patient already reviewed this doctor
      const reviewsRef = firestoreCollection(firestore, 'doctorReviews');
      const existingReviewQuery = query(
        reviewsRef,
        where('doctorId', '==', doctorId),
        where('patientId', '==', patientId)
      );
      const existingSnap = await getDocs(existingReviewQuery);
      
      const reviewData = {
        doctorId,
        patientId,
        patientName: patientName || 'Anonymous',
        rating,
        comment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (!existingSnap.empty) {
        // Update existing review
        const existingDoc = existingSnap.docs[0];
        await updateDoc(existingDoc.ref, cleanFirestoreData({
          ...reviewData,
          updatedAt: serverTimestamp()
        }));
      } else {
        // Create new review
        await addDoc(reviewsRef, reviewData);
      }

      // Recalculate doctor's average rating
      await firebaseDb.updateDoctorRating(doctorId);
      
      return true;
    } catch (e: any) {
      console.error("Submit review error", e);
      throw new Error(e.message || "Failed to submit review");
    }
  },

  getDoctorReviews: async (doctorId: string) => {
    try {
      const reviewsRef = firestoreCollection(firestore, 'doctorReviews');
      const q = query(
        reviewsRef,
        where('doctorId', '==', doctorId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          doctorId: data.doctorId,
          patientId: data.patientId,
          patientName: data.patientName || 'Anonymous',
          rating: Number(data.rating) || 0,
          comment: data.comment || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (e) {
      console.error("Get doctor reviews error", e);
      return [];
    }
  },

  updateDoctorRating: async (doctorId: string) => {
    try {
      const reviewsRef = firestoreCollection(firestore, 'doctorReviews');
      const q = query(reviewsRef, where('doctorId', '==', doctorId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return;
      }

      let totalRating = 0;
      let count = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalRating += Number(data.rating) || 0;
        count++;
      });

      const averageRating = count > 0 ? totalRating / count : 5.0;
      
      // Update doctor's rating
      const doctorRef = doc(firestore, 'doctors', doctorId);
      await updateDoc(doctorRef, cleanFirestoreData({
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount: count,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Update doctor rating error", e);
    }
  },

  // --- APPOINTMENTS ---
  getAppointments: async (userId: string, role: UserRole) => {
    try {
      const appointmentsRef = firestoreCollection(firestore, 'appointments');
      const field = role === UserRole.DOCTOR ? 'doctorId' : 'patientId';
      const q = query(
        appointmentsRef, 
        where(field, '==', userId),
        orderBy('scheduledAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => {
        try {
          const data = doc.data() || {};
          let scheduledAt: Date;
          try {
            scheduledAt = data.scheduledAt?.toDate() || new Date();
            if (isNaN(scheduledAt.getTime())) scheduledAt = new Date();
          } catch {
            scheduledAt = new Date();
          }
          
          return {
            id: doc.id,
            doctorName: data.doctorName || 'Specialist',
            patientName: data.patientName || 'Patient',
            date: scheduledAt.toLocaleDateString(),
            time: scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: data.status || 'UPCOMING',
            paymentStatus: data.paymentStatus || 'PENDING',
            type: data.consultationType || 'VIDEO',
            fee: Number(data.fee) || 0,
            notes: data.notes || '',
            patientId: data.patientId || '',
            doctorId: data.doctorId || ''
          } as Appointment;
        } catch (err) {
          console.error('Error mapping appointment:', err);
          return null;
        }
      }).filter((apt): apt is Appointment => apt !== null);
    } catch (e) {
      console.error("DB: Appointments fetch error", e);
      return [];
    }
  },

  createAppointment: async (apt: any) => {
    try {
      const appointmentsRef = firestoreCollection(firestore, 'appointments');
      const docRef = await addDoc(appointmentsRef, {
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        scheduledAt: Timestamp.fromDate(new Date(`${apt.date}T${apt.time}:00`)),
        consultationType: apt.type,
        fee: apt.fee,
        status: 'UPCOMING',
        paymentStatus: 'PENDING',
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...apt };
    } catch (e) {
      console.error("Create appointment error", e);
      throw e;
    }
  },

  updateAppointmentStatus: async (id: string, status: string, notes?: string) => {
    try {
      const docRef = doc(firestore, 'appointments', id);
      const updates: any = { status, updatedAt: serverTimestamp() };
      if (notes) updates.notes = notes;
      await updateDoc(docRef, cleanFirestoreData(updates));
      return true;
    } catch (e) {
      console.error("Update appointment error", e);
      throw e;
    }
  },

  // --- ARTICLE ANALYTICS ---
  incrementArticleView: async (articleId: string) => {
    try {
      const docRef = doc(firestore, 'articles', articleId);
      await updateDoc(docRef, { views: increment(1) });
      return true;
    } catch (e) {
      console.error("Increment article views error", e);
      return false;
    }
  },

  incrementArticleShare: async (articleId: string) => {
    try {
      const docRef = doc(firestore, 'articles', articleId);
      await updateDoc(docRef, { shares: increment(1) });
      return true;
    } catch (e) {
      console.error("Increment article shares error", e);
      return false;
    }
  },

  // --- PATIENT HISTORY ---
  getPatientFullHistory: async (patientId: string) => {
    try {
      const appointmentsRef = firestoreCollection(firestore, 'appointments');
      const recordsRef = firestoreCollection(firestore, 'healthRecords');
      
      const [aptsSnapshot, recsSnapshot] = await Promise.all([
        getDocs(query(
          appointmentsRef,
          where('patientId', '==', patientId),
          where('status', '==', 'COMPLETED'),
          orderBy('scheduledAt', 'desc')
        )),
        getDocs(query(
          recordsRef,
          where('patientId', '==', patientId),
          orderBy('recordedAt', 'desc')
        ))
      ]);

      const pastConsultations = aptsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'CONSULTATION' as const,
          title: `${data.consultationType} Visit`,
          provider: data.doctorName || 'Doctor',
          date: data.scheduledAt?.toDate().toLocaleDateString() || '',
          notes: data.notes,
          status: data.status
        };
      });

      const pastRecords = recsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'RECORD' as const,
          recordType: data.type,
          title: data.title,
          provider: data.doctor,
          date: data.recordedAt?.toDate().toLocaleDateString() || '',
          fileUrl: data.fileUrl,
          status: data.status
        };
      });

      return [...pastConsultations, ...pastRecords].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (e) {
      console.error("DB: History fetch error", e);
      return [];
    }
  },

  // --- ARTICLES ---
  getArticles: async (): Promise<Article[]> => {
    try {
      const articlesRef = firestoreCollection(firestore, 'articles');
      const q = query(articlesRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => {
        try {
          const data = doc.data() || {};
          let dateStr = '';
          try {
            const createdAt = data.createdAt?.toDate();
            if (createdAt && !isNaN(createdAt.getTime())) {
              dateStr = createdAt.toLocaleDateString();
            }
          } catch {
            dateStr = new Date().toLocaleDateString();
          }
          
          return {
            id: doc.id,
            title: data.title || 'Untitled',
            excerpt: data.excerpt || '',
            content: data.content || '',
            authorId: data.authorId || '',
            authorName: data.authorName || 'Unknown',
            authorRole: data.authorRole || UserRole.DOCTOR,
            category: data.category || 'General',
            readTime: Number(data.readTime) || 5,
            date: dateStr,
            likes: Number(data.likes) || 0,
            views: Number(data.views) || 0,
            image: data.image || '',
            isPremium: Boolean(data.isPremium),
            price: Number(data.price) || 0,
            currency: data.currency || 'TZS',
            status: data.status || 'published',
            highlights: data.highlights || ''
          } as Article;
        } catch (err) {
          console.error('Error mapping article:', err);
          return null;
        }
      }).filter((article): article is Article => article !== null);
    } catch (e) {
      console.error("Fetch articles error", e);
      return [];
    }
  },

  createArticle: async (article: any) => {
    try {
      const articlesRef = firestoreCollection(firestore, 'articles');
      const docRef = await addDoc(articlesRef, {
        ...article,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...article };
    } catch (e) {
      console.error("Create article error", e);
      throw e;
    }
  },

  updateArticle: async (id: string, article: any) => {
    try {
      const docRef = doc(firestore, 'articles', id);
      await updateDoc(docRef, cleanFirestoreData({ ...article, updatedAt: serverTimestamp() }));
      return { id, ...article };
    } catch (e) {
      console.error("Update article error", e);
      throw e;
    }
  },

  deleteArticle: async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'articles', id));
      return true;
    } catch (e) {
      console.error("Delete article error", e);
      throw e;
    }
  },

  // --- HEALTH RECORDS ---
  getHealthRecords: async (userId: string): Promise<HealthRecord[]> => {
    try {
      const recordsRef = firestoreCollection(firestore, 'healthRecords');
      const q = query(recordsRef, where('patientId', '==', userId), orderBy('recordedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          title: data.title,
          doctor: data.doctor,
          date: data.recordedAt?.toDate().toLocaleDateString() || '',
          fileUrl: data.fileUrl,
          status: data.status
        };
      });
    } catch (e) {
      console.error("Fetch health records error", e);
      return [];
    }
  },

  createHealthRecord: async (userId: string, record: HealthRecord) => {
    try {
      const recordsRef = firestoreCollection(firestore, 'healthRecords');
      const docRef = await addDoc(recordsRef, {
        patientId: userId,
        type: record.type,
        title: record.title,
        doctor: record.doctor,
        recordedAt: Timestamp.fromDate(new Date(record.date)),
        fileUrl: record.fileUrl,
        status: record.status,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...record };
    } catch (e) {
      console.error("Create health record error", e);
      throw e;
    }
  },

  // --- PHARMACY ---
  getMedicines: async (): Promise<Medicine[]> => {
    try {
      const medicinesRef = firestoreCollection(firestore, 'medicines');
      const querySnapshot = await getDocs(medicinesRef);
      return querySnapshot.docs.map((doc) => {
        try {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name || 'Unknown Medicine',
            category: data.category || 'General',
            price: Number(data.price) || 0,
            stock: Number(data.stock) || 0,
            description: data.description || '',
            image: data.image || '',
            ...data
          } as Medicine;
        } catch (err) {
          console.error('Error mapping medicine:', err);
          return null;
        }
      }).filter((med): med is Medicine => med !== null);
    } catch (e) {
      console.error("Fetch medicines error", e);
      return [];
    }
  },

  getInventory: async (pharmacyId: string): Promise<InventoryItem[]> => {
    try {
      const inventoryRef = firestoreCollection(firestore, 'inventory');
      const q = query(inventoryRef, where('pharmacy_id', '==', pharmacyId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InventoryItem));
    } catch (e) {
      console.error("Fetch inventory error", e);
      return [];
    }
  },

  addInventoryItem: async (item: Partial<InventoryItem>) => {
    try {
      const inventoryRef = firestoreCollection(firestore, 'inventory');
      const docRef = await addDoc(inventoryRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...item };
    } catch (e) {
      console.error("Add inventory error", e);
      throw e;
    }
  },

  deleteInventoryItem: async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'inventory', id));
      return true;
    } catch (e) {
      console.error("Delete inventory error", e);
      throw e;
    }
  },

  getPharmacyBranches: async (pharmacyId: string): Promise<PharmacyBranch[]> => {
    try {
      const branchesRef = firestoreCollection(firestore, 'pharmacyBranches');
      const q = query(branchesRef, where('owner_id', '==', pharmacyId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PharmacyBranch));
    } catch (e) {
      console.error("Fetch branches error", e);
      return [];
    }
  },

  createPharmacyBranch: async (branch: any) => {
    try {
      const branchesRef = firestoreCollection(firestore, 'pharmacyBranches');
      const docRef = await addDoc(branchesRef, { ...branch, created_at: serverTimestamp() });
      return { id: docRef.id, ...branch };
    } catch (e) {
      console.error("Create branch error", e);
      throw e;
    }
  },

  verifyPrescription: async (qrCode: string): Promise<any | null> => {
    try {
      const prescriptionsRef = firestoreCollection(firestore, 'prescriptions');
      const q = query(prescriptionsRef, where('qrCode', '==', qrCode), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        appointmentId: data.appointmentId,
        items: data.items || [],
        status: data.status || 'ISSUED',
        pharmacyId: data.pharmacyId,
        pharmacyName: data.pharmacyName,
        qrCode: data.qrCode || data.qr_code,
        qrCodeUrl: data.qrCodeUrl,
        notes: data.notes,
        issuedAt: data.issuedAt,
        lockedAt: data.lockedAt,
        dispensedAt: data.dispensedAt,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        isExternal: data.isExternal,
        externalFileUrl: data.externalFileUrl
      } as any;
    } catch (e) {
      console.error("Verify prescription error", e);
      return null;
    }
  },

  dispensePrescription: async (rxId: string, pharmacyId: string) => {
    try {
      // Simple implementation - update prescription status directly
      const docRef = doc(firestore, 'prescriptions', rxId);
      const prescriptionSnap = await getDoc(docRef);
      
      if (!prescriptionSnap.exists()) {
        console.error("Prescription not found");
        return false;
      }

      const currentStatus = prescriptionSnap.data().status;
      
      // Check if already dispensed
      if (currentStatus === 'DISPENSED') {
        console.error("Prescription already dispensed");
        return false;
      }

      // Update to dispensed status
      await updateDoc(docRef, cleanFirestoreData({
        status: 'DISPENSED',
        dispensed_by: pharmacyId,
        dispensedAt: serverTimestamp()
      }));
      return true;
    } catch (e) {
      console.error("Dispense prescription error", e);
      return false;
    }
  },

  getOrders: async (userId: string, role: UserRole) => {
    try {
      const ordersRef = firestoreCollection(firestore, 'orders');
      const field = role === UserRole.PHARMACY ? 'pharmacy_id' : 'patient_id';
      const q = query(ordersRef, where(field, '==', userId), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Fetch orders error", e);
      return [];
    }
  },

  subscribeToOrders: (pharmacyId: string, callback: (payload: any) => void) => {
    console.warn("Real-time subscriptions not implemented yet for Firebase");
    return { unsubscribe: () => {} };
  },

  // --- CHW ---
  getHouseholdVisits: async (chwId: string): Promise<HouseholdVisit[]> => {
    try {
      const visitsRef = firestoreCollection(firestore, 'householdVisits');
      const q = query(visitsRef, where('chw_id', '==', chwId), orderBy('visit_date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => {
        try {
          const data = doc.data() || {};
          let visitDate = '';
          try {
            const date = data.visit_date?.toDate();
            if (date && !isNaN(date.getTime())) {
              visitDate = date.toISOString();
            }
          } catch {
            visitDate = new Date().toISOString();
          }
          
          return {
            id: doc.id,
            chw_id: data.chw_id || '',
            head_of_household: data.head_of_household || '',
            location_name: data.location_name || '',
            visit_date: visitDate,
            risk_level: data.risk_level || 'Routine',
            notes: data.notes || '',
            maternal_status: data.maternal_status || undefined,
            location_lat: Number(data.location_lat) || undefined,
            location_lng: Number(data.location_lng) || undefined
          } as HouseholdVisit;
        } catch (err) {
          console.error('Error mapping household visit:', err);
          return null;
        }
      }).filter((visit): visit is HouseholdVisit => visit !== null);
    } catch (e) {
      console.error("Fetch household visits error", e);
      return [];
    }
  },

  recordHouseholdVisit: async (visit: any) => {
    try {
      const visitsRef = firestoreCollection(firestore, 'householdVisits');
      const docRef = await addDoc(visitsRef, {
        ...visit,
        visit_date: Timestamp.fromDate(new Date(visit.visit_date)),
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...visit };
    } catch (e) {
      console.error("Record household visit error", e);
      throw e;
    }
  },

  // --- ADMIN ---
  getPackages: async (): Promise<SubscriptionPackage[]> => {
    try {
      const packagesRef = firestoreCollection(firestore, 'subscriptionPackages');
      const querySnapshot = await getDocs(packagesRef);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SubscriptionPackage));
    } catch (e) {
      console.error("Fetch packages error", e);
      return [];
    }
  },

  updatePackages: async (pkgs: SubscriptionPackage[]) => {
    try {
      for (const pkg of pkgs) {
        const docRef = doc(firestore, 'subscriptionPackages', pkg.id);
        await updateDoc(docRef, pkg as any);
      }
      return true;
    } catch (e) {
      console.error("Update packages error", e);
      return false;
    }
  },

  getPartners: async (): Promise<Partner[]> => {
    try {
      const partnersRef = firestoreCollection(firestore, 'partners');
      const querySnapshot = await getDocs(partnersRef);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Partner));
    } catch (e) {
      console.error("Fetch partners error", e);
      return [];
    }
  },

  getPendingVerifications: async () => {
    try {
      const verificationsRef = firestoreCollection(firestore, 'verifications');
      const q = query(verificationsRef, where('status', '==', 'PENDING'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Fetch verifications error", e);
      return [];
    }
  },

  getPendingTransactions: async () => {
    try {
      const transactionsRef = firestoreCollection(firestore, 'transactions');
      const q = query(transactionsRef, where('status', '==', 'PENDING'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Fetch transactions error", e);
      return [];
    }
  },

  verifyTransaction: async (id: string, status: string) => {
    try {
      const docRef = doc(firestore, 'transactions', id);
      await updateDoc(docRef, cleanFirestoreData({ status, updatedAt: serverTimestamp() }));
      return true;
    } catch (e) {
      console.error("Verify transaction error", e);
      throw e;
    }
  },

  // --- MESSAGES ---
  getMessages: async (userId: string, chatPartnerId: string) => {
    try {
      const messagesRef = firestoreCollection(firestore, 'messages');
      const chatId = [userId, chatPartnerId].sort().join('_');
      const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((docSnap) => {
        const data: any = docSnap.data();
        return {
          id: docSnap.id,
          sender: data.senderId === userId ? 'me' : 'them',
          text: data.text,
          time: data.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
          status: data.read ? 'read' : 'sent'
        };
      });
    } catch (e) {
      console.error("Fetch messages error", e);
      return [];
    }
  },

  sendMessage: async (senderId: string, recipientId: string, content: string) => {
    try {
      const messagesRef = firestoreCollection(firestore, 'messages');
      const chatId = [senderId, recipientId].sort().join('_');
      const docRef = await addDoc(messagesRef, {
        chatId,
        senderId,
        recipientId,
        text: content,
        participants: [senderId, recipientId], // retained for future queries
        read: false,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, senderId, recipientId, text: content };
    } catch (e) {
      console.error("Send message error", e);
      throw e;
    }
  },

  // --- VITALS ---
  addHealthMetric: async (metric: any) => {
    try {
      const metricsRef = firestoreCollection(firestore, 'healthMetrics');
      const docRef = await addDoc(metricsRef, {
        ...metric,
        recorded_at: serverTimestamp(),
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...metric };
    } catch (e) {
      console.error("Add health metric error", e);
      throw e;
    }
  },

  // --- REFERRALS ---
  applyReferralCode: async (userId: string, referralCode: string): Promise<boolean> => {
    try {
      // Find referrer by code
      const usersRef = firestoreCollection(firestore, 'users');
      const referrerQuery = query(usersRef, where('referralCode', '==', referralCode.toUpperCase()));
      const referrerSnap = await getDocs(referrerQuery);
      
      if (referrerSnap.empty) {
        return false; // Invalid referral code
      }

      const referrerDoc = referrerSnap.docs[0];
      const referrerId = referrerDoc.id;

      // Check if user already used a referral code
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().referredBy) {
        return false; // Already used a referral code
      }

      // Update new user with referrer info
      await updateDoc(userRef, cleanFirestoreData({
        referredBy: referrerId,
        referralAppliedAt: serverTimestamp()
      }));

      // Award credits to both users (referrer gets 20% discount credit, new user gets 15% discount credit)
      await updateDoc(referrerDoc.ref, cleanFirestoreData({
        referralCount: increment(1),
        referralCredits: increment(2000), // 2000 points = 20% off next consultation (assuming 10000 TZS base)
        updatedAt: serverTimestamp()
      }));

      // Award new user credit
      await updateDoc(userRef, cleanFirestoreData({
        referralCredits: 1500, // 1500 points = 15% off first consultation
        updatedAt: serverTimestamp()
      }));

      // Record referral
      const referralsRef = firestoreCollection(firestore, 'referrals');
      await addDoc(referralsRef, {
        referrerId,
        referredUserId: userId,
        referralCode,
        status: 'APPLIED',
        createdAt: serverTimestamp()
      });

      return true;
    } catch (e) {
      console.error("Apply referral code error", e);
      return false;
    }
  },

  getReferralStats: async (userId: string) => {
    try {
      const referralsRef = firestoreCollection(firestore, 'referrals');
      const userReferralsQuery = query(referralsRef, where('referrerId', '==', userId));
      const snap = await getDocs(userReferralsQuery);
      
      return {
        totalReferrals: snap.size,
        referrals: snap.docs.map(d => ({ id: d.id, ...d.data() }))
      };
    } catch (e) {
      console.error("Get referral stats error", e);
      return { totalReferrals: 0, referrals: [] };
    }
  },

  // --- ADMIN ANALYTICS ---
  getAdminStats: async () => {
    try {
      // Get all users
      const usersRef = firestoreCollection(firestore, 'users');
      const usersSnap = await getDocs(usersRef);
      const allUsers = usersSnap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          isActive: data.isActive !== false,
          role: data.role || 'PATIENT',
          createdAt: data.createdAt || data.created_at || null
        };
      });
      
      // Get all transactions
      const transactionsRef = firestoreCollection(firestore, 'transactions');
      const transactionsSnap = await getDocs(transactionsRef);
      const allTransactions = transactionsSnap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          status: data.status || 'PENDING',
          amount: Number(data.amount) || 0,
          itemType: data.itemType || data.type || 'CONSULTATION',
          type: data.type || 'CONSULTATION',
          createdAt: data.createdAt || data.created_at || null
        };
      });
      
      // Get all doctors
      const doctorsRef = firestoreCollection(firestore, 'doctors');
      const doctorsSnap = await getDocs(doctorsRef);
      const allDoctors = doctorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Calculate statistics
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(u => u.isActive !== false).length;
      const usersByRole = {
        PATIENT: allUsers.filter(u => u.role === 'PATIENT').length,
        DOCTOR: allUsers.filter(u => u.role === 'DOCTOR').length,
        PHARMACY: allUsers.filter(u => u.role === 'PHARMACY').length,
        COURIER: allUsers.filter(u => u.role === 'COURIER').length,
        CHW: allUsers.filter(u => u.role === 'CHW').length,
        ADMIN: allUsers.filter(u => u.role === 'ADMIN').length,
      };
      
      // Calculate revenue
      const verifiedTransactions = allTransactions.filter(t => t.status === 'VERIFIED' || t.status === 'COMPLETED');
      const totalRevenue = verifiedTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      // Get revenue by type
      const revenueByType = {
        consultations: verifiedTransactions.filter(t => t.itemType === 'consultation' || t.type === 'CONSULTATION_FEE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
        pharmacy: verifiedTransactions.filter(t => t.itemType === 'order' || t.itemType === 'sale').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
        subscriptions: verifiedTransactions.filter(t => t.itemType === 'subscription').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      };
      
      // Get active doctors count
      const activeDoctors = allDoctors.length;
      
      // Get recent stats (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUsers = allUsers.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return createdAt >= thirtyDaysAgo;
      }).length;
      
      const recentRevenue = verifiedTransactions.filter(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date((t as any).created_at || t.createdAt);
        return createdAt >= thirtyDaysAgo;
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      // Calculate growth percentages
      const userGrowth = totalUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(1) : '0';
      const revenueGrowth = totalRevenue > 0 ? ((recentRevenue / totalRevenue) * 100).toFixed(1) : '0';
      
      return {
        totalUsers,
        activeUsers,
        usersByRole,
        totalRevenue,
        revenueByType,
        activeDoctors,
        totalTransactions: allTransactions.length,
        recentUsers,
        recentRevenue,
        userGrowth,
        revenueGrowth,
      };
    } catch (e) {
      console.error("Failed to get admin stats", e);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: { PATIENT: 0, DOCTOR: 0, PHARMACY: 0, COURIER: 0, CHW: 0, ADMIN: 0 },
        totalRevenue: 0,
        revenueByType: { consultations: 0, pharmacy: 0, subscriptions: 0 },
        activeDoctors: 0,
        totalTransactions: 0,
        recentUsers: 0,
        recentRevenue: 0,
        userGrowth: '0',
        revenueGrowth: '0',
      };
    }
  },

  // --- ADMIN LOGS ---
  getAdminLogs: async (limitCount: number = 100) => {
    try {
      const logsRef = firestoreCollection(firestore, 'adminLogs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp),
      }));
    } catch (e) {
      console.error("Failed to get admin logs", e);
      return [];
    }
  },

  // --- TRUST TIER MANAGEMENT ---
  getTrustTierConfigs: async (role?: 'DOCTOR' | 'COURIER'): Promise<TrustTierConfig[]> => {
    try {
      const configsRef = firestoreCollection(firestore, 'trustTierConfigs');
      const q = role 
        ? query(configsRef, where('role', '==', role), where('isActive', '==', true))
        : query(configsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrustTierConfig));
    } catch (e) {
      console.error("Get trust tier configs error", e);
      return [];
    }
  },

  createTrustTierConfig: async (config: Omit<TrustTierConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const configsRef = firestoreCollection(firestore, 'trustTierConfigs');
      const docRef = await addDoc(configsRef, {
        ...config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...config };
    } catch (e) {
      console.error("Create trust tier config error", e);
      throw e;
    }
  },

  updateTrustTierConfig: async (id: string, updates: Partial<TrustTierConfig>) => {
    try {
      const configRef = doc(firestore, 'trustTierConfigs', id);
      await updateDoc(configRef, cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Update trust tier config error", e);
      throw e;
    }
  },

  getUserTierAssignment: async (userId: string) => {
    try {
      const assignmentRef = doc(firestore, 'userTierAssignments', userId);
      const snapshot = await getDoc(assignmentRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (e) {
      console.error("Get user tier assignment error", e);
      return null;
    }
  },

  assignUserTier: async (userId: string, assignment: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const assignmentRef = doc(firestore, 'userTierAssignments', userId);
      await setDoc(assignmentRef, cleanFirestoreData({
        ...assignment,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
      
      // Update doctor/courier with trust tier info
      const userRef = assignment.userRole === 'DOCTOR' 
        ? doc(firestore, 'doctors', userId)
        : doc(firestore, 'users', userId);
      await updateDoc(userRef, cleanFirestoreData({
        trustTier: assignment.trustTier,
        isTrusted: true,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Assign user tier error", e);
      throw e;
    }
  },

  activateUserTierAfterTrial: async (userId: string, activatedBy: string) => {
    try {
      const assignmentRef = doc(firestore, 'userTierAssignments', userId);
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      
      await updateDoc(assignmentRef, cleanFirestoreData({
        status: 'ACTIVE',
        isTrialActive: false,
        activationDate: new Date().toISOString(),
        nextPaymentDate: nextPaymentDate.toISOString(),
        activatedBy,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Activate user tier error", e);
      throw e;
    }
  },

  updateDoctorVerificationPermission: async (doctorId: string, canVerify: boolean) => {
    try {
      const doctorRef = doc(firestore, 'doctors', doctorId);
      await updateDoc(doctorRef, cleanFirestoreData({
        canVerifyArticles: canVerify,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Update doctor verification permission error", e);
      throw e;
    }
  },

  // --- ARTICLE VERIFICATION ---
  assignArticleForVerification: async (articleId: string, doctorId: string) => {
    try {
      const articleRef = doc(firestore, 'articles', articleId);
      await updateDoc(articleRef, cleanFirestoreData({
        status: 'pending_verification',
        pendingVerificationBy: doctorId,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Assign article for verification error", e);
      throw e;
    }
  },

  verifyArticle: async (articleId: string, verifierId: string, verifierName: string, notes?: string) => {
    try {
      const articleRef = doc(firestore, 'articles', articleId);
      await updateDoc(articleRef, cleanFirestoreData({
        status: 'verified',
        verifiedBy: verifierId,
        verifiedByName: verifierName,
        verifiedAt: new Date().toISOString(),
        verificationNotes: notes || '',
        pendingVerificationBy: null,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Verify article error", e);
      throw e;
    }
  },

  rejectArticle: async (articleId: string, verifierId: string, reason: string) => {
    try {
      const articleRef = doc(firestore, 'articles', articleId);
      await updateDoc(articleRef, cleanFirestoreData({
        status: 'rejected',
        verifiedBy: verifierId,
        rejectionReason: reason,
        verifiedAt: new Date().toISOString(),
        pendingVerificationBy: null,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("Reject article error", e);
      throw e;
    }
  },

  publishArticle: async (articleId: string) => {
    try {
      const articleRef = doc(firestore, 'articles', articleId);
      await updateDoc(articleRef, {
        status: 'published',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Publish article error", e);
      throw e;
    }
  },

  getArticlesPendingVerification: async (doctorId?: string) => {
    try {
      const articlesRef = firestoreCollection(firestore, 'articles');
      const q = doctorId
        ? query(articlesRef, where('pendingVerificationBy', '==', doctorId))
        : query(articlesRef, where('status', '==', 'pending_verification'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
    } catch (e) {
      console.error("Get articles pending verification error", e);
      return [];
    }
  },

  getCouriers: async () => {
    try {
      const usersRef = firestoreCollection(firestore, 'users');
      const q = query(usersRef, where('role', '==', 'COURIER'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Get couriers error", e);
      return [];
    }
  },

  // --- BATCH MANAGEMENT ---
  getBatches: async (): Promise<any[]> => {
    try {
      const batchesRef = firestoreCollection(firestore, 'medicineBatches');
      const snapshot = await getDocs(batchesRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch batches", e);
      return [];
    }
  },

  addBatch: async (batch: any): Promise<string> => {
    try {
      const batchesRef = firestoreCollection(firestore, 'medicineBatches');
      const docRef = await addDoc(batchesRef, cleanFirestoreData(batch));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to add batch", e);
      throw e;
    }
  },

  updateBatch: async (batchId: string, updates: any): Promise<void> => {
    try {
      const batchRef = doc(firestore, 'medicineBatches', batchId);
      await updateDoc(batchRef, cleanFirestoreData(updates));
    } catch (e) {
      console.error("DB: Failed to update batch", e);
      throw e;
    }
  },

  deleteBatch: async (batchId: string): Promise<void> => {
    try {
      const batchRef = doc(firestore, 'medicineBatches', batchId);
      await deleteDoc(batchRef);
    } catch (e) {
      console.error("DB: Failed to delete batch", e);
      throw e;
    }
  },

  // --- PRESCRIPTIONS ---
  getPrescriptions: async (patientId?: string, doctorId?: string): Promise<any[]> => {
    try {
      const prescriptionsRef = firestoreCollection(firestore, 'prescriptions');
      let q = query(prescriptionsRef, orderBy('createdAt', 'desc'));
      if (patientId) q = query(q, where('patientId', '==', patientId));
      if (doctorId) q = query(q, where('doctorId', '==', doctorId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch prescriptions", e);
      return [];
    }
  },

  createPrescription: async (prescription: any): Promise<string> => {
    try {
      const prescriptionsRef = firestoreCollection(firestore, 'prescriptions');
      const docRef = await addDoc(prescriptionsRef, cleanFirestoreData({
        ...prescription,
        createdAt: serverTimestamp()
      }));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create prescription", e);
      throw e;
    }
  },

  updatePrescription: async (prescriptionId: string, updates: any): Promise<void> => {
    try {
      const prescriptionRef = doc(firestore, 'prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      }));
    } catch (e) {
      console.error("DB: Failed to update prescription", e);
      throw e;
    }
  },

  // --- FAMILY MEMBERS ---
  getFamilyMembers: async (userId: string): Promise<any[]> => {
    try {
      const membersRef = firestoreCollection(firestore, 'familyMembers');
      const q = query(membersRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch family members", e);
      return [];
    }
  },

  // --- MEDICATION SCHEDULES ---
  getMedicationSchedules: async (patientId: string): Promise<any[]> => {
    try {
      const schedulesRef = firestoreCollection(firestore, 'medicationSchedules');
      const q = query(schedulesRef, where('patientId', '==', patientId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch medication schedules", e);
      return [];
    }
  },

  createMedicationSchedule: async (schedule: any): Promise<string> => {
    try {
      const schedulesRef = firestoreCollection(firestore, 'medicationSchedules');
      const docRef = await addDoc(schedulesRef, cleanFirestoreData(schedule));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create medication schedule", e);
      throw e;
    }
  },

  updateMedicationSchedule: async (scheduleId: string, updates: any): Promise<void> => {
    try {
      const scheduleRef = doc(firestore, 'medicationSchedules', scheduleId);
      await updateDoc(scheduleRef, cleanFirestoreData(updates));
    } catch (e) {
      console.error("DB: Failed to update medication schedule", e);
      throw e;
    }
  },

  deleteMedicationSchedule: async (scheduleId: string): Promise<void> => {
    try {
      const scheduleRef = doc(firestore, 'medicationSchedules', scheduleId);
      await deleteDoc(scheduleRef);
    } catch (e) {
      console.error("DB: Failed to delete medication schedule", e);
      throw e;
    }
  },

  markMedicationTaken: async (scheduleId: string, date: string): Promise<void> => {
    try {
      const scheduleRef = doc(firestore, 'medicationSchedules', scheduleId);
      await updateDoc(scheduleRef, cleanFirestoreData({
        [`taken_${date}`]: true,
        lastTaken: serverTimestamp()
      }));
    } catch (e) {
      console.error("DB: Failed to mark medication taken", e);
      throw e;
    }
  },

  skipMedicationDose: async (scheduleId: string, date: string): Promise<void> => {
    try {
      const scheduleRef = doc(firestore, 'medicationSchedules', scheduleId);
      await updateDoc(scheduleRef, cleanFirestoreData({
        [`skipped_${date}`]: true
      }));
    } catch (e) {
      console.error("DB: Failed to skip medication dose", e);
      throw e;
    }
  },

  // --- HEALTH METRICS ---
  getHealthMetrics: async (patientId: string): Promise<any[]> => {
    try {
      const metricsRef = firestoreCollection(firestore, 'healthMetrics');
      const q = query(metricsRef, where('patient_id', '==', patientId), orderBy('recorded_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch health metrics", e);
      return [];
    }
  },

  // --- SUPPLIERS ---
  getSuppliers: async (): Promise<any[]> => {
    try {
      const suppliersRef = firestoreCollection(firestore, 'suppliers');
      const snapshot = await getDocs(suppliersRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch suppliers", e);
      return [];
    }
  },

  createSupplier: async (supplier: any): Promise<string> => {
    try {
      const suppliersRef = firestoreCollection(firestore, 'suppliers');
      const docRef = await addDoc(suppliersRef, cleanFirestoreData(supplier));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create supplier", e);
      throw e;
    }
  },

  updateSupplier: async (supplierId: string, updates: any): Promise<void> => {
    try {
      const supplierRef = doc(firestore, 'suppliers', supplierId);
      await updateDoc(supplierRef, cleanFirestoreData(updates));
    } catch (e) {
      console.error("DB: Failed to update supplier", e);
      throw e;
    }
  },

  deleteSupplier: async (supplierId: string): Promise<void> => {
    try {
      const supplierRef = doc(firestore, 'suppliers', supplierId);
      await deleteDoc(supplierRef);
    } catch (e) {
      console.error("DB: Failed to delete supplier", e);
      throw e;
    }
  },

  // --- PURCHASES ---
  getPurchases: async (): Promise<any[]> => {
    try {
      const purchasesRef = firestoreCollection(firestore, 'purchases');
      const snapshot = await getDocs(query(purchasesRef, orderBy('date', 'desc')));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch purchases", e);
      return [];
    }
  },

  createPurchase: async (purchase: any): Promise<string> => {
    try {
      const purchasesRef = firestoreCollection(firestore, 'purchases');
      const docRef = await addDoc(purchasesRef, cleanFirestoreData(purchase));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create purchase", e);
      throw e;
    }
  },

  updatePurchase: async (purchaseId: string, updates: any): Promise<void> => {
    try {
      const purchaseRef = doc(firestore, 'purchases', purchaseId);
      await updateDoc(purchaseRef, cleanFirestoreData(updates));
    } catch (e) {
      console.error("DB: Failed to update purchase", e);
      throw e;
    }
  },

  deletePurchase: async (purchaseId: string): Promise<void> => {
    try {
      const purchaseRef = doc(firestore, 'purchases', purchaseId);
      await deleteDoc(purchaseRef);
    } catch (e) {
      console.error("DB: Failed to delete purchase", e);
      throw e;
    }
  },

  updateMedicineStock: async (medicineId: string, quantityChange: number): Promise<void> => {
    try {
      const medicineRef = doc(firestore, 'medicines', medicineId);
      await updateDoc(medicineRef, {
        stock: increment(quantityChange)
      });
    } catch (e) {
      console.error("DB: Failed to update medicine stock", e);
      throw e;
    }
  },

  // --- REPORTS ---
  getSalesReport: async (startDate?: string, endDate?: string): Promise<any> => {
    try {
      const transactionsRef = firestoreCollection(firestore, 'transactions');
      let q = query(transactionsRef, where('type', '==', 'PHARMACY_SALE'));
      if (startDate) q = query(q, where('createdAt', '>=', new Date(startDate)));
      if (endDate) q = query(q, where('createdAt', '<=', new Date(endDate)));
      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(doc => doc.data());
      return {
        totalSales: sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
        count: sales.length,
        sales
      };
    } catch (e) {
      console.error("DB: Failed to fetch sales report", e);
      return { totalSales: 0, count: 0, sales: [] };
    }
  },

  getPurchasesReport: async (startDate?: string, endDate?: string): Promise<any> => {
    try {
      const purchasesRef = firestoreCollection(firestore, 'purchases');
      let q = query(purchasesRef);
      if (startDate) q = query(q, where('date', '>=', startDate));
      if (endDate) q = query(q, where('date', '<=', endDate));
      const snapshot = await getDocs(q);
      const purchases = snapshot.docs.map(doc => doc.data());
      return {
        totalPurchases: purchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
        count: purchases.length,
        purchases
      };
    } catch (e) {
      console.error("DB: Failed to fetch purchases report", e);
      return { totalPurchases: 0, count: 0, purchases: [] };
    }
  },

  getInventoryReport: async (): Promise<any> => {
    try {
      const medicinesRef = firestoreCollection(firestore, 'medicines');
      const snapshot = await getDocs(medicinesRef);
      const medicines = snapshot.docs.map(doc => doc.data());
      const totalValue = medicines.reduce((sum, m) => sum + ((Number(m.stock) || 0) * (Number(m.price) || 0)), 0);
      const lowStock = medicines.filter(m => (Number(m.stock) || 0) < (Number(m.reorderLevel) || 10));
      return {
        totalItems: medicines.length,
        totalValue,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock
      };
    } catch (e) {
      console.error("DB: Failed to fetch inventory report", e);
      return { totalItems: 0, totalValue: 0, lowStockCount: 0, lowStockItems: [] };
    }
  },

  // --- UNITS & CONVERSIONS ---
  getUnits: async (): Promise<any[]> => {
    try {
      const unitsRef = firestoreCollection(firestore, 'inventoryUnits');
      const snapshot = await getDocs(unitsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch units", e);
      return [];
    }
  },

  getConversions: async (): Promise<any[]> => {
    try {
      const conversionsRef = firestoreCollection(firestore, 'unitConversions');
      const snapshot = await getDocs(conversionsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("DB: Failed to fetch conversions", e);
      return [];
    }
  },

  createConversion: async (conversion: any): Promise<string> => {
    try {
      const conversionsRef = firestoreCollection(firestore, 'unitConversions');
      const docRef = await addDoc(conversionsRef, cleanFirestoreData(conversion));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create conversion", e);
      throw e;
    }
  },

  updateConversion: async (conversionId: string, updates: any): Promise<void> => {
    try {
      const conversionRef = doc(firestore, 'unitConversions', conversionId);
      await updateDoc(conversionRef, cleanFirestoreData(updates));
    } catch (e) {
      console.error("DB: Failed to update conversion", e);
      throw e;
    }
  },

  deleteConversion: async (conversionId: string): Promise<void> => {
    try {
      const conversionRef = doc(firestore, 'unitConversions', conversionId);
      await deleteDoc(conversionRef);
    } catch (e) {
      console.error("DB: Failed to delete conversion", e);
      throw e;
    }
  },

  // --- ORDERS ---
  createOrder: async (order: any): Promise<string> => {
    try {
      const ordersRef = firestoreCollection(firestore, 'orders');
      const docRef = await addDoc(ordersRef, cleanFirestoreData({
        ...order,
        createdAt: serverTimestamp()
      }));
      return docRef.id;
    } catch (e) {
      console.error("DB: Failed to create order", e);
      throw e;
    }
  },

};

export const db = firebaseDb;

