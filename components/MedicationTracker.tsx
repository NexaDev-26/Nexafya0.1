/**
 * Medication Tracker Component
 * Allows patients to track medication schedules and adherence
 */

import React, { useState, useEffect } from 'react';
import { Pill, Clock, CheckCircle, XCircle, Calendar, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { medicationReminderService, MedicationSchedule, MedicationDose } from '../services/medicationReminderService';
import { usePreferences } from '../contexts/PreferencesContext';

export const MedicationTracker: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = usePreferences();
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<MedicationDose[]>([]);
  const [adherenceStats, setAdherenceStats] = useState({
    totalDoses: 0,
    takenDoses: 0,
    skippedDoses: 0,
    adherenceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedules' | 'upcoming' | 'stats'>('schedules');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [scheds, upcoming, stats] = await Promise.all([
        medicationReminderService.getSchedules(user.id),
        medicationReminderService.getUpcomingDoses(user.id, 24),
        medicationReminderService.getAdherenceStats(user.id, 30),
      ]);

      setSchedules(scheds);
      setUpcomingDoses(upcoming);
      setAdherenceStats(stats);
    } catch (error) {
      console.error('Load medication data error:', error);
      notify('Failed to load medication data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (scheduleId: string, scheduledTime: string) => {
    if (!user?.id) return;

    try {
      await medicationReminderService.markDoseTaken(scheduleId, scheduledTime, user.id);
      notify('Medication marked as taken', 'success');
      loadData();
    } catch (error) {
      notify('Failed to update medication', 'error');
    }
  };

  const handleMarkSkipped = async (scheduleId: string, scheduledTime: string) => {
    if (!user?.id) return;

    try {
      await medicationReminderService.markDoseSkipped(scheduleId, scheduledTime, user.id);
      notify('Medication marked as skipped', 'info');
      loadData();
    } catch (error) {
      notify('Failed to update medication', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Clock className="animate-spin mx-auto mb-4 text-nexafya-blue" size={32} />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">{t('medicationTracker')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your medications and adherence</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700/50">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'schedules'
              ? 'text-nexafya-blue border-b-2 border-nexafya-blue'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t('schedules') || 'Schedules'}
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'upcoming'
              ? 'text-nexafya-blue border-b-2 border-nexafya-blue'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t('upcoming') || 'Upcoming'}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'stats'
              ? 'text-nexafya-blue border-b-2 border-nexafya-blue'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t('statistics') || 'Statistics'}
        </button>
      </div>

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#0A1B2E]/50 rounded-2xl">
              <Pill className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500 dark:text-gray-400">No medication schedules found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Your doctor will add medications after consultation</p>
            </div>
          ) : (
            schedules.map(schedule => (
              <div
                key={schedule.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{schedule.medicationName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{schedule.dosage}</p>
                    {schedule.instructions && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">{schedule.instructions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase">
                      {schedule.frequency.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Times</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {schedule.times.join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Start Date</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(schedule.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">End Date</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {schedule.endDate ? new Date(schedule.endDate).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Prescribed By</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {schedule.doctorName || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upcoming Doses Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingDoses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#0A1B2E]/50 rounded-2xl">
              <Clock className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500 dark:text-gray-400">No upcoming doses in the next 24 hours</p>
            </div>
          ) : (
            upcomingDoses.map((dose, index) => {
              const schedule = schedules.find(s => s.id === dose.scheduleId);
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Pill className="text-blue-600 dark:text-blue-400" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {schedule?.medicationName || 'Medication'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {schedule?.dosage} • {dose.scheduledTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!dose.taken && !dose.skipped && (
                        <>
                          <button
                            onClick={() => handleMarkTaken(dose.scheduleId, dose.scheduledTime)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-bold text-sm"
                          >
                            <CheckCircle size={16} />
                            Taken
                          </button>
                          <button
                            onClick={() => handleMarkSkipped(dose.scheduleId, dose.scheduledTime)}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 font-bold text-sm"
                          >
                            <XCircle size={16} />
                            Skip
                          </button>
                        </>
                      )}
                      {dose.taken && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle size={20} />
                          <span className="font-bold">Taken</span>
                        </div>
                      )}
                      {dose.skipped && (
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                          <XCircle size={20} />
                          <span className="font-bold">Skipped</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Adherence Rate</p>
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {adherenceStats.adherenceRate}%
            </p>
            <p className="text-xs text-gray-400 mt-2">Last 30 days</p>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Doses Taken</p>
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {adherenceStats.takenDoses}
            </p>
            <p className="text-xs text-gray-400 mt-2">Out of {adherenceStats.totalDoses} total</p>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Doses Skipped</p>
              <XCircle className="text-orange-600 dark:text-orange-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {adherenceStats.skippedDoses}
            </p>
            <p className="text-xs text-gray-400 mt-2">Need attention</p>
          </div>
        </div>
      )}
    </div>
  );
};

