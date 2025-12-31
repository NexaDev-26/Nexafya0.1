import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, Plus, X, Check, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { db as firestore } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

interface TimeSlot {
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  available: boolean;
}

interface DaySchedule {
  day: string; // 'Monday', 'Tuesday', etc.
  enabled: boolean;
  timeSlots: TimeSlot[];
}

interface DoctorSchedule {
  doctorId: string;
  weeklySchedule: DaySchedule[];
  timeSlotDuration: number; // minutes, default 30
  updatedAt?: any;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: '1', startTime: '09:00', endTime: '09:30', available: true },
  { id: '2', startTime: '09:30', endTime: '10:00', available: true },
  { id: '3', startTime: '10:00', endTime: '10:30', available: true },
  { id: '4', startTime: '10:30', endTime: '11:00', available: true },
  { id: '5', startTime: '11:00', endTime: '11:30', available: true },
  { id: '6', startTime: '11:30', endTime: '12:00', available: true },
  { id: '7', startTime: '14:00', endTime: '14:30', available: true },
  { id: '8', startTime: '14:30', endTime: '15:00', available: true },
  { id: '9', startTime: '15:00', endTime: '15:30', available: true },
  { id: '10', startTime: '15:30', endTime: '16:00', available: true },
  { id: '11', startTime: '16:00', endTime: '16:30', available: true },
  { id: '12', startTime: '16:30', endTime: '17:00', available: true },
];

export const DoctorSchedule: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DoctorSchedule>({
    doctorId: user?.id || '',
    weeklySchedule: DAYS_OF_WEEK.map(day => ({
      day,
      enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
      timeSlots: DEFAULT_TIME_SLOTS.map(slot => ({ ...slot }))
    })),
    timeSlotDuration: 30,
  });

  useEffect(() => {
    if (user?.id) {
      loadSchedule();
    }
  }, [user?.id]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const scheduleRef = doc(firestore, 'doctorSchedules', user!.id);
      const scheduleDoc = await getDoc(scheduleRef);
      
      if (scheduleDoc.exists()) {
        const data = scheduleDoc.data() as DoctorSchedule;
        setSchedule({
          doctorId: user!.id,
          weeklySchedule: data.weeklySchedule || schedule.weeklySchedule,
          timeSlotDuration: data.timeSlotDuration || 30,
        });
      } else {
        // Initialize with default schedule
        setSchedule({
          doctorId: user!.id,
          weeklySchedule: DAYS_OF_WEEK.map(day => ({
            day,
            enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
            timeSlots: DEFAULT_TIME_SLOTS.map((slot, idx) => ({ ...slot, id: `${idx + 1}` }))
          })),
          timeSlotDuration: 30,
        });
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
      notify('Failed to load schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const scheduleRef = doc(firestore, 'doctorSchedules', user.id);
      await setDoc(scheduleRef, cleanFirestoreData({
        ...schedule,
        updatedAt: serverTimestamp(),
      }), { merge: true });

      // Also update the doctor's availability array in doctors collection
      const enabledDays = schedule.weeklySchedule
        .filter(day => day.enabled)
        .map(day => day.day);
      
      const doctorRef = doc(firestore, 'doctors', user.id);
      await setDoc(doctorRef, {
        availability: enabledDays,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      notify('Schedule saved successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      notify(`Failed to save schedule: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, idx) =>
        idx === dayIndex ? { ...day, enabled: !day.enabled } : day
      ),
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, idx) => {
        if (idx === dayIndex) {
          const lastSlot = day.timeSlots[day.timeSlots.length - 1];
          const newStartTime = lastSlot ? lastSlot.endTime : '09:00';
          const [hours, minutes] = newStartTime.split(':').map(Number);
          const endMinutes = minutes + schedule.timeSlotDuration;
          const endHours = hours + Math.floor(endMinutes / 60);
          const finalMinutes = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
          
          return {
            ...day,
            timeSlots: [
              ...day.timeSlots,
              {
                id: `${Date.now()}`,
                startTime: newStartTime,
                endTime: endTime,
                available: true,
              }
            ]
          };
        }
        return day;
      }),
    }));
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, idx) => {
        if (idx === dayIndex) {
          return {
            ...day,
            timeSlots: day.timeSlots.filter((_, sIdx) => sIdx !== slotIndex)
          };
        }
        return day;
      }),
    }));
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, idx) => {
        if (idx === dayIndex) {
          return {
            ...day,
            timeSlots: day.timeSlots.map((slot, sIdx) => {
              if (sIdx === slotIndex) {
                return { ...slot, [field]: value };
              }
              return slot;
            })
          };
        }
        return day;
      }),
    }));
  };

  const toggleSlotAvailability = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, idx) => {
        if (idx === dayIndex) {
          return {
            ...day,
            timeSlots: day.timeSlots.map((slot, sIdx) => {
              if (sIdx === slotIndex) {
                return { ...slot, available: !slot.available };
              }
              return slot;
            })
          };
        }
        return day;
      }),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-blue-600" size={28} />
            Schedule Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set your available days and time slots for patient appointments
          </p>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Schedule
            </>
          )}
        </button>
      </div>

      {/* Time Slot Duration */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
          Appointment Duration (minutes)
        </label>
        <select
          value={schedule.timeSlotDuration}
          onChange={(e) => setSchedule(prev => ({ ...prev, timeSlotDuration: Number(e.target.value) }))}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        {schedule.weeklySchedule.map((daySchedule, dayIndex) => (
          <div
            key={daySchedule.day}
            className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(dayIndex)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    daySchedule.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      daySchedule.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {daySchedule.day}
                </h3>
                {daySchedule.enabled && (
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                    Active
                  </span>
                )}
              </div>
              {daySchedule.enabled && (
                <button
                  onClick={() => addTimeSlot(dayIndex)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Add Slot
                </button>
              )}
            </div>

            {daySchedule.enabled ? (
              <div className="space-y-2">
                {daySchedule.timeSlots.map((slot, slotIndex) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Clock size={18} className="text-gray-400" />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'startTime', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'endTime', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                      />
                    </div>
                    <button
                      onClick={() => toggleSlotAvailability(dayIndex, slotIndex)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        slot.available
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {slot.available ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {daySchedule.timeSlots.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No time slots added. Click "Add Slot" to add availability.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                This day is disabled. Toggle to enable and add time slots.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
