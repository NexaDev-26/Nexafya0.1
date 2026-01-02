
import React, { useState, useEffect } from 'react';
import { UserRole, Appointment, Challenge, HealthPlan } from '../types';
import { Calendar, Video, Users, Wallet, Bot, ShoppingBag, Shield, FileText, Pill, Activity, Trophy, Flame, Droplet, Dumbbell, Utensils, CheckCircle, AlertOctagon, PenTool, AlertTriangle, PhoneCall, MapPin, Clock, CheckSquare, Camera, Ambulance, Flame as Fire, ShieldAlert, Plus, Package } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { MOCK_CHALLENGES, MOCK_HEALTH_PLANS, MOCK_MEDICINES } from '../constants';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
// Firebase Firestore imports - must be imported explicitly for production builds
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

// Ensure Firebase functions are available (defensive check for production builds)
if (typeof window !== 'undefined' && (!collection || !query || !where || !onSnapshot)) {
  console.error('Firebase Firestore functions not properly imported');
}
import { VitalsScanner } from './VitalsScanner';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface DashboardProps {
  role: UserRole;
  userName: string;
  onNavigate: (view: string, tab?: any) => void;
  appointments?: Appointment[]; 
  onCancelAppointment?: (id: string) => void;
  onRescheduleAppointment?: (id: string, date: string, time: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    role, 
    userName, 
    onNavigate, 
    appointments = [], 
}) => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecentOrders, setLoadingRecentOrders] = useState(false); 
  const { notify } = useNotification();
  const { isDarkMode } = useDarkMode();
  const [greeting, setGreeting] = useState('Hello');
  const [userPoints, setUserPoints] = useState(user?.points || 0);

  // Doctor analytics
  const [doctorArticleViews, setDoctorArticleViews] = useState<{ total: number; topTitle: string; topViews: number }>({ total: 0, topTitle: '', topViews: 0 });
  const [doctorEarnings, setDoctorEarnings] = useState<{ articles: number; consultations: number }>({ articles: 0, consultations: 0 });
  
  // SOS State
  const [showSOS, setShowSOS] = useState(false);
  const [sosStep, setSosStep] = useState<'select' | 'confirm' | 'active'>('select');
  const [sosType, setSosType] = useState<'Ambulance' | 'Police' | 'Fire' | 'Hospital' | null>(null);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosLocation, setSosLocation] = useState<{lat: number, lng: number} | null>(null);

  // Vitals State
  const [showVitals, setShowVitals] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    if (user) setUserPoints(user.points);
  }, [user]);

  useEffect(() => {
    const loadDoctorStats = async () => {
      if (!user || user.role !== UserRole.DOCTOR) return;
      try {
        const allArticles = await db.getArticles();
        const my = Array.isArray(allArticles) ? allArticles.filter(a => a?.authorId === user.id) : [];
        const totalViews = my.reduce((sum, a) => sum + (Number(a?.views) || 0), 0);
        const top = my.length > 0 ? [...my].sort((a, b) => (Number(b?.views) || 0) - (Number(a?.views) || 0))[0] : null;
        setDoctorArticleViews({ total: totalViews, topTitle: top?.title || '', topViews: Number(top?.views) || 0 });

        // Earnings: from transactions (fallback to completed appointments fees if no transactions)
        try {
          const txs = await (db as any).getPendingTransactions?.() ?? [];
          const mine = Array.isArray(txs) ? txs.filter((t: any) => t?.recipientId === user.id && (t?.status === 'VERIFIED' || t?.status === 'COMPLETED' || t?.status === 'APPROVED')) : [];
          const articleE = mine.filter((t: any) => t?.itemType === 'article').reduce((s: number, t: any) => s + Number(t?.amount || 0), 0);
          const consultE = mine.filter((t: any) => t?.itemType === 'consultation').reduce((s: number, t: any) => s + Number(t?.amount || 0), 0);
          setDoctorEarnings({ articles: articleE, consultations: consultE });
        } catch (txError) {
          console.error('Error loading doctor earnings:', txError);
          setDoctorEarnings({ articles: 0, consultations: 0 });
        }
      } catch (e) {
        console.error('Error loading doctor stats:', e);
        setDoctorArticleViews({ total: 0, topTitle: '', topViews: 0 });
        setDoctorEarnings({ articles: 0, consultations: 0 });
      }
    };
    loadDoctorStats();
  }, [user?.id, user?.role]);

  // Load recent orders for patient dashboard
  useEffect(() => {
    if (user?.role === UserRole.PATIENT && user.id && firestore) {
      setLoadingRecentOrders(true);
      
      try {
        // Verify all required Firebase functions are available
        if (!collection || !query || !where || !onSnapshot) {
          console.error('Firebase Firestore functions not available:', { collection: !!collection, query: !!query, where: !!where, onSnapshot: !!onSnapshot });
          setLoadingRecentOrders(false);
          return;
        }
        
        const ordersRef = collection(firestore, 'orders');
        const q = query(ordersRef, where('patient_id', '==', user.id));
      
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            try {
              const ordersData = snapshot.docs.map((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate?.() || (data.created_at?.toDate?.()) || new Date();
                return {
                  id: doc.id,
                  orderId: doc.id.slice(0, 8).toUpperCase(),
                  total: data.total_amount || data.total || 0,
                  status: data.status || 'PENDING',
                  date: createdAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  }),
                  createdAt: createdAt
                };
              }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);
              
              setRecentOrders(ordersData);
              setLoadingRecentOrders(false);
            } catch (mapError) {
              console.error('Error processing orders data:', mapError);
              setLoadingRecentOrders(false);
            }
          },
          (error) => {
            console.error('Recent orders listener error:', error);
            setLoadingRecentOrders(false);
          }
        );

        return () => {
          try {
            unsubscribe();
          } catch (unsubError) {
            console.error('Error unsubscribing from orders:', unsubError);
          }
        };
      } catch (error) {
        console.error('Error setting up orders listener:', error);
        setLoadingRecentOrders(false);
      }
    }
  }, [user?.id, user?.role, firestore]);

  // SOS Countdown Logic
  useEffect(() => {
      let timer: any;
      if (showSOS && sosStep === 'active' && sosCountdown > 0) {
          timer = setInterval(() => setSosCountdown(prev => prev - 1), 1000);
      } else if (sosCountdown === 0 && sosStep === 'active') {
          if (!sosLocation) {
             if ("geolocation" in navigator) {
                 navigator.geolocation.getCurrentPosition((position) => {
                     setSosLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                     notify(`${sosType} Alert Sent with Real Coordinates!`, 'success');
                 });
             } else {
                 setSosLocation({ lat: -6.7924, lng: 39.2083 });
                 notify(`${sosType} Alert Sent (GPS Unavailable).`, 'success');
             }
          }
      }
      return () => clearInterval(timer);
  }, [showSOS, sosStep, sosCountdown, sosType]);

  const handleSOSClick = () => {
      setShowSOS(true);
      setSosStep('select');
  };

  const selectSOSType = (type: 'Ambulance' | 'Police' | 'Fire' | 'Hospital') => {
      setSosType(type);
      setSosStep('confirm');
  };

  const activateSOS = () => {
      setSosStep('active');
      setSosCountdown(5);
  };

  const cancelSOS = () => {
      setShowSOS(false);
      setSosStep('select');
      setSosCountdown(5);
      setSosLocation(null);
      setSosType(null);
  };

  const renderDoctorDashboard = () => {
      const stats = { patients: 42, consults: appointments.filter(a => a.status === 'UPCOMING').length, earnings: '1.4M' };

      return (
        <div className="flex flex-col xl:flex-row gap-8 h-full xl:h-[calc(100vh-140px)] animate-in fade-in duration-500">
            <div className="flex-1 flex flex-col gap-8 overflow-y-auto pr-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold font-display text-gray-900 dark:text-white mb-1">
                            {greeting}, Dr. {userName.split(' ')[1] || userName}!
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">You have <span className="font-bold text-gray-900 dark:text-white">{stats.consults} appointments</span> upcoming.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-600/20">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-xl"><Users size={20} /></div>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{stats.patients}</h3>
                        <p className="text-blue-100 text-sm">Active Patients</p>
                    </div>
                    <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl"><Calendar size={20} /></div>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.consults}</h3>
                        <p className="text-gray-500 dark:text-gray-300 text-sm">Upcoming Consults</p>
                    </div>
                    <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><Wallet size={20} /></div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">TZS {(doctorEarnings.articles + doctorEarnings.consultations).toLocaleString()}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Earnings Total</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 dark:bg-[#0A0F1C]/50 rounded-xl p-2 border border-transparent dark:border-gray-700/30">
                            <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[9px]">Articles</p>
                            <p className="font-extrabold text-gray-900 dark:text-white">TZS {doctorEarnings.articles.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#0A0F1C]/50 rounded-xl p-2 border border-transparent dark:border-gray-700/30">
                            <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[9px]">Consults</p>
                            <p className="font-extrabold text-gray-900 dark:text-white">TZS {doctorEarnings.consultations.toLocaleString()}</p>
                          </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-white">Article Views</h3>
                      <button onClick={() => onNavigate('manage-articles', 'feed')} className="text-xs font-bold text-blue-600 hover:underline">Open Articles</button>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{doctorArticleViews.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total views across your articles</p>
                    {doctorArticleViews.topTitle && (
                      <p className="text-xs text-gray-500 mt-3">
                        Top: <span className="font-bold text-gray-900 dark:text-white">{doctorArticleViews.topTitle}</span> • {doctorArticleViews.topViews.toLocaleString()} views
                      </p>
                    )}
                  </div>
                  <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                      <span className="text-xs text-gray-400">Doctor</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => onNavigate('patients')} className="px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 font-bold text-sm">My Patients</button>
                      <button onClick={() => onNavigate('finance')} className="px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-sm">Finance</button>
                      <button onClick={() => onNavigate('manage-articles', 'editor')} className="px-4 py-3 rounded-2xl bg-purple-50 text-purple-700 font-bold text-sm">Write Article</button>
                      <button onClick={() => onNavigate('consultations')} className="px-4 py-3 rounded-2xl bg-gray-50 text-gray-700 font-bold text-sm">Schedule</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Today's Schedule</h3>
                    <div className="space-y-3">
                        {appointments.slice(0,3).map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0A0F1C]/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                                        {apt.patientName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{apt.patientName}</p>
                                        <p className="text-xs text-gray-500">{apt.time} - {apt.type}</p>
                                    </div>
                                </div>
                                <button onClick={() => onNavigate('consultations')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg">Open</button>
                            </div>
                        ))}
                        {appointments.length === 0 && <p className="text-gray-500 text-sm">No appointments scheduled.</p>}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderPharmacyDashboard = () => {
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Pharmacy Overview</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{userName}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate('orders')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
                        <ShoppingBag size={18} /> Manage Orders
                    </button>
                    <button onClick={() => onNavigate('finance')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 flex items-center gap-2">
                        <Wallet size={18} /> Finance
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-6 rounded-2xl">
                    <h3 className="text-emerald-800 dark:text-emerald-300 font-bold text-lg mb-1">Total Sales</h3>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">TZS 1.2M</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl">
                    <h3 className="text-blue-800 dark:text-blue-300 font-bold text-lg mb-1">Pending Orders</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">5</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 p-6 rounded-2xl">
                    <h3 className="text-purple-800 dark:text-purple-300 font-bold text-lg mb-1">Pending Payments</h3>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">3</p>
                </div>
            </div>
        </div>
      );
  };

  const renderPatientDashboard = () => {
    const nextAppointment = appointments.find(a => a.status === 'UPCOMING');
    
    const HEALTH_TRENDS = [
        { day: 'Mon', bp: 120, hr: 72 },
        { day: 'Tue', bp: 118, hr: 75 },
        { day: 'Wed', bp: 122, hr: 70 },
        { day: 'Thu', bp: 121, hr: 74 },
        { day: 'Fri', bp: 119, hr: 71 },
        { day: 'Sat', bp: 124, hr: 80 },
        { day: 'Sun', bp: 120, hr: 73 },
    ];

    const { isDarkMode: isDark } = useDarkMode();

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-10 relative">
            
            {showVitals && <VitalsScanner onClose={() => setShowVitals(false)} />}

            {showSOS && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border-4 border-red-500 text-center overflow-hidden">
                        
                        {sosStep === 'select' && (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display mb-6">Emergency SOS</h2>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button onClick={() => selectSOSType('Ambulance')} className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900 rounded-2xl hover:bg-red-100 transition-colors gap-2">
                                        <Ambulance size={32} className="text-red-600" />
                                        <span className="font-bold text-red-700 dark:text-red-400 text-sm">Ambulance</span>
                                    </button>
                                    <button onClick={() => selectSOSType('Hospital')} className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-900 rounded-2xl hover:bg-blue-100 transition-colors gap-2">
                                        <Plus size={32} className="text-blue-600" />
                                        <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">Hospital</span>
                                    </button>
                                    <button onClick={() => selectSOSType('Fire')} className="flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-100 dark:border-orange-900 rounded-2xl hover:bg-orange-100 transition-colors gap-2">
                                        <Fire size={32} className="text-orange-600" />
                                        <span className="font-bold text-orange-700 dark:text-orange-400 text-sm">Fire</span>
                                    </button>
                                    <button onClick={() => selectSOSType('Police')} className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-[#0A0F1C] border-2 border-gray-200 dark:border-gray-700/50 rounded-2xl hover:bg-gray-200 dark:hover:bg-[#0F172A] transition-colors gap-2">
                                        <ShieldAlert size={32} className="text-gray-700 dark:text-white" />
                                        <span className="font-bold text-gray-800 dark:text-white text-sm">Police</span>
                                    </button>
                                </div>
                                <button onClick={cancelSOS} className="text-gray-500 font-bold hover:underline">Cancel</button>
                            </>
                        )}

                        {sosStep === 'confirm' && (
                            <>
                                <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                    <AlertTriangle size={48} />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Confirm {sosType}?</h2>
                                <p className="text-gray-500 mb-8 leading-relaxed">
                                    This will share your live location with emergency services immediately.
                                </p>
                                <div className="space-y-3">
                                    <button onClick={activateSOS} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-600/30 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                                        <PhoneCall size={24} /> Trigger Alert
                                    </button>
                                    <button onClick={() => setSosStep('select')} className="w-full py-4 bg-gray-100 dark:bg-[#0A0F1C] text-gray-700 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-[#0F172A] transition-colors">Back</button>
                                </div>
                            </>
                        )}

                        {sosStep === 'active' && (
                            <div className="relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full animate-ping"></div>
                                <div className="relative z-10">
                                    {sosCountdown > 0 ? (
                                        <>
                                            <h2 className="text-6xl font-black text-red-600 mb-2 font-mono">{sosCountdown}</h2>
                                            <p className="text-gray-500 font-bold uppercase tracking-widest">Calling {sosType}...</p>
                                            <button onClick={cancelSOS} className="mt-8 text-sm font-bold text-gray-400 hover:text-gray-600 underline">Cancel</button>
                                        </>
                                    ) : (
                                        <div className="animate-in zoom-in duration-300">
                                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle size={40} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Help Sent!</h3>
                                            <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                                                {sosLocation ? `${sosLocation.lat.toFixed(4)}, ${sosLocation.lng.toFixed(4)}` : 'Locating...'}
                                            </p>
                                            <button onClick={cancelSOS} className="mt-8 w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Close</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-gray-900 dark:text-white">
                        {greeting}, {userName.split(' ')[0]}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
                        Your health summary for today.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-3 md:py-2 rounded-2xl font-bold flex items-center gap-2 shadow-sm border border-amber-200 dark:border-amber-800 text-sm md:text-base flex-grow md:flex-grow-0 justify-center">
                        <Trophy size={18} /> {userPoints} Pts
                    </div>
                    <button 
                        onClick={() => onNavigate('symptom-checker')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 md:py-2 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 justify-center text-sm md:text-base flex-grow md:flex-grow-0"
                    >
                        <Bot size={20} /> <span className="hidden sm:inline">AI Checkup</span><span className="sm:hidden">AI</span>
                    </button>
                    <button 
                        onClick={handleSOSClick}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 md:py-2 rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center flex-grow md:flex-grow-0 animate-pulse gap-2"
                    >
                        <AlertTriangle size={20} /> <span className="hidden sm:inline">SOS</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    
                    <div className="bg-white dark:bg-[#0F172A] p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                                <div className="w-full sm:w-auto">
                                    <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                        Next Appointment
                                    </span>
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-3 truncate">
                                        {nextAppointment ? nextAppointment.doctorName : "No upcoming appointments"}
                                    </h3>
                                    {nextAppointment && <p className="text-gray-500 text-sm md:text-base">{nextAppointment.type} Consultation</p>}
                                </div>
                                {nextAppointment && (
                                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end mt-2 sm:mt-0 bg-gray-50 sm:bg-transparent dark:bg-gray-100/50 sm:dark:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                                        <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{nextAppointment.time}</p>
                                        <p className="text-sm text-gray-400 font-bold">{nextAppointment.date}</p>
                                    </div>
                                )}
                            </div>

                            {nextAppointment ? (
                                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                    {nextAppointment.type === 'VIDEO' && (
                                        <button 
                                            onClick={() => onNavigate('video-call')}
                                            className="bg-gray-900 dark:bg-teal-500 text-white dark:text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform w-full sm:w-auto justify-center"
                                        >
                                            <Video size={18} /> Join Video Call
                                        </button>
                                    )}
                                    <button onClick={() => onNavigate('consultations')} className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto">
                                        Reschedule
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onNavigate('consultations')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                                    Book Now
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0F172A] p-5 md:p-6 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 px-2">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
                                    <Activity className="text-purple-500" size={20} /> Health Trends
                                </h3>
                            </div>
                            <button onClick={() => setShowVitals(true)} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors w-full sm:w-auto justify-center">
                                <Camera size={16} /> Scan Vitals
                            </button>
                        </div>
                        <div className="h-56 md:h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={HEALTH_TRENDS}>
                                    <defs>
                                        <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#E5E7EB"} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF', 
                                            borderRadius: '12px',
                                            border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                                            color: isDark ? '#F3F4F6' : '#1F2937'
                                        }} 
                                        itemStyle={{ color: isDark ? '#F3F4F6' : '#1F2937' }}
                                    />
                                    <Area type="monotone" dataKey="bp" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorBp)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    <div className="bg-white dark:bg-[#0F172A] p-5 md:p-6 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Quick Access</h3>
                        
                        {/* Prominent Symptom Checker Card */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-lg mb-1">Free Symptom Checker</h4>
                                    <p className="text-blue-100 text-sm">Get instant health insights - No signup required!</p>
                                </div>
                                <button 
                                    onClick={() => onNavigate('symptom-checker')}
                                    className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                                >
                                    <Bot size={18} /> Check Now
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Symptom Checker', icon: Bot, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', action: 'symptom-checker', highlight: true },
                                { label: 'Pharmacy', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', action: 'pharmacy' },
                                { label: 'Lab Tests', icon: Activity, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', action: 'care-center-labs' },
                                { label: 'Insurance', icon: Shield, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', action: 'insurance' },
                                { label: 'Records', icon: FileText, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', action: 'records' },
                            ].map((action, i) => (
                                <button 
                                    key={i}
                                    onClick={() => onNavigate(action.action)}
                                    className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0A0F1C]/50 hover:bg-gray-100 dark:hover:bg-[#0F172A] transition-all flex flex-col items-center justify-center gap-3 group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                                        <action.icon size={20} />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions Widget - Recent Orders */}
                    {user?.role === UserRole.PATIENT && (
                        <div className="bg-white dark:bg-[#0F172A] p-5 md:p-6 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Package size={20} className="text-blue-600 dark:text-blue-400" /> Recent Orders
                                </h3>
                                <button 
                                    onClick={() => onNavigate('orders')}
                                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="space-y-3">
                                {loadingRecentOrders ? (
                                    <div className="space-y-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-16"></div>
                                        ))}
                                    </div>
                                ) : recentOrders.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                        <Package size={24} className="mx-auto mb-2 opacity-50" />
                                        <p>No recent orders</p>
                                        <button 
                                            onClick={() => onNavigate('pharmacy')}
                                            className="mt-2 text-blue-600 dark:text-blue-400 font-bold hover:underline text-xs"
                                        >
                                            Browse Pharmacy →
                                        </button>
                                    </div>
                                ) : (
                                    recentOrders.map((order) => (
                                        <div 
                                            key={order.id}
                                            onClick={() => onNavigate('orders')}
                                            className="bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-3 border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                        Order #{order.orderId}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                        TZS {order.total.toLocaleString()}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        order.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  if (role === UserRole.DOCTOR) return renderDoctorDashboard();
  if (role === UserRole.PATIENT) return renderPatientDashboard();
  if (role === UserRole.PHARMACY) return renderPharmacyDashboard();
  
  return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <h2 className="text-2xl font-bold mb-2">Welcome {role}</h2>
          <p>Dashboard view for {role} role.</p>
      </div>
  );
};
