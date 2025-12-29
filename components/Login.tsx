
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Activity, ShieldCheck, User as UserIcon, Loader2, Lock, Mail, ArrowRight, Eye, EyeOff, X, CheckSquare, Square, Smartphone, KeyRound } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { auth } from '../lib/firebase';

interface LoginProps {
  onLogin: () => void;
  onClose: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onClose }) => {
  const { signIn, signUp } = useAuth();
  const { notify } = useNotification();
  
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isRegistering, setIsRegistering] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [referralCode, setReferralCode] = useState('');

  // Check URL for referral code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, []);

  // Initialize from LocalStorage
  useEffect(() => {
      const savedEmail = localStorage.getItem('nexa_remember_email');
      if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
      }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (localLoading) return;

      if (authMethod === 'phone') {
          if (!phone) {
              notify('Please enter a phone number', 'error');
              return;
          }
          
          if (!showOtpInput) {
              setLocalLoading(true);
              setTimeout(() => {
                  setLocalLoading(false);
                  setShowOtpInput(true);
                  notify('OTP code sent to your phone via SMS.', 'info');
              }, 1500);
              return;
          }

          if (otp.length < 4) {
              notify('Invalid OTP Code', 'error');
              return;
          }

          setLocalLoading(true);
          try {
              // Simulation for phone - in real app, use Supabase verifyOtp
              const mockEmail = `${role.toLowerCase()}@nexafya.com`;
              const success = await signIn(mockEmail, 'password');
              if (success) onLogin();
          } catch (err) {
              notify("Phone login failed", "error");
          } finally {
              setLocalLoading(false);
          }
          return;
      }

      if (!email || !password) {
          notify('Please fill in all fields', 'error');
          return;
      }

      if (isRegistering && !name) {
          notify('Name is required for registration', 'error');
          return;
      }

      if (rememberMe) {
          localStorage.setItem('nexa_remember_email', email);
      } else {
          localStorage.removeItem('nexa_remember_email');
      }

      setLocalLoading(true);
      try {
          let success = false;
          if (isRegistering) {
              success = await signUp(email, password, name, role);
              // Apply referral code after successful registration
              if (success && referralCode) {
                  try {
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                          await db.applyReferralCode(currentUser.uid, referralCode);
                          notify('Referral code applied! You got 15% off your first consultation!', 'success');
                      }
                  } catch (refErr) {
                      console.error('Failed to apply referral code:', refErr);
                      // Don't fail registration if referral fails
                  }
              }
          } else {
              success = await signIn(email, password);
          }
          
          if (success) {
              onLogin();
          }
      } catch (error: any) {
          console.error(error);
          notify(error.message || "Authentication failed", "error");
      } finally {
          setLocalLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0F172A] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300">
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-200 dark:hover:bg-gray-300 rounded-full transition-colors text-gray-500 dark:text-gray-300"
          >
            <X size={20} />
          </button>

          <div className="hidden md:flex md:w-1/2 bg-[#051818] relative flex-col justify-center p-12 text-white overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#051818] to-[#0B3B3B] opacity-90 z-0"></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                      <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                          <Activity size={32} className="text-emerald-400" />
                      </div>
                      <h1 className="text-3xl font-serif font-bold tracking-tight">NexaFya</h1>
                  </div>
                  
                  <h2 className="text-4xl font-bold mb-6 leading-tight">
                      Healthcare,<br/>
                      <span className="text-emerald-400">Simplified.</span>
                  </h2>
                  <p className="text-gray-300 text-lg max-w-md mb-12 leading-relaxed">
                      Access world-class medical care, AI diagnostics, and pharmacy services instantly.
                  </p>
              </div>
          </div>

          <div className="w-full md:w-1/2 bg-white dark:bg-[#0F172A] overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-6 sm:p-8 md:p-12">
                  <div className="w-full max-w-md space-y-6">
                      
                      <div className="text-center md:text-left pt-2 md:pt-0">
                          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-serif">
                              {authMethod === 'phone' && showOtpInput ? 'Verify OTP' : isRegistering ? 'Create Account' : 'Welcome Back'}
                          </h2>
                          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2">
                              {authMethod === 'phone' && showOtpInput ? 'Enter the code sent to your phone.' : 'Enter your details to access your dashboard.'}
                          </p>
                      </div>

                      {!showOtpInput && (
                          <div className="flex p-1 bg-gray-100 dark:bg-gray-200 rounded-xl">
                              <button 
                                  onClick={() => setAuthMethod('email')}
                                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${authMethod === 'email' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                              >
                                  <Mail size={16} /> Email
                              </button>
                              <button 
                                  onClick={() => setAuthMethod('phone')}
                                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${authMethod === 'phone' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                              >
                                  <Smartphone size={16} /> Phone
                              </button>
                          </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                          {((isRegistering && authMethod === 'email') || authMethod === 'phone') && (
                              <div className="space-y-3 animate-in slide-in-from-top-4">
                                  {isRegistering && (
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
                                          <div className="relative">
                                              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                              <input 
                                                  type="text" 
                                                  value={name}
                                                  onChange={(e) => setName(e.target.value)}
                                                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                                  placeholder="John Doe"
                                                  disabled={localLoading}
                                              />
                                          </div>
                                      </div>
                                  )}
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                          {authMethod === 'phone' ? 'Simulate Role (Demo)' : 'I am a...'}
                                      </label>
                                      <div className="flex flex-wrap gap-2">
                                          {[UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY, UserRole.COURIER].map((r) => (
                                              <button
                                                  key={r}
                                                  type="button"
                                                  onClick={() => setRole(r)}
                                                  disabled={localLoading}
                                                  className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide border transition-all whitespace-nowrap ${
                                                      role === r 
                                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                                      : 'bg-white dark:bg-[#0F172A] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700/50 hover:border-emerald-300'
                                                  }`}
                                              >
                                                  {r.replace('_', ' ')}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {authMethod === 'phone' && !showOtpInput && (
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mobile Number</label>
                                  <div className="relative">
                                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <input 
                                          type="tel" 
                                          value={phone}
                                          onChange={(e) => setPhone(e.target.value)}
                                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-100 border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                          placeholder="+255 7XX XXX XXX"
                                          disabled={localLoading}
                                      />
                                  </div>
                              </div>
                          )}

                          {authMethod === 'phone' && showOtpInput && (
                              <div className="animate-in slide-in-from-right">
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">One-Time Password</label>
                                  <div className="relative">
                                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <input 
                                          type="text" 
                                          value={otp}
                                          onChange={(e) => setOtp(e.target.value)}
                                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-100 border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-900 dark:text-white tracking-widest text-center text-xl"
                                          placeholder="0 0 0 0"
                                          maxLength={6}
                                          disabled={localLoading}
                                          autoFocus
                                      />
                                  </div>
                                  <button type="button" onClick={() => setShowOtpInput(false)} className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-2 hover:underline">
                                      Change Phone Number
                                  </button>
                              </div>
                          )}

                          {authMethod === 'email' && (
                              <>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email Address</label>
                                      <div className="relative">
                                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                          <input 
                                              type="email" 
                                              value={email}
                                              onChange={(e) => setEmail(e.target.value)}
                                              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-100 border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                              placeholder="name@nexafya.com"
                                              disabled={localLoading}
                                          />
                                      </div>
                                  </div>

                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Password</label>
                                      <div className="relative">
                                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                          <input 
                                              type={showPassword ? "text" : "password"} 
                                              value={password}
                                              onChange={(e) => setPassword(e.target.value)}
                                              className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-100 border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                              placeholder="••••••••"
                                              disabled={localLoading}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                          >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                          </button>
                                      </div>
                                  </div>
                              </>
                          )}

                          <button 
                              type="submit" 
                              disabled={localLoading}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                          >
                              {localLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                  authMethod === 'phone' 
                                    ? (showOtpInput ? 'Verify & Login' : 'Send OTP') 
                                    : (isRegistering ? 'Create Account' : 'Sign In')
                              )}
                              {!localLoading && <ArrowRight size={20} />}
                          </button>
                      </form>

                      {authMethod === 'email' && (
                          <div className="text-center pt-1">
                              <p className="text-sm text-gray-500">
                                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                                  <button onClick={() => !localLoading && setIsRegistering(!isRegistering)} className="ml-2 text-emerald-600 font-bold hover:underline">
                                      {isRegistering ? 'Sign In' : 'Sign Up'}
                                  </button>
                              </p>
                          </div>
                      )}

                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
