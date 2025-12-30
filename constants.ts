
import { UserRole, Appointment, Metric, PaymentMethod, Doctor, Medicine, Article, HealthRecord, MedicationSchedule, FamilyMember, Challenge, HealthPlan, SubscriptionPackage } from './types';

// NexaFya Brand Colors
export const COLORS = {
  primary: '#0066CC', // Medical Blue
  secondary: '#00A86B', // Health Green
  accent: '#FF6B35', // Alert Orange
  darkBg: '#0A0F1C',
  lightBg: '#FFFFFF',
};

// Note: Trust tier packages for Doctors and Couriers are now managed by Admin through the platform
// These are NOT subscriptions but one-time/monthly fees set by Admin for trusted doctor/courier tiers
// Default trial period is 3 months before Admin activates paid tier

export const MOCK_CHALLENGES: Challenge[] = [
    { 
        id: 'c1', 
        title: '7-Day Hydration Hero', 
        description: 'Drink 3 liters of water daily for a week.', 
        totalDays: 7, 
        currentDay: 3, 
        joined: true, 
        icon: 'droplet',
        rewardPoints: 150,
        category: 'Hydration'
    },
    { 
        id: 'c2', 
        title: 'Morning Walk Streak', 
        description: 'Walk for 20 mins every morning.', 
        totalDays: 30, 
        currentDay: 0, 
        joined: false, 
        icon: 'footprints',
        rewardPoints: 500,
        category: 'Fitness'
    },
    { 
        id: 'c3', 
        title: 'No Sugar Week', 
        description: 'Avoid processed sugar for 7 days.', 
        totalDays: 7, 
        currentDay: 0, 
        joined: false, 
        icon: 'candy-off',
        rewardPoints: 300,
        category: 'Nutrition'
    }
];

export const MOCK_HEALTH_PLANS: HealthPlan[] = [
    {
        id: 'hp1',
        title: 'Hypertension Management',
        description: 'Daily protocols to lower blood pressure naturally.',
        duration: '4 Weeks',
        progress: 45,
        dailyTask: 'Log AM/PM Blood Pressure',
        pointsPerTask: 50,
        completedToday: false,
        category: 'Chronic Care'
    },
];

// Doctors are now fetched from DB, but we keep this for UI fallback/search filter options
export const MOCK_DOCTORS: Doctor[] = [
  { 
    id: '2', 
    name: 'Dr. Sarah Mushi', 
    role: UserRole.DOCTOR, 
    email: 'doctor@nexafya.com', 
    avatar: 'https://picsum.photos/200/200?random=2', 
    location: 'Dar es Salaam', 
    specialty: 'General Practitioner', 
    rating: 4.8, 
    availability: ['Mon', 'Tue', 'Thu'], 
    price: 25000, 
    experience: 8,
    points: 1200
  },
  { 
    id: '3', 
    name: 'Dr. John Doe', 
    role: UserRole.DOCTOR, 
    email: 'john@nexafya.com', 
    avatar: 'https://picsum.photos/200/200?random=5', 
    location: 'Arusha', 
    specialty: 'Cardiologist', 
    rating: 4.9, 
    availability: ['Mon', 'Wed', 'Fri'], 
    price: 45000, 
    experience: 12,
    points: 3200
  }
];

export const MOCK_MEDICINES: Medicine[] = [
  { id: 'm1', name: 'Panadol Extra', description: 'Pain relief for headaches and fever.', price: 5000, image: 'https://picsum.photos/200/200?random=10', inStock: true, category: 'Pain Relief', pharmacyName: 'City Pharmacy' },
  { id: 'm2', name: 'Amoxyl Capsules', description: 'Antibiotic for bacterial infections.', price: 12000, image: 'https://picsum.photos/200/200?random=11', inStock: true, category: 'Antibiotics', pharmacyName: 'Afya Plus Pharmacy' },
  { id: 'm3', name: 'Vitamin C Zinc', description: 'Immune system booster.', price: 15000, image: 'https://picsum.photos/200/200?random=12', inStock: true, category: 'Supplements', pharmacyName: 'City Pharmacy' },
];

