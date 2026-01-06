
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { MapPin, Navigation, Package, CheckCircle, Clock, DollarSign, Bike, Smartphone, Shield, ArrowRight, Phone, Camera, Key, TrendingUp, BarChart2, Calendar } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { MapComponent } from './MapComponent';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CourierDashboardProps {
  user: User;
  initialTab?: 'dashboard' | 'map' | 'earnings';
}

const EARNINGS_DATA = [
    { day: 'Mon', amount: 45000 },
    { day: 'Tue', amount: 52000 },
    { day: 'Wed', amount: 38000 },
    { day: 'Thu', amount: 61000 },
    { day: 'Fri', amount: 55000 },
    { day: 'Sat', amount: 72000 },
    { day: 'Sun', amount: 20000 },
];

export const CourierDashboard: React.FC<CourierDashboardProps> = ({ user, initialTab = 'dashboard' }) => {
  const { notify } = useNotification();
  const [activeView, setActiveView] = useState(initialTab);
  const [isOnline, setIsOnline] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState<any | null>(null);
  
  // PoD Modal State
  const [showPodModal, setShowPodModal] = useState(false);
  const [podMethod, setPodMethod] = useState<'otp' | 'photo'>('otp');
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
      setActiveView(initialTab);
  }, [initialTab]);

  // Mock Active Jobs
  const availableJobs = [
      { id: 'JOB-102', pickup: 'City Pharmacy (Posta)', dropoff: 'Upanga East', distance: '2.4 km', fee: 3500, items: 'Medicine Package (Small)', lat: -6.8163, lng: 39.2888 },
      { id: 'JOB-105', pickup: 'Afya Plus (Kinondoni)', dropoff: 'Mikocheni B', distance: '5.1 km', fee: 6000, items: 'Prescription Box', lat: -6.7786, lng: 39.2631 },
  ];

  // Map Markers logic
  const mapMarkers = activeDelivery 
    ? [
        { lat: activeDelivery.lat || -6.8163, lng: activeDelivery.lng || 39.2888, title: 'Pickup: ' + activeDelivery.pickup, type: 'pharmacy' as const },
        { lat: -6.7924, lng: 39.2083, title: 'My Location', type: 'courier' as const } 
      ]
    : availableJobs.map(job => ({ lat: job.lat, lng: job.lng, title: `Job: ${job.pickup}`, type: 'pharmacy' as const }));

  const handleToggleStatus = () => {
      setIsOnline(!isOnline);
      notify(isOnline ? 'You are now offline.' : 'You are now online and visible to pharmacies.', isOnline ? 'info' : 'success');
  };

  const handleAcceptJob = (job: any) => {
      setActiveDelivery({ ...job, status: 'Picking Up' });
      notify('Job Accepted! Proceed to pickup location.', 'success');
  };

  const handleGetDirections = () => {
      if (activeDelivery) {
          // Open Google Maps Directions
          const url = `https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.lat},${activeDelivery.lng}`;
          window.open(url, '_blank');
          notify('Opening navigation...', 'info');
      }
  };

  const initiateCompletion = () => {
      setShowPodModal(true);
  };

  const confirmDelivery = () => {
      if (podMethod === 'otp' && deliveryOtp.length < 4) {
          notify('Please enter the 4-digit OTP provided by the customer.', 'error');
          return;
      }
      
      setIsVerifying(true);
      setTimeout(() => {
          setIsVerifying(false);
          setShowPodModal(false);
          setDeliveryOtp('');
          setActiveDelivery(null);
          notify('Proof of Delivery Verified! Earnings added to wallet.', 'success');
      }, 1500);
  };

  const updateDeliveryStatus = () => {
      if (!activeDelivery) return;
      if (activeDelivery.status === 'Picking Up') {
          setActiveDelivery({ ...activeDelivery, status: 'In Transit' });
          notify('Package collected. Start delivery.', 'info');
      } else if (activeDelivery.status === 'In Transit') {
          initiateCompletion();
      }
  };

  // --- SUB-VIEWS ---

  const RenderMap = () => (
      <div className="h-[calc(100vh-140px)] w-full rounded-[2.5rem] overflow-hidden border border-gray-200 dark:border-gray-700 relative">
          <MapComponent 
              center={activeDelivery ? [activeDelivery.lat, activeDelivery.lng] : [-6.7924, 39.2083]} 
              zoom={13} 
              markers={mapMarkers}
          />
          <div className="absolute top-4 left-4 z-[400] bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-lg max-w-xs">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Live Tracking</h3>
              <p className="text-xs text-gray-500">
                  {activeDelivery ? `Navigating to ${activeDelivery.status === 'Picking Up' ? 'Pickup' : 'Dropoff'}` : 'Waiting for jobs...'}
              </p>
          </div>
      </div>
  );

  const RenderEarnings = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-lg shadow-emerald-600/20 col-span-1 md:col-span-2 relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-2">Total Balance</p>
                      <h2 className="text-5xl font-mono font-bold mb-6">TZS 345,000</h2>
                      <div className="flex gap-3">
                          <button className="bg-white text-emerald-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors">Withdraw</button>
                          <button className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors">History</button>
                      </div>
                  </div>
                  <DollarSign className="absolute -bottom-10 -right-10 w-64 h-64 text-emerald-500 opacity-20" />
              </div>
              
              <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                          <Package size={24} />
                      </div>
                      <div>
                          <p className="text-gray-500 text-xs font-bold uppercase">Total Deliveries</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">142</h3>
                      </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700/50 h-1.5 rounded-full overflow-hidden mb-2">
                      <div className="bg-blue-600 h-full w-[85%]"></div>
                  </div>
                  <p className="text-xs text-gray-400">Top 15% of couriers this week</p>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp size={20} className="text-blue-500" /> Weekly Performance
                  </h3>
                  <select className="bg-gray-50 dark:bg-[#0A0F1C] border-none rounded-lg text-sm font-bold p-2 outline-none text-gray-900 dark:text-white">
                      <option>This Week</option>
                      <option>Last Week</option>
                  </select>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={EARNINGS_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                      <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Bar dataKey="amount" fill="#059669" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Recent Payouts</h3>
              <div className="space-y-3">
                  {[1,2,3].map(i => (
                      <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                  <Calendar size={18} />
                              </div>
                              <div>
                                  <p className="font-bold text-sm text-gray-900 dark:text-white">Weekly Payout</p>
                                  <p className="text-xs text-gray-500">24 Oct, 2023</p>
                              </div>
                          </div>
                          <span className="font-mono font-bold text-emerald-600">+ TZS 245,000</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const RenderDashboard = () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Active Delivery */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Earnings Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-blue-100 text-xs font-bold uppercase mb-1">Today's Earnings</p>
                          <h3 className="text-3xl font-bold">TZS 45,000</h3>
                          <div className="mt-4 flex items-center gap-2 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg">
                              <DollarSign size={12} /> +12% from yesterday
                          </div>
                      </div>
                      <DollarSign className="absolute -bottom-4 -right-4 text-white opacity-10 w-32 h-32" />
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                          <CheckCircle size={24} />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 dark:text-white">12</h4>
                      <p className="text-xs text-gray-500 uppercase font-bold">Completed</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mb-2">
                          <Clock size={24} />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 dark:text-white">4.2 hr</h4>
                      <p className="text-xs text-gray-500 uppercase font-bold">Online Time</p>
                  </div>
              </div>

              {/* Active Delivery Map Context */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] h-[400px] relative overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm flex flex-col items-center justify-center group">
                  
                  <div className="absolute inset-0 z-0">
                      <MapComponent 
                          center={activeDelivery ? [activeDelivery.lat, activeDelivery.lng] : [-6.8163, 39.2888]} 
                          zoom={14} 
                          markers={mapMarkers}
                      />
                  </div>
                  
                  {activeDelivery ? (
                      <div className="z-10 w-full h-full flex flex-col justify-between p-6 pointer-events-none">
                          <div className="flex justify-between items-start pointer-events-auto">
                              <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 max-w-xs">
                                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Current Task</p>
                                  <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                      {activeDelivery.status === 'Picking Up' ? 'Go to Pharmacy' : 'Go to Customer'}
                                      <Navigation size={18} className="text-blue-500" />
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {activeDelivery.status === 'Picking Up' ? activeDelivery.pickup : activeDelivery.dropoff}
                                  </p>
                                  <button onClick={handleGetDirections} className="mt-3 w-full bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100">
                                      <Navigation size={14}/> Get Directions
                                  </button>
                              </div>
                              <button className="bg-emerald-500 text-white p-3 rounded-full shadow-lg hover:bg-emerald-600 transition-colors">
                                  <Phone size={24} />
                              </button>
                          </div>

                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700/50 pointer-events-auto">
                              <div className="flex items-center justify-between mb-4">
                                  <div>
                                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{activeDelivery.id}</h4>
                                      <p className="text-sm text-gray-500">{activeDelivery.items}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-emerald-600 text-lg">TZS {activeDelivery.fee.toLocaleString()}</p>
                                      <p className="text-xs text-gray-400">Cash on Delivery</p>
                                  </div>
                              </div>
                              
                              <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2 mb-6">
                                  <div className={`h-full rounded-full bg-blue-600 transition-all duration-500 ${activeDelivery.status === 'Picking Up' ? 'w-1/3' : 'w-2/3'}`}></div>
                              </div>

                              <button 
                                  onClick={updateDeliveryStatus}
                                  className="w-full py-4 bg-gray-900 dark:bg-teal-500 text-white dark:text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                              >
                                  {activeDelivery.status === 'Picking Up' ? 'Confirm Pickup' : 'Confirm Delivery'}
                                  <ArrowRight size={20} />
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center z-10 bg-white/80 dark:bg-[#0F172A]/80 p-6 rounded-3xl backdrop-blur-sm pointer-events-auto">
                          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                              <Navigation size={40} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Waiting for jobs...</h3>
                          <p className="text-gray-500">Go online to receive delivery requests.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Right Column: Job Queue */}
          <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                  <h3 className="font-bold text-xl mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                      <Package size={20} className="text-purple-500" /> Available Jobs
                  </h3>

                  {!isOnline ? (
                      <div className="p-6 text-center bg-gray-50 dark:bg-[#0A0F1C]/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                          <p className="text-gray-500 text-sm">You are offline. Go online to see available deliveries.</p>
                      </div>
                  ) : activeDelivery ? (
                      <div className="p-6 text-center bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                          <p className="text-blue-700 dark:text-blue-300 font-bold text-sm">You have an active delivery.</p>
                          <p className="text-blue-600/70 dark:text-blue-400/70 text-xs mt-1">Complete it to accept new jobs.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {availableJobs.map((job) => (
                              <div key={job.id} className="p-4 bg-gray-50 dark:bg-[#0A0F1C]/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="px-2 py-1 bg-white dark:bg-[#0F172A] rounded-lg text-xs font-bold shadow-sm text-gray-900 dark:text-white">{job.id}</span>
                                      <span className="text-emerald-600 font-bold">TZS {job.fee.toLocaleString()}</span>
                                  </div>
                                  
                                  <div className="space-y-3 mb-4">
                                      <div className="flex items-start gap-3">
                                          <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                                          <div>
                                              <p className="text-xs text-gray-400 font-bold uppercase">Pickup</p>
                                              <p className="text-sm font-bold text-gray-900 dark:text-white">{job.pickup}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-3">
                                          <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                                          <div>
                                              <p className="text-xs text-gray-400 font-bold uppercase">Dropoff</p>
                                              <p className="text-sm font-bold text-gray-900 dark:text-white">{job.dropoff}</p>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                          <Bike size={14} /> {job.distance}
                                      </span>
                                      <button 
                                          onClick={() => handleAcceptJob(job)}
                                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                                      >
                                          Accept
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* PoD Modal */}
      {showPodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative border border-gray-100 dark:border-gray-700">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Shield size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Proof of Delivery</h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">Verify delivery to complete job.</p>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-[#0A0F1C] p-1 rounded-xl mb-6">
                      <button 
                          onClick={() => setPodMethod('otp')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${podMethod === 'otp' ? 'bg-white dark:bg-[#0F172A] shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                          Customer OTP
                      </button>
                      <button 
                          onClick={() => setPodMethod('photo')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${podMethod === 'photo' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                      >
                          Photo Proof
                      </button>
                  </div>

                  {podMethod === 'otp' ? (
                      <div className="mb-6">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Enter 4-Digit Code</label>
                          <div className="relative">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                              <input 
                                  type="number" 
                                  value={deliveryOtp}
                                  onChange={(e) => setDeliveryOtp(e.target.value)}
                                  placeholder="0 0 0 0"
                                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 rounded-xl text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                              />
                          </div>
                          <p className="text-xs text-gray-400 mt-2 text-center">Ask the customer for the code sent to their phone.</p>
                      </div>
                  ) : (
                      <div className="mb-6">
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700/50 rounded-xl h-32 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0A0F1C] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#0F172A] transition-colors">
                              <Camera size={32} className="text-gray-400 mb-2" />
                              <p className="text-sm font-bold text-gray-500">Tap to Take Photo</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 text-center">Capture the package at the door or with the customer.</p>
                      </div>
                  )}

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setShowPodModal(false)}
                          className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelivery}
                          disabled={isVerifying}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                          {isVerifying ? 'Verifying...' : 'Confirm'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header & Status Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-bold font-serif text-gray-900 dark:text-white">Courier Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage deliveries and track earnings.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-[#0F172A] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <span className={`text-sm font-bold px-3 ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
              </span>
              <button 
                  onClick={handleToggleStatus}
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isOnline ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700/50'}`}
              >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isOnline ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
          </div>
      </div>

      {activeView === 'map' && <RenderMap />}
      {activeView === 'earnings' && <RenderEarnings />}
      {activeView === 'dashboard' && <RenderDashboard />}
    </div>
  );
};
