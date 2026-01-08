
import React, { useState, useEffect } from 'react';
import { SymptomChecker } from './SymptomChecker';
import { Bot, Stethoscope, TestTube, MapPin, Calendar, Clock, ChevronRight, X, User as UserIcon, CreditCard, CheckCircle, Search, Star, Filter, ArrowLeft, Video, MessageSquare, Phone, Loader2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { Appointment, User, Doctor, UserRole } from '../types';
import { db } from '../services/db';
import { firebaseDb } from '../services/firebaseDb';
import { addSampleDoctors } from '../utils/addSampleDoctors';
import { useAuth } from '../contexts/AuthContext';

interface CareCenterProps {
    initialTab?: 'ai' | 'doctors' | 'labs';
    onBookAppointment?: (appointment: Appointment) => void;
    user?: User;
}

export const CareCenter: React.FC<CareCenterProps> = ({ initialTab = 'ai', onBookAppointment, user }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'doctors' | 'labs'>(initialTab);
  const { notify } = useNotification();
  const { user: currentUser } = useAuth();

  // Booking Modal State (Shared)
  const [bookingItem, setBookingItem] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00');
  
  // Doctor Finder State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  
  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
      const loadDoctors = async () => {
          try {
              console.log('Loading doctors...');
              setLoadingDoctors(true);
              const data = await db.getDoctors();
              console.log('Doctors loaded:', data.length, data);
              
              if (!data || data.length === 0) {
                  console.warn('No doctors returned from database. Checking if doctors exist in Firestore...');
                  setDoctors([]);
                  setLoadingDoctors(false);
                  return;
              }
              
              // Show all active doctors (verified and unverified)
              // Verified doctors will be sorted first
              const activeDoctors = data.filter((doc: Doctor) => {
                const isActive = doc.isActive !== false;
                if (!isActive) {
                  console.log(`Doctor ${doc.name} (${doc.id}) is inactive, filtering out`);
                }
                return isActive;
              });
              
              console.log('Active doctors after filter:', activeDoctors.length);
              console.log('Active doctors details:', activeDoctors.map(d => ({ id: d.id, name: d.name, specialty: d.specialty, isActive: d.isActive, verificationStatus: d.verificationStatus })));
              
              setDoctors(activeDoctors);
              setLoadingDoctors(false);
              
              if (activeDoctors.length === 0) {
                  console.warn('No active doctors found. Make sure doctors are registered and active.');
              } else {
                  console.log(`✅ Successfully loaded ${activeDoctors.length} active doctors`);
              }
          } catch (error: any) {
              console.error('Error loading doctors:', error);
              console.error('Error details:', {
                  message: error.message,
                  code: error.code,
                  stack: error.stack
              });
              setLoadingDoctors(false);
              setDoctors([]);
              notify(`Failed to load specialists: ${error.message || 'Unknown error'}. Please check console for details.`, "error");
          }
      };
      loadDoctors();
  }, [notify]);

  useEffect(() => {
      const loadReviews = async () => {
          if (!selectedDoctor) return;
          try {
              const data = await db.getDoctorReviews(selectedDoctor.id);
              setReviews(data);
          } catch (error) {
              console.error(error);
          }
      };
      loadReviews();
  }, [selectedDoctor]);

  // Load available time slots when doctor and date are selected
  useEffect(() => {
      const loadAvailableSlots = async () => {
          if (!selectedDoctor || !bookingDate) {
              setAvailableSlots([]);
              return;
          }
          setLoadingSlots(true);
          try {
              const slots = await firebaseDb.getAvailableTimeSlots(selectedDoctor.id, bookingDate);
              setAvailableSlots(slots);
              // Clear selected slot if it's no longer available
              if (selectedSlot && !slots.includes(selectedSlot)) {
                  setSelectedSlot(null);
              }
          } catch (error) {
              console.error('Failed to load available slots:', error);
              setAvailableSlots([]);
          } finally {
              setLoadingSlots(false);
          }
      };
      loadAvailableSlots();
  }, [selectedDoctor, bookingDate]);

  const LAB_TESTS = [
      { id: 1, name: 'Malaria MRDT & Blood Slide', price: 15000, time: '30 mins', type: 'Pathology', lab: 'Afya Diagnostics' },
      { id: 2, name: 'Full Blood Picture (FBP)', price: 25000, time: '24 hrs', type: 'Hematology', lab: 'City Lab Hub' },
      { id: 3, name: 'Typhoid Widal Test', price: 12000, time: '1 hr', type: 'Pathology', lab: 'Afya Diagnostics' },
      { id: 4, name: 'Liver Function Test', price: 45000, time: '24 hrs', type: 'Biochemistry', lab: 'Regency Center' },
      { id: 5, name: 'Chest X-Ray', price: 35000, time: 'Instant', type: 'Imaging', lab: 'City Lab Hub' },
  ];

  // Filter to show only active doctors (verified and unverified)
  // Verified doctors will be shown first, unverified will have a badge
  const activeDoctors = doctors.filter(doc => 
    (doc.isActive !== false) // Include if isActive is true or undefined
  );

  const specialties = ['All', ...Array.from(new Set(activeDoctors.map(d => d.specialty)))];

  const filteredDoctors = activeDoctors.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) || 
                            doc.specialty.toLowerCase().includes(doctorSearch.toLowerCase());
      const matchesSpecialty = specialtyFilter === 'All' || doc.specialty === specialtyFilter;
      return matchesSearch && matchesSpecialty;
  }).sort((a, b) => {
    // Sort: Verified first, then by rating
    if (a.verificationStatus === 'Verified' && b.verificationStatus !== 'Verified') return -1;
    if (a.verificationStatus !== 'Verified' && b.verificationStatus === 'Verified') return 1;
    return b.rating - a.rating;
  });

  const handleInitiateBooking = (item: any, type: 'lab' | 'doctor') => {
      if (type === 'doctor' && !selectedSlot) {
          notify('Please select an available time slot first', 'error');
          return;
      }
      setBookingItem({ ...item, bookingType: type });
      if (type === 'doctor' && selectedSlot) {
          // For doctor bookings, slot and date are already selected
          setBookingTime(selectedSlot);
      } else {
          // For lab bookings, set default date/time
      setBookingDate(new Date().toISOString().split('T')[0]);
      setBookingTime('09:00');
      }
  };

  const handleConfirmBooking = async () => {
      if (!bookingItem) return;

      // For doctor bookings, ensure slot is selected
      if (bookingItem.bookingType === 'doctor' && !selectedSlot && !bookingTime) {
          notify('Please select a time slot', 'error');
          return;
      }

      if (onBookAppointment && user) {
          const newAppointment: Appointment = {
              id: Date.now().toString(),
              doctorName: bookingItem.bookingType === 'doctor' ? bookingItem.name : bookingItem.lab,
              doctorId: bookingItem.bookingType === 'doctor' ? bookingItem.id : undefined,
              patientName: user.name,
              patientId: user.id,
              date: bookingDate,
              time: selectedSlot || bookingTime,
              status: 'UPCOMING',
              paymentStatus: 'PENDING',
              type: bookingItem.bookingType === 'doctor' ? 'VIDEO' : 'IN_PERSON',
              fee: bookingItem.price || (bookingItem.bookingType === 'doctor' ? bookingItem.price : 0)
          };
          
          try {
              await onBookAppointment(newAppointment);
          notify(`Appointment confirmed with ${newAppointment.doctorName} on ${bookingDate}`, 'success');
              setBookingItem(null);
              setSelectedDoctor(null);
              setSelectedSlot(null);
          } catch (error: any) {
              notify(error.message || 'Failed to book appointment', 'error');
          }
      } else {
          notify(`Booking request for ${bookingItem.name} sent!`, 'success');
          setBookingItem(null);
          setSelectedDoctor(null);
          setSelectedSlot(null);
      }
  };

  const handleSubmitReview = async () => {
      if (!selectedDoctor || !user || user.role !== UserRole.PATIENT) {
          notify("Only patients can submit reviews.", "error");
          return;
      }

      if (!reviewComment.trim()) {
          notify("Please write a review comment.", "error");
          return;
      }

      setIsSubmittingReview(true);
      try {
          await db.submitReview(selectedDoctor.id, user.id, reviewRating, reviewComment, user.name);
          notify("Review submitted successfully!", "success");
          setReviewComment('');
          setReviewRating(5);
          setShowReviewForm(false);
          
          // Reload reviews and doctor data
          const updatedReviews = await db.getDoctorReviews(selectedDoctor.id);
          setReviews(updatedReviews);
          
          // Reload doctors to get updated rating
          const updatedDoctors = await db.getDoctors();
          setDoctors(updatedDoctors);
          const updatedDoctor = updatedDoctors.find(d => d.id === selectedDoctor.id);
          if (updatedDoctor) {
              setSelectedDoctor(updatedDoctor);
          }
      } catch (error: any) {
          notify(error.message || "Failed to submit review", "error");
      } finally {
          setIsSubmittingReview(false);
      }
  };

  const renderDoctors = () => {
      if (selectedDoctor) {
          return (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                  <button 
                      onClick={() => setSelectedDoctor(null)}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 font-bold"
                  >
                      <ArrowLeft size={20} /> Back to Specialists
                  </button>

                  <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700/50">
                      {/* Doctor Profile Header */}
                      <div className="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-600">
                          <div className="absolute -bottom-16 left-8 flex items-end">
                              <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                                  {selectedDoctor.avatar ? (
                                      <img 
                                          src={selectedDoctor.avatar} 
                                          className="w-full h-full object-cover" 
                                          alt={selectedDoctor.name}
                                          onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                  const initials = selectedDoctor.name.split(' ').length >= 2
                                                      ? (selectedDoctor.name.split(' ')[0].charAt(0) + selectedDoctor.name.split(' ')[selectedDoctor.name.split(' ').length - 1].charAt(0)).toUpperCase()
                                                      : selectedDoctor.name.substring(0, 2).toUpperCase();
                                                  parent.innerHTML = `<span class="text-white font-bold text-3xl">${initials}</span>`;
                                              }
                                          }}
                                      />
                                  ) : (
                                      <span className="text-white font-bold text-3xl">
                                          {selectedDoctor.name.split(' ').length >= 2
                                              ? (selectedDoctor.name.split(' ')[0].charAt(0) + selectedDoctor.name.split(' ')[selectedDoctor.name.split(' ').length - 1].charAt(0)).toUpperCase()
                                              : selectedDoctor.name.substring(0, 2).toUpperCase()}
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>
                      
                      <div className="pt-20 px-8 pb-8">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                              <div className="flex-1">
                                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap mb-2">
                                      {selectedDoctor.name.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`}
                                      {selectedDoctor.verificationStatus === 'Verified' && (
                                          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                                              <CheckCircle size={12} fill="currentColor" /> Verified
                                          </span>
                                      )}
                                  </h2>
                                  
                                  {/* Rating and Experience */}
                                  <div className="flex items-center gap-4 mb-3 flex-wrap">
                                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                                          <Star size={18} fill="currentColor" /> {selectedDoctor.rating.toFixed(1)}
                                      </div>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                          {selectedDoctor.experience || selectedDoctor.yearsOfExperience || 0}y exp
                                      </span>
                                      {selectedDoctor.verificationStatus === 'Verified' && (
                                          <>
                                              <span className="text-gray-300">•</span>
                                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                  Verified Professional
                                              </span>
                                          </>
                                      )}
                                  </div>
                                  
                                  {/* Specialty and Location */}
                                  <p className="text-lg text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2 mb-3">
                                      <Stethoscope size={18} />
                                      {selectedDoctor.specialty || 'General Practitioner'} • {selectedDoctor.location || 'Tanzania'}
                                  </p>
                                  
                                  {/* Bio/Description */}
                                  {selectedDoctor.bio ? (
                                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed max-w-2xl mb-3">
                                          {selectedDoctor.bio}
                                      </p>
                                  ) : (
                                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed max-w-2xl mb-3">
                                          {selectedDoctor.name.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`} is a {selectedDoctor.specialty || 'General Practitioner'} with {selectedDoctor.experience || selectedDoctor.yearsOfExperience || 0} years of comprehensive medical experience. Dedicated to providing exceptional patient care with a focus on preventive medicine and holistic health.
                                      </p>
                                  )}
                                  
                                  {/* Location Details */}
                                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                          <MapPin size={16} />
                                          <span>{selectedDoctor.location || 'Tanzania'}</span>
                                      </div>
                                      {selectedDoctor.workplace && (
                                          <>
                                              <span className="text-gray-300">•</span>
                                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                  <MapPin size={16} />
                                                  <span>{selectedDoctor.workplace}</span>
                                              </div>
                                          </>
                                      )}
                                      {selectedDoctor.email && (
                                          <>
                                              <span className="text-gray-300">•</span>
                                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                  <span>{selectedDoctor.email}</span>
                                              </div>
                                          </>
                                      )}
                                      {selectedDoctor.phone && (
                                          <>
                                              <span className="text-gray-300">•</span>
                                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                  <Phone size={16} />
                                                  <span>{selectedDoctor.phone}</span>
                                              </div>
                                          </>
                                      )}
                                  </div>
                              </div>
                              <div className="flex gap-3 mt-4 md:mt-0">
                                  <button 
                                      onClick={() => {
                                          if (onNavigate) onNavigate('messages');
                                          notify('Opening chat...', 'info');
                                      }}
                                      className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Send Message"
                                  >
                                      <MessageSquare size={20} />
                                  </button>
                                  {selectedDoctor.phone && (
                                      <a 
                                          href={`tel:${selectedDoctor.phone}`}
                                          className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                          title="Call Doctor"
                                      >
                                          <Phone size={20} />
                                      </a>
                                  )}
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="md:col-span-2 space-y-8">
                                  <div>
                                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">About Doctor</h3>
                                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                          {selectedDoctor.bio || `Dr. ${selectedDoctor.name.split(' ')[1] || selectedDoctor.name} is a distinguished ${selectedDoctor.specialty} with over ${selectedDoctor.experience} years of experience in top medical institutions. Dedicated to providing comprehensive care with a focus on patient well-being and preventive medicine.`}
                                      </p>
                                      
                                      {/* Professional Details */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                          {selectedDoctor.workplace && (
                                              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Workplace</p>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedDoctor.workplace}</p>
                                              </div>
                                          )}
                                          {selectedDoctor.medicalLicenseNumber && (
                                              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">License Number</p>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedDoctor.medicalLicenseNumber}</p>
                                              </div>
                                          )}
                                          {selectedDoctor.medicalCouncilRegistration && (
                                              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Council Registration</p>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedDoctor.medicalCouncilRegistration}</p>
                                              </div>
                                          )}
                                          {selectedDoctor.verificationStatus && (
                                              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Verification Status</p>
                                                  <p className={`text-sm font-medium ${
                                                      selectedDoctor.verificationStatus === 'Verified' ? 'text-emerald-600 dark:text-emerald-400' :
                                                      selectedDoctor.verificationStatus === 'Pending' ? 'text-amber-600 dark:text-amber-400' :
                                                      'text-gray-600 dark:text-gray-400'
                                                  }`}>
                                                      {selectedDoctor.verificationStatus}
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <div>
                                      <div className="flex justify-between items-center mb-4">
                                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Reviews</h3>
                                          {user && user.role === UserRole.PATIENT && (
                                              <button
                                                  onClick={() => setShowReviewForm(!showReviewForm)}
                                                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                              >
                                                  {showReviewForm ? 'Cancel' : 'Write Review'}
                                              </button>
                                          )}
                                      </div>

                                      {showReviewForm && user && user.role === UserRole.PATIENT && (
                                          <div className="bg-gray-50 dark:bg-gray-100/50 p-4 rounded-xl mb-4 border border-gray-200 dark:border-gray-700/50">
                                              <div className="mb-3">
                                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                                                  <div className="flex gap-1">
                                                      {[1, 2, 3, 4, 5].map((star) => (
                                                          <button
                                                              key={star}
                                                              onClick={() => setReviewRating(star)}
                                                              className="focus:outline-none"
                                                          >
                                                              <Star
                                                                  size={24}
                                                                  className={star <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                                                              />
                                                          </button>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div className="mb-3">
                                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Review</label>
                                                  <textarea
                                                      value={reviewComment}
                                                      onChange={(e) => setReviewComment(e.target.value)}
                                                      placeholder="Share your experience with this doctor..."
                                                      className="w-full p-3 border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      rows={4}
                                                  />
                                              </div>
                                              <button
                                                  onClick={handleSubmitReview}
                                                  disabled={isSubmittingReview}
                                                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                              >
                                                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                                              </button>
                                          </div>
                                      )}

                                      {reviews.length === 0 ? (
                                          <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
                                      ) : (
                                          <div className="space-y-4">
                                              {reviews.map((review) => (
                                                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                                                      <div className="flex items-start justify-between mb-2">
                                                          <div className="flex items-center gap-2">
                                                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                                  {review.patientName.charAt(0)}
                                                              </div>
                                                              <div>
                                                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{review.patientName}</p>
                                                                  <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                                              </div>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                              <Star size={14} className="text-amber-500 fill-amber-500" />
                                                              <span className="text-sm font-medium text-gray-900 dark:text-white">{review.rating}</span>
                                                          </div>
                                                      </div>
                                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{review.comment}</p>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  <div>
                                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Book Appointment</h3>
                                      
                                      {/* Date Selection */}
                                      <div className="mb-6">
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                              Select Date
                                          </label>
                                          <input
                                              type="date"
                                              value={bookingDate}
                                              onChange={(e) => {
                                                  setBookingDate(e.target.value);
                                                  setSelectedSlot(null); // Clear selected slot when date changes
                                              }}
                                              min={new Date().toISOString().split('T')[0]}
                                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                          />
                                      </div>

                                      {/* Available Time Slots */}
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                              Available Time Slots
                                          </label>
                                          {loadingSlots ? (
                                              <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="animate-spin text-blue-600" size={24} />
                                              </div>
                                          ) : availableSlots.length === 0 ? (
                                              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                  <Clock className="mx-auto text-gray-400 mb-2" size={32} />
                                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                                      {bookingDate ? 'No available slots for this date. Please select another date.' : 'Please select a date first.'}
                                                  </p>
                                              </div>
                                          ) : (
                                              <div className="flex flex-wrap gap-2">
                                                  {availableSlots.map((slot) => {
                                                      // Convert 24h format to 12h format for display
                                                      const [hours, minutes] = slot.split(':').map(Number);
                                                      const period = hours >= 12 ? 'PM' : 'AM';
                                                      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                                                      const displaySlot = `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
                                                      
                                                      return (
                                                          <button 
                                                              key={slot}
                                                              onClick={() => setSelectedSlot(slot)}
                                                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                                  selectedSlot === slot 
                                                                  ? 'bg-blue-600 text-white shadow-md' 
                                                                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700'
                                                              }`}
                                                          >
                                                              {displaySlot}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              <div className="md:col-span-1">
                                  <div className="bg-gray-50 dark:bg-gray-100/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 sticky top-4">
                                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Booking Summary</h3>
                                      <div className="flex justify-between mb-2 text-sm">
                                          <span className="text-gray-500">Consultation Fee</span>
                                          <span className="font-bold text-gray-900 dark:text-white">TZS {selectedDoctor.price.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between mb-4 text-sm">
                                          <span className="text-gray-500">Service Fee</span>
                                          <span className="font-bold text-gray-900 dark:text-white">TZS 2,000</span>
                                      </div>
                                      
                                      <div className="border-t border-gray-200 dark:border-gray-700/50 my-4"></div>
                                      
                                      <div className="flex justify-between mb-6 text-lg font-bold">
                                          <span>Total</span>
                                          <span className="text-blue-600">TZS {(selectedDoctor.price + 2000).toLocaleString()}</span>
                                      </div>

                                      <button 
                                          onClick={() => handleInitiateBooking(selectedDoctor, 'doctor')}
                                          disabled={!selectedSlot}
                                          className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      >
                                          {selectedSlot ? 'Book Appointment' : 'Select a Time Slot'}
                                      </button>
                                      {!selectedSlot && <p className="text-xs text-center text-red-500 mt-2">Please select a time slot above.</p>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Find a Specialist</h3>
                      <p className="text-gray-500 dark:text-gray-400">Connect with top doctors for video or in-person consultations.</p>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                              type="text" 
                              placeholder="Search name, specialty..." 
                              value={doctorSearch}
                              onChange={(e) => setDoctorSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      <div className="relative">
                          <select 
                              value={specialtyFilter}
                              onChange={(e) => setSpecialtyFilter(e.target.value)}
                              className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white font-medium"
                          >
                              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                  </div>
              </div>

              {loadingDoctors ? (
                  <div className="text-center py-20">
                      <Loader2 className="mx-auto mb-4 text-blue-600 animate-spin" size={48} />
                      <p className="text-gray-500 dark:text-gray-400 font-bold">Loading specialists...</p>
                  </div>
              ) : doctors.length === 0 ? (
                  <div className="text-center py-20">
                      <Stethoscope className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-500 dark:text-gray-400 font-bold">No specialists found</p>
                      <p className="text-sm text-gray-400 mt-2 mb-4">No doctors are available in the database yet.</p>
                      {(currentUser?.role === UserRole.ADMIN) && (
                          <button
                              onClick={async () => {
                                  notify('Adding sample doctors...', 'info');
                                  setLoadingDoctors(true);
                                  const result = await addSampleDoctors();
                                  if (result.success) {
                                      notify(result.message, 'success');
                                      // Reload doctors
                                      const data = await db.getDoctors();
                                      const activeDoctors = data.filter((doc: Doctor) => doc.isActive !== false);
                                      setDoctors(activeDoctors);
                                  } else {
                                      notify(result.message, 'error');
                                  }
                                  setLoadingDoctors(false);
                              }}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                          >
                              Add Sample Doctors
                          </button>
                      )}
                  </div>
              ) : filteredDoctors.length === 0 ? (
                  <div className="text-center py-20">
                      <Search className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-500 dark:text-gray-400 font-bold">No doctors match your search</p>
                      <p className="text-sm text-gray-400 mt-2">Try different keywords or clear filters</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredDoctors.map((doc) => {
                          // Generate initials from name (e.g., "Dr. Zero" -> "DZ")
                          const getInitials = (name: string) => {
                              const parts = name.split(' ');
                              if (parts.length >= 2) {
                                  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                              }
                              return name.substring(0, 2).toUpperCase();
                          };
                          
                          return (
                              <div key={doc.id} onClick={() => setSelectedDoctor(doc)} className="bg-white dark:bg-[#0F172A] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group flex flex-col">
                                  {/* Top Section: Avatar and Info */}
                                  <div className="flex items-start justify-between mb-4">
                                      {/* Large Avatar with Initials */}
                                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                                          {doc.avatar ? (
                                              <img 
                                                  src={doc.avatar} 
                                                  alt={doc.name} 
                                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                  onError={(e) => {
                                                      const target = e.target as HTMLImageElement;
                                                      target.style.display = 'none';
                                                      const parent = target.parentElement;
                                                      if (parent) {
                                                          parent.innerHTML = `<span class="text-white font-bold text-2xl">${getInitials(doc.name)}</span>`;
                                                      }
                                                  }} 
                                              />
                                          ) : (
                                              <span className="text-white font-bold text-2xl">{getInitials(doc.name)}</span>
                                          )}
                                      </div>
                                      
                                      {/* Right Side: Rating, Experience, Verification */}
                                      <div className="flex flex-col items-end gap-1.5">
                                          {/* Rating */}
                                          <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                              <Star size={14} fill="currentColor" /> {doc.rating.toFixed(1)}
                                          </span>
                                          
                                          {/* Experience */}
                                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                              {doc.experience || doc.yearsOfExperience || 0}y exp
                                          </span>
                                          
                                          {/* Verification Badge */}
                                          {doc.verificationStatus === 'Verified' ? (
                                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <CheckCircle size={10} /> Verified
                                              </span>
                                          ) : doc.verificationStatus === 'Pending' || doc.verificationStatus === 'Under Review' ? (
                                              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">⏳ Pending</span>
                                          ) : (
                                              <span className="text-xs text-gray-500 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Unverified</span>
                                          )}
                                      </div>
                                  </div>
                                  
                                  {/* Doctor Name */}
                                  <h4 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-2">
                                      {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                  </h4>
                                  
                                  {/* Specialty and Location */}
                                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3 flex items-center gap-1.5">
                                      <Stethoscope size={14} className="flex-shrink-0" />
                                      <span>{doc.specialty || 'General Practitioner'}</span>
                                      <span className="text-blue-400">•</span>
                                      <span>{doc.location || 'Tanzania'}</span>
                                  </p>
                                  
                                  {/* Bio/Description */}
                                  {doc.bio ? (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-3 leading-relaxed">
                                          {doc.bio}
                                      </p>
                                  ) : (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 italic">
                                          {doc.specialty || 'General Practitioner'} with {doc.experience || doc.yearsOfExperience || 0} years of experience.
                                      </p>
                                  )}

                                  {/* Hospital/Workplace */}
                                  {doc.workplace && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                                          <MapPin size={12} className="flex-shrink-0" />
                                          <span>{doc.workplace}</span>
                                      </p>
                                  )}

                                  {/* Bottom Section: Consultation Price and Action */}
                                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                      <div>
                                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">CONSULTATION</p>
                                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                                              TZS {(doc.price || 0).toLocaleString()}
                                          </p>
                                      </div>
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedDoctor(doc);
                                          }}
                                          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex-shrink-0"
                                      >
                                          <ChevronRight size={20} />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      );
  };

  const renderLabs = () => (
      <div className="animate-in fade-in slide-in-from-right duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Diagnostics & Lab Tests</h3>
                  <p className="text-gray-500 dark:text-gray-400">Book tests at accredited centers or request home sample collection.</p>
              </div>
              <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Home Collection Available</span>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LAB_TESTS.map((test) => (
                  <div key={test.id} className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-xl ${test.type === 'Imaging' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'} dark:bg-gray-700`}>
                              <TestTube size={24} />
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">TZS {test.price.toLocaleString()}</span>
                      </div>
                      
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{test.name}</h4>
                      <p className="text-sm text-gray-500 mb-4">{test.lab}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                          <span className="flex items-center gap-1"><Clock size={12}/> {test.time}</span>
                          <span className="flex items-center gap-1"><MapPin size={12}/> Mikocheni</span>
                      </div>

                      <button 
                        onClick={() => handleInitiateBooking(test, 'lab')}
                        className="w-full py-3 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                      >
                          Book Test <ChevronRight size={16} />
                      </button>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Booking Confirmation Modal */}
      {bookingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-gray-100 dark:border-gray-700">
                  <button onClick={() => setBookingItem(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>

                  <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Confirm Appointment</h3>
                      <p className="text-sm text-gray-500">Please review the details below.</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-[#0A0F1C]/50 p-4 rounded-2xl mb-6 space-y-3 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-bold uppercase">Service</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white text-right">
                              {bookingItem.bookingType === 'doctor' ? 'Consultation' : bookingItem.name}
                          </span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-bold uppercase">Provider</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {bookingItem.bookingType === 'doctor' ? bookingItem.name : bookingItem.lab}
                          </span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-bold uppercase">Price</span>
                          <span className="text-sm font-bold text-emerald-600">TZS {bookingItem.price.toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Patient</label>
                          <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                                  {user?.name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</span>
                          </div>
                      </div>

                      {bookingItem.bookingType === 'doctor' ? (
                          // Doctor booking - show selected date and slot (read-only)
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Date</label>
                                  <div className="p-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white font-medium">
                                      {new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Time</label>
                                  <div className="p-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white font-medium">
                                      {(() => {
                                          const timeStr = selectedSlot || bookingTime;
                                          const [hours, minutes] = timeStr.split(':').map(Number);
                                          const period = hours >= 12 ? 'PM' : 'AM';
                                          const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                                          return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
                                      })()}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          // Lab booking - allow date/time selection
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Date</label>
                              <div className="relative">
                                  <input 
                                      type="date" 
                                      value={bookingDate}
                                      onChange={(e) => setBookingDate(e.target.value)}
                                          min={new Date().toISOString().split('T')[0]}
                                      className="w-full pl-3 pr-2 py-3 bg-white dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Time</label>
                              <div className="relative">
                                  <input 
                                      type="time" 
                                          value={bookingTime}
                                          onChange={(e) => setBookingTime(e.target.value)}
                                      className="w-full pl-3 pr-2 py-3 bg-white dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                  />
                              </div>
                          </div>
                      </div>
                      )}
                  </div>

                  <button 
                      onClick={handleConfirmBooking}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                      <CheckCircle size={18} /> Confirm Booking
                  </button>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Care Center</h2>
            <p className="text-gray-500 dark:text-gray-400">Get immediate AI insights, book a specialist, or schedule lab tests.</p>
        </div>
        <div className="bg-white dark:bg-[#0F172A] p-1.5 rounded-2xl inline-flex shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto max-w-full">
            <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
            }`}
            >
            <Bot size={18} /> AI Doctor
            </button>
            <button
            onClick={() => { setActiveTab('doctors'); setSelectedDoctor(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'doctors'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
            }`}
            >
            <Stethoscope size={18} /> Specialists
            </button>
            <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'labs'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
            }`}
            >
            <TestTube size={18} /> Lab Tests
            </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px]">
        {activeTab === 'ai' && <SymptomChecker />}
        {activeTab === 'doctors' && renderDoctors()}
        {activeTab === 'labs' && renderLabs()}
      </div>
    </div>
  );
};