export const PHARMACY_PAYMENT_DETAILS: Record<string, { mpesa: string, tigo: string, airtel: string }> = {
    'City Pharmacy': { mpesa: '552211', tigo: '883311', airtel: '112233' },
    'Afya Plus Pharmacy': { mpesa: '667788', tigo: '990011', airtel: '445566' },
};

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Understanding Hypertension in Tanzania',
    excerpt: 'High blood pressure is a silent killer. Learn about the dietary changes...',
    highlights: '• 30% of adults in urban areas are affected.\n• Reduce salt intake.',
    content: 'Full content placeholder regarding Hypertension...',
    authorId: '2',
    authorName: 'Dr. Sarah Mushi',
    authorRole: 'Cardiologist',
    category: 'Heart Health',
    readTime: 5,
    date: 'Oct 24, 2023',
    likes: 124,
    image: 'https://picsum.photos/800/400?random=20',
    isPremium: true,
    price: 2000,
    currency: 'TZS',
    status: 'published'
  },
  {
    id: '2',
    title: 'Malaria Prevention Tips',
    excerpt: 'Simple steps to keep your home mosquito-free.',
    highlights: '• Use treated nets.\n• Clear stagnant water.',
    content: 'Malaria remains a major challenge...',
    authorId: '3',
    authorName: 'Dr. John Doe',
    authorRole: 'General Practitioner',
    category: 'General',
    readTime: 3,
    date: 'Oct 20, 2023',
    likes: 89,
    image: 'https://picsum.photos/800/400?random=21',
    isPremium: false,
    status: 'published'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    doctorName: 'Dr. Sarah Mushi',
    doctorId: '2',
    patientName: 'Juma Baraka',
    date: '2023-10-28',
    time: '10:00 AM',
    status: 'UPCOMING',
    paymentStatus: 'PAID',
    type: 'VIDEO',
    fee: 25000
  },
  {
    id: 'apt-2',
    doctorName: 'Dr. John Doe',
    doctorId: '3',
    patientName: 'Juma Baraka',
    date: '2023-10-15',
    time: '02:00 PM',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    type: 'IN_PERSON',
    fee: 45000
  }
];

export const MOCK_ORDERS = [
    {
        id: 'ord-1023',
        date: '2023-10-24',
        customer: 'Juma Baraka',
        items: 'Panadol Extra x2, Vitamin C',
        total: 25000,
        status: 'Delivered',
        location: 'Mikocheni A'
    },
    {
        id: 'ord-1024',
        date: '2023-10-26',
        customer: 'Juma Baraka',
        items: 'Amoxyl Capsules',
        total: 12000,
        status: 'Dispatched',
        location: 'Mikocheni A'
    }
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'mpesa', provider: 'MPESA', icon: 'M' },
  { id: 'tigo', provider: 'TIGOPESA', icon: 'T' },
  { id: 'airtel', provider: 'AIRTEL', icon: 'A' },
  { id: 'nhif', provider: 'NHIF', icon: 'N' },
];

export const MOCK_HEALTH_RECORDS: HealthRecord[] = [
    { id: 'hr1', type: 'Prescription', title: 'Antibiotics Course', doctor: 'Dr. Sarah Mushi', date: '2023-10-15', fileUrl: '#', status: 'Active' },
    { id: 'hr2', type: 'Lab Result', title: 'Malaria Test (Negative)', doctor: 'City Lab Hub', date: '2023-09-10', fileUrl: '#', status: 'Archived' }
];

export const MOCK_MED_SCHEDULE: MedicationSchedule[] = [
    { id: 'ms1', name: 'Amoxicillin', dosage: '500mg', time: '08:00 AM', taken: true, patientName: 'Juma Baraka' },
];

export const ADMIN_STATS_DATA = [
  { name: 'Mon', revenue: 4000, consultations: 24 },
  { name: 'Tue', revenue: 3000, consultations: 18 },
  { name: 'Wed', revenue: 2000, consultations: 12 },
  { name: 'Thu', revenue: 2780, consultations: 20 },
  { name: 'Fri', revenue: 1890, consultations: 15 },
  { name: 'Sat', revenue: 2390, consultations: 22 },
  { name: 'Sun', revenue: 3490, consultations: 30 },
];

export const PATIENT_VITALS = [
  { label: 'Heart Rate', value: '90 BPM', icon: 'heart' },
  { label: 'Total Weight', value: '65 KG', icon: 'weight' },
  { label: 'Blood Cells', value: '1200 UL', icon: 'blood' },
  { label: 'Calorie Burn', value: '2200 kcal', icon: 'fire' },
];

export const HEALTH_TIPS = [
    { id: 't1', title: 'Daily Health Tips To Strengthen Your Immune System', author: 'Dr. Michael', image: 'https://picsum.photos/200/200?random=50' },
];