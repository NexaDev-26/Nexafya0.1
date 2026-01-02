
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
// Lazy load addSampleDoctors to avoid side-effect issues in production
// The function will be registered globally when first imported by a component

// Helper function to create lazy-loaded components with error handling
const createLazyComponent = (importFn: () => Promise<any>) => {
  return lazy(() => 
    importFn().catch((error) => {
      console.error('Failed to load component:', error);
      // Return a fallback component that shows an error
      return {
        default: () => (
          <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-white rounded-2xl shadow-xl p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Component Load Error</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Failed to load this component. Please refresh the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      };
    })
  );
};

// Lazy load heavy components for code splitting with error handling
const CHWDashboard = createLazyComponent(() => import('./components/CHWDashboard').then(m => ({ default: m.CHWDashboard })));
const CourierDashboard = createLazyComponent(() => import('./components/CourierDashboard').then(m => ({ default: m.CourierDashboard })));
const AdminAnalytics = createLazyComponent(() => import('./components/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const UserManagement = createLazyComponent(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const SymptomChecker = createLazyComponent(() => import('./components/SymptomChecker').then(m => ({ default: m.SymptomChecker })));
const Consultations = createLazyComponent(() => import('./components/Consultations').then(m => ({ default: m.Consultations })));
const Pharmacy = createLazyComponent(() => import('./components/Pharmacy').then(m => ({ default: m.Pharmacy })));
const PharmacyPOS = createLazyComponent(() => import('./components/PharmacyPOS').then(m => ({ default: m.PharmacyPOS })));
const PurchaseManagement = createLazyComponent(() => import('./components/PurchaseManagement').then(m => ({ default: m.PurchaseManagement })));
const ReportsDashboard = createLazyComponent(() => import('./components/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const BatchExpiryTracker = createLazyComponent(() => import('./components/BatchExpiryTracker').then(m => ({ default: m.BatchExpiryTracker })));
const UnitConverter = createLazyComponent(() => import('./components/UnitConverter').then(m => ({ default: m.UnitConverter })));
const SupplierManagement = createLazyComponent(() => import('./components/SupplierManagement').then(m => ({ default: m.SupplierManagement })));
const InvoiceGenerator = createLazyComponent(() => import('./components/InvoiceGenerator').then(m => ({ default: m.InvoiceGenerator })));
const StockAlerts = createLazyComponent(() => import('./components/StockAlerts').then(m => ({ default: m.StockAlerts })));
const MedicationReminderEnhanced = createLazyComponent(() => import('./components/MedicationReminderEnhanced').then(m => ({ default: m.MedicationReminderEnhanced })));
const HealthAnalytics = createLazyComponent(() => import('./components/HealthAnalytics').then(m => ({ default: m.HealthAnalytics })));
const PaymentIntegration = createLazyComponent(() => import('./components/PaymentIntegration').then(m => ({ default: m.PaymentIntegration })));
const EPrescription = createLazyComponent(() => import('./components/EPrescription').then(m => ({ default: m.EPrescription })));
const FamilyHealthDashboard = createLazyComponent(() => import('./components/FamilyHealthDashboard').then(m => ({ default: m.FamilyHealthDashboard })));
const HealthGoals = createLazyComponent(() => import('./components/HealthGoals').then(m => ({ default: m.HealthGoals })));
const NotificationPreferences = createLazyComponent(() => import('./components/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const Profile = createLazyComponent(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const Patients = createLazyComponent(() => import('./components/Patients').then(m => ({ default: m.Patients })));
const Orders = createLazyComponent(() => import('./components/Orders').then(m => ({ default: m.Orders })));
const Articles = createLazyComponent(() => import('./components/Articles').then(m => ({ default: m.Articles })));
const Couriers = createLazyComponent(() => import('./components/Couriers').then(m => ({ default: m.Couriers })));
const VideoCall = createLazyComponent(() => import('./components/VideoCall').then(m => ({ default: m.VideoCall })));
const HealthRecords = createLazyComponent(() => import('./components/HealthRecords').then(m => ({ default: m.HealthRecords })));
const CareCenter = createLazyComponent(() => import('./components/CareCenter').then(m => ({ default: m.CareCenter })));
const HealthResources = createLazyComponent(() => import('./components/HealthResources').then(m => ({ default: m.HealthResources })));
const Insurance = createLazyComponent(() => import('./components/Insurance').then(m => ({ default: m.Insurance })));
const Messages = createLazyComponent(() => import('./components/Messages').then(m => ({ default: m.Messages })));
const ConversationalSymptomChecker = createLazyComponent(() => import('./components/ConversationalSymptomChecker').then(m => ({ default: m.ConversationalSymptomChecker })));
const EnhancedCalendar = createLazyComponent(() => import('./components/EnhancedCalendar').then(m => ({ default: m.EnhancedCalendar })));
const AuthorProfile = createLazyComponent(() => import('./components/AuthorProfile').then(m => ({ default: m.AuthorProfile })));
import { NotificationProvider, useNotification } from './components/NotificationSystem';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackToTop } from './components/BackToTop'; 
import { UserRole, Article, Appointment, HealthRecord, FamilyMember } from './types';
import { MOCK_ARTICLES } from './constants'; 
import { db } from './services/db'; 
import { Loader2 } from 'lucide-react';
import { DriverProfile } from './components/DriverProfile';
import { notificationService } from './services/notificationService';
import { OnboardingTour } from './components/OnboardingTour';
import { handleError } from './utils/errorHandler';
// Ensure Firebase is initialized first before any components load
import { db as firestore, auth } from './lib/firebase';

// Store Firebase references globally - use async getters to avoid production build issues
if (typeof window !== 'undefined') {
  // Store as async functions to ensure they work in production builds
  (window as any).__firebaseFunctions = {
    async getCollection() {
      const { collection } = await import('firebase/firestore');
      return collection;
    },
    async getQuery() {
      const { query } = await import('firebase/firestore');
      return query;
    },
    async getWhere() {
      const { where } = await import('firebase/firestore');
      return where;
    },
    async getOnSnapshot() {
      const { onSnapshot } = await import('firebase/firestore');
      return onSnapshot;
    },
    firestore,
    auth,
    // Helper to get all functions at once
    async getFunctions() {
      const { collection, query, where, onSnapshot } = await import('firebase/firestore');
      return { collection, query, where, onSnapshot, firestore, auth };
    }
  };
}

import './index.css'; 

const MainApp: React.FC = () => {
  const { user, loading: authLoading, signOut, updateProfile } = useAuth();
  const { notify } = useNotification();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  // For PATIENT role on mobile, default to 'resources' (Health Hub) instead of 'dashboard'
  const getInitialView = () => {
    // Safe window access for production builds
    if (typeof window !== 'undefined' && window.innerWidth && user?.role === UserRole.PATIENT) {
      const isMobile = window.innerWidth < 768; // Mobile breakpoint
      if (isMobile) {
        return 'resources';
      }
    }
    return 'dashboard';
  };
  
  const [currentView, setCurrentView] = useState(() => {
    // Initialize safely
    try {
      return getInitialView();
    } catch (error) {
      console.warn('Error getting initial view:', error);
      return 'dashboard';
    }
  });
  
  // Update view when user loads and is PATIENT on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth && user && user.role === UserRole.PATIENT) {
      const isMobile = window.innerWidth < 768;
      if (isMobile && currentView === 'dashboard') {
        setCurrentView('resources');
      }
    }
  }, [user, currentView]);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [targetDoctorId, setTargetDoctorId] = useState<string | null>(null);
  const [targetArticleId, setTargetArticleId] = useState<string | null>(null);
  const [targetAuthorId, setTargetAuthorId] = useState<string | null>(null);
  const [articleInitialTab, setArticleInitialTab] = useState<'feed' | 'editor' | 'read' | 'preview'>('feed');

  // --- REAL GLOBAL STATE ---
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 1. Fetch Real Data when User Authenticates
  useEffect(() => {
    if (user?.id) {
        const loadData = async () => {
            try {
                const apts = await db.getAppointments(user.id, user.role);
                setAppointments(apts);

                const realArticles = await db.getArticles();
                if(realArticles.length > 0) setArticles(realArticles);

                if (user.role === UserRole.PATIENT) {
                    const records = await db.getHealthRecords(user.id);
                    setHealthRecords(records);
                }
            } catch (e) {
                handleError(e, notify);
            }
        };
        loadData();
    }
  }, [user?.id, user?.role]); 

  useEffect(() => {
      const savedMembers = localStorage.getItem('nexa_family_members');
      if (savedMembers) {
          try {
              setFamilyMembers(JSON.parse(savedMembers));
          } catch (e) {
              console.error("Failed to load family members", e);
          }
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('nexa_family_members', JSON.stringify(familyMembers));
  }, [familyMembers]);

  // Initialize notifications
  useEffect(() => {
    if (user?.id) {
      // Initialize FCM for push notifications
      notificationService.initializeMessaging().catch(error => {
        console.warn('FCM initialization failed:', error);
      });
      
      // Check if onboarding needed
      const hasCompletedOnboarding = localStorage.getItem(`nexafya_onboarding_${user.role}`);
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user?.id, user?.role]);

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    setCurrentView('dashboard');
  };

  const handleSwitchProfile = (name: string, relation: string) => {
      notify(`Switched profile to ${name} (${relation})`, 'success');
  };

  const handleUpdateUser = (updates: any) => {
      updateProfile(updates);
  };

  const handleAddFamilyMember = (newMember: Omit<FamilyMember, 'id' | 'avatar'>) => {
      const avatarUrl = `https://ui-avatars.com/api/?name=${newMember.name}&background=random`;
      const member: FamilyMember = {
          id: Date.now().toString(),
          avatar: avatarUrl,
          ...newMember
      };
      setFamilyMembers(prev => [...prev, member]);
  };

  const handleRemoveFamilyMember = (id: string) => {
      setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleViewDoctor = (doctorId: string) => {
      setTargetDoctorId(doctorId);
      setCurrentView('consultations');
  };

  const handleViewAuthor = (authorId: string) => {
      setTargetAuthorId(authorId);
      setCurrentView('author-profile');
  };

  const handleViewArticle = (articleId: string) => {
      setTargetArticleId(articleId);
      handleNavigate('articles', 'read');
  };

  const handleNavigate = (view: string, tab?: any) => {
      if (view === 'manage-articles' || view === 'articles') {
          setArticleInitialTab(tab || (view === 'manage-articles' ? 'feed' : 'feed'));
      }
      setCurrentView(view);
  };

  const handleBookAppointment = async (newAppointment: Appointment) => {
      try {
          await db.createAppointment({
              patientId: user?.id,
              doctorId: newAppointment.doctorId,
              patientName: newAppointment.patientName || user?.name,
              doctorName: newAppointment.doctorName,
              date: newAppointment.date,
              time: newAppointment.time,
              type: newAppointment.type,
              fee: newAppointment.fee,
              location: newAppointment.location
          });
          
          if (user) {
              const apts = await db.getAppointments(user.id, user.role);
              setAppointments(apts);
          }
          notify("Appointment booked successfully!", "success");
      } catch (e) {
          handleError(e, notify);
      }
  };

  const handleBookAppointmentByDoctorId = (doctorId: string) => {
      setTargetDoctorId(doctorId);
      handleNavigate('consultations');
  };

  const handleCancelAppointment = async (id: string) => {
      try {
          await db.updateAppointmentStatus(id, 'CANCELLED');
          setAppointments(prev => prev.filter(a => a.id !== id));
          notify("Appointment cancelled.", "info");
      } catch (e) {
          handleError(e, notify);
      }
  };

  const handleRescheduleAppointment = async (id: string, newDate: string, newTime: string) => {
      setAppointments(prev => prev.map(a => 
          a.id === id ? { ...a, date: newDate, time: newTime, status: 'UPCOMING' } : a
      ));
  };

  const handleAddHealthRecord = (record: HealthRecord) => {
      setHealthRecords(prev => [record, ...prev]);
  };

  // If we are actively checking the session, show the splash loader
  if (authLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
              <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-500 font-bold text-sm tracking-widest uppercase animate-pulse">NexaFya is syncing...</p>
              </div>
          </div>
      );
  }

  // If no user is present after loading, show the landing page
  if (!user) {
      return (
          <>
              <LandingPage onGetStarted={() => setShowAuthModal(true)} />
              {showAuthModal && <Login onLogin={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
          </>
      );
  }

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 font-bold text-sm tracking-widest uppercase animate-pulse">Loading...</p>
      </div>
    </div>
  );

  // Error fallback for lazy-loaded components
  const LazyErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-white rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load Component</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={retry}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderAuthenticatedView = () => {
    switch (currentView) {
      case 'dashboard':
        if (user.role === UserRole.CHW) {
          return <Suspense fallback={<LoadingFallback />}><CHWDashboard user={user} /></Suspense>;
        }
        if (user.role === UserRole.ADMIN) {
          return <Suspense fallback={<LoadingFallback />}><AdminAnalytics /></Suspense>;
        }
        if (user.role === UserRole.COURIER) {
          return <Suspense fallback={<LoadingFallback />}><CourierDashboard user={user} /></Suspense>;
        }
        return <Dashboard 
                  role={user.role} 
                  userName={user.name} 
                  onNavigate={handleNavigate}
                  appointments={appointments}
                  onCancelAppointment={handleCancelAppointment}
                  onRescheduleAppointment={handleRescheduleAppointment}
               />;
      
      case 'care-center':
        return <Suspense fallback={<LoadingFallback />}><CareCenter initialTab="ai" onBookAppointment={handleBookAppointment} user={user} /></Suspense>;
      case 'care-center-labs':
        return <Suspense fallback={<LoadingFallback />}><CareCenter initialTab="labs" onBookAppointment={handleBookAppointment} user={user} /></Suspense>;
      case 'resources':
        return <Suspense fallback={<LoadingFallback />}><HealthResources 
                  user={user} 
                  articles={articles} 
                  setArticles={setArticles} 
                  onNavigate={handleNavigate}
                  onViewDoctor={handleViewDoctor}
                  onViewAuthor={handleViewAuthor}
                  healthRecords={healthRecords}
                  onAddHealthRecord={handleAddHealthRecord}
               /></Suspense>;
      case 'insurance':
        return <Suspense fallback={<LoadingFallback />}><Insurance /></Suspense>;
      case 'messages':
        return <Suspense fallback={<LoadingFallback />}><Messages user={user} onNavigate={handleNavigate} /></Suspense>;
      case 'symptom-checker':
        return <Suspense fallback={<LoadingFallback />}><SymptomChecker /></Suspense>;
      case 'symptom-checker-conversational':
        return <Suspense fallback={<LoadingFallback />}><ConversationalSymptomChecker /></Suspense>;
      case 'calendar':
        return <Suspense fallback={<LoadingFallback />}><EnhancedCalendar /></Suspense>;
      case 'consultations':
        return <Suspense fallback={<LoadingFallback />}><Consultations 
                  role={user.role}
                  initialDoctorId={targetDoctorId} 
                  onBookAppointment={handleBookAppointment}
                  onRescheduleAppointment={handleRescheduleAppointment}
                  onCancelAppointment={handleCancelAppointment}
                  appointments={appointments}
                  userName={user.name}
                  onNavigate={handleNavigate}
               /></Suspense>;
      case 'patients':
        return <Suspense fallback={<LoadingFallback />}><Patients onNavigate={handleNavigate} /></Suspense>;
      case 'orders':
        return <Suspense fallback={<LoadingFallback />}><Orders user={user} onNavigate={handleNavigate} /></Suspense>;
      case 'inventory':
        return <Suspense fallback={<LoadingFallback />}><Pharmacy /></Suspense>; 
      case 'couriers':
        return <Suspense fallback={<LoadingFallback />}><Couriers onNavigate={handleNavigate} /></Suspense>;
      case 'driver-profile':
        return <DriverProfile user={user} onBack={() => handleNavigate('couriers')} />;
      case 'users':
        return <Suspense fallback={<LoadingFallback />}><UserManagement /></Suspense>;
      case 'reports':
        return <Suspense fallback={<LoadingFallback />}><ReportsDashboard /></Suspense>;
      case 'purchases':
        return <Suspense fallback={<LoadingFallback />}><PurchaseManagement /></Suspense>;
      case 'batch-expiry':
        return <Suspense fallback={<LoadingFallback />}><BatchExpiryTracker /></Suspense>;
      case 'unit-converter':
        return <Suspense fallback={<LoadingFallback />}><UnitConverter /></Suspense>;
      case 'suppliers':
        return <Suspense fallback={<LoadingFallback />}><SupplierManagement /></Suspense>;
      case 'invoices':
        return <Suspense fallback={<LoadingFallback />}><InvoiceGenerator /></Suspense>;
      case 'stock-alerts':
        return <Suspense fallback={<LoadingFallback />}><StockAlerts /></Suspense>;
      case 'medication-reminders':
        return <Suspense fallback={<LoadingFallback />}><MedicationReminderEnhanced /></Suspense>;
      case 'health-analytics':
        return <Suspense fallback={<LoadingFallback />}><HealthAnalytics /></Suspense>;
      case 'payments':
        return <Suspense fallback={<LoadingFallback />}><PaymentIntegration /></Suspense>;
      case 'e-prescriptions':
        return <Suspense fallback={<LoadingFallback />}><EPrescription /></Suspense>;
      case 'family-health':
        return <Suspense fallback={<LoadingFallback />}><FamilyHealthDashboard /></Suspense>;
      case 'health-goals':
        return <Suspense fallback={<LoadingFallback />}><HealthGoals /></Suspense>;
      case 'notification-preferences':
        return <Suspense fallback={<LoadingFallback />}><NotificationPreferences /></Suspense>;
      case 'map':
        return <Suspense fallback={<LoadingFallback />}><CourierDashboard user={user} initialTab="map" /></Suspense>;
      case 'earnings':
        return <Suspense fallback={<LoadingFallback />}><CourierDashboard user={user} initialTab="earnings" /></Suspense>;
      case 'records':
        return <Suspense fallback={<LoadingFallback />}><HealthRecords records={healthRecords} onAddRecord={handleAddHealthRecord} /></Suspense>;
      case 'articles': 
      case 'manage-articles':
        return <Suspense fallback={<LoadingFallback />}><Articles 
                  user={user} 
                  articles={articles} 
                  setArticles={setArticles} 
                  viewMode={currentView === 'manage-articles' ? 'manage' : 'public'} 
                  onNavigate={handleNavigate}
                  onViewDoctor={handleViewDoctor}
                  onViewAuthor={handleViewAuthor}
                  initialArticleId={targetArticleId}
                  initialTab={articleInitialTab}
               /></Suspense>;
      case 'author-profile':
        return targetAuthorId ? (
          <Suspense fallback={<LoadingFallback />}>
            <AuthorProfile
              authorId={targetAuthorId}
              user={user}
              articles={articles}
              onBack={() => {
                // For couriers, go back to articles, for others go to resources
                if (user.role === UserRole.COURIER) {
                  handleNavigate('articles');
                } else {
                  handleNavigate('resources');
                }
              }}
              onNavigate={handleNavigate}
              onBookAppointment={handleBookAppointmentByDoctorId}
            />
          </Suspense>
        ) : null;
      case 'video-call':
        return <Suspense fallback={<LoadingFallback />}><VideoCall onEnd={() => handleNavigate('dashboard')} /></Suspense>;
      case 'pharmacy':
        return <Suspense fallback={<LoadingFallback />}><Pharmacy /></Suspense>;
      case 'finance':
      case 'profile':
      case 'settings':
        return <Suspense fallback={<LoadingFallback />}><Profile 
                  user={user} 
                  onLogout={signOut} 
                  articles={articles} 
                  onNavigate={handleNavigate} 
                  onViewArticle={handleViewArticle}
                  familyMembers={familyMembers}
                  onAddFamilyMember={handleAddFamilyMember}
                  onRemoveFamilyMember={handleRemoveFamilyMember}
                  onUpdateUser={handleUpdateUser}
                  initialTab={currentView === 'finance' ? 'finance' : currentView === 'settings' ? 'settings' : 'overview'} 
               /></Suspense>;
      default:
        return <Dashboard role={user.role} userName={user.name} onNavigate={handleNavigate} appointments={appointments} />;
    }
  };

  return (
    <div className="transition-colors duration-300">
      <Layout 
        user={user} 
        role={user.role} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleTheme={toggleDarkMode}
        onLogout={signOut}
        onSwitchProfile={handleSwitchProfile}
        familyMembers={familyMembers}
        onAddFamilyMember={handleAddFamilyMember}
      >
        {renderAuthenticatedView()}
      </Layout>
      <BackToTop />
      
      {/* Onboarding Tour */}
      {showOnboarding && user && (
        <OnboardingTour
          role={user.role}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

const App = () => {
  try {
    return (
      <ErrorBoundary>
        <DarkModeProvider>
          <NotificationProvider>
            <AuthProvider>
              <PreferencesProvider>
                <MainApp />
              </PreferencesProvider>
            </AuthProvider>
          </NotificationProvider>
        </DarkModeProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A1B2E] p-4">
          <div className="max-w-md w-full bg-white dark:bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Initialization Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Failed to initialize the application. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }
};

// Initialize app only in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const container = document.getElementById('root');
  if (!container) {
    // Fallback if root container doesn't exist
    const fallbackDiv = document.createElement('div');
    fallbackDiv.id = 'root';
    fallbackDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;';
    fallbackDiv.innerHTML = `
      <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">Root Container Not Found</h1>
      <p style="color: #6b7280;">Make sure index.html has a &lt;div id="root"&gt;&lt;/div&gt; element.</p>
    `;
    document.body.appendChild(fallbackDiv);
    throw new Error('Root container not found. Make sure index.html has a <div id="root"></div> element.');
  }

  // Prevent multiple root creation during HMR
  let root = (container as any)._reactRootContainer;
  if (!root) {
    try {
      root = createRoot(container);
      (container as any)._reactRootContainer = root;
    } catch (error) {
      console.error('Failed to create React root:', error);
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;">
          <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">Failed to Initialize React</h1>
          <p style="color: #6b7280;">Please refresh the page or check the browser console for details.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
            Reload Page
          </button>
        </div>
      `;
      throw error;
    }
  }

  try {
    root.render(<App />);
  } catch (error) {
    console.error('Failed to render app:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;">
        <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">Rendering Error</h1>
        <p style="color: #6b7280;">${errorMessage}</p>
        <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Reload Page
        </button>
      </div>
    `;
  }
}
