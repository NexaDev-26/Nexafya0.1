/**
 * Comprehensive i18n (Internationalization) System for NexaFya
 * Supports English (en) and Swahili (sw)
 */

export type Language = 'en' | 'sw';

export interface Translations {
  // Navigation
  dashboard: string;
  careCenter: string;
  consultations: string;
  pharmacy: string;
  health: string;
  profile: string;
  settings: string;
  logout: string;
  
  // Common Actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  view: string;
  search: string;
  filter: string;
  close: string;
  confirm: string;
  back: string;
  next: string;
  previous: string;
  
  // Patient Dashboard
  upcomingAppointments: string;
  aiSymptomChecker: string;
  medicalLibrary: string;
  healthRecords: string;
  orderMedicine: string;
  bookAppointment: string;
  viewDoctors: string;
  
  // Doctor Dashboard
  todaysSchedule: string;
  patientRecords: string;
  consultationRoom: string;
  issuePrescription: string;
  manageArticles: string;
  earnings: string;
  
  // Pharmacy Dashboard
  inventory: string;
  orders: string;
  sales: string;
  addBranch: string;
  lowStock: string;
  
  // Courier Dashboard
  deliveries: string;
  routeMap: string;
  deliveryStatus: string;
  courierEarnings: string;
  
  // Admin Dashboard
  revenue: string;
  analytics: string;
  userManagement: string;
  systemSettings: string;
  
  // Payment
  payment: string;
  paymentMethod: string;
  selectPaymentMethod: string;
  mpesa: string;
  tigoPesa: string;
  airtelMoney: string;
  bankTransfer: string;
  creditCard: string;
  paypal: string;
  stripe: string;
  lipanamba: string;
  phoneNumber: string;
  referenceNumber: string;
  paymentSuccess: string;
  paymentFailed: string;
  
  // NHIF
  nhif: string;
  nhifStatus: string;
  nhifBenefits: string;
  verifyNHIF: string;
  
  // USSD
  ussdFallback: string;
  dialCode: string;
  featurePhone: string;
  
  // Notifications
  notifications: string;
  newMessage: string;
  appointmentReminder: string;
  medicationReminder: string;
  
  // Health
  medicationTracker: string;
  healthMetrics: string;
  vitals: string;
  prescriptions: string;
  schedules: string;
  upcoming: string;
  statistics: string;
  
  // General
  loading: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  noData: string;
  welcome: string;
  hello: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    careCenter: 'Care Center',
    consultations: 'Consultations',
    pharmacy: 'Pharmacy',
    health: 'Health',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log Out',
    
    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    // Patient Dashboard
    upcomingAppointments: 'Upcoming Appointments',
    aiSymptomChecker: 'AI Symptom Checker',
    medicalLibrary: 'Medical Library',
    healthRecords: 'Health Records',
    orderMedicine: 'Order Medicine',
    bookAppointment: 'Book Appointment',
    viewDoctors: 'View Doctors',
    
    // Doctor Dashboard
    todaysSchedule: "Today's Schedule",
    patientRecords: 'Patient Records',
    consultationRoom: 'Consultation Room',
    issuePrescription: 'Issue Prescription',
    manageArticles: 'Manage Articles',
    earnings: 'Earnings',
    
    // Pharmacy Dashboard
    inventory: 'Inventory',
    orders: 'Orders',
    sales: 'Sales',
    addBranch: 'Add Branch',
    lowStock: 'Low Stock',
    
    // Courier Dashboard
    deliveries: 'Deliveries',
    routeMap: 'Route Map',
    deliveryStatus: 'Delivery Status',
    courierEarnings: 'Earnings',
    
    // Admin Dashboard
    revenue: 'Revenue',
    analytics: 'Analytics',
    userManagement: 'User Management',
    systemSettings: 'System Settings',
    
    // Payment
    payment: 'Payment',
    paymentMethod: 'Payment Method',
    selectPaymentMethod: 'Select Payment Method',
    mpesa: 'M-Pesa',
    tigoPesa: 'Tigo Pesa',
    airtelMoney: 'Airtel Money',
    bankTransfer: 'Bank Transfer',
    creditCard: 'Credit/Debit Card',
    paypal: 'PayPal',
    stripe: 'Stripe',
    lipanamba: 'Lipanamba',
    phoneNumber: 'Phone Number',
    referenceNumber: 'Reference Number',
    paymentSuccess: 'Payment Successful',
    paymentFailed: 'Payment Failed',
    
    // NHIF
    nhif: 'NHIF',
    nhifStatus: 'NHIF Status',
    nhifBenefits: 'NHIF Benefits',
    verifyNHIF: 'Verify NHIF',
    
    // USSD
    ussdFallback: 'USSD Fallback',
    dialCode: 'Dial *150*60#',
    featurePhone: 'Feature Phone Access',
    
