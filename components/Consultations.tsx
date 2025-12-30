
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Medicine, UserRole, PaymentMethod, Doctor, HealthRecord } from '../types';
import { Calendar as CalendarIcon, Video, Clock, ChevronRight, User, FileText, CheckCircle, X, Plus, Pill, Search, AlertCircle, History, Activity, ClipboardList, ArrowLeft, Gift, Award, MoreVertical, MapPin, DollarSign, CreditCard, Shield, Smartphone, Lock, Copy, Hash, Loader2, Navigation, ChevronLeft, LayoutList, Filter, CalendarDays, ExternalLink, Download } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { usePreferences } from '../contexts/PreferencesContext';
import PaymentModal from './PaymentModal';

interface ConsultationsProps {
    role?: UserRole;
    initialDoctorId?: string | null;
    onBookAppointment?: (appointment: Appointment) => void;
    onRescheduleAppointment?: (id: string, date: string, time: string) => void;
    onCancelAppointment?: (id: string) => void;
    appointments?: Appointment[];
    userName?: string;
    onNavigate?: (view: string) => void;
}

export const Consultations: React.FC<ConsultationsProps> = ({ 
    role,
    userName, 
    onNavigate, 
    appointments = [],
    onRescheduleAppointment,
    onCancelAppointment,
    initialDoctorId,
    onBookAppointment
}) => {
  const { notify } = useNotification();
  const { language } = usePreferences();
  
  // -- VIEW STATE --
  const [doctorViewMode, setDoctorViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'notes' | 'history' | 'rx'>('notes');
  
  // -- CALENDAR STATE --
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarSearch, setCalendarSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // -- PATIENT STATE --
  const [patientTab, setPatientTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'confirm'>('form');

  // -- DATA STATE --
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newBooking, setNewBooking] = useState<{ doctor?: Doctor; date: string; time: string; location?: string; mode?: 'CHAT' | 'AUDIO' | 'VIDEO' }>({
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      location: '',
      mode: 'CHAT'
  });

  // Clinical Notes & Rx State
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [prescribedItems, setPrescribedItems] = useState<{name: string, dosage: string}[]>([]);
  const [drugSearch, setDrugSearch] = useState('');
  const [payApt, setPayApt] = useState<Appointment | null>(null);

  useEffect(() => {
      const fetchDoctors = async () => {
          try {
              const data = await db.getDoctors();
              setDoctors(data);
          } catch (e) { console.error(e); }
      };
      if (role === UserRole.PATIENT) fetchDoctors();
  }, [role]);

  // Fetch Patient History when selected patient changes
  useEffect(() => {
      if (selectedApt?.patientId && role === UserRole.DOCTOR) {
          const loadHistory = async () => {
              setHistoryLoading(true);
              try {
                  const history = await db.getPatientFullHistory(selectedApt.patientId!);
                  setPatientHistory(history);
              } catch (e) {
                  console.error(e);
                  notify("Could not load patient history", "error");
              } finally {
                  setHistoryLoading(false);
              }
          };
          loadHistory();
      }
  }, [selectedApt?.patientId, role]);

  // --- CALENDAR LOGIC ---
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad start
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Real days
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentMonth]);

  const filteredCalendarApts = useMemo(() => {
      if (!Array.isArray(appointments)) return [];
      return appointments.filter(apt => {
          try {
              const matchesSearch = (apt?.patientName || '').toLowerCase().includes(calendarSearch.toLowerCase());
              if (!apt?.date) return false;
              const aptDate = new Date(apt.date);
              if (isNaN(aptDate.getTime())) return false;
              
              let matchesRange = true;
              if (dateRange.start) {
                  const startDate = new Date(dateRange.start);
                  matchesRange = matchesRange && !isNaN(startDate.getTime()) && aptDate >= startDate;
              }
              if (dateRange.end) {
                  const endDate = new Date(dateRange.end);
                  matchesRange = matchesRange && !isNaN(endDate.getTime()) && aptDate <= endDate;
              }
              
              return matchesSearch && matchesRange;
          } catch {
              return false;
          }
      });
  }, [appointments, calendarSearch, dateRange]);

  const changeMonth = (offset: number) => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // --- HANDLERS ---
  const handleEndConsultation = async () => {
      if (!soapNotes.assessment || !soapNotes.plan) {
          notify('Please complete the Assessment and Plan before ending.', 'error');
          return;
      }
      
      const combinedNotes = `SUBJECTIVE: ${soapNotes.subjective}\nOBJECTIVE: ${soapNotes.objective}\nASSESSMENT: ${soapNotes.assessment}\nPLAN: ${soapNotes.plan}`;
      
      try {
          if (selectedApt) {
            await db.updateAppointmentStatus(selectedApt.id, 'COMPLETED', combinedNotes);
            notify('Consultation finalized. Summary saved to history.', 'success');
            setSelectedApt(null);
            setSoapNotes({ subjective: '', objective: '', assessment: '', plan: '' });
            setPrescribedItems([]);
          }
      } catch (e) {
          notify("Failed to save consultation summary.", "error");
      }
  };

  const handleJoinCall = () => {
      if (onNavigate) onNavigate('video-call');
      else notify('Video call feature not available in this preview.', 'info');
  };

  // --- RENDER CALENDAR VIEW ---
  const renderCalendar = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* Calendar Controls */}
            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display min-w-[200px] text-center">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search patient..." 
                                value={calendarSearch}
                                onChange={(e) => setCalendarSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl px-3 py-1">
                            <Filter size={16} className="text-gray-400" />
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none"
                            />
                            <span className="text-gray-300">to</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-[#0A1B2E]/50">
                    {weekDays.map(day => (
                        <div key={day} className="py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">{day}</div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 overflow-y-auto">
                    {calendarDays.map((date, i) => {
                        const dateStr = date ? date.toISOString().split('T')[0] : '';
                        // Simple string matching for appointments (standardize formats for real apps)
                        const dayApts = date ? filteredCalendarApts.filter(apt => {
                            const aptD = new Date(apt.date).toISOString().split('T')[0];
                            return aptD === dateStr;
                        }) : [];

                        const isToday = date && date.toDateString() === new Date().toDateString();

                        return (
                            <div key={i} className={`min-h-[140px] p-2 border-r border-b border-gray-50 dark:border-gray-700/50/50 transition-colors ${!date ? 'bg-gray-50/30 dark:bg-[#0A1B2E]/10' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/5'}`}>
                                {date && (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400'}`}>
                                                {date.getDate()}
                                            </span>
                                            {dayApts.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                                        </div>
                                        <div className="space-y-1.5">
                                            {dayApts.map(apt => (
                                                <button 
                                                    key={apt.id}
                                                    onClick={() => { setSelectedApt(apt); setDoctorViewMode('list'); }}
                                                    className={`w-full text-left p-1.5 rounded-lg text-[10px] leading-tight transition-all truncate hover:ring-2 hover:ring-blue-500/20 ${
                                                        apt.status === 'UPCOMING' 
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                                                        : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-600/50 dark:text-gray-300 dark:border-gray-700/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1 font-black mb-0.5">
                                                        <Clock size={8} /> {apt.time}
                                                    </div>
                                                    <p className="font-bold truncate">{apt.patientName}</p>
                                                    <p className="opacity-70 flex items-center gap-1">
                                                        {apt.type === 'VIDEO' ? <Video size={8} /> : <User size={8} />} {apt.type}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
  };

  // --- RENDER PATIENT VIEW ---
  if (role === UserRole.PATIENT) {
      return (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
              <PaymentModal
                isOpen={!!payApt}
                onClose={() => setPayApt(null)}
                amount={payApt?.fee || 0}
                currency={'TZS'}
                description={`Consultation payment: ${payApt?.doctorName || ''}`}
                itemType="consultation"
                itemId={payApt?.id}
                recipientId={payApt?.doctorId}
                onSuccess={() => notify('Payment submitted. Doctor will verify shortly.', 'info')}
              />

              {showBookingModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                  <div className="bg-white dark:bg-[#0A1B2E] w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Book Consultation</h3>
                      <button
                        onClick={() => { setShowBookingModal(false); setBookingStep('form'); }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Doctor */}
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Choose Doctor</label>
                        <select
                          value={newBooking.doctor?.id || ''}
                          onChange={(e) => {
                            const docId = e.target.value;
                            const docObj = doctors.find(d => d.id === docId);
                            setNewBooking(prev => ({ ...prev, doctor: docObj }));
                          }}
                          className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select doctor…</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} • {d.specialty}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date/Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Date</label>
                          <input
                            type="date"
                            value={newBooking.date}
                            onChange={(e) => setNewBooking(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Time</label>
                          <input
                            type="time"
                            value={newBooking.time}
                            onChange={(e) => setNewBooking(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#0A1B2E] border-gray-200 dark:border-gray-700/50 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Mode */}
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Consultation Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['CHAT','AUDIO','VIDEO'] as const).map(m => (
                            <button
                              key={m}
                              onClick={() => setNewBooking(prev => ({ ...prev, mode: m }))}
                              className={`px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                                newBooking.mode === m
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              {m === 'CHAT' ? 'Chat' : m === 'AUDIO' ? 'Audio' : 'Video'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => { setShowBookingModal(false); setBookingStep('form'); }}
                          className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              if (!newBooking.doctor) {
                                notify('Please select a doctor', 'error');
                                return;
                              }
                              const apt: Appointment = {
                                id: `tmp-${Date.now()}`,
                                doctorId: newBooking.doctor.id,
                                doctorName: newBooking.doctor.name,
                                patientName: userName || 'Patient',
                                date: newBooking.date,
                                time: newBooking.time,
                                status: 'UPCOMING',
                                paymentStatus: 'PENDING',
                                type: (newBooking.mode || 'CHAT'),
                                fee: newBooking.doctor.price
                              };
                              await onBookAppointment?.(apt);
                              setShowBookingModal(false);
                            } catch (error) {
                              console.error('Failed to book appointment:', error);
                              notify('Failed to book appointment', 'error');
                            }
                          }}
                          className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                        >
                          Confirm Booking
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h2 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Consultations</h2>
                      <p className="text-gray-500 dark:text-gray-300">Manage your visits and consultations.</p>
                  </div>
                  <div className="flex gap-2">
                      <div className="bg-white dark:bg-[#0F172A] p-1.5 rounded-2xl inline-flex shadow-sm border border-gray-100 dark:border-gray-700/50">
                          <button onClick={() => setPatientTab('upcoming')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${patientTab === 'upcoming' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>Upcoming</button>
                          <button onClick={() => setPatientTab('past')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${patientTab === 'past' ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white shadow-md' : 'text-gray-500'}`}>Past</button>
                      </div>
                      <button onClick={() => setShowBookingModal(true)} className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center">
                          <Plus size={20} />
                      </button>
                  </div>
              </div>
              
              <div className="grid gap-4">
                  {appointments.filter(a => patientTab === 'upcoming' ? a.status === 'UPCOMING' : a.status !== 'UPCOMING').map(apt => (
                      <div key={apt.id} className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row gap-6 items-center relative">
                          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-2xl text-center min-w-[80px]">
                              <span className="block text-2xl font-bold">{new Date(apt.date).getDate()}</span>
                              <span className="block text-xs font-bold uppercase">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                          </div>
                          <div className="flex-1 text-center md:text-left">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{apt.doctorName}</h3>
                              <p className="text-sm text-gray-500">{apt.time} • {apt.type} Consult</p>
                          </div>
                          {apt.paymentStatus !== 'PAID' && (apt.fee || 0) > 0 ? (
                            <button
                              onClick={() => setPayApt(apt)}
                              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <button
                              onClick={() => notify('Consultation is paid. Open from the doctor when ready.', 'info')}
                              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md"
                            >
                              Open
                            </button>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- RENDER DOCTOR VIEW ---
  return (
      <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500">
          
          {/* Main Controls Overlay */}
          <div className="flex justify-between items-center bg-white dark:bg-[#0F172A] p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
             <div className="flex gap-2">
                <button 
                    onClick={() => setDoctorViewMode('list')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${doctorViewMode === 'list' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <LayoutList size={18} /> List View
                </button>
                <button 
                    onClick={() => setDoctorViewMode('calendar')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${doctorViewMode === 'calendar' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <CalendarDays size={18} /> Calendar
                </button>
             </div>
             
             {selectedApt && (
                 <div className="hidden md:flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Active Workspace: {selectedApt.patientName}</span>
                 </div>
             )}
          </div>

          <div className="flex-1 min-h-0">
              {doctorViewMode === 'calendar' ? renderCalendar() : (
                  <div className="h-full flex gap-6">
                    {/* Left Panel: Patient List */}
                    <div className="w-full lg:w-1/3 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display mb-4">Patient Queue</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search queue..." 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {appointments.map(apt => (
                                <div 
                                    key={apt.id} 
                                    onClick={() => setSelectedApt(apt)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                                        selectedApt?.id === apt.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                        : 'bg-white dark:bg-[#0F172A] border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{apt.patientName}</h4>
                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase tracking-wider">{apt.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {apt.type === 'VIDEO' ? <Video size={10}/> : <User size={10}/>}
                                        <span>{apt.type} • {apt.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Workspace */}
                    <div className="hidden lg:flex flex-1 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex-col overflow-hidden relative">
                        {selectedApt ? (
                            <>
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-[#0A1B2E]/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-lg">
                                            {selectedApt.patientName.charAt(0)}
                                        </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedApt.patientName}</h2>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <History size={12}/> {patientHistory.length} Total Records
                                                </p>
                                            </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleJoinCall} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all">
                                            <Video size={18} /> Join Call
                                        </button>
                                    </div>
                                </div>

                                <div className="flex border-b border-gray-100 dark:border-gray-700/50 px-6">
                                    {['notes', 'history', 'rx'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveWorkspaceTab(tab as any)}
                                            className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                                                activeWorkspaceTab === tab 
                                                ? 'border-blue-600 text-blue-600' 
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            {tab === 'rx' ? 'Prescription' : tab === 'history' ? 'Health History' : 'New Note'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 p-8 overflow-y-auto bg-gray-50/30 dark:bg-[#0A1B2E]/10">
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        {activeWorkspaceTab === 'notes' && (
                                            <div className="space-y-6 animate-in fade-in">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Subjective (Symptoms)</label>
                                                        <textarea 
                                                            className="w-full p-4 h-32 rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                                            placeholder="Patient reports..."
                                                            value={soapNotes.subjective}
                                                            onChange={e => setSoapNotes({...soapNotes, subjective: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Objective (Observation)</label>
                                                        <textarea 
                                                            className="w-full p-4 h-32 rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                                            placeholder="Vital signs, physical findings..."
                                                            value={soapNotes.objective}
                                                            onChange={e => setSoapNotes({...soapNotes, objective: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Assessment (Diagnosis)</label>
                                                    <textarea 
                                                        className="w-full p-4 h-32 rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        placeholder="Primary diagnosis..."
                                                        value={soapNotes.assessment}
                                                        onChange={e => setSoapNotes({...soapNotes, assessment: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Plan (Treatment)</label>
                                                    <textarea 
                                                        className="w-full p-4 h-48 rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0A1B2E] resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        placeholder="Next steps, follow up, instructions..."
                                                        value={soapNotes.plan}
                                                        onChange={e => setSoapNotes({...soapNotes, plan: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {activeWorkspaceTab === 'history' && (
                                            <div className="space-y-6 animate-in fade-in">
                                                {historyLoading ? (
                                                    <div className="flex items-center justify-center py-20">
                                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                                    </div>
                                                ) : patientHistory.length === 0 ? (
                                                    <div className="text-center py-20 text-gray-400">
                                                        <History size={48} className="mx-auto mb-4 opacity-10" />
                                                        <p>No past medical history found for this patient.</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative border-l-2 border-blue-100 dark:border-blue-900/30 ml-4 space-y-8 pb-10">
                                                        {patientHistory.map((item, idx) => (
                                                            <div key={item.id} className="relative pl-8">
                                                                <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white dark:border-gray-800 ${item.type === 'CONSULTATION' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                                                <div className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block ${item.type === 'CONSULTATION' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                                {item.type === 'CONSULTATION' ? 'Past Consult' : item.recordType || 'Medical Record'}
                                                                            </span>
                                                                            <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-xs font-bold text-gray-400">{item.date}</p>
                                                                            <p className="text-[10px] text-gray-500 italic">by {item.provider}</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {item.type === 'CONSULTATION' && item.notes && (
                                                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-[#0A1B2E]/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all cursor-help">{item.notes}</p>
                                                                        </div>
                                                                    )}

                                                                    {item.type === 'RECORD' && (
                                                                        <div className="mt-4 flex items-center gap-3">
                                                                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                                                                <ExternalLink size={14}/> View Document
                                                                            </button>
                                                                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                                                                <Download size={14}/>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeWorkspaceTab === 'rx' && (
                                            <div className="animate-in fade-in">
                                                <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700/50">
                                                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                        <Pill className="text-blue-500" size={20}/> Issue Prescription
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                            <input type="text" placeholder="Search medicines database..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl outline-none" />
                                                        </div>
                                                        <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
                                                            <Pill size={32} className="mx-auto mb-2 opacity-10" />
                                                            <p>Search and select medicines to add to prescription.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] flex justify-end gap-4">
                                    <button onClick={() => setSelectedApt(null)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Close Workspace</button>
                                    {activeWorkspaceTab === 'notes' && (
                                        <button onClick={handleEndConsultation} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all">Complete & Save Session</button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <CalendarIcon size={64} className="text-gray-200 dark:text-gray-700 mb-6" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a patient</h3>
                                <p className="text-gray-500 max-w-sm">Open a patient from your queue or the calendar to start a consultation.</p>
                            </div>
                        )}
                    </div>
                  </div>
              )}
          </div>
      </div>
  );
};
