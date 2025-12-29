/**
 * Medication Reminder Service
 * Handles medication schedules, reminders, and tracking
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';

export interface MedicationSchedule {
  id?: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: 'ONCE_DAILY' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'FOUR_TIMES_DAILY' | 'AS_NEEDED';
  times: string[]; // e.g., ['08:00', '20:00']
  startDate: string;
  endDate?: string;
  duration?: number; // days
  instructions?: string;
  doctorId?: string;
  doctorName?: string;
  prescriptionId?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface MedicationDose {
  id?: string;
  scheduleId: string;
  patientId: string;
  scheduledTime: string;
  takenTime?: string;
  taken: boolean;
  skipped: boolean;
  notes?: string;
  createdAt?: any;
}

export interface MedicationReminder {
  scheduleId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  reminderTime: string; // Time to send reminder (e.g., 15 minutes before)
  sent: boolean;
  sentAt?: any;
}

export interface RefillReminder {
  id?: string;
  patientId: string;
  medicationName: string;
  scheduleId: string;
  prescriptionId?: string;
  currentQuantity?: number;
  daysBeforeRefill: number; // How many days before running out to remind
  lastRefillDate?: string;
  nextRefillDate: string;
  reminderSent: boolean;
  reminderSentAt?: any;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

class MedicationReminderService {
  /**
   * Create a medication schedule
   */
  async createSchedule(schedule: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const scheduleRef = await addDoc(collection(firestore, 'medicationSchedules'), {
        ...schedule,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create initial dose records
      await this.createDoseRecords(scheduleRef.id, schedule);

      return scheduleRef.id;
    } catch (error) {
      console.error('Create medication schedule error:', error);
      throw error;
    }
  }

  /**
   * Get all medication schedules for a patient
   */
  async getSchedules(patientId: string): Promise<MedicationSchedule[]> {
    try {
      const q = query(
        collection(firestore, 'medicationSchedules'),
        where('patientId', '==', patientId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MedicationSchedule[];
    } catch (error) {
      console.error('Get medication schedules error:', error);
      return [];
    }
  }

  /**
   * Mark a dose as taken
   */
  async markDoseTaken(
    scheduleId: string,
    scheduledTime: string,
    patientId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      // Find the dose record
      const dosesQuery = query(
        collection(firestore, 'medicationDoses'),
        where('scheduleId', '==', scheduleId),
        where('patientId', '==', patientId),
        where('scheduledTime', '==', scheduledTime)
      );

      const dosesSnapshot = await getDocs(dosesQuery);

      if (dosesSnapshot.empty) {
        // Create new dose record
        await addDoc(collection(firestore, 'medicationDoses'), {
          scheduleId,
          patientId,
          scheduledTime,
          takenTime: new Date().toISOString(),
          taken: true,
          skipped: false,
          notes,
          createdAt: serverTimestamp(),
        });
      } else {
        // Update existing dose record
        const doseDoc = dosesSnapshot.docs[0];
        await updateDoc(doc(firestore, 'medicationDoses', doseDoc.id), {
          taken: true,
          takenTime: new Date().toISOString(),
          skipped: false,
          notes,
        });
      }

      return true;
    } catch (error) {
      console.error('Mark dose taken error:', error);
      return false;
    }
  }

  /**
   * Mark a dose as skipped
   */
  async markDoseSkipped(
    scheduleId: string,
    scheduledTime: string,
    patientId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const dosesQuery = query(
        collection(firestore, 'medicationDoses'),
        where('scheduleId', '==', scheduleId),
        where('patientId', '==', patientId),
        where('scheduledTime', '==', scheduledTime)
      );

      const dosesSnapshot = await getDocs(dosesQuery);

      if (dosesSnapshot.empty) {
        await addDoc(collection(firestore, 'medicationDoses'), {
          scheduleId,
          patientId,
          scheduledTime,
          taken: false,
          skipped: true,
          notes: reason,
          createdAt: serverTimestamp(),
        });
      } else {
        const doseDoc = dosesSnapshot.docs[0];
        await updateDoc(doc(firestore, 'medicationDoses', doseDoc.id), {
          taken: false,
          skipped: true,
          notes: reason,
        });
      }

      return true;
    } catch (error) {
      console.error('Mark dose skipped error:', error);
      return false;
    }
  }

  /**
   * Get upcoming doses for a patient
   */
  async getUpcomingDoses(patientId: string, hours: number = 24): Promise<MedicationDose[]> {
    try {
      const schedules = await this.getSchedules(patientId);
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const upcomingDoses: MedicationDose[] = [];

      for (const schedule of schedules) {
        for (const timeStr of schedule.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const doseTime = new Date();
          doseTime.setHours(hours, minutes, 0, 0);

          // If time has passed today, check tomorrow
          if (doseTime < now) {
            doseTime.setDate(doseTime.getDate() + 1);
          }

          if (doseTime <= futureTime) {
            // Check if already taken
            const dosesQuery = query(
              collection(firestore, 'medicationDoses'),
              where('scheduleId', '==', schedule.id),
              where('patientId', '==', patientId),
              where('scheduledTime', '==', timeStr)
            );

            const dosesSnapshot = await getDocs(dosesQuery);
            const existingDose = dosesSnapshot.docs[0]?.data() as MedicationDose | undefined;

            if (!existingDose || !existingDose.taken) {
              upcomingDoses.push({
                scheduleId: schedule.id!,
                patientId,
                scheduledTime: timeStr,
                taken: false,
                skipped: false,
                ...existingDose,
              });
            }
          }
        }
      }

      return upcomingDoses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    } catch (error) {
      console.error('Get upcoming doses error:', error);
      return [];
    }
  }

  /**
   * Get medication adherence statistics
   */
  async getAdherenceStats(patientId: string, days: number = 30): Promise<{
    totalDoses: number;
    takenDoses: number;
    skippedDoses: number;
    adherenceRate: number;
  }> {
    try {
      const schedules = await this.getSchedules(patientId);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      let totalDoses = 0;
      let takenDoses = 0;
      let skippedDoses = 0;

      for (const schedule of schedules) {
        const scheduleStart = new Date(schedule.startDate);
        const scheduleEnd = schedule.endDate ? new Date(schedule.endDate) : endDate;

        const relevantStart = scheduleStart > startDate ? scheduleStart : startDate;
        const relevantEnd = scheduleEnd < endDate ? scheduleEnd : endDate;

        if (relevantStart > relevantEnd) continue;

        const daysDiff = Math.ceil((relevantEnd.getTime() - relevantStart.getTime()) / (1000 * 60 * 60 * 24));

        for (const timeStr of schedule.times) {
          const dosesForTime = daysDiff;
          totalDoses += dosesForTime;

          // Count taken/skipped doses
          const dosesQuery = query(
            collection(firestore, 'medicationDoses'),
            where('scheduleId', '==', schedule.id),
            where('patientId', '==', patientId),
            where('scheduledTime', '==', timeStr)
          );

          const dosesSnapshot = await getDocs(dosesQuery);
          dosesSnapshot.forEach(doc => {
            const dose = doc.data() as MedicationDose;
            if (dose.taken) takenDoses++;
            if (dose.skipped) skippedDoses++;
          });
        }
      }

      const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

      return {
        totalDoses,
        takenDoses,
        skippedDoses,
        adherenceRate: Math.round(adherenceRate * 100) / 100,
      };
    } catch (error) {
      console.error('Get adherence stats error:', error);
      return {
        totalDoses: 0,
        takenDoses: 0,
        skippedDoses: 0,
        adherenceRate: 0,
      };
    }
  }

  /**
   * Create dose records for a schedule
   */
  private async createDoseRecords(
    scheduleId: string,
    schedule: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // This would create initial dose records, but for now we'll create them on-demand
    // In production, you might want to pre-create dose records for the entire schedule
  }

  /**
   * Deactivate a medication schedule
   */
  async deactivateSchedule(scheduleId: string): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'medicationSchedules', scheduleId), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Deactivate schedule error:', error);
      return false;
    }
  }

  /**
   * Create a refill reminder
   */
  async createRefillReminder(reminder: Omit<RefillReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reminderRef = await addDoc(collection(firestore, 'refillReminders'), {
        ...reminder,
        reminderSent: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return reminderRef.id;
    } catch (error) {
      console.error('Create refill reminder error:', error);
      throw error;
    }
  }

  /**
   * Get refill reminders for a patient
   */
  async getRefillReminders(patientId: string): Promise<RefillReminder[]> {
    try {
      const q = query(
        collection(firestore, 'refillReminders'),
        where('patientId', '==', patientId),
        where('isActive', '==', true),
        orderBy('nextRefillDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as RefillReminder[];
    } catch (error) {
      console.error('Get refill reminders error:', error);
      return [];
    }
  }

  /**
   * Get upcoming refills (within next X days)
   */
  async getUpcomingRefills(patientId: string, days: number = 7): Promise<RefillReminder[]> {
    try {
      const reminders = await this.getRefillReminders(patientId);
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return reminders.filter(reminder => {
        const refillDate = new Date(reminder.nextRefillDate);
        return refillDate <= futureDate && refillDate >= now;
      });
    } catch (error) {
      console.error('Get upcoming refills error:', error);
      return [];
    }
  }

  /**
   * Mark refill reminder as sent
   */
  async markRefillReminderSent(reminderId: string): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'refillReminders', reminderId), {
        reminderSent: true,
        reminderSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Mark refill reminder sent error:', error);
      return false;
    }
  }

  /**
   * Update refill date after medication refilled
   */
  async updateRefillDate(reminderId: string, newRefillDate: string, quantity?: number): Promise<boolean> {
    try {
      const updateData: any = {
        nextRefillDate: newRefillDate,
        lastRefillDate: new Date().toISOString(),
        reminderSent: false, // Reset reminder
        updatedAt: serverTimestamp(),
      };

      if (quantity !== undefined) {
        updateData.currentQuantity = quantity;
      }

      await updateDoc(doc(firestore, 'refillReminders', reminderId), updateData);
      return true;
    } catch (error) {
      console.error('Update refill date error:', error);
      return false;
    }
  }

  /**
   * Deactivate refill reminder
   */
  async deactivateRefillReminder(reminderId: string): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'refillReminders', reminderId), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Deactivate refill reminder error:', error);
      return false;
    }
  }
}

export const medicationReminderService = new MedicationReminderService();
export default medicationReminderService;

