
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CHWDashboard } from './components/CHWDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminAnalytics } from './components/AdminAnalytics';
import { UserManagement } from './components/UserManagement';
import { SymptomChecker } from './components/SymptomChecker';
import { Consultations } from './components/Consultations';
import { Pharmacy } from './components/Pharmacy';
import { PharmacyPOS } from './components/PharmacyPOS';
import { PurchaseManagement } from './components/PurchaseManagement';
import { ReportsDashboard } from './components/ReportsDashboard';
import { BatchExpiryTracker } from './components/BatchExpiryTracker';
import { UnitConverter } from './components/UnitConverter';
import { SupplierManagement } from './components/SupplierManagement';
import { InvoiceGenerator } from './components/InvoiceGenerator';
import { StockAlerts } from './components/StockAlerts';
import { MedicationReminderEnhanced } from './components/MedicationReminderEnhanced';
import { HealthAnalytics } from './components/HealthAnalytics';
import { PaymentIntegration } from './components/PaymentIntegration';
import { EPrescription } from './components/EPrescription';
import { FamilyHealthDashboard } from './components/FamilyHealthDashboard';
import { HealthGoals } from './components/HealthGoals';
import { NotificationPreferences } from './components/NotificationPreferences';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { Patients } from './components/Patients';
import { Orders } from './components/Orders';
import { Articles } from './components/Articles';
import { Couriers } from './components/Couriers';
import { VideoCall } from './components/VideoCall';
import { HealthRecords } from './components/HealthRecords';
import { CareCenter } from './components/CareCenter';
import { HealthResources } from './components/HealthResources';
import { Insurance } from './components/Insurance';
import { Messages } from './components/Messages';
import { LandingPage } from './components/LandingPage';
import { ConversationalSymptomChecker } from './components/ConversationalSymptomChecker';
import { EnhancedCalendar } from './components/EnhancedCalendar';
import { AuthorProfile } from './components/AuthorProfile';
import { NotificationProvider, useNotification } from './components/NotificationSystem';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { ErrorBoundary } from './components/ErrorBoundary'; 
import { UserRole, Article, Appointment, HealthRecord, FamilyMember } from './types';
import { MOCK_ARTICLES } from './constants'; 
import { db } from './services/db'; 
import { Loader2 } from 'lucide-react';
import { DriverProfile } from './components/DriverProfile';
import { notificationService } from './services/notificationService';
import { OnboardingTour } from './components/OnboardingTour';
import { handleError } from './utils/errorHandler';
import './style.css'; 

const MainApp: React.FC = () => {
  const { user, loading: authLoading, signOut, updateProfile } = useAuth();
  const { notify } = useNotification();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [currentView, setCurrentView] = useState('dashboard');
  
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
              doctorId: newAppointment.doctorId || newAppointment.doctorName,
              date: newAppointment.date,
              time: newAppointment.time,
              type: newAppointment.type,
              fee: newAppointment.fee
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

  const renderAuthenticatedView = () => {
    switch (currentView) {
      case 'dashboard':
        if (user.role === UserRole.CHW) return <CHWDashboard user={user} />;
        if (user.role === UserRole.ADMIN) return <AdminAnalytics />;
        if (user.role === UserRole.COURIER) return <CourierDashboard user={user} />;
        return <Dashboard 
                  role={user.role} 
                  userName={user.name} 
                  onNavigate={handleNavigate}
                  appointments={appointments}
                  onCancelAppointment={handleCancelAppointment}
                  onRescheduleAppointment={handleRescheduleAppointment}
               />;
      
      case 'care-center':
        return <CareCenter initialTab="ai" onBookAppointment={handleBookAppointment} user={user} />;
      case 'care-center-labs':
        return <CareCenter initialTab="labs" onBookAppointment={handleBookAppointment} user={user} />;
      case 'resources':
        return <HealthResources 
                  user={user} 
                  articles={articles} 
                  setArticles={setArticles} 
                  onNavigate={handleNavigate}
                  onViewDoctor={handleViewDoctor}
                  onViewAuthor={handleViewAuthor}
                  healthRecords={healthRecords}
                  onAddHealthRecord={handleAddHealthRecord}
               />;
      case 'insurance':
        return <Insurance />;
      case 'messages':
        return <Messages user={user} onNavigate={handleNavigate} />;
      case 'symptom-checker':
        return <SymptomChecker />;
      case 'symptom-checker-conversational':
        return <ConversationalSymptomChecker />;
      case 'calendar':
        return <EnhancedCalendar />;
      case 'consultations':
        return <Consultations 
                  role={user.role}
                  initialDoctorId={targetDoctorId} 
                  onBookAppointment={handleBookAppointment}
                  onRescheduleAppointment={handleRescheduleAppointment}
                  onCancelAppointment={handleCancelAppointment}
                  appointments={appointments}
                  userName={user.name}
                  onNavigate={handleNavigate}
               />;
      case 'patients':
        return <Patients onNavigate={handleNavigate} />;
      case 'orders':
        return <Orders user={user} />;
      case 'inventory':
        return <Pharmacy />; 
      case 'couriers':
        return <Couriers onNavigate={handleNavigate} />;
      case 'driver-profile':
        return <DriverProfile user={user} onBack={() => handleNavigate('couriers')} />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <ReportsDashboard />;
      case 'purchases':
        return <PurchaseManagement />;
      case 'batch-expiry':
        return <BatchExpiryTracker />;
      case 'unit-converter':
        return <UnitConverter />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'invoices':
        return <InvoiceGenerator />;
      case 'stock-alerts':
        return <StockAlerts />;
      case 'medication-reminders':
        return <MedicationReminderEnhanced />;
      case 'health-analytics':
        return <HealthAnalytics />;
      case 'payments':
        return <PaymentIntegration />;
      case 'e-prescriptions':
        return <EPrescription />;
      case 'family-health':
        return <FamilyHealthDashboard />;
      case 'health-goals':
        return <HealthGoals />;
      case 'notification-preferences':
        return <NotificationPreferences />;
      case 'map':
        return <CourierDashboard user={user} initialTab="map" />;
      case 'earnings':
        return <CourierDashboard user={user} initialTab="earnings" />;
      case 'records':
        return <HealthRecords records={healthRecords} onAddRecord={handleAddHealthRecord} />;
      case 'articles': 
      case 'manage-articles':
        return <Articles 
                  user={user} 
                  articles={articles} 
                  setArticles={setArticles} 
                  viewMode={currentView === 'manage-articles' ? 'manage' : 'public'} 
                  onNavigate={handleNavigate}
                  onViewDoctor={handleViewDoctor}
                  onViewAuthor={handleViewAuthor}
                  initialArticleId={targetArticleId}
                  initialTab={articleInitialTab}
               />;
      case 'author-profile':
        return targetAuthorId ? (
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
            onBookAppointment={handleBookAppointment}
          />
        ) : null;
      case 'video-call':
        return <VideoCall onEnd={() => handleNavigate('dashboard')} />;
      case 'pharmacy':
        return <Pharmacy />;
      case 'finance':
      case 'profile':
      case 'settings':
        return <Profile 
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
               />;
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
