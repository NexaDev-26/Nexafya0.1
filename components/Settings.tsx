
import React, { useState } from 'react';
import { Bell, Moon, Sun, Globe, Shield, Smartphone, Eye, Lock, FileText, Database, RefreshCw, Key, CheckCircle, AlertTriangle, QrCode, Copy, Mail, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { usePreferences, Language, Currency } from '../contexts/PreferencesContext';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
  const { notify } = useNotification();
  const { user, sendPasswordReset } = useAuth();
  const { language, setLanguage, currency, setCurrency } = usePreferences();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications'>('general');
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
    appointments: true,
    messages: true,
    payments: true,
    articles: true,
    system: true
  });
  
  // Security Modal States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'method' | 'code'>('method');
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'phone'>('phone');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']); // Array for 6 boxes
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleOtpChange = (index: number, value: string) => {
      if (isNaN(Number(value))) return;
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);
      // Auto-focus next input
      if (value && index < 5) {
          const nextInput = document.getElementById(`otp-${index + 1}`);
          nextInput?.focus();
      }
  };

  const handleVerifyComplete = () => {
      const code = otpCode.join('');
      if (code === '123456') { // Mock check
          setIs2FAEnabled(true);
          setShowVerificationModal(false);
          setOtpCode(['', '', '', '', '', '']);
          setVerifyStep('method');
          notify('Two-Factor Authentication Enabled Successfully!', 'success');
      } else {
          notify('Invalid Code. Please try 123456.', 'error');
      }
  };

  const renderVerificationModal = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl relative overflow-hidden">
            <button 
                onClick={() => setShowVerificationModal(false)} 
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
            >
                <X size={20} />
            </button>

            <div className="p-8">
                {verifyStep === 'method' ? (
                    <div className="animate-in slide-in-from-right">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Verification</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-sm">Choose how you'd like to verify your profile to enable 2FA.</p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => { setVerifyMethod('email'); setVerifyStep('code'); }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                                        <Mail size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900 dark:text-white">Email</p>
                                        <p className="text-xs text-gray-500">Send code to email address</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500" />
                            </button>

                            <button 
                                onClick={() => { setVerifyMethod('phone'); setVerifyStep('code'); }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
                                        <Smartphone size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900 dark:text-white">Phone</p>
                                        <p className="text-xs text-gray-500">Send SMS with verification code</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right text-center">
                        <button onClick={() => setVerifyStep('method')} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
                        
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your {verifyMethod}</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                            Enter the 6-digit verification code sent to <br/>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {verifyMethod === 'email' ? user?.email : '+255 7XX XXX XXX'}
                            </span>
                        </p>

                          <div className="flex justify-center gap-2 mb-8">
                              {otpCode.map((digit, index) => (
                                  <input
                                      key={index}
                                      id={`otp-${index}`}
                                      type="text"
                                      maxLength={1}
                                      value={digit}
                                      onChange={(e) => handleOtpChange(index, e.target.value)}
                                      className="w-12 h-14 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-center text-xl font-bold bg-transparent dark:text-white focus:border-teal-500 focus:ring-0 outline-none transition-colors"
                                  />
                              ))}
                          </div>

                          <button 
                              onClick={handleVerifyComplete}
                              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 transition-all mb-4"
                          >
                              Verify
                          </button>
                          
                          <p className="text-xs text-gray-400">
                              Resend code in <span className="text-teal-600 font-bold">00:45</span>
                          </p>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  const renderSecurity = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-2xl flex items-center justify-center">
                      <Shield size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white">Login & Security</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account protection settings.</p>
                  </div>
              </div>

              <div className="space-y-4">
                  {/* Password Change Card */}
                  <div className="p-6 border border-gray-200 dark:border-gray-700/50 rounded-3xl bg-gray-50 dark:bg-[#0A1B2E]/50 hover:bg-white dark:hover:bg-gray-800 transition-colors group cursor-pointer" onClick={() => sendPasswordReset(user?.email || '')}>
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white">Password</h4>
                          <button className="text-teal-600 text-sm font-bold group-hover:underline">Update</button>
                      </div>
                      <p className="text-xs text-gray-500">Last changed 3 months ago</p>
                  </div>

                  {/* 2FA Card */}
                  <div className="p-6 border border-gray-200 dark:border-gray-700/50 rounded-3xl bg-gray-50 dark:bg-[#0A1B2E]/50 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                          <button 
                              onClick={() => !is2FAEnabled && setShowVerificationModal(true)}
                              className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${is2FAEnabled ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${is2FAEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">Add an extra layer of security to your account by requiring a code when signing in.</p>
                      {is2FAEnabled ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-lg w-fit">
                              <CheckCircle size={14} /> Enabled via Phone
                          </div>
                      ) : (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg w-fit">
                              <AlertTriangle size={14} /> Not Set Up
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderNotifications = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Bell size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white">Notification Preferences</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Control how and when you receive notifications.</p>
                  </div>
              </div>

              <div className="space-y-6">
                  {/* Notification Channels */}
                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4">Notification Channels</h4>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Email Notifications</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, email: !prev.email }));
                                      notify(notificationSettings.email ? 'Email notifications disabled' : 'Email notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.email ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.email ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Push Notifications</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Browser and app push notifications</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, push: !prev.push }));
                                      notify(notificationSettings.push ? 'Push notifications disabled' : 'Push notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.push ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.push ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">SMS Notifications</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive text message notifications</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, sms: !prev.sms }));
                                      notify(notificationSettings.sms ? 'SMS notifications disabled' : 'SMS notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.sms ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.sms ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Notification Types */}
                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4">What to Notify Me About</h4>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Appointments & Consultations</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Reminders and updates about appointments</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, appointments: !prev.appointments }));
                                      notify(notificationSettings.appointments ? 'Appointment notifications disabled' : 'Appointment notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.appointments ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.appointments ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Messages</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">New messages and chat notifications</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, messages: !prev.messages }));
                                      notify(notificationSettings.messages ? 'Message notifications disabled' : 'Message notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.messages ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.messages ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Payments & Transactions</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Payment confirmations and transaction updates</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, payments: !prev.payments }));
                                      notify(notificationSettings.payments ? 'Payment notifications disabled' : 'Payment notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.payments ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.payments ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">Articles & Content</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">New articles and content updates</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, articles: !prev.articles }));
                                      notify(notificationSettings.articles ? 'Article notifications disabled' : 'Article notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.articles ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.articles ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                          <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">System Updates</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Important system announcements and updates</p>
                              </div>
                              <button 
                                  onClick={() => {
                                      setNotificationSettings(prev => ({ ...prev, system: !prev.system }));
                                      notify(notificationSettings.system ? 'System notifications disabled' : 'System notifications enabled', 'info');
                                  }}
                                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationSettings.system ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${notificationSettings.system ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  // Re-using simplified General render for brevity in this response
  const renderGeneral = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-6">Preferences</h3>
              
              <div className="grid gap-6">
                  <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-gray-700/50">
                      <div>
                          <p className="font-bold text-gray-900 dark:text-white">Language</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Select your preferred language</p>
                      </div>
                      <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="bg-gray-100 dark:bg-[#0A1B2E] border border-transparent dark:border-gray-700/50 rounded-xl px-4 py-2 font-bold text-sm outline-none text-gray-900 dark:text-white">
                          <option value="en">English</option>
                          <option value="sw">Swahili</option>
                      </select>
                  </div>
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="font-bold text-gray-900 dark:text-white">Currency</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">For billing and payments</p>
                      </div>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="bg-gray-100 dark:bg-[#0A1B2E] border border-transparent dark:border-gray-700/50 rounded-xl px-4 py-2 font-bold text-sm outline-none text-gray-900 dark:text-white">
                          <option value="TZS">TZS (Tanzanian Shilling)</option>
                          <option value="USD">USD</option>
                      </select>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
        {showVerificationModal && renderVerificationModal()}

        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Account Settings</h2>
        </div>

        <div className="bg-gray-100 dark:bg-[#0F172A] p-1 rounded-2xl flex gap-1 border border-transparent dark:border-gray-700/50">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'general' ? 'bg-white dark:bg-blue-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
                General
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'notifications' ? 'bg-white dark:bg-blue-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
                Notifications
            </button>
            <button 
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'security' ? 'bg-white dark:bg-blue-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
                Security & Privacy
            </button>
        </div>

        {activeTab === 'general' ? renderGeneral() : activeTab === 'notifications' ? renderNotifications() : renderSecurity()}
    </div>
  );
};