    // Notifications
    notifications: 'Notifications',
    newMessage: 'New Message',
    appointmentReminder: 'Appointment Reminder',
    medicationReminder: 'Medication Reminder',
    
    // Health
    medicationTracker: 'Medication Tracker',
    healthMetrics: 'Health Metrics',
    vitals: 'Vitals',
    prescriptions: 'Prescriptions',
    schedules: 'Schedules',
    upcoming: 'Upcoming',
    statistics: 'Statistics',
    
    // General
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    noData: 'No data available',
    welcome: 'Welcome',
    hello: 'Hello',
  },
  sw: {
    // Navigation
    dashboard: 'Dashibodi',
    careCenter: 'Kituo cha Huduma',
    consultations: 'Mashauriano',
    pharmacy: 'Duka la Dawa',
    health: 'Afya',
    profile: 'Wasifu',
    settings: 'Mipangilio',
    logout: 'Ondoka',
    
    // Common Actions
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    view: 'Angalia',
    search: 'Tafuta',
    filter: 'Chuja',
    close: 'Funga',
    confirm: 'Thibitisha',
    back: 'Rudi',
    next: 'Ifuatayo',
    previous: 'Iliyotangulia',
    
    // Patient Dashboard
    upcomingAppointments: 'Miadi Inayokuja',
    aiSymptomChecker: 'Kichunguzi cha Dalili cha AI',
    medicalLibrary: 'Maktaba ya Matibabu',
    healthRecords: 'Rekodi za Afya',
    orderMedicine: 'Agiza Dawa',
    bookAppointment: 'Panga Miadi',
    viewDoctors: 'Angalia Madaktari',
    
    // Doctor Dashboard
    todaysSchedule: 'Ratiba ya Leo',
    patientRecords: 'Rekodi za Wagonjwa',
    consultationRoom: 'Chumba cha Mashauriano',
    issuePrescription: 'Toa Dawa',
    manageArticles: 'Simamia Makala',
    earnings: 'Mapato',
    
    // Pharmacy Dashboard
    inventory: 'Hifadhi',
    orders: 'Maagizo',
    sales: 'Mauzo',
    addBranch: 'Ongeza Tawi',
    lowStock: 'Hifadhi Ndogo',
    
    // Courier Dashboard
    deliveries: 'Uwasilishaji',
    routeMap: 'Ramani ya Njia',
    deliveryStatus: 'Hali ya Uwasilishaji',
    courierEarnings: 'Mapato',
    
    // Admin Dashboard
    revenue: 'Mapato',
    analytics: 'Uchambuzi',
    userManagement: 'Usimamizi wa Watumiaji',
    systemSettings: 'Mipangilio ya Mfumo',
    
    // Payment
    payment: 'Malipo',
    paymentMethod: 'Njia ya Malipo',
    selectPaymentMethod: 'Chagua Njia ya Malipo',
    mpesa: 'M-Pesa',
    tigoPesa: 'Tigo Pesa',
    airtelMoney: 'Airtel Money',
    bankTransfer: 'Uhamisho wa Benki',
    creditCard: 'Kadi ya Mkopo',
    paypal: 'PayPal',
    stripe: 'Stripe',
    lipanamba: 'Lipanamba',
    phoneNumber: 'Nambari ya Simu',
    referenceNumber: 'Nambari ya Rejea',
    paymentSuccess: 'Malipo Yamefanikiwa',
    paymentFailed: 'Malipo Yameshindwa',
    
    // NHIF
    nhif: 'NHIF',
    nhifStatus: 'Hali ya NHIF',
    nhifBenefits: 'Faida za NHIF',
    verifyNHIF: 'Thibitisha NHIF',
    
    // USSD
    ussdFallback: 'USSD',
    dialCode: 'Piga *150*60#',
    featurePhone: 'Ufikiaji wa Simu ya Kawaida',
    
    // Notifications
    notifications: 'Arifa',
    newMessage: 'Ujumbe Mpya',
    appointmentReminder: 'Kikumbusho cha Miadi',
    medicationReminder: 'Kikumbusho cha Dawa',
    
    // Health
    medicationTracker: 'Kifuatiliaji cha Dawa',
    healthMetrics: 'Vipimo vya Afya',
    vitals: 'Vipimo Muhimu',
    prescriptions: 'Dawa',
    schedules: 'Ratiba',
    upcoming: 'Zinazokuja',
    statistics: 'Takwimu',
    
    // General
    loading: 'Inapakia...',
    error: 'Hitilafu',
    success: 'Mafanikio',
    warning: 'Onyo',
    info: 'Taarifa',
    noData: 'Hakuna data',
    welcome: 'Karibu',
    hello: 'Hujambo',
  },
};

export const getTranslation = (lang: Language, key: keyof Translations): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};

export const t = (lang: Language) => (key: keyof Translations): string => {
  return getTranslation(lang, key);
};

export default translations;

