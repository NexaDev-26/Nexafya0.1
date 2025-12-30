import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Bell, 
  Clock, 
  CheckCircle, 
  X, 
  Plus,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';
import { MedicationSchedule } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';
import { ProgressBar } from './ProgressBar';

interface EnhancedMedicationSchedule extends MedicationSchedule {
  frequency?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  notes?: string;
  adherenceRate?: number;
  streak?: number;
  nextDose?: Date;
  missedDoses?: number;
  sideEffects?: string[];
}

export const MedicationReminderEnhanced: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [medications, setMedications] = useState<EnhancedMedicationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<EnhancedMedicationSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    duration: '',
    instructions: '',
  });

  useEffect(() => {
    loadMedications();
    // Check for upcoming doses every minute
    const interval = setInterval(checkUpcomingDoses, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const data = await db.getMedicationSchedules?.(user?.id || '') || [];
      
      // Enhance with adherence data
      const enhanced = data.map(med => {
        const adherenceRate = calculateAdherence(med);
        const streak = calculateStreak(med);
        const nextDose = calculateNextDose(med);
        const missedDoses = calculateMissedDoses(med);

        return {
          ...med,
          adherenceRate,
          streak,
          nextDose,
          missedDoses,
        };
      });

      setMedications(enhanced);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const calculateAdherence = (med: MedicationSchedule): number => {
    // Calculate adherence rate based on taken vs scheduled
    // This would come from actual data
    return Math.floor(Math.random() * 40) + 60; // Mock: 60-100%
  };

  const calculateStreak = (med: MedicationSchedule): number => {
    // Calculate current streak of consecutive doses
    return Math.floor(Math.random() * 30) + 1; // Mock: 1-30 days
  };

  const calculateNextDose = (med: MedicationSchedule): Date => {
    const [hours, minutes] = med.time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    
    if (next < new Date()) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  };

  const calculateMissedDoses = (med: MedicationSchedule): number => {
    // Calculate missed doses in the last week
    return Math.floor(Math.random() * 3); // Mock: 0-2 missed
  };

  const checkUpcomingDoses = () => {
    const now = new Date();
    medications.forEach(med => {
      if (med.nextDose) {
        const timeUntil = med.nextDose.getTime() - now.getTime();
        // Notify 15 minutes before
        if (timeUntil > 0 && timeUntil <= 15 * 60 * 1000) {
          notify(`Time to take ${med.name} in 15 minutes!`, 'info', {
            action: {
              label: 'Mark as Taken',
              onClick: () => handleMarkTaken(med.id),
            },
          });
        }
      }
    });
  };

  const handleMarkTaken = async (id: string) => {
    try {
      await db.markMedicationTaken(id, new Date().toISOString().split('T')[0]);
      notify('Medication marked as taken!', 'success');
      loadMedications();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await db.skipMedicationDose(id, new Date().toISOString().split('T')[0]);
      notify('Dose skipped', 'info');
      loadMedications();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.time) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const medicationData: EnhancedMedicationSchedule = {
        id: editingMedication?.id || Date.now().toString(),
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        time: formData.time,
        taken: false,
        patientName: user?.name || '',
        color: (formData as any).color || 'blue',
        notes: (formData as any).notes || '',
      };

      if (editingMedication) {
        await db.updateMedicationSchedule(editingMedication.id, medicationData);
        notify('Medication updated successfully', 'success');
      } else {
        await db.createMedicationSchedule(medicationData);
        notify('Medication added successfully', 'success');
      }

      setShowForm(false);
      setEditingMedication(null);
      resetForm();
      loadMedications();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      time: '',
      duration: '',
      instructions: '',
    });
  };

  const upcomingMedications = medications.filter(med => {
    if (!med.nextDose) return false;
    const now = new Date();
    const next = med.nextDose;
    return next <= new Date(now.getTime() + 2 * 60 * 60 * 1000); // Next 2 hours
  });

  const todayMedications = medications.filter(med => {
    const today = new Date().toDateString();
    // Filter logic for today's medications
    return true; // Simplified
  });

  if (loading) {
    return <SkeletonLoader type="list" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medication Reminders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your medications</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMedication(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Medication
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Pill className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {medications.length}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Medications</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {medications.length > 0 
              ? Math.round(medications.reduce((sum, m) => sum + (m.adherenceRate || 0), 0) / medications.length)
              : 0}%
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Adherence</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Award className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {medications.length > 0 
              ? Math.max(...medications.map(m => m.streak || 0))
              : 0}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Best Streak</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {upcomingMedications.length}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming (2h)</p>
        </div>
      </div>

      {/* Upcoming Medications */}
      {upcomingMedications.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl border border-blue-200 dark:border-blue-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="text-blue-600 dark:text-blue-400" size={20} />
            Upcoming Doses (Next 2 Hours)
          </h2>
          <div className="space-y-3">
            {upcomingMedications.map(med => (
              <div
                key={med.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-blue-200 dark:border-blue-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Pill className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{med.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {med.dosage} • {med.frequency}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                      {med.nextDose && new Date(med.nextDose).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkTaken(med.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Mark Taken
                  </button>
                  <button
                    onClick={() => handleSkip(med.id)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Medications */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Medications</h2>
        </div>
        {medications.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No medications scheduled"
            description="Add medications to start tracking your adherence"
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Add Medication
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {medications.map(med => (
              <div
                key={med.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${
                      med.taken ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Pill className={med.taken ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {med.name}
                        </h3>
                        {med.taken && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                            Taken
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <span>{med.dosage}</span>
                        <span>•</span>
                        <span>{med.frequency}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {med.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        {med.adherenceRate !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Adherence:</span>
                            <ProgressBar
                              current={med.adherenceRate}
                              total={100}
                              showLabel={false}
                              color={med.adherenceRate >= 80 ? 'green' : med.adherenceRate >= 60 ? 'orange' : 'purple'}
                              className="w-24"
                            />
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {med.adherenceRate}%
                            </span>
                          </div>
                        )}
                        {med.streak !== undefined && (
                          <div className="flex items-center gap-2">
                            <Award size={14} className="text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {med.streak} day streak
                            </span>
                          </div>
                        )}
                        {med.missedDoses !== undefined && med.missedDoses > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-orange-600 dark:text-orange-400" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                              {med.missedDoses} missed this week
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!med.taken && (
                      <button
                        onClick={() => handleMarkTaken(med.id)}
                        className="px-4 py-2 text-sm font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Mark Taken
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingMedication(med);
                        setFormData({
                          name: med.name,
                          dosage: med.dosage,
                          frequency: med.frequency,
                          time: med.time,
                          duration: '',
                          instructions: '',
                        });
                        setShowForm(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await db.deleteMedicationSchedule(med.id);
                          notify('Medication removed', 'success');
                          loadMedications();
                        } catch (error) {
                          handleError(error, notify);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medication Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingMedication ? 'Edit Medication' : 'Add Medication'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingMedication(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Paracetamol 500mg"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={3}
                  placeholder="e.g., Take with food"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingMedication(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <Pill size={18} />
                {editingMedication ? 'Update Medication' : 'Add Medication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

