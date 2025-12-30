
import React, { useEffect, useState } from 'react';
import { Play, ArrowRight, Activity, Stethoscope, Pill, MessageSquare, Truck, Users, Building2, ShieldCheck, Phone, Globe, Menu, X, CheckCircle, Star, Zap, DollarSign, MapPin, Bike, BarChart2, LayoutDashboard, HeartPulse, CreditCard, FileText, Calendar, Video, Moon, Sun } from 'lucide-react';
import { db } from '../services/db';
import { Partner, SubscriptionPackage } from '../types';
import { useDarkMode } from '../contexts/DarkModeContext';
import { LogoIcon } from './LogoIcon';

interface LandingPageProps {
  onGetStarted: () => void;
}

type ViewState = 'home' | 'patients' | 'doctors' | 'pharmacies' | 'couriers';

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // Dynamic Content State
  const [partners, setPartners] = useState<Partner[]>([]);
  const [doctorPackages, setDoctorPackages] = useState<SubscriptionPackage[]>([]);
  const [pharmacyPackages, setPharmacyPackages] = useState<SubscriptionPackage[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Fetch Dynamic Data
    const loadContent = async () => {
        const prts = await db.getPartners();
        setPartners(prts);
        const pkgs = await db.getPackages();
        setDoctorPackages(pkgs.filter(p => p.role === 'DOCTOR'));
        setPharmacyPackages(pkgs.filter(p => p.role === 'PHARMACY'));
    };
    loadContent();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: ViewState) => {
      setCurrentView(view);
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- SUB-VIEWS RENDER FUNCTIONS ---

  const RenderHome = () => (
    <div className="animate-in fade-in duration-700">
         {/* 1. Hero Section */}
         <div className="max-w-[1280px] mx-auto px-6 md:px-8 mb-24 lg:mb-32 pt-16">
            <div className="flex flex-col items-center text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                        AVAILABLE 24/7 ACROSS TANZANIA
                    </div>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight max-w-4xl transition-colors duration-300">
                       Professional Healthcare, <br/>
                       <span className="text-teal-600 dark:text-teal-400">In Your Pocket.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 dark:text-gray-300 leading-relaxed max-w-2xl transition-colors duration-300">
                       Skip the queues. Consult verified specialists in minutes. Get prescriptions delivered same-day. Track your family's health with AI-powered insights. Experience world-class healthcare that's fast, affordable, and available 24/7—all from your phone in Tanzania.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                       <button onClick={() => handleNavClick('patients')} className="px-8 py-4 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-full font-bold text-lg transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2">
                         Find a Doctor <ArrowRight size={20} />
                       </button>
                       <button onClick={onGetStarted} className="px-8 py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-colors">
                         Check Symptoms
                       </button>
                    </div>
            </div>
         </div>

         {/* 2. Partners Section (Simplified) */}
         <div className="border-y border-gray-100 dark:border-gray-700/50 bg-white dark:bg-[#0A0F1C] py-16 mb-24 transition-colors duration-300">
             <div className="max-w-[1280px] mx-auto px-6">
                 <div className="text-center mb-12"><p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trusted by healthcare partners across Tanzania</p></div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
                     {partners.map((partner) => (
                         <div key={partner.id} className="flex flex-col items-center gap-4 group cursor-default">
                             <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white dark:bg-[#0F172A] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 group-hover:shadow-md transition-shadow">
                                 <img src={partner.logoUrl} alt={partner.name} className="max-w-full max-h-full object-contain dark:invert" onError={(e) => {
                                     const target = e.target as HTMLImageElement;
                                     target.style.display = 'none';
                                     const parent = target.parentElement;
                                     if (parent) {
                                         parent.innerHTML = `<div class="text-2xl font-bold text-teal-600 dark:text-teal-400">${partner.name.charAt(0)}</div>`;
                                     }
                                 }} />
                             </div>
                             <span className="text-sm font-bold text-gray-600 dark:text-gray-300 text-center">{partner.name}</span>
                         </div>
                     ))}
                 </div>
             </div>
         </div>

         {/* 3. For Providers (B2B) */}
         <div className="max-w-[1280px] mx-auto px-6 mb-32">
             <div className="bg-gray-50 dark:bg-[#0F172A] rounded-[3rem] p-10 md:p-20 border border-gray-200 dark:border-gray-700/50 relative overflow-hidden transition-colors duration-300">
                 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-16">
                     <div className="md:w-1/2">
                         <span className="text-teal-600 dark:text-teal-400 font-bold tracking-wider uppercase text-xs mb-3 block">FOR DOCTORS & PHARMACIES</span>
                         <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-6">Empowering Healthcare Providers</h2>
                         <p className="text-gray-500 dark:text-gray-300 text-lg mb-10 leading-relaxed">
                             Expand your practice beyond the hospital walls. NexaFya provides digital records, secure billing, and patient follow-up tools to help you care for more people, efficiently.
                         </p>
                         <button onClick={() => handleNavClick('doctors')} className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold hover:bg-black dark:hover:bg-gray-100 transition-all hover:scale-105 shadow-xl flex items-center gap-3">
                             Join as Provider <ArrowRight size={18} />
                         </button>
                     </div>
                     <div className="md:w-5/12 grid grid-cols-2 gap-6">
                         <div className="bg-white dark:bg-[#0A0F1C] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                             <Users className="text-blue-600 dark:text-blue-400 mb-4" size={36} /><h4 className="font-bold text-gray-900 dark:text-white text-lg">Patient Records</h4>
                         </div>
                         <div className="bg-white dark:bg-[#0A0F1C] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow mt-8">
                             <Building2 className="text-purple-600 dark:text-purple-400 mb-4" size={36} /><h4 className="font-bold text-gray-900 dark:text-white text-lg">Inventory</h4>
                         </div>
                         <div className="bg-white dark:bg-[#0A0F1C] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                             <MessageSquare className="text-teal-600 dark:text-teal-400 mb-4" size={36} /><h4 className="font-bold text-gray-900 dark:text-white text-lg">Direct Chat</h4>
                         </div>
                         <div className="bg-white dark:bg-[#0A0F1C] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow mt-8">
                             <Activity className="text-orange-500 dark:text-orange-400 mb-4" size={36} /><h4 className="font-bold text-gray-900 dark:text-white text-lg">Analytics</h4>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
    </div>
  );

  const RenderPatients = () => (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
          
          {/* Patient Hero Section */}
          <div className="relative overflow-hidden mb-20 bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-white dark:to-[#0A0F1C] pt-10 pb-20 transition-colors duration-300">
              <div className="max-w-[1280px] mx-auto px-6">
                  <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                      
                      {/* Left: Text */}
                      <div className="w-full lg:w-1/2 text-center lg:text-left z-10">
                          <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 dark:text-white mb-6 leading-[1.1] transition-colors duration-300">
                              Professional Healthcare,<br />
                              <span className="text-blue-600 dark:text-blue-400">Anytime You Need It.</span>
                          </h1>
                          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0 transition-colors duration-300">
                              Connect with verified doctors, get prescriptions delivered, and manage your family's health—all from your phone. No waiting rooms, just care.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                              <button onClick={onGetStarted} className="px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2">
                                  Talk to a Doctor <ArrowRight size={20}/>
                              </button>
                              <button onClick={onGetStarted} className="px-8 py-4 bg-white dark:bg-transparent text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full font-bold text-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                                  Check Symptoms (Free)
                              </button>
                          </div>
                          
                          <div className="mt-8 flex items-center justify-center lg:justify-start gap-6">
                              <div className="flex -space-x-4">
                                  <img className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700" src="https://i.pravatar.cc/100?img=1" alt="User" />
                                  <img className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700" src="https://i.pravatar.cc/100?img=5" alt="User" />
                                  <img className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700" src="https://i.pravatar.cc/100?img=8" alt="User" />
                                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 bg-gray-100 dark:bg-[#0F172A] flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">+2k</div>
                              </div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Trusted by families in Dar es Salaam</p>
                          </div>
                      </div>

                      {/* Right: Image */}
                      <div className="w-full lg:w-1/2 relative">
                          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-gray-700 rotate-1 hover:rotate-0 transition-transform duration-500">
                              <img 
                                  src="https://images.unsplash.com/photo-1631217868269-dfc1c5c05b97?auto=format&fit=crop&q=80" 
                                  alt="East African Doctor and Patient" 
                                  className="w-full h-[500px] object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <div className="absolute bottom-6 left-6 text-white">
                                  <p className="font-bold text-lg">Dr. Amina Juma</p>
                                  <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
                                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Online Now
                                  </div>
                              </div>
                          </div>
                          
                          {/* Floating Card */}
                          <div className="absolute -left-6 top-12 bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 hidden lg:block animate-bounce duration-[3000ms] transition-colors duration-300">
                              <div className="flex items-center gap-3">
                                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                      <Video size={20} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Next Call</p>
                                      <p className="font-bold text-gray-900 dark:text-white">10:00 AM</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Feature Grid */}
          <div className="max-w-[1280px] mx-auto px-6 mb-24">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform"><Activity size={28} /></div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">AI Symptom Checker</h3>
                      <p className="text-gray-500 dark:text-gray-300 mb-6 leading-relaxed">Unsure what's wrong? Our AI assistant helps triage your symptoms instantly in Swahili or English.</p>
                      <button onClick={onGetStarted} className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Check Now <ArrowRight size={16}/></button>
                  </div>
                  <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform"><Stethoscope size={28} /></div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Video Consultations</h3>
                      <p className="text-gray-500 dark:text-gray-300 mb-6 leading-relaxed">Speak to verified doctors via HD video or voice call. Get digital prescriptions sent to your phone.</p>
                      <button onClick={onGetStarted} className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Book Doctor <ArrowRight size={16}/></button>
                  </div>
                  <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform"><ShieldCheck size={28} /></div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Insurance Support</h3>
                      <p className="text-gray-500 dark:text-gray-300 mb-6 leading-relaxed">We accept NHIF and major private insurance cards like Jubilee and Strategis for cashless treatment.</p>
                      <button onClick={onGetStarted} className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Verify Card <ArrowRight size={16}/></button>
                  </div>
              </div>
          </div>
          
          {/* App Download Section */}
          <div className="bg-[#051818] py-24 text-white mt-12 rounded-t-[3rem] mx-4 lg:mx-8">
              <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
                  <div className="md:w-1/2">
                      <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Download the NexaFya App</h2>
                      <p className="text-gray-400 mb-10 text-lg leading-relaxed">Get full access to features like Vitals Scanning, Medication Reminders, and offline USSD support on our mobile app.</p>
                      <div className="flex flex-wrap gap-4">
                          <button className="bg-white text-black px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 hover:bg-gray-200 transition-colors">
                              <Globe size={24} /> 
                              <div className="text-left">
                                  <span className="block text-[10px] font-bold uppercase tracking-wider">Download on the</span>
                                  <span className="text-base">App Store</span>
                              </div>
                          </button>
                          <button className="bg-transparent border border-gray-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 hover:bg-white/10 transition-colors">
                              <Globe size={24} /> 
                              <div className="text-left">
                                  <span className="block text-[10px] font-bold uppercase tracking-wider">Get it on</span>
                                  <span className="text-base">Google Play</span>
                              </div>
                          </button>
                      </div>
                  </div>
                  <div className="md:w-1/2 flex justify-center">
                      <div className="relative w-72 h-[550px] border-[8px] border-gray-800 rounded-[3rem] overflow-hidden bg-gray-900 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                          <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-br from-teal-900 to-black opacity-60"></div>
                          <div className="relative z-10 p-8 pt-16 text-center h-full flex flex-col justify-center">
                              <div className="w-20 h-20 bg-teal-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-teal-500/30"><HeartPulse size={40} color="white"/></div>
                              <h4 className="font-bold text-2xl mb-2">Vitals Scan</h4>
                              <p className="text-sm text-gray-300 mb-8">Place your finger over the camera to measure.</p>
                              <div className="text-7xl font-mono font-bold text-teal-400 mb-2">72</div>
                              <p className="text-sm text-gray-500 uppercase tracking-[0.2em] font-bold">BPM</p>
                              
                              <div className="mt-12 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                  <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-teal-400 h-full w-[70%] animate-pulse"></div>
                                  </div>
                                  <p className="text-xs text-teal-300 mt-2 font-bold">Detecting pulse...</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const RenderDoctors = () => (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
          <div className="bg-blue-600 text-white py-24 mb-12">
              <div className="max-w-[1280px] mx-auto px-6 text-center">
                  <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">Build Your Digital Clinic</h1>
                  <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">Set your own rates, manage your schedule, and treat patients from anywhere. We handle the paperwork.</p>
                  <button onClick={onGetStarted} className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors">Join as Doctor</button>
              </div>
          </div>

          <div className="max-w-[1280px] mx-auto px-6 mb-20">
              <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Features Designed for Doctors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                      { title: 'Electronic Records', desc: 'Securely store patient history, SOAP notes, and lab results.', icon: LayoutDashboard },
                      { title: 'e-Prescribing', desc: 'Issue digital prescriptions that patients can fulfill instantly.', icon: FileText },
                      { title: 'Smart Scheduling', desc: 'Set availability for video, voice, or in-person visits.', icon: Calendar },
                      { title: 'Automated Billing', desc: 'Receive payments via M-Pesa, Bank, or Insurance seamlessly.', icon: CreditCard },
                  ].map((feat, i) => (
                      <div key={i} className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                          <feat.icon className="text-blue-600 dark:text-blue-400 mb-4" size={32} />
                          <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{feat.title}</h4>
                          <p className="text-gray-500 dark:text-gray-300 text-sm leading-relaxed">{feat.desc}</p>
                      </div>
                  ))}
              </div>
          </div>

          <div className="max-w-[1280px] mx-auto px-6">
              <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
              <p className="text-center text-gray-500 dark:text-gray-300 mb-12">Choose the plan that fits your practice size.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {doctorPackages.map((pkg, i) => (
                      <div key={i} className={`rounded-3xl p-8 border relative transition-colors duration-300 ${pkg.isPopular ? 'bg-[#0F172A] dark:bg-[#1E293B] text-white border-gray-700/50 dark:border-gray-600/50 shadow-xl scale-105' : 'bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white border-gray-200 dark:border-gray-700/50'}`}>
                          {pkg.isPopular && <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">Most Popular</div>}
                          <h3 className="font-bold text-xl mb-2">{pkg.name}</h3>
                          <div className="flex items-baseline gap-1 mb-4">
                              {pkg.currency && <span className="text-sm font-bold opacity-70">{pkg.currency}</span>}
                              <span className="text-4xl font-bold">{pkg.price}</span>
                              <span className="text-sm opacity-70">{pkg.period}</span>
                          </div>
                          <p className={`text-sm mb-8 ${pkg.isPopular ? 'text-gray-400 dark:text-gray-300' : 'text-gray-500 dark:text-gray-300'}`}>{pkg.description}</p>
                          <ul className="space-y-4 mb-8">
                              {pkg.features.map((feat, j) => (
                                  <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                      <CheckCircle size={18} className={pkg.isPopular ? 'text-blue-400' : 'text-blue-600 dark:text-blue-400'} /> {feat}
                                  </li>
                              ))}
                          </ul>
                          <button onClick={onGetStarted} className={`w-full py-3 rounded-xl font-bold transition-all ${pkg.isPopular ? 'bg-white dark:bg-white text-black dark:text-gray-900 hover:bg-gray-100' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}>
                              Get Started
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const RenderPharmacies = () => (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 py-24 mb-12 transition-colors duration-300">
              <div className="max-w-[1280px] mx-auto px-6 text-center">
                  <h1 className="text-4xl md:text-6xl font-serif font-bold text-emerald-900 dark:text-emerald-400 mb-6">Grow Your Pharmacy</h1>
                  <p className="text-xl text-emerald-800 dark:text-gray-300 max-w-2xl mx-auto mb-8">Connect with thousands of patients. Receive digital prescriptions, manage inventory, and dispatch deliveries.</p>
                  <button onClick={onGetStarted} className="bg-emerald-600 dark:bg-emerald-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors">Partner with Us</button>
              </div>
          </div>

          <div className="max-w-[1280px] mx-auto px-6 mb-20">
              <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="md:w-1/2 space-y-6">
                      <div className="flex gap-4">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0"><Building2 /></div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Inventory Management</h3>
                              <p className="text-gray-500 dark:text-gray-300">Track stock levels in real-time. Get low-stock alerts and expiration warnings.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><Zap /></div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Instant Orders</h3>
                              <p className="text-gray-500 dark:text-gray-300">Receive orders directly from patients or doctors nearby. Verify prescriptions via QR code.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Truck /></div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Integrated Delivery</h3>
                              <p className="text-gray-500 dark:text-gray-300">One-click dispatch to our network of verified couriers. Track deliveries to the patient's door.</p>
                          </div>
                      </div>
                  </div>
                  <div className="md:w-1/2">
                      <img src="https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80" alt="Pharmacy Dashboard" className="rounded-3xl shadow-2xl" />
                  </div>
              </div>
          </div>

          <div className="max-w-[900px] mx-auto px-6">
              <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Partnership Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                  {pharmacyPackages.map((pkg, i) => (
                      <div key={i} className={`rounded-3xl p-8 border transition-colors duration-300 ${pkg.isPopular ? 'bg-emerald-900 dark:bg-emerald-800/50 text-white border-emerald-900 dark:border-emerald-700/50 shadow-xl' : 'bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white border-gray-200 dark:border-gray-700/50'}`}>
                          <h3 className="font-bold text-xl mb-2">{pkg.name}</h3>
                          <div className="flex items-baseline gap-1 mb-4">
                              {pkg.currency && <span className="text-sm font-bold opacity-70">{pkg.currency}</span>}
                              <span className="text-4xl font-bold">{pkg.price}</span>
                              <span className="text-sm opacity-70">{pkg.period}</span>
                          </div>
                          <p className={`text-sm mb-8 ${pkg.isPopular ? 'text-gray-300' : 'text-gray-500 dark:text-gray-300'}`}>{pkg.description}</p>
                          <ul className="space-y-4 mb-8">
                              {pkg.features.map((feat, j) => (
                                  <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                      <CheckCircle size={18} className={pkg.isPopular ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'} /> {feat}
                                  </li>
                              ))}
                          </ul>
                          <button onClick={onGetStarted} className={`w-full py-3 rounded-xl font-bold transition-all ${pkg.isPopular ? 'bg-white dark:bg-white text-black dark:text-gray-900 hover:bg-gray-100' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'}`}>
                              Get Started
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const RenderCouriers = () => (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
          <div className="max-w-[1280px] mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16">
              <div className="md:w-1/2">
                  <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Deliver Health, Earn Wealth</h1>
                  <p className="text-xl text-gray-500 dark:text-gray-300 mb-8 transition-colors duration-300">Join Tanzania's dedicated medical logistics network. Deliver medicines, lab samples, and happiness.</p>
                  <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3">
                          <CheckCircle className="text-orange-500 dark:text-orange-400" /> <span className="font-bold text-gray-700 dark:text-white">Instant Daily Payouts via Mobile Money</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <CheckCircle className="text-orange-500 dark:text-orange-400" /> <span className="font-bold text-gray-700 dark:text-white">Flexible Shifts - Be Your Own Boss</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <CheckCircle className="text-orange-500 dark:text-orange-400" /> <span className="font-bold text-gray-700 dark:text-white">Medical Handling Training Provided</span>
                      </div>
                  </div>
                  <button onClick={onGetStarted} className="bg-orange-600 dark:bg-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors shadow-lg shadow-orange-600/20">Ride with Us</button>
              </div>
              <div className="md:w-1/2">
                  <div className="bg-gray-100 dark:bg-[#0F172A] rounded-[3rem] p-8 relative transition-colors duration-300">
                      <img src="https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?auto=format&fit=crop&q=80" alt="Courier" className="rounded-3xl shadow-xl w-full" />
                      <div className="absolute -bottom-6 -left-6 bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 flex gap-4 items-center transition-colors duration-300">
                          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400"><DollarSign /></div>
                          <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">Weekly Earnings</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">TZS 350,000</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0F1C] text-gray-900 dark:text-white font-sans overflow-x-hidden selection:bg-teal-100 dark:selection:bg-teal-900/30 selection:text-teal-900 dark:selection:text-teal-100 flex flex-col transition-colors duration-300">
      
      {/* --- Navigation --- */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? 'bg-white/95 dark:bg-[#0A0F1C]/95 backdrop-blur-md py-4 shadow-sm border-b border-gray-100 dark:border-gray-700/50' : 'py-6 bg-white/50 dark:bg-[#0A0F1C]/50 backdrop-blur-sm'}`}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavClick('home')}>
               <LogoIcon className="w-10 h-10" />
               <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors">NexaFya</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500 dark:text-white/80">
               <button onClick={() => handleNavClick('patients')} className={`hover:text-teal-600 dark:hover:text-teal-400 transition-colors ${currentView === 'patients' ? 'text-teal-600 dark:text-teal-400' : ''}`}>Patients</button>
               <button onClick={() => handleNavClick('doctors')} className={`hover:text-teal-600 dark:hover:text-teal-400 transition-colors ${currentView === 'doctors' ? 'text-teal-600 dark:text-teal-400' : ''}`}>Doctors</button>
               <button onClick={() => handleNavClick('pharmacies')} className={`hover:text-teal-600 dark:hover:text-teal-400 transition-colors ${currentView === 'pharmacies' ? 'text-teal-600 dark:text-teal-400' : ''}`}>Pharmacies</button>
               <button onClick={() => handleNavClick('couriers')} className={`hover:text-teal-600 dark:hover:text-teal-400 transition-colors ${currentView === 'couriers' ? 'text-teal-600 dark:text-teal-400' : ''}`}>Couriers</button>
            </div>

            <div className="hidden md:flex items-center gap-4">
               <button 
                 onClick={toggleDarkMode}
                 className="p-2 text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors duration-300"
                 title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
               >
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               <button 
                 onClick={onGetStarted}
                 className="text-sm font-bold text-gray-600 dark:text-white/80 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-4 py-2"
               >
                 Log in
               </button>
               <button 
                 onClick={onGetStarted}
                 className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
               >
                 Get Care Now <ArrowRight size={16} />
               </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
                className="md:hidden text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#0F172A] border-b border-gray-100 dark:border-gray-700/50 p-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 z-40">
                <button onClick={toggleDarkMode} className="text-lg font-bold text-gray-700 dark:text-white py-2 text-left flex items-center gap-2 transition-colors">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={() => handleNavClick('patients')} className="text-lg font-bold text-gray-700 dark:text-white py-2 text-left transition-colors">For Patients</button>
                <button onClick={() => handleNavClick('doctors')} className="text-lg font-bold text-gray-700 dark:text-white py-2 text-left transition-colors">For Doctors</button>
                <button onClick={() => handleNavClick('pharmacies')} className="text-lg font-bold text-gray-700 dark:text-white py-2 text-left transition-colors">Pharmacies</button>
                <button onClick={() => handleNavClick('couriers')} className="text-lg font-bold text-gray-700 dark:text-white py-2 text-left transition-colors">Couriers</button>
                <hr className="border-gray-100 dark:border-gray-800 my-2" />
                <button onClick={onGetStarted} className="w-full py-4 text-center font-bold text-teal-600 dark:text-teal-400 border-2 border-teal-600 dark:border-teal-500 rounded-xl">
                    Log In
                </button>
                <button onClick={onGetStarted} className="w-full py-4 text-center font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg">
                    Get Care Now
                </button>
            </div>
        )}
      </nav>

      {/* --- Main Content Area --- */}
      <main className="flex-grow pt-24 w-full">
         {currentView === 'home' && <RenderHome />}
         {currentView === 'patients' && <RenderPatients />}
         {currentView === 'doctors' && <RenderDoctors />}
         {currentView === 'pharmacies' && <RenderPharmacies />}
         {currentView === 'couriers' && <RenderCouriers />}
      </main>

      {/* --- Footer --- */}
      <footer className="bg-white dark:bg-[#0A0F1C] border-t border-gray-100 dark:border-gray-700/50 pt-24 pb-12 transition-colors duration-300">
          <div className="max-w-[1280px] mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
                  
                  {/* Brand */}
                  <div className="lg:col-span-2">
                      <div className="flex items-center gap-3 mb-6">
                          <LogoIcon className="w-10 h-10" />
                          <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors">NexaFya</span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-300 text-sm leading-relaxed mb-8 max-w-sm">
                          Making healthcare accessible, affordable, and dignified for everyone in East Africa.
                      </p>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-[#0F172A] w-fit px-5 py-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <Phone size={18} /> USSD: *150*80#
                      </div>
                  </div>

                  {/* Links */}
                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-6">Product</h4>
                      <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-300 font-medium">
                          <li><button onClick={() => handleNavClick('patients')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Symptom Checker</button></li>
                          <li><button onClick={() => handleNavClick('doctors')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">For Doctors</button></li>
                          <li><button onClick={() => handleNavClick('pharmacies')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Pharmacy Store</button></li>
                      </ul>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-6">Company</h4>
                      <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-300 font-medium">
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">About Us</a></li>
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Careers</a></li>
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Contact</a></li>
                      </ul>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                      <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-300 font-medium">
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Privacy Policy</a></li>
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Terms of Service</a></li>
                          <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Patient Rights</a></li>
                      </ul>
                  </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 dark:text-gray-500 font-medium">
                  <p>&copy; {new Date().getFullYear()} NexaFya Health Systems. All rights reserved.</p>
                  <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Globe size={14} /> English (US)
                      </button>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
};
