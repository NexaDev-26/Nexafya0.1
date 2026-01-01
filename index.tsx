
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
// Import addSampleDoctors utility to make it available globally
import './utils/addSampleDoctors';

// Lazy load heavy components for code splitting
const CHWDashboard = lazy(() => import('./components/CHWDashboard').then(m => ({ default: m.CHWDashboard })));
const CourierDashboard = lazy(() => import('./components/CourierDashboard').then(m => ({ default: m.CourierDashboard })));
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const SymptomChecker = lazy(() => import('./components/SymptomChecker').then(m => ({ default: m.SymptomChecker })));
const Consultations = lazy(() => import('./components/Consultations').then(m => ({ default: m.Consultations })));
const Pharmacy = lazy(() => import('./components/Pharmacy').then(m => ({ default: m.Pharmacy })));
const PharmacyPOS = lazy(() => import('./components/PharmacyPOS').then(m => ({ default: m.PharmacyPOS })));
const PurchaseManagement = lazy(() => import('./components/PurchaseManagement').then(m => ({ default: m.PurchaseManagement })));
const ReportsDashboard = lazy(() => import('./components/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const BatchExpiryTracker = lazy(() => import('./components/BatchExpiryTracker').then(m => ({ default: m.BatchExpiryTracker })));
const UnitConverter = lazy(() => import('./components/UnitConverter').then(m => ({ default: m.UnitConverter })));
const SupplierManagement = lazy(() => import('./components/SupplierManagement').then(m => ({ default: m.SupplierManagement })));
const InvoiceGenerator = lazy(() => import('./components/InvoiceGenerator').then(m => ({ default: m.InvoiceGenerator })));
const StockAlerts = lazy(() => import('./components/StockAlerts').then(m => ({ default: m.StockAlerts })));
const MedicationReminderEnhanced = lazy(() => import('./components/MedicationReminderEnhanced').then(m => ({ default: m.MedicationReminderEnhanced })));
const HealthAnalytics = lazy(() => import('./components/HealthAnalytics').then(m => ({ default: m.HealthAnalytics })));
const PaymentIntegration = lazy(() => import('./components/PaymentIntegration').then(m => ({ default: m.PaymentIntegration })));
const EPrescription = lazy(() => import('./components/EPrescription').then(m => ({ default: m.EPrescription })));
const FamilyHealthDashboard = lazy(() => import('./components/FamilyHealthDashboard').then(m => ({ default: m.FamilyHealthDashboard })));
const HealthGoals = lazy(() => import('./components/HealthGoals').then(m => ({ default: m.HealthGoals })));
const NotificationPreferences = lazy(() => import('./components/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const Patients = lazy(() => import('./components/Patients').then(m => ({ default: m.Patients })));
const Orders = lazy(() => import('./components/Orders').then(m => ({ default: m.Orders })));
const Articles = lazy(() => import('./components/Articles').then(m => ({ default: m.Articles })));
const Couriers = lazy(() => import('./components/Couriers').then(m => ({ default: m.Couriers })));
const VideoCall = lazy(() => import('./components/VideoCall').then(m => ({ default: m.VideoCall })));
const HealthRecords = lazy(() => import('./components/HealthRecords').then(m => ({ default: m.HealthRecords })));
const CareCenter = lazy(() => import('./components/CareCenter').then(m => ({ default: m.CareCenter })));
const HealthResources = lazy(() => import('./components/HealthResources').then(m => ({ default: m.HealthResources })));
const Insurance = lazy(() => import('./components/Insurance').then(m => ({ default: m.Insurance })));
const Messages = lazy(() => import('./components/Messages').then(m => ({ default: m.Messages })));
const ConversationalSymptomChecker = lazy(() => import('./components/ConversationalSymptomChecker').then(m => ({ default: m.ConversationalSymptomChecker })));
const EnhancedCalendar = lazy(() => import('./components/EnhancedCalendar').then(m => ({ default: m.EnhancedCalendar })));
const AuthorProfile = lazy(() => import('./components/AuthorProfile').then(m => ({ default: m.AuthorProfile })));
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
import './index.css'; 

const MainApp: React.FC = () => {
  const { user, loading: authLoading, signOut, updateProfile } = useAuth();
  const { notify } = useNotification();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  // For PATIENT role on mobile, default to 'resources' (Health Hub) instead of 'dashboard'
  const getInitialView = () => {
    if (typeof window !== 'undefined' && user?.role === UserRole.PATIENT) {
      const isMobile = window.innerWidth < 768; // Mobile breakpoint
      if (isMobile) {
        return 'resources';
      }
    }
    return 'dashboard';
  };
  
  const [currentView, setCurrentView] = useState(() => getInitialView());
  
  // Update view when user loads and is PATIENT on mobile
  useEffect(() => {
    if (user && user.role === UserRole.PATIENT) {
      const isMobile = window.innerWidth < 768;
      if (isMobile && currentView === 'dashboard') {
        setCurrentView('resources');
      }
    }
  }, [user]);
  
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

const App = () => (
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

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

// Prevent multiple root creation during HMR
let root = (container as any)._reactRootContainer;
if (!root) {
  root = createRoot(container);
  (container as any)._reactRootContainer = root;
}

root.render(<App />);
